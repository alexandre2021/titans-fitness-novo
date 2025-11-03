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
          <img 
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png" 
            alt="Titans Fitness" 
            className={isMobile ? "h-12 w-auto" : "h-10 w-auto"}
          />
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          {!isMobile && (
            <>
              <Link to="/blog">
                <Button variant="ghost">Blog</Button>
              </Link>
              <Link to="/sobre">
                <Button variant="ghost">Sobre Nós</Button>
              </Link>
              <Link to="/faq">
                <Button variant="ghost">FAQ</Button>
              </Link>
            </>
          )}
          {(location.pathname.startsWith("/faq") || location.pathname.startsWith("/sobre") || location.pathname.startsWith("/termos") || location.pathname.startsWith("/privacidade") || location.pathname.startsWith("/central-de-ajuda") || location.pathname.startsWith("/contato") || location.pathname.startsWith("/blog")) && (
            <Link to="/">
              <Button variant="ghost">Início</Button>
            </Link>
          )}
          <LoginRedirectButton />
        </div>
      </div>
    </header>
  );
};

export default LandingHeader;