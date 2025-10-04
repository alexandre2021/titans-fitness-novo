import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

// Este hook garante que o usuário logado seja identificado no OneSignal,
// permitindo o envio de notificações direcionadas a ele.

export const useOneSignal = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Aguarda o OneSignal SDK estar pronto (ele é carregado no index.html)
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(function(OneSignal) {
      // O evento 'initialized' garante que o login/logout só aconteça
      // depois que o SDK estiver 100% pronto.
      OneSignal.on('initialized', () => {
        if (user?.id) {
          // Associa o ID do usuário do Supabase com o OneSignal
          OneSignal.login(user.id);
          console.log(`[OneSignal] Usuário ${user.id} logado.`);
        } else {
          // Se não há usuário (logout), desassocia do OneSignal
          if (OneSignal.User.isLoggedIn()) {
            OneSignal.logout();
            console.log('[OneSignal] Usuário deslogado do OneSignal.');
          }
        }
      });
    });
  }, [user]);
};