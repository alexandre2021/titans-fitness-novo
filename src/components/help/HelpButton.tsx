import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

interface HelpButtonProps {
  onClick: () => void;
}

const HelpButton = ({ onClick }: HelpButtonProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className={cn(
      "fixed z-50",
      // Posiciona ao lado do FAB de mensagens
      isDesktop ? "top-1 right-[4.5rem]" : "bottom-20 left-[4.5rem]"
    )}>
      <Button
        variant="secondary"
        className="rounded-full h-9 px-3 shadow-lg flex items-center justify-center text-xs font-medium"
        onClick={onClick}
        aria-label="Abrir Central de Ajuda"
      >
        Ajuda
      </Button>
    </div>
  );
};

export default HelpButton;
