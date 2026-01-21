import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

interface MessagesButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

const MessagesButton = ({ onClick, unreadCount }: MessagesButtonProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  return (
    <div className={cn(
      "fixed z-50",
      isDesktop ? "top-1 right-6" : "bottom-20 left-4"
    )}>
      <Button
        variant="secondary"
        className={cn(
          "rounded-full p-0 shadow-lg flex items-center justify-center relative",
          isDesktop ? "h-9 w-9 [&_svg]:size-5" : "h-12 w-12 [&_svg]:size-6"
        )}
        onClick={onClick}
        aria-label="Abrir Mensagens"
      >
        <MessageSquare />

        {/* Badge de mensagens não lidas */}
        {unreadCount != null && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
};

export default MessagesButton;
