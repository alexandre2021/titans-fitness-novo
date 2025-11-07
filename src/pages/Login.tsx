import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'cadastro_sucesso') {
      toast.success('Cadastro realizado com sucesso!', {
        description: 'Faça o login para acessar a plataforma.',
        duration: 6000
      });
    }
  }, [searchParams]);

  // Este efeito lida com o redirecionamento APÓS uma mudança de estado de login bem-sucedida.
  // Ele agora apenas redireciona usuários já logados para longe da página de login.
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (authLoading) return;
      
      if (user) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
  
          if (profile?.user_type === 'professor') {
            navigate('/index-professor', { replace: true });
          } else if (profile?.user_type === 'aluno') {
            navigate('/index-aluno', { replace: true });
          }
        }
      }
    };
    void checkAndRedirect();
  }, [user, authLoading, navigate]);

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
        } else if (error.message === "Invalid login credentials") {
          errorMessage = "Credenciais inválidas. Verifique seu email e senha.";
        }
        toast.error(errorMessage);
        return;
      }
    } catch (error) {
      toast.error("Erro inesperado no login");
      console.error("Erro no login:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // ✅ CORREÇÃO: Aponta para a URL de callback correta.
          redirectTo: `${window.location.origin}/auth/callback`, 
        },
      });
      if (error) throw error;
    } catch (error: unknown) {
      let errorMessage = "Ocorreu um erro desconhecido.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error("Erro no login com Google", { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border py-3">
        <div className="flex items-center justify-center relative px-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="h-9 w-9 p-0 absolute left-4 md:left-6"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png"
            alt="Titans.fitness"
            className="h-10"
          />
        </div>
      </header>

      <main className="flex-1 flex justify-center px-6 pt-8 pb-12 md:pt-12">
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
            <div className="space-y-4 mb-4">
              <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-5 w-5" />
                )}
                Entrar com Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">OU</span></div>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
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
            </form>
            
            <div className="mt-6 text-center text-sm">
              <Link to="/esqueci-senha" className="text-primary hover:underline">
                Esqueci minha senha
              </Link>
              <p className="mt-2 text-muted-foreground">
                Não tem uma conta?{" "}
                <Link to="/cadastro" className="font-bold text-primary hover:underline">
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