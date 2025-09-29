import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
    if (message === 'vinculo_sucesso') {
      toast.success('Vínculo com o Personal Trainer realizado com sucesso!', {
        description: 'Faça o login para acessar seu novo dashboard.',
      });
    } else if (message === 'ja_seguindo') {
      toast.info('Você já segue este Personal Trainer!', {
        description: 'Nenhuma ação foi necessária. Faça o login para continuar.',
        duration: 6000
      });
    } else if (message === 'seguir_sucesso') {
      toast.success('Agora você está seguindo um novo Personal Trainer!', {
        description: 'Faça o login para ver as novidades.',
        duration: 6000
      });
    }
  }, [searchParams]);

  // Este efeito lida com o redirecionamento APÓS uma mudança de estado de login bem-sucedida.
  // Ele também redireciona usuários já logados para longe da página de login.
  useEffect(() => {
    console.log('[Login useEffect] Disparado. Auth Loading:', authLoading, 'User:', !!user);
    if (!authLoading && user) {
      console.log('[Login useEffect] Usuário autenticado, iniciando redirecionamento...');
      const redirectUser = async () => {
        console.log('[Login useEffect] 1. Buscando perfil para o user ID:', user.id);
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        console.log('[Login useEffect] 2. Perfil encontrado:', profile);

        if (profile?.user_type === 'professor') {
          console.log('[Login useEffect] 3. Redirecionando para /index-professor');
          navigate('/index-professor', { replace: true });
        } else if (profile?.user_type === 'aluno') {
          console.log('[Login useEffect] 3. Redirecionando para /index-aluno');
          navigate('/index-aluno', { replace: true });
        } else {
          console.log('[Login useEffect] 3. Tipo de usuário não reconhecido ou perfil nulo. Redirecionando para /');
          // Fallback para tipos de usuário desconhecidos ou se o perfil falhar ao carregar
          navigate('/', { replace: true });
        }
      };

      // Usamos void para indicar explicitamente que não estamos aguardando a promessa aqui.
      void redirectUser();
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('[handleSubmit] 1. Iniciando processo de login para:', email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('[handleSubmit] 2. Erro retornado pelo Supabase Auth:', error);
        let errorMessage = `Erro no login: ${error.message}`;
        if (error.message === "Email not confirmed") {
          errorMessage = "Email não confirmado. Por favor, verifique sua caixa de entrada.";
        } else if (error.message === "Invalid login credentials") {
          errorMessage = "Credenciais inválidas. Verifique seu email e senha.";
        }
        toast.error(errorMessage);
        return;
      }

      console.log('[handleSubmit] 3. Login bem-sucedido. O useEffect cuidará do redirecionamento.');
      // Em caso de sucesso, mostra o toast. O useEffect acima cuidará do redirecionamento.
      toast.success('Login realizado com sucesso!');

    } catch (error) {
      console.error('[handleSubmit] 4. Erro inesperado no bloco try-catch:', error);
      toast.error("Erro inesperado no login");
      console.error("Erro no login:", error);
    } finally {
      setIsLoading(false);
      console.log('[handleSubmit] 5. Fim do processo de login.');
    }
  };

  // Se o usuário já está logado, não renderiza o formulário e aguarda o redirecionamento.
  // Isso evita a "piscada" da tela de login.
  if (authLoading || user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal-simples.png"
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
            
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Não tem uma conta?{" "}
              <Link to="/cadastro" className="font-bold text-primary hover:underline">
                Cadastre-se gratuitamente
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Login;
