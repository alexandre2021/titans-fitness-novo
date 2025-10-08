import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { User, Users, ArrowLeft } from "lucide-react";

const UserTypeSelection = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
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

      {/* Main Content */}
      <main className="flex-1 flex justify-center px-6 pt-8 pb-6 md:pt-16 md:pb-12">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-text-primary mb-4">
              Como você gostaria de usar o Titans.fitness?
            </h1>
            <p className="text-xl text-text-secondary">
              Escolha o tipo de conta que melhor se adequa ao seu perfil
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Personal Trainer Card */}
            <Card className="border-border hover:border-primary transition-colors cursor-pointer group">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl text-text-primary">Personal Trainer</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-text-secondary mb-8">
                  Gerencie seus alunos, crie treinos personalizados e acompanhe o progresso de cada cliente com nossa IA.
                </p>
                <Link to="/cadastro/professor" className="block">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    Sou Personal Trainer
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Aluno Card */}
            <Card className="border-border hover:border-secondary transition-colors cursor-pointer group">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                  <Users className="w-8 h-8 text-secondary" />
                </div>
                <CardTitle className="text-2xl text-text-primary">Aluno</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-text-secondary mb-8">
                  Acesse seus treinos personalizados, acompanhe seu progresso e mantenha contato direto com seu Personal Trainer.
                </p>
                <Link to="/cadastro/aluno" className="block">
                  <Button className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                    Sou Aluno
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-text-secondary">
              Já tem uma conta?{" "}<Link to="/login" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserTypeSelection;