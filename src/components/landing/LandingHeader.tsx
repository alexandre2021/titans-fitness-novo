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
              className="h-12"
            />
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#funcionalidades" className="text-text-navigation hover:text-text-primary transition-colors">
              Funcionalidades
            </a>
            <a href="#planos" className="text-text-navigation hover:text-text-primary transition-colors">
              Planos
            </a>
            <Link to="/login" className="text-text-navigation hover:text-text-primary transition-colors">
              Login
            </Link>
            <Link to="/cadastro">
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Cadastre-se
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;