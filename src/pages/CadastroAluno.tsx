import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

const formSchema = z.object({
  nome_completo: z.string().min(2, "Nome completo deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email deve ter formato válido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirm_password: z.string().min(6, "Confirmação de senha é obrigatória"),
  aceitarTermos: z.boolean().refine(val => val === true, "Você deve aceitar os termos"),
}).refine((data) => data.password === data.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
});

type FormData = z.infer<typeof formSchema>;
type Convite = Tables<'convites'>;

export default function CadastroAluno() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid' | 'expired';
    message?: string;
    ptName?: string;
    conviteData?: Convite;
  }>({status: 'idle'});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: "",
      email: "",
      password: "",
      confirm_password: "",
      aceitarTermos: false,
    },
  });

  // Validar token de convite
  const validateToken = useCallback(async (token: string) => {
    setTokenValidation({status: 'validating'});
    
    try {
      // Buscar convite
      const { data: conviteData, error } = await supabase
        .from('convites')
        .select('*')
        .eq('token_convite', token)
        .eq('tipo_convite', 'cadastro')
        .single();

      if (error || !conviteData) {
        setTokenValidation({
          status: 'invalid',
          message: 'Token de convite inválido ou não encontrado.'
        });
        return;
      }

      // Verificar se o convite não expirou
      if (new Date(conviteData.expires_at) < new Date()) {
        setTokenValidation({
          status: 'expired',
          message: 'Este convite expirou. Solicite um novo convite ao seu Personal Trainer.'
        });
        return;
      }

      // Verificar se já foi usado
      if (conviteData.status !== 'pendente') {
        setTokenValidation({
          status: 'invalid',
          message: 'Este convite já foi utilizado ou cancelado.'
        });
        return;
      }

      // Buscar nome do Personal Trainer
      const { data: ptData } = await supabase
        .from('personal_trainers')
        .select('nome_completo')
        .eq('id', conviteData.personal_trainer_id)
        .single();

      // Token válido
      setTokenValidation({
        status: 'valid',
        message: 'Convite válido! Complete seu cadastro.',
        ptName: ptData?.nome_completo || 'Personal Trainer',
        conviteData: conviteData
      });

      // Preencher email se não veio da URL
      if (conviteData.email_convidado && !form.getValues('email')) {
        form.setValue('email', conviteData.email_convidado);
      }

    } catch (error) {
      console.error('Erro ao validar token:', error);
      setTokenValidation({
        status: 'invalid',
        message: 'Erro ao validar convite. Tente novamente.'
      });
    }
  }, [form]);

  // Validar token na URL
  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    const emailFromUrl = searchParams.get('email');
    const ptNameFromUrl = searchParams.get('pt');
    const isFromInvite = searchParams.get('ref') === 'convite';

    if (!tokenFromUrl) {
      setTokenValidation({
        status: 'invalid',
        message: 'Token de convite não encontrado na URL.'
      });
      return;
    }

    // Preencher email se veio da URL
    if (emailFromUrl) {
      form.setValue('email', emailFromUrl);
    }

    // Validar token
    validateToken(tokenFromUrl);

    // Mostrar mensagem de boas-vindas se temos o nome do PT
    if (ptNameFromUrl && isFromInvite) {
      toast({
        title: "Bem-vindo!",
        description: `${ptNameFromUrl} te convidou para o Titans Fitness! Complete seu cadastro abaixo.`,
        duration: 5000,
      });
    }
  }, [searchParams, form, toast, validateToken]); // Adicionado validateToken às dependências

  const onSubmit = async (data: FormData) => {
    if (tokenValidation.status !== 'valid' || !tokenValidation.conviteData) {
      toast({
        title: "Erro",
        description: "Token de convite inválido. Não é possível prosseguir com o cadastro.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome_completo: data.nome_completo,
            user_type: 'aluno',
          }
        }
      });

      if (authError) {
        toast({
          title: "Erro no cadastro",
          description: authError.message === 'User already registered' 
            ? "Este email já está cadastrado. Tente fazer login." 
            : authError.message,
          variant: "destructive",
        });
        return;
      }

      if (!authData.user) {
        toast({
          title: "Erro",
          description: "Erro ao criar usuário.",
          variant: "destructive",
        });
        return;
      }

      // Criar perfil do usuário
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          user_type: 'aluno'
        });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
      }

      // Criar registro do aluno
      const ptId = tokenValidation.conviteData?.personal_trainer_id;
      const { error: alunoError } = await supabase
        .from('alunos')
        .insert({
          id: authData.user.id,
          personal_trainer_id: ptId,
          nome_completo: data.nome_completo,
          email: data.email,
          telefone: null,
          avatar_type: 'letter',
          avatar_letter: data.nome_completo.charAt(0).toUpperCase(),
          avatar_color: '#60A5FA',
          onboarding_completo: false,
          status: 'ativo'
        });

      if (alunoError) {
        console.error('Erro ao criar aluno:', alunoError);
        toast({
          title: "Erro",
          description: "Erro ao finalizar cadastro. Tente novamente.",
          variant: "destructive",
        });
        return;
      }

      // Marcar convite como aceito
      const conviteId = tokenValidation.conviteData?.id;
      if (conviteId) {
        await supabase
          .from('convites')
          .update({ 
            status: 'aceito',
            aceito_em: new Date().toISOString()
          })
          .eq('id', conviteId);
      }

      toast({
        title: "Sucesso!",
        description: `Cadastro realizado com sucesso! Agora você treina com ${tokenValidation.ptName}. Faça login para começar.`,
        duration: 5000,
      });

      // Fazer logout para limpar a sessão e redirecionar para login
      await supabase.auth.signOut();
      navigate('/login');

    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border py-4">
        <div className="flex items-center justify-center relative px-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="h-10 w-10 p-0 absolute left-6"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png"
            alt="Titans.fitness"
            className="h-12"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex justify-center px-6 pt-8 pb-6 md:pt-16 md:pb-12">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-text-primary">
              Complete seu Cadastro
            </CardTitle>
            <CardDescription className="text-text-secondary text-sm">
              Você foi convidado! Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Status do Token */}
            {tokenValidation.status === 'validating' && (
              <Alert className="mb-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Validando convite...
                </AlertDescription>
              </Alert>
            )}

            {tokenValidation.status === 'valid' && tokenValidation.ptName && (
              <Alert className="mb-6 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  <strong>Convite válido!</strong> Você será aluno de <strong>{tokenValidation.ptName}</strong>
                </AlertDescription>
              </Alert>
            )}

            {(tokenValidation.status === 'invalid' || tokenValidation.status === 'expired') && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {tokenValidation.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Formulário - só exibe se token for válido */}
            {tokenValidation.status === 'valid' && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome_completo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Seu nome completo" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="email" 
                            placeholder="seu@email.com"
                            disabled={!!searchParams.get('email')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="Sua senha"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Senha *</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirme sua senha"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="aceitarTermos"
                    render={({ field }) => (
                      <FormItem className="flex flex-col space-y-2">
                        <div className="flex items-start space-x-2">
                          <Checkbox
                            id="aceitarTermos"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <Label htmlFor="aceitarTermos" className="text-sm text-text-primary leading-relaxed">
                            Eu aceito os{" "}
                            <Link to="/termos" className="text-primary hover:underline">
                              Termos de Uso
                            </Link>{" "}
                            e a{" "}
                            <Link to="/privacidade" className="text-primary hover:underline">
                              Política de Privacidade
                            </Link>
                          </Label>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={isLoading}
                  >
                    {isLoading ? "Cadastrando..." : "Cadastrar Aluno"}
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-text-secondary">Já tem uma conta? </span>
              <Link to="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
