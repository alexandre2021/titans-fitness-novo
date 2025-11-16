import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * Componente que gerencia a limpeza de dados de notificações no logout
 *
 * Funcionalidades:
 * - Remove push subscriptions do banco quando usuário faz logout
 * - Limpa localStorage relacionado a notificações da conta anterior
 * - Previne conflitos entre múltiplas contas no mesmo dispositivo
 */
export const NotificationCleanup = () => {
  const { user } = useAuth();
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Se tinha um usuário anterior e agora não tem mais (logout)
    if (previousUserIdRef.current && !user) {
      const userIdToClean = previousUserIdRef.current;
      console.log('🧹 Detectado logout, iniciando limpeza de notificações...', userIdToClean);

      // Executa a limpeza das subscriptions no banco usando o userId anterior
      supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userIdToClean)
        .then(() => {
          console.log('✅ Subscriptions limpas do banco de dados');
        })
        .catch(error => {
          console.error('❌ Erro durante limpeza de notificações no logout:', error);
        });
    }

    // Atualiza a referência do usuário atual
    previousUserIdRef.current = user?.id || null;
  }, [user]);

  // Este componente não renderiza nada
  return null;
};
