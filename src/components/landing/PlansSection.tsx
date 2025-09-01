import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star } from "lucide-react";

const PlansSection = () => {
  const plans = [
    {
      name: "Plano Gratuito",
      price: "R$ 0",
      period: "para sempre",
      description: "Todas as funcionalidades essenciais, sem custo.",
      features: [
        "Alunos ilimitados",
        "Até 100 exercícios personalizados",
        "Acesso ao app do aluno",
        "Suporte por email"
      ],
      isPopular: true,
      ctaText: "Começar Gratuitamente"
    }
  ];

  return (
    <section id="planos" className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Um plano simples e gratuito
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Oferecemos um plano gratuito e generoso para que você possa gerenciar
            seus alunos e treinos sem preocupações.
          </p>
        </div>

        <div className="flex justify-center">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className="relative border-primary border-2 shadow-lg max-w-sm"
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold">
                    Nosso Compromisso
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-text-primary text-2xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                  <span className="text-text-secondary">{plan.period}</span>
                </div>
                <p className="text-text-secondary mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="w-5 h-5 text-secondary mr-3 flex-shrink-0" />
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.isPopular 
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground' 
                      : 'bg-secondary hover:bg-secondary/90 text-secondary-foreground'
                  }`}
                >
                  {plan.ctaText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlansSection;