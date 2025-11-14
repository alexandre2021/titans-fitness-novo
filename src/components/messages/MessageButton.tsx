import { Button } from "@/components/ui/button";
import { MessageSquare, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

interface MessagesButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

const MessagesButton = ({ onClick, unreadCount }: MessagesButtonProps) => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { permission, isSupported } = useNotificationPermission();

  // Mostra badge de alerta se notificações não estão habilitadas
  const showNotificationAlert = isSupported && permission !== 'granted';

  return (
    <div className={cn(
      "fixed z-50",
      isDesktop ? "top-6 right-6" : "bottom-20 left-4"
    )}>
      <Button
        variant="secondary"
        className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-6 relative"
        onClick={onClick}
        aria-label="Abrir Mensagens"
      >
        <MessageSquare />

        {/* Badge de mensagens não lidas - canto superior direito */}
        {unreadCount != null && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {unreadCount}
          </span>
        )}

        {/* Badge de alerta de notificações desabilitadas - canto inferior direito */}
        {showNotificationAlert && (
          <span
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-md"
            title="Notificações desabilitadas"
          >
            <BellOff className="h-3 w-3" />
          </span>
        )}
      </Button>
    </div>
  );
};

export default MessagesButton;
