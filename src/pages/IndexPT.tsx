import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, Activity, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const IndexPT = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: "Meus Alunos",
      value: "12",
      icon: Users,
      description: "Alunos ativos"
    },
    {
      title: "Exercícios",
      value: "45",
      icon: Dumbbell,
      description: "Na biblioteca"
    },
    {
      title: "Treinos",
      value: "28",
      icon: Activity,
      description: "Criados este mês"
    }
  ];

  const recentActivities = [
    "João completou treino de peito",
    "Maria agendou nova avaliação",
    "Pedro faltou ao treino de hoje",
    "Ana atingiu novo PR no agachamento"
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inicial</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {user?.user_metadata?.full_name || 'Personal Trainer'}!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-2 w-2 bg-primary rounded-full" />
                <p className="text-sm">{activity}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IndexPT;