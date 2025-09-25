import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter">
          A plataforma completa para <span className="text-primary">Professores</span>
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Gerencie seus alunos com ferramentas de ponta e compartilhe seu conhecimento com uma comunidade apaixonada por fitness.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/cadastro/professor">
            <Button size="lg" className="w-full sm:w-auto">Sou Professor</Button>
          </Link>
          <Link to="/#comunidade">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">Explorar Conteúdo</Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;