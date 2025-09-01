import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const LandingHeader = () => {
  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets//TitansFitnessLogo.png" 
              alt="Titans.fitness" 
              className="h-16"
            />
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center space-x-4">
            <a href="#funcionalidades" className="text-text-navigation hover:text-text-primary transition-colors">
              Funcionalidades
            </a>
            <a href="#planos" className="text-text-navigation hover:text-text-primary transition-colors">
              Plano
            </a>
            <Link to="/login">
              <Button variant="secondary">Login</Button>
            </Link>
            <Link to="/cadastro">
              <Button className="hover:bg-primary/80">Cadastre-se</Button>
            </Link>
          </nav>

          {/* Mobile nav: Login sempre visível no header */}
          <nav className="flex md:hidden items-center gap-2">
            <Link to="/login">
              <Button variant="secondary" size="sm">Login</Button>
            </Link>
            <Link to="/cadastro">
              <Button size="sm" className="hover:bg-primary/80">Cadastre-se</Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;