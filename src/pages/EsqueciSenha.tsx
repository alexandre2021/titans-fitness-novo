import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (emailSent && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      setEmailSent(false);
      setCountdown(60);
    }
    return () => clearTimeout(timer);
  }, [emailSent, countdown]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/resetar-senha`,
    });

    setLoading(false);

    if (error) {
      toast.error("Erro ao redefinir a senha", {
        description: "Ocorreu um erro ao tentar enviar o e-mail de redefinição. Por favor, verifique o e-mail digitado e tente novamente.",
      });
    } else {
      toast.success("Sucesso", {
        description: "Se o e-mail estiver correto, você receberá um link para redefinir sua senha.",
      });
      setEmailSent(true);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Esqueceu a Senha?</CardTitle>
          <CardDescription>
            {emailSent
              ? `Um link de recuperação foi enviado para ${email}. Verifique sua caixa de entrada.`
              : "Digite seu e-mail abaixo para receber um link de redefinição de senha."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordReset}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading || emailSent}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || emailSent}>
                {loading
                  ? "Enviando..."
                  : emailSent
                  ? `Aguarde ${countdown}s para reenviar`
                  : "Enviar Link"}
              </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Lembrou a senha?{" "}
            <Link to="/login" className="underline">
              Fazer Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
