import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="bg-background py-20">
      <div className="container mx-auto px-6 text-center">
        <h1 className="text-5xl font-bold text-text-primary mb-6 leading-tight">
          Potencialize seus resultados com{" "}
          <span className="text-primary">inteligência artificial</span>
        </h1>
        
        <p className="text-xl text-text-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
          A plataforma completa para Personal Trainers gerenciarem seus alunos 
          com eficiência e profissionalismo. Treinos personalizados, 
          acompanhamento inteligente e muito mais.
        </p>
        
        <div className="flex justify-center">
          <Link to="/cadastro">
            <Button size="lg" className="bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-4 text-lg">
              Cadastre-se
            </Button>
          </Link>
        </div>
        
        <p className="text-text-secondary mt-6 text-sm">
          ✓ Gratuito para sempre • ✓ Solução completa • ✓ Configuração em 5 minutos
        </p>
      </div>
    </section>
  );
};

export default HeroSection;