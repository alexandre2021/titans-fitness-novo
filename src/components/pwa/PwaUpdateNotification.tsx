import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Este componente gerencia o ciclo de vida de atualização do PWA.
 * - Verifica periodicamente (a cada hora) se há uma nova versão.
 * - Exibe uma notificação (toast) quando uma atualização está pronta.
 * - Permite que o usuário aplique a atualização clicando em um botão.
 */
function PwaUpdateNotification() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // A verificação periódica e no 'visibilitychange' já são suficientes
      // e mais eficientes que um setInterval fixo.
      // A própria biblioteca já faz uma verificação periódica (geralmente 24h).
      // Nossa lógica de 'visibilitychange' cobre o caso de reabertura do app.
    },
  });

  useEffect(() => {
    // Guarda a referência da função de update para usar nos listeners.
    // Isso evita recriar os listeners se a instância de `r` mudar.
    let intervalId: number | undefined;
    let registration: ServiceWorkerRegistration | undefined;
    let lastCheckTime = 0;
    const CHECK_COOLDOWN = 30000; // 30 segundos de cooldown entre verificações

    const checkForUpdate = () => {
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTime;

      if (timeSinceLastCheck < CHECK_COOLDOWN) {
        console.log(`[PWA] ⏱️ Cooldown ativo. Última verificação há ${Math.round(timeSinceLastCheck / 1000)}s. Aguarde ${Math.round((CHECK_COOLDOWN - timeSinceLastCheck) / 1000)}s`);
        return;
      }

      lastCheckTime = now;
      console.log('[PWA] ✅ Verificando atualizações...');
      registration?.update();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('App is visible again, checking for new PWA version...');
        checkForUpdate();
      }
    };

    // O hook useRegisterSW pode demorar um pouco para registrar.
    // Usamos o `navigator` para pegar o registro quando estiver pronto.
    navigator.serviceWorker?.ready.then((r) => {
      registration = r;
      // Inicia a verificação periódica somente após o SW estar pronto.
      intervalId = window.setInterval(() => {
        console.log('Checking for new PWA version (hourly)...');
        checkForUpdate();
      }, 60 * 60 * 1000); // 1 hora
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Função de limpeza do useEffect
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    if (needRefresh) {
      toast.info('Uma nova versão está disponível!', {
        description: 'Clique para atualizar e obter as últimas melhorias.',
        action: (
          <Button size="sm" onClick={() => updateServiceWorker(true)}>Atualizar</Button>
        ),
        duration: Infinity, // Mantém o toast visível até ser dispensado
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null; // Este componente não renderiza nada diretamente na árvore DOM.
}

export default PwaUpdateNotification;