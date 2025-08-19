import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  personal_trainer_code: z.string().min(1, "Código do Personal Trainer é obrigatório"),
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
  const [ptValidation, setPtValidation] = useState<{status: 'idle' | 'validating' | 'valid' | 'invalid', message?: string, ptName?: string}>({status: 'idle'});
  const [isFromInvite, setIsFromInvite] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personal_trainer_code: "",
      nome_completo: "",
      email: "",
      password: "",
      confirm_password: "",
      aceitarTermos: false,
    },
  });

  // Capturar código do PT da URL e dados do convite
  useEffect(() => {
    const codigoPTFromUrl = searchParams.get('codigo');
    const emailFromUrl = searchParams.get('email');
    const isFromInviteParam = searchParams.get('ref') === 'convite';
    const ptNameFromUrl = searchParams.get('pt');

    if (codigoPTFromUrl) {
      setIsFromInvite(isFromInviteParam);
      
      // Preencher o código automaticamente
      form.setValue('personal_trainer_code', codigoPTFromUrl.toUpperCase());
      
      // Preencher o email se veio da URL
      if (emailFromUrl) {
        form.setValue('email', emailFromUrl);
      }
      
      // Validar o código automaticamente
      validatePTCode(codigoPTFromUrl);

      // Se temos o nome do PT da URL, exibir mensagem de boas-vindas
      if (ptNameFromUrl && isFromInviteParam) {
        toast({
          title: "Bem-vindo!",
          description: `${ptNameFromUrl} te convidou para o Titans Fitness! O código e email já foram preenchidos automaticamente.`,
          duration: 5000,
        });
      }
    }
  }, [searchParams, form, toast]);

  // Validação em tempo real do código PT
  const validatePTCode = async (code: string) => {
    if (!code || code.length < 3) {
      setPtValidation({status: 'idle'});
      return;
    }

    setPtValidation({status: 'validating'});
    
    try {
      const { data, error } = await supabase
        .from('personal_trainers')
        .select('id, nome_completo')
        .eq('codigo_pt', code.toUpperCase())
        .single();

      if (error || !data) {
        setPtValidation({status: 'invalid', message: 'Código do Personal Trainer não encontrado'});
      } else {
        setPtValidation({
          status: 'valid', 
          message: `Personal Trainer encontrado!`,
          ptName: data.nome_completo
        });
      }
    } catch (error) {
      setPtValidation({status: 'invalid', message: 'Erro ao validar código'});
    }
  };

  const onSubmit = async (data: FormData) => {
    if (ptValidation.status !== 'valid') {
      toast({
        title: "Erro",
        description: "Por favor, insira um código de Personal Trainer válido.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Primeiro, criar o usuário no Supabase Auth
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

      // Buscar o PT para obter o ID
      const { data: ptData } = await supabase
        .from('personal_trainers')
        .select('id')
        .eq('codigo_pt', data.personal_trainer_code.toUpperCase())
        .single();

      if (!ptData) {
        toast({
          title: "Erro",
          description: "Personal Trainer não encontrado.",
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
      const { error: alunoError } = await supabase
        .from('alunos')
        .insert({
          id: authData.user.id,
          personal_trainer_id: ptData.id,
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

      // Confirmar email automaticamente (para desenvolvimento)
      if (authData.user && !authData.user.email_confirmed_at) {
        // Em produção, isso seria feito via trigger ou edge function
        console.log('Email seria confirmado automaticamente');
      }

      toast({
        title: "Sucesso!",
        description: `Cadastro realizado com sucesso${ptValidation.ptName ? ` com ${ptValidation.ptName}` : ''}! Faça login para começar.`,
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
              {isFromInvite ? "Complete seu Cadastro" : "Cadastro de Aluno"}
            </CardTitle>
            <CardDescription className="text-text-secondary text-sm">
              {isFromInvite 
                ? "Você está quase lá! Preencha os dados abaixo" 
                : "Preencha os dados abaixo para criar sua conta"
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Banner de convite aceito */}
            {isFromInvite && ptValidation.status === 'valid' && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Convite aceito!</span>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Você será aluno de <strong>{ptValidation.ptName}</strong>
                </p>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="personal_trainer_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Personal Trainer *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: ABC123"
                          onChange={(e) => {
                            field.onChange(e);
                            validatePTCode(e.target.value);
                          }}
                          className="uppercase"
                          disabled={isFromInvite && ptValidation.status === 'valid'}
                        />
                      </FormControl>
                      {ptValidation.status === 'validating' && (
                        <p className="text-sm text-muted-foreground">Validando código...</p>
                      )}
                      {ptValidation.status === 'valid' && (
                        <div className="flex items-center gap-2 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>{ptValidation.message}</span>
                        </div>
                      )}
                      {ptValidation.status === 'invalid' && (
                        <p className="text-sm text-destructive">{ptValidation.message}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          disabled={isFromInvite && !!searchParams.get('email')}
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