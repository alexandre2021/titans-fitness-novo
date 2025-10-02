import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

export const useServiceWorker = () => {
  const intervalRef = useRef<number | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      const intervalMS = import.meta.env.DEV 
        ? 10 * 1000 
        : 60 * 60 * 1000;

      console.log('[PWA] ✅ Service Worker registrado:', swUrl);
      console.log(`[PWA] ⏰ Verificando atualizações a cada ${intervalMS / 1000}s`);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = window.setInterval(() => {
        console.log('[PWA] 🔄 Verificando por atualizações...');
        registration.update();
      }, intervalMS);
    },

    onRegisterError(error) {
      console.error('[PWA] ❌ Erro ao registrar Service Worker:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast('🚀 Nova versão disponível!', {
        description: 'Clique para atualizar agora',
        action: {
          label: 'Atualizar',
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { needRefresh };
};