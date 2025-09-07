import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'vinculo_sucesso') {
      toast.success('Vínculo com o Personal Trainer realizado com sucesso!', {
        description: 'Faça o login para acessar seu novo dashboard.',
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        let errorMessage = `Erro no login: ${error.message}`;
        if (error.message === "Email not confirmed") {
          errorMessage = "Email não confirmado. Por favor, verifique sua caixa de entrada.";
        }
        toast.error(errorMessage);
        return;
      }

      if (data.user) {
        // Buscar tipo de usuário e redirecionar
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', data.user.id)
          .single();

        if (profile?.user_type === 'aluno') {
          toast.success('Login realizado com sucesso!');
          navigate('/index-aluno');
        } else if (profile?.user_type === 'personal_trainer') {
          toast.success('Login realizado com sucesso!');
          navigate('/index-pt');
        } else {
          toast.success('Login realizado com sucesso!');
          navigate('/');
        }
      }
    } catch (error) {
      toast.error("Erro inesperado no login");
      console.error("Erro no login:", error);
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
            onClick={() => navigate("/")}
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
              Faça login em sua conta
            </CardTitle>
            <p className="text-text-secondary text-sm">
              Digite suas credenciais para acessar a plataforma
            </p>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-text-primary">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-border focus:ring-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-text-primary">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-border focus:ring-primary"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>

              <div className="text-center">
                <Link to="/esqueci-senha" className="text-sm text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-text-secondary">
                Não tem uma conta?{" "}
                <Link to="/cadastro" className="text-primary hover:underline">
                  Cadastre-se gratuitamente
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
