import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessagesButtonProps {
  onClick: () => void;
  unreadCount?: number;
  isDesktop: boolean;
}

const MessagesButton = ({ onClick, unreadCount, isDesktop }: MessagesButtonProps) => {
  return (
    <div className={cn(
      "fixed z-50",
      isDesktop ? "top-6 right-20" : "bottom-20 left-4 md:left-6"
    )}>
      <Button
        variant="secondary"
        className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-6"
        onClick={onClick}
        aria-label="Abrir Mensagens"
      >
        <MessageSquare />
        {unreadCount != null && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{unreadCount}</span>
        )}
      </Button>
    </div>
  );
};

export default MessagesButton;
