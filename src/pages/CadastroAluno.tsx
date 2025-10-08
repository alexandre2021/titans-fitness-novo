import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();

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

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome_completo: data.nome_completo,
            user_type: 'aluno',
          },
          emailRedirectTo: `${window.location.origin}/login`,
        }
      });

      if (authError) {
        toast.error("Erro no cadastro", { description: authError.message });
        return;
      }

      if (!authData.user) {
        toast.error("Erro no cadastro", { description: "Não foi possível criar o usuário." });
        return;
      }

      // 2. Gerar código de vínculo único
      const { data: codigoVinculo, error: rpcError } = await supabase.rpc('gerar_codigo_vinculo_unico');

      if (rpcError || !codigoVinculo) {
        console.error('Erro ao gerar código de vínculo:', rpcError);
        toast.error("Erro Crítico no Cadastro", {
          description: "Não foi possível gerar um identificador único. Tente novamente.",
        });
        // Rollback: deletar usuário do Auth
        await supabase.auth.admin.deleteUser(authData.user.id);
        return;
      }

      // 3. Criar perfil em user_profiles
      await supabase.from('user_profiles').insert({ id: authData.user.id, user_type: 'aluno' });

      // 4. Criar perfil em alunos
      const { error: alunoError } = await supabase.from('alunos').insert({
        id: authData.user.id,
        nome_completo: data.nome_completo,
        email: data.email.toLowerCase(),
        codigo_vinculo: codigoVinculo,
        onboarding_completo: false,
        status: 'ativo',
      });

      if (alunoError) {
        toast.error("Erro no cadastro", { description: `Não foi possível criar o perfil de aluno: ${alunoError.message}` });
        // Rollback
        await supabase.auth.admin.deleteUser(authData.user.id);
        return;
      }

      // 5. Redirecionar para confirmação de email
      navigate("/confirmacao-email");

    } catch (error) {
      console.error('Erro inesperado no cadastro:', error);
      toast.error("Erro", {
        description: "Erro inesperado. Tente novamente."
      })
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
              Crie sua Conta de Aluno
            </CardTitle>
            <CardDescription className="text-text-secondary text-sm">
              Preencha os dados abaixo para começar a usar a plataforma
            </CardDescription>
          </CardHeader>

          <CardContent>
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