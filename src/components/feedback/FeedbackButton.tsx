import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

interface FeedbackButtonProps {
  onClick: () => void;
}

const FeedbackButton = ({ onClick }: FeedbackButtonProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className={cn(
      "fixed z-50",
      // Posiciona ao lado do FAB de Ajuda
      isDesktop ? "top-6 right-[8.5rem]" : "bottom-20 left-[9rem]"
    )}>
      <Button
        variant="secondary"
        className="rounded-full h-12 px-4 shadow-lg flex items-center justify-center text-sm font-medium"
        onClick={onClick}
        aria-label="Enviar Feedback"
      >
        Feedback
      </Button>
    </div>
  );
};

export default FeedbackButton;
