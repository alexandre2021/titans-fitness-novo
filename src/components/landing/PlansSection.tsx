import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Star } from "lucide-react";

const PlansSection = () => {
  const plans = [
    {
      name: "Gratuito",
      price: "R$ 0",
      period: "/mês",
      description: "Perfeito para começar",
      features: [
        "Até 5 alunos",
        "Até 50 exercícios personalizados",
        "Suporte por email"
      ],
      isPopular: false,
      ctaText: "Começar Grátis"
    },
    {
      name: "Essencial",
      price: "R$ 49",
      period: "/mês",
      description: "Para Personal Trainers estabelecidos",
      features: [
        "Até 50 alunos",
        "Até 500 exercícios personalizados",
        "IA para criação de treinos",
        "Suporte prioritário"
      ],
      isPopular: true,
      ctaText: "Começar Teste Grátis"
    },
    {
      name: "Pró",
      price: "R$ 129",
      period: "/mês",
      description: "Para estúdios e academias",
      features: [
        "Alunos ilimitados",
        "Exercícios personalizados ilimitados",
        "IA para criação de treinos",
        "Suporte prioritário"
      ],
      isPopular: false,
      ctaText: "Falar com Vendas"
    }
  ];

  return (
    <section id="planos" className="py-20 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Planos que crescem com você
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Escolha o plano ideal para o seu momento profissional. 
            Todos incluem teste gratuito de 14 dias, sem compromisso.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative border-border ${
                plan.isPopular 
                  ? 'border-primary border-2 shadow-lg scale-105' 
                  : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold flex items-center">
                    <Star className="w-4 h-4 mr-1" />
                    Mais Popular
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
        
        <div className="text-center mt-12">
          <p className="text-text-secondary mb-4">
            Precisa de algo personalizado? Fale conosco!
          </p>
          <Button variant="outline" className="border-text-navigation text-text-navigation hover:bg-text-navigation hover:text-white">
            Contato Comercial
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PlansSection;