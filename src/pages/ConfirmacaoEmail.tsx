import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";


const ConfirmacaoEmail = () => {
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
        <Card className="w-full max-w-md border-border text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl text-text-primary">
              Cadastro Realizado!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <p className="text-text-secondary">
              Seu cadastro foi realizado com sucesso. Verifique seu email para confirmar sua conta.
            </p>
            
            <p className="text-sm text-text-secondary">
              Após confirmar seu email, você poderá fazer login e começar a usar a plataforma.
            </p>
            
            <div className="pt-4">
              <Link to="/login">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Ir para Login
                </Button>
              </Link>
            </div>
            
            <div className="pt-2">
              <Link to="/" className="text-sm text-primary hover:underline">
                Voltar para início
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ConfirmacaoEmail;