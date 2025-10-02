import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('Service Worker registrado:', r);
    },
    onRegisterError(error) {
      console.error('Erro no registro do Service Worker:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      const toastId = toast.info('Nova versão disponível!', {
        description: 'Clique no botão para atualizar o aplicativo.',
        duration: Infinity, // Mantém o toast visível até ser dispensado
        action: (
          <Button size="sm" onClick={() => updateServiceWorker(true)}>
            Atualizar
          </Button>
        ),
        onDismiss: () => setNeedRefresh(false),
      });
      return () => {
        toast.dismiss(toastId);
      };
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null; // O componente não renderiza nada visualmente, apenas gerencia o toast.
}

export default ReloadPrompt;