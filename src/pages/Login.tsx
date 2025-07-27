import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(`Erro no login: ${error.message}`);
        return;
      }

      // O AuthGuard vai redirecionar automaticamente baseado no tipo de usuário
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
              Faça login em sua conta
            </CardTitle>
            <p className="text-text-secondary">
              Digite suas credenciais para acessar a plataforma
            </p>
          </CardHeader>
          
          <CardContent>
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
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-border focus:ring-primary"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Link 
                  to="/esqueci-senha" 
                  className="text-sm text-primary hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
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