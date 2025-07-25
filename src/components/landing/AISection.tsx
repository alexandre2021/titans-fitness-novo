import { Button } from "@/components/ui/button";
import { Brain, Zap, Target, TrendingUp } from "lucide-react";

const AISection = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center bg-primary/10 rounded-full px-4 py-2 mb-6">
              <Brain className="w-5 h-5 text-primary mr-2" />
              <span className="text-primary font-semibold">Powered by AI</span>
            </div>
            
            <h2 className="text-4xl font-bold text-text-primary mb-6">
              Inteligência Artificial que 
              <span className="text-primary"> revoluciona </span>
              o Personal Training
            </h2>
            
            <p className="text-xl text-text-secondary mb-8 leading-relaxed">
              Nossa IA analisa dados de treino, progresso e preferências dos alunos 
              para criar programas totalmente personalizados e otimizar resultados.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start space-x-3">
                <Zap className="w-6 h-6 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-text-primary">Treinos Automáticos</h3>
                  <p className="text-text-secondary">Gere treinos personalizados em segundos baseados no perfil do aluno.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Target className="w-6 h-6 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-text-primary">Ajustes Inteligentes</h3>
                  <p className="text-text-secondary">A IA sugere modificações baseadas no progresso e feedback do aluno.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-6 h-6 text-secondary mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-text-primary">Previsão de Resultados</h3>
                  <p className="text-text-secondary">Antecipe resultados e ajuste estratégias para máxima eficiência.</p>
                </div>
              </div>
            </div>
            
            <Button className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
              Experimentar IA Gratuitamente
            </Button>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-8 h-96 flex items-center justify-center">
              <div className="text-center">
                <Brain className="w-24 h-24 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-text-primary mb-2">IA em Ação</h3>
                <p className="text-text-secondary">Visualização da interface de IA</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISection;