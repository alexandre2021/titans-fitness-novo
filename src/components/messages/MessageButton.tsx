import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils"; // Supondo que você tenha um helper `cn`

interface MessagesButtonProps {
  onClick: () => void;
  unreadCount?: number;
  position?: 'top-right' | 'bottom-left';
}

const MessagesButton = ({ onClick, unreadCount, position = 'top-right' }: MessagesButtonProps) => {
  const isDesktop = position === 'top-right';

  return (
    <Button
      variant="secondary"
      className={cn(
        "fixed z-50 rounded-full shadow-lg flex items-center justify-center p-0",
        {
          'top-4 right-4 h-12 w-12 [&_svg]:size-6': isDesktop,
          'bottom-20 left-4 h-14 w-14 [&_svg]:size-7': !isDesktop, // bottom-20 para ficar acima da navegação inferior
        }
      )}
      onClick={onClick}
    >
      <MessageSquare />
      {unreadCount != null && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{unreadCount}</span>
      )}
    </Button>
  );
};

export default MessagesButton;
