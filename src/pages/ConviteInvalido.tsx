import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, LogIn } from "lucide-react";
import { useEffect, useState } from "react";

const getErrorMessage = (errorCode: string | null) => {
  switch (errorCode) {
    case 'nao_encontrado':
      return { 
        title: "Convite não encontrado", 
        message: "O link de convite que você usou não parece existir. Verifique se o link foi copiado corretamente."
      };
    case 'ja_utilizado':
      return { 
        title: "Convite já utilizado", 
        message: "Este convite já foi aceito anteriormente. Se você já está vinculado, pode simplesmente fazer o login."
      };
    case 'aluno_ja_vinculado':
      return { 
        title: "Aluno já tem um Personal Trainer", 
        message: "Sua conta já está associada a um Personal Trainer. Não é possível aceitar um novo convite."
      };
    case 'falha_ao_atualizar':
    case 'erro_interno':
      return { 
        title: "Erro no Servidor", 
        message: "Não foi possível processar seu convite devido a um erro interno. Por favor, tente novamente mais tarde."
      };
    default:
      return { 
        title: "Link de Convite Inválido", 
        message: "O link que você acessou é inválido ou expirou. Por favor, peça um novo convite ao seu Personal Trainer."
      };
  }
};

const ConviteInvalido = () => {
  const [searchParams] = useSearchParams();
  const [errorInfo, setErrorInfo] = useState(getErrorMessage(null));

  useEffect(() => {
    const errorCode = searchParams.get('error');
    setErrorInfo(getErrorMessage(errorCode));
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center border-destructive/50 shadow-lg">
        <CardHeader>
          <div className="mx-auto bg-destructive/10 rounded-full p-4 w-fit">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive pt-4">
            {errorInfo.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-text-secondary">
            {errorInfo.message}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Página Inicial
              </Link>
            </Button>
            <Button asChild>
              <Link to="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Ir para o Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConviteInvalido;
