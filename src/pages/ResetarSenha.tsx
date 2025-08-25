import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

export default function ResetarSenha() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const errorDescription = params.get('error_description');

    if (errorDescription) {
      const decodedError = decodeURIComponent(errorDescription.replace(/\+/g, ' '));
      if (decodedError.includes('expired')) {
        setUrlError("O link para redefinição de senha expirou ou já foi utilizado. Por favor, solicite um novo link.");
      } else {
        setUrlError("O link utilizado é inválido ou ocorreu um erro. Por favor, solicite um novo link.");
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // A recuperação de senha foi iniciada, o usuário está nesta página
        // após clicar no link de e-mail. Não precisamos fazer nada aqui,
        // apenas permitir que eles insiram uma nova senha.
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("As senhas não correspondem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setError(null);
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      toast({
        title: "Erro ao redefinir a senha",
        description: "Não foi possível redefinir sua senha. O link pode ter expirado. Por favor, tente o processo de 'Esqueci a senha' novamente.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso!",
        description: "Sua senha foi redefinida com sucesso. Você já pode fazer o login.",
      });
      navigate("/login");
    }
  };

  if (urlError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
        <Card className="mx-auto max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive">Link Inválido ou Expirado</CardTitle>
            <CardDescription className="pt-2">
              {urlError}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/esqueci-senha">
              <Button className="w-full">
                Solicitar Novo Link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
          <CardDescription>
            Digite sua nova senha abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
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
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Redefinindo..." : "Redefinir Senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
