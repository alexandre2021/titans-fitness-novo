import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Users, Calendar, BarChart3, Smartphone, Shield } from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Brain,
      title: "IA Personalizada",
      description: "Algoritmos inteligentes que analisam o progresso dos alunos e sugerem ajustes automáticos nos treinos."
    },
    {
      icon: Users,
      title: "Gestão de Alunos",
      description: "Organize todos os seus alunos em um só lugar com perfis detalhados e histórico completo."
    },
    {
      icon: Calendar,
      title: "Agenda Inteligente",
      description: "Sistema de agendamento automatizado que otimiza sua agenda e reduz cancelamentos."
    },
    {
      icon: BarChart3,
      title: "Relatórios Avançados",
      description: "Dashboards detalhados com métricas de desempenho e evolução dos seus alunos."
    },
    {
      icon: Smartphone,
      title: "App Mobile",
      description: "Acesso completo via aplicativo para você e seus alunos, sincronizado em tempo real."
    },
    {
      icon: Shield,
      title: "Segurança Total",
      description: "Seus dados e dos seus alunos protegidos com criptografia de nível bancário."
    }
  ];

  return (
    <section id="funcionalidades" className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Funcionalidades que fazem a diferença
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Tudo que você precisa para profissionalizar seu trabalho como Professor
            e oferecer a melhor experiência para seus alunos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-border hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-text-primary">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-text-secondary">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;