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
import { useAuth } from "@/hooks/useAuth";

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

export default function CadastroAluno() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValidation, setTokenValidation] = useState<{
    status: 'idle' | 'validating' | 'valid' | 'invalid' | 'expired';
    message?: string;
    ptName?: string;
    conviteData?: {
      id: string;
      token_convite: string;
      email_convidado: string;
      personal_trainer_id: string;
      pt_nome: string;
    };
  }>({status: 'idle'});
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

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

  const validateToken = useCallback(async (token: string) => {
    setTokenValidation({status: 'validating', message: 'Validando convite...'});
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-invite', {
        body: { token }
      });

      if (error) {
        console.error('Erro na validação do token:', error);
        setTokenValidation({
          status: 'invalid',
          message: 'Erro ao validar convite. Tente novamente.'
        });
        return;
      }

      if (data?.success) {
        setTokenValidation({
          status: 'valid',
          message: 'Convite válido! Complete seu cadastro.',
          ptName: data.convite.pt_nome,
          conviteData: {
            id: data.convite.id,
            token_convite: data.convite.token_convite,
            email_convidado: data.convite.email_convidado,
            personal_trainer_id: data.convite.personal_trainer_id,
            pt_nome: data.convite.pt_nome
          }
        });

        // Pré-preencher email se disponível
        if (data.convite.email_convidado) {
          form.setValue('email', data.convite.email_convidado);
        }
      } else {
        setTokenValidation({
          status: 'invalid',
          message: data?.error || 'Token de convite inválido'
        });
      }
    } catch (error) {
      console.error('Erro na validação:', error);
      setTokenValidation({
        status: 'invalid',
        message: 'Erro interno ao validar convite'
      });
    }
  }, [form]);

  const invalidateToken = async (conviteId: string, token: string) => {
    try {
      await supabase.functions.invoke('invalidate-invite', {
        body: { 
          conviteId,
          token 
        }
      });
    } catch (error) {
      console.error('Erro ao invalidar token:', error);
    }
  };

  useEffect(() => {
    // Aguarda a verificação de autenticação terminar
    if (authLoading) {
      setTokenValidation({ status: 'validating', message: 'Verificando sessão...' });
      return;
    }

    // Se um usuário já está logado, impede o cadastro
    if (user) {
      setTokenValidation({
        status: 'invalid',
        message: 'Você já está logado. Para cadastrar um novo usuário, por favor, saia da sua conta primeiro.'
      });
      return;
    }

    // Prossegue com a validação do token apenas se for um usuário anônimo
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setTokenValidation({
        status: 'invalid',
        message: 'Token de convite não encontrado na URL.'
      });
      return;
    }

    const emailFromUrl = searchParams.get('email');
    if (emailFromUrl) {
      form.setValue('email', emailFromUrl);
    }

    validateToken(tokenFromUrl);

    const ptNameFromUrl = searchParams.get('pt');
    const isFromInvite = searchParams.get('ref') === 'convite';
    if (ptNameFromUrl && isFromInvite) {
      toast({
        title: "Bem-vindo!",
        description: `${ptNameFromUrl} te convidou para o Titans Fitness! Complete seu cadastro abaixo.`,
        duration: 5000,
      });
    }
  }, [authLoading, user, searchParams, validateToken, form, toast]);

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
            : "Ocorreu um erro ao realizar o cadastro. Verifique os dados e tente novamente.",
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

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          user_type: 'aluno'
        });

      if (profileError) {
        console.error('Erro ao criar perfil:', profileError);
      }

      const ptId = tokenValidation.conviteData.personal_trainer_id;
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

      // Invalidar o token após uso bem-sucedido
      await invalidateToken(
        tokenValidation.conviteData.id,
        tokenValidation.conviteData.token_convite
      );

      toast({
        title: "Sucesso!",
        description: `Cadastro realizado com sucesso! Agora você treina com ${tokenValidation.ptName}. Faça login para começar.`,
        duration: 5000,
      });

      await supabase.auth.signOut();
      navigate('/login?message=cadastro_sucesso');

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
            {tokenValidation.status === 'validating' && (
              <Alert className="mb-6">
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  {tokenValidation.message || 'Validando convite...'}
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
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate('/login')}
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

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
                            disabled={!!tokenValidation.conviteData?.email_convidado}
                            readOnly={!!tokenValidation.conviteData?.email_convidado}
                          />
                        </FormControl>
                        {tokenValidation.conviteData?.email_convidado && (
                          <p className="text-xs text-muted-foreground">
                            Email pré-preenchido através do convite
                          </p>
                        )}
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