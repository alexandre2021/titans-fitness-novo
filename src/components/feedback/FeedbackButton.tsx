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
      // Posiciona ao lado do FAB de Ajuda com mesmo espaçamento que há entre Ajuda e Mensagens
      // Mensagens: right-6, Ajuda: right-20, gap ~8px, então Feedback: right-[10rem]
      isDesktop ? "top-1 right-[6.5rem]" : "bottom-20 left-[9rem]"
    )}>
      <Button
        className="rounded-full h-9 px-3 shadow-lg flex items-center justify-center text-xs font-medium bg-green-600 hover:bg-green-700 text-white"
        onClick={onClick}
        aria-label="Enviar Feedback"
      >
        Feedback
      </Button>
    </div>
  );
};

export default FeedbackButton;
