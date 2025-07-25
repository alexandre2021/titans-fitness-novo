import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { User, Users } from "lucide-react";
import titansLogo from "@/assets/titans-logo.png";

const UserTypeSelection = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="flex items-center space-x-3">
            <img src={titansLogo} alt="Titans.fitness" className="h-10 w-10" />
            <span className="text-2xl font-bold text-text-primary">Titans.fitness</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
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
                <p className="text-text-secondary mb-6">
                  Gerencie seus alunos, crie treinos personalizados e 
                  acompanhe o progresso de cada cliente com nossa IA.
                </p>
                <ul className="text-left text-text-secondary space-y-2 mb-8">
                  <li>✓ Gestão completa de alunos</li>
                  <li>✓ Criação de treinos com IA</li>
                  <li>✓ Relatórios de progresso</li>
                  <li>✓ Agenda inteligente</li>
                </ul>
                <Link to="/cadastro/personal-trainer" className="block">
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
                <p className="text-text-secondary mb-6">
                  Acesse seus treinos personalizados, acompanhe seu progresso 
                  e mantenha contato direto com seu Personal Trainer.
                </p>
                <ul className="text-left text-text-secondary space-y-2 mb-8">
                  <li>✓ Acesso aos seus treinos</li>
                  <li>✓ Histórico de exercícios</li>
                  <li>✓ Acompanhamento de progresso</li>
                  <li>✓ Comunicação com seu PT</li>
                </ul>
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
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">
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