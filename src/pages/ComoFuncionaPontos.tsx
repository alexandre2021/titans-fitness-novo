import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trophy, Flame, Star, TrendingUp, Award, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ComoFuncionaPontos = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Como Funciona</h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Introdução */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-2">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Sistema de Pontos</h2>
          <p className="text-muted-foreground">
            Acompanhe seu progresso e seja recompensado por cada treino!
          </p>
        </div>

        {/* Pontos por Treino */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-yellow-500" />
              Pontos por Treino
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span>Completar um treino</span>
              <span className="font-bold text-green-600">+50 pts</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span>Novo recorde pessoal</span>
              <span className="font-bold text-green-600">+30 pts</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Você ganha pontos toda vez que finaliza uma sessão de treino.
            </p>
          </CardContent>
        </Card>

        {/* Bônus de Sequência */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-5 w-5 text-orange-500" />
              Bônus de Sequência (Streak)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Treine em dias consecutivos e ganhe pontos bônus extras!
            </p>
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-orange-500">🔥🔥🔥</span>
                <span>3 dias seguidos</span>
              </div>
              <span className="font-bold text-orange-600">+10 pts</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <span className="text-orange-500">🔥🔥🔥🔥🔥🔥🔥</span>
                <span>7 dias seguidos</span>
              </div>
              <span className="font-bold text-orange-600">+20 pts</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <div className="flex items-center gap-2">
                <span>14 dias seguidos</span>
              </div>
              <span className="font-bold text-orange-600">+40 pts</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <div className="flex items-center gap-2">
                <span>30 dias seguidos</span>
              </div>
              <span className="font-bold text-orange-600">+100 pts</span>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-orange-800">
                <strong>Atenção:</strong> Se você pular um dia de treino, sua sequência volta para zero!
                Mantenha a consistência para maximizar seus pontos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Níveis */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-purple-500" />
              Níveis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Acumule pontos para subir de nível e mostrar sua dedicação!
            </p>

            {/* Bronze */}
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
                <Trophy className="h-5 w-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">Bronze</p>
                <p className="text-sm text-amber-700">0 - 499 pontos</p>
              </div>
            </div>

            {/* Prata */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                <Trophy className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-700">Prata</p>
                <p className="text-sm text-gray-600">500 - 1.499 pontos</p>
              </div>
            </div>

            {/* Ouro */}
            <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-yellow-700">Ouro</p>
                <p className="text-sm text-yellow-600">1.500+ pontos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recordes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Recordes Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Acompanhamos seus recordes pessoais para você ver sua evolução:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span>Maior sequência de dias treinando</span>
              </li>
              <li className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <span>Treino mais longo (em minutos)</span>
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>Total de treinos concluídos</span>
              </li>
              <li className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-purple-500" />
                <span>Total de minutos treinados</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Dica Final */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-primary">Dica de Ouro</p>
              <p className="text-sm text-muted-foreground">
                A consistência é mais importante que a intensidade! Treinar regularmente,
                mesmo que por menos tempo, te ajudará a acumular mais pontos e manter
                sua sequência ativa.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ComoFuncionaPontos;
