import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  personal_trainer_code: z.string().min(1, "Código do Personal Trainer é obrigatório"),
  nome_completo: z.string().min(2, "Nome completo deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email deve ter formato válido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirm_password: z.string().min(6, "Confirmação de senha é obrigatória"),
  telefone: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
});

type FormData = z.infer<typeof formSchema>;

export default function CadastroAluno() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [ptValidation, setPtValidation] = useState<{status: 'idle' | 'validating' | 'valid' | 'invalid', message?: string}>({status: 'idle'});
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      personal_trainer_code: "",
      nome_completo: "",
      email: "",
      password: "",
      confirm_password: "",
      telefone: "",
    },
  });

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
        setPtValidation({status: 'valid', message: `Personal Trainer: ${data.nome_completo}`});
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
          telefone: data.telefone || null,
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
        description: "Cadastro realizado com sucesso! Faça login.",
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center p-2">
      <div className="w-full max-w-md">
        {/* Botão voltar acima do logo e do card */}
        <div className="mb-1">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-center mb-4">
          <img 
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets//TitansFitnessLogo.png" 
            alt="Titans.fitness" 
            className="h-12"
          />
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Cadastro de Aluno</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para criar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="personal_trainer_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código do Personal Trainer</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ex: ABC123"
                          onChange={(e) => {
                            field.onChange(e);
                            validatePTCode(e.target.value);
                          }}
                          className="uppercase"
                        />
                      </FormControl>
                      {ptValidation.status === 'validating' && (
                        <p className="text-sm text-muted-foreground">Validando código...</p>
                      )}
                      {ptValidation.status === 'valid' && (
                        <p className="text-sm text-green-600">{ptValidation.message}</p>
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
                      <FormLabel>Nome Completo</FormLabel>
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="seu@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (Opcional)</FormLabel>
                      <FormControl>
                        <PhoneInput
                          value={field.value}
                          onChange={field.onChange}
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
                      <FormLabel>Senha</FormLabel>
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
                      <FormLabel>Confirmar Senha</FormLabel>
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

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading || ptValidation.status !== 'valid'}
                >
                  {isLoading ? "Cadastrando..." : "Cadastrar Aluno"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link to="/login" className="text-primary hover:underline">
                Faça login
              </Link>
            </div>

            <div className="mt-4 text-center text-xs text-muted-foreground">
              Ao se cadastrar, você concorda com nossos{" "}
              <Link to="/termos" className="text-primary hover:underline">
                Termos de Uso
              </Link>{" "}
              e{" "}
              <Link to="/privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}