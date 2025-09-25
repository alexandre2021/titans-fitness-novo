import LoginRedirectButton from "./LoginRedirectButton";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { useMediaQuery } from "@/hooks/use-media-query";

const LandingHeader = () => {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          {isMobile ? (
            <img 
              src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-mobile.png" 
              alt="Titans Fitness" 
              className="h-12 w-auto"
            />
          ) : (
            <img 
              src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal-simples.png" 
              alt="Titans Fitness" 
              className="h-10 w-auto"
            />
          )}
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          {location.pathname === "/" && (
            <Link to="/aplicativo">
              <Button variant="ghost">Nosso Aplicativo</Button>
            </Link>
          )}
          {location.pathname.startsWith("/aplicativo") && (
            <Link to="/">
              <Button variant="ghost">Comunidade</Button>
            </Link>
          )}
          <LoginRedirectButton />
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;