import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

export const useServiceWorker = () => {
  const intervalRef = useRef<number | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      // Desativa verificação automática em desenvolvimento
      if (import.meta.env.DEV) {
        console.log('[PWA] ✅ Service Worker registrado (modo dev - sem verificação automática):', swUrl);
        return;
      }

      const intervalMS = 60 * 60 * 1000; // 1 hora

      console.log('[PWA] ✅ Service Worker registrado:', swUrl);
      console.log(`[PWA] ⏰ Verificando atualizações a cada ${intervalMS / 1000}s`);

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = window.setInterval(() => {
        const now = new Date().toLocaleTimeString();
        console.log(`[PWA] 🔄 Verificando por atualizações às ${now}...`);
        registration.update().then(() => {
          console.log(`[PWA] ✔️ Verificação concluída às ${now}`);
        }).catch((err) => {
          console.error(`[PWA] ❌ Erro na verificação às ${now}:`, err);
        });
      }, intervalMS);
    },

    onRegisterError(error) {
      console.error('[PWA] ❌ Erro ao registrar Service Worker:', error);
    },

    onNeedRefresh() {
      console.log('[PWA] 🆕 onNeedRefresh disparado!');
    },
  });

  useEffect(() => {
    console.log('[PWA] needRefresh mudou para:', needRefresh);
    
    if (needRefresh) {
      console.log('[PWA] 🎯 Exibindo toast de atualização');
      toast('Nova versão disponível!', {
        description: 'Clique para atualizar agora',
        position: 'top-center',
        action: {
          label: 'Atualizar',
          onClick: () => {
            console.log('[PWA] 🔄 Usuário clicou em atualizar');
            updateServiceWorker(true);
          },
        },
        classNames: {
          actionButton: 'bg-primary text-primary-foreground',
        },
        duration: Infinity,
        dismissible: false,
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