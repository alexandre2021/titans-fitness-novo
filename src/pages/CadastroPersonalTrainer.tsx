import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


const formSchema = z.object({
  nomeCompleto: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmarSenha: z.string().min(6, "Confirmação de senha obrigatória"),
  aceitarTermos: z.boolean().refine(val => val === true, "Você deve aceitar os termos"),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarSenha"],
});

type FormData = z.infer<typeof formSchema>;

const CadastroPersonalTrainer = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const aceitarTermos = watch("aceitarTermos");

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.senha,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });

      if (authError) {
        toast.error(`Erro no cadastro: ${authError.message}`);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao criar usuário");
        return;
      }

      // Criar perfil genérico
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          user_type: 'personal_trainer'
        });

      if (profileError) {
        toast.error(`Erro ao criar perfil: ${profileError.message}`);
        return;
      }

      // Criar perfil específico do PT
      const { error: ptError } = await supabase
        .from('personal_trainers')
        .insert({
          id: authData.user.id,
          nome_completo: data.nomeCompleto,
          onboarding_completo: false,
          plano: 'gratuito'
        });

      if (ptError) {
        toast.error(`Erro ao criar perfil de PT: ${ptError.message}`);
        return;
      }

      toast.success("Cadastro realizado com sucesso!");
      navigate("/confirmacao-email");

    } catch (error) {
      toast.error("Erro inesperado no cadastro");
      console.error("Erro no cadastro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="flex items-center">
            <img 
              src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets//TitansFitnessLogo.png" 
              alt="Titans.fitness" 
              className="h-12"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-text-primary">
              Cadastro Personal Trainer
            </CardTitle>
            <p className="text-text-secondary">
              Crie sua conta e comece a gerenciar seus alunos
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nomeCompleto" className="text-text-primary">
                  Nome Completo *
                </Label>
                <Input
                  id="nomeCompleto"
                  {...register("nomeCompleto")}
                  className="border-border focus:ring-primary"
                />
                {errors.nomeCompleto && (
                  <p className="text-sm text-destructive">{errors.nomeCompleto.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-text-primary">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="border-border focus:ring-primary"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="senha" className="text-text-primary">
                  Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? "text" : "password"}
                    {...register("senha")}
                    className="border-border focus:ring-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.senha && (
                  <p className="text-sm text-destructive">{errors.senha.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha" className="text-text-primary">
                  Confirmar Senha *
                </Label>
                <div className="relative">
                  <Input
                    id="confirmarSenha"
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmarSenha")}
                    className="border-border focus:ring-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmarSenha && (
                  <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>
                )}
              </div>
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={aceitarTermos || false}
                  onCheckedChange={(checked) => setValue("aceitarTermos", !!checked)}
                />
                <Label htmlFor="terms" className="text-sm text-text-primary leading-relaxed">
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
              {errors.aceitarTermos && (
                <p className="text-sm text-destructive">{errors.aceitarTermos.message}</p>
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Cadastrando..." : "Cadastrar Personal Trainer"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-text-secondary">
                Já tem uma conta?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Fazer login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CadastroPersonalTrainer;