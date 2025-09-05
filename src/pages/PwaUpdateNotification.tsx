// src/components/pwa/PwaUpdateNotification.tsx

import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

const PwaUpdateNotification = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for new PWA version periodically.
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // 3600000ms = 1 hour
      }
      console.log(`PWA Service Worker registered: ${swUrl}`);
    },
    onRegisterError(error) {
      console.error('PWA Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      const toastId = toast.info('Uma nova versão está disponível!', {
        position: 'bottom-center',
        duration: Infinity, // Manter aberto até o usuário interagir
        action: (
          <Button
            size="sm"
            onClick={() => updateServiceWorker(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Agora
          </Button>
        ),
        onDismiss: () => setNeedRefresh(false),
      });

      return () => {
        toast.dismiss(toastId);
      };
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null; // Este componente apenas renderiza um toast, não tem UI própria.
};

export default PwaUpdateNotification;
