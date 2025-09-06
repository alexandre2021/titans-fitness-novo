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
      const intervalMS = import.meta.env.DEV
        ? 10 * 1000 // 10 seconds in development
        : 60 * 60 * 1000; // 1 hour in production

      if (registration) {
        setInterval(() => {
          registration.update();
        }, intervalMS);
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
