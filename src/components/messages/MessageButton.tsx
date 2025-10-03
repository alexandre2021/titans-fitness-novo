import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

interface MessagesButtonProps {
  onClick: () => void;
  unreadCount?: number;
  position?: 'top-right' | 'bottom-left';
}

const MessagesButton = ({ onClick, unreadCount, position = 'top-right' }: MessagesButtonProps) => {
  const isDesktop = position === 'top-right';

  const positionClasses = isDesktop
    ? 'top-4 right-4'
    : 'bottom-20 left-4'; // bottom-20 para ficar acima da navegação inferior

  const sizeClasses = isDesktop
    ? 'h-12 w-12 [&_svg]:size-6' // Tamanho menor para desktop
    : 'h-14 w-14 [&_svg]:size-7'; // Tamanho maior para mobile

  return (
    <Button
      variant="secondary"
      className={`fixed z-50 rounded-full shadow-lg flex items-center justify-center p-0 ${sizeClasses} ${positionClasses} bg-red-600 hover:bg-red-700 text-white`}
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
