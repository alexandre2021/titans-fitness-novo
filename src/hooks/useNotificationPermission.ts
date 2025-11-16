import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { VAPID_PUBLIC_KEY } from '@/config/vapid';

// Debug: Log para verificar se a variável está sendo carregada
console.log('🔑 VAPID_PUBLIC_KEY carregada:', VAPID_PUBLIC_KEY ? `${VAPID_PUBLIC_KEY.substring(0, 20)}...` : 'undefined');

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UseNotificationPermissionReturn {
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  cleanupOnLogout: () => Promise<void>;
  isSupported: boolean;
}

/**
 * Hook para gerenciar permissões de notificações push
 *
 * Funcionalidades:
 * - Verificar suporte do navegador
 * - Solicitar permissão
 * - Registrar/desregistrar subscription
 * - Sincronizar com Supabase
 */
export const useNotificationPermission = (): UseNotificationPermissionReturn => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verifica se o navegador suporta notificações
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  /**
   * Converte base64 URL-safe para Uint8Array (necessário para VAPID key)
   */
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  /**
   * Verifica o estado atual da subscription
   */
  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported || !user) {
      setIsLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setIsSubscribed(!!subscription);

      // Verifica se a subscription existe no banco de dados
      if (subscription) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('endpoint')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .single();

        // Se não existe no banco, criar
        if (!data) {
          await supabase.from('push_subscriptions').insert({
            user_id: user.id,
            endpoint: subscription.endpoint,
            subscription_object: subscription.toJSON() as any,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  /**
   * Atualiza o estado da permissão
   */
  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      setIsLoading(false);
      return;
    }

    setPermission(Notification.permission as NotificationPermissionState);
    checkSubscriptionStatus();
  }, [isSupported, checkSubscriptionStatus]);

  /**
   * Solicita permissão ao usuário
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('Notificações não suportadas neste navegador');
      return false;
    }

    if (permission === 'denied') {
      console.warn('Permissão de notificação foi negada pelo usuário');
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result === 'granted';
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      return false;
    }
  }, [isSupported, permission]);

  /**
   * Registra uma nova subscription
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    console.log('🔔 [subscribe] Iniciando processo...');
    console.log('🔔 [subscribe] isSupported:', isSupported);
    console.log('🔔 [subscribe] user:', user?.id);

    if (!isSupported || !user) {
      console.error('❌ [subscribe] Navegador não suportado ou usuário não logado');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('❌ [subscribe] VAPID_PUBLIC_KEY não configurada');
      return false;
    }

    console.log('🔔 [subscribe] VAPID_PUBLIC_KEY:', VAPID_PUBLIC_KEY.substring(0, 20) + '...');
    setIsLoading(true);

    try {
      // Primeiro, garante que tem permissão
      console.log('🔔 [subscribe] Solicitando permissão...');
      const hasPermission = await requestPermission();
      console.log('🔔 [subscribe] Permissão concedida:', hasPermission);

      if (!hasPermission) {
        console.error('❌ [subscribe] Permissão negada pelo usuário');
        return false;
      }

      // Aguarda o service worker estar pronto
      console.log('🔔 [subscribe] Aguardando Service Worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('✅ [subscribe] Service Worker pronto');

      // Verifica se já existe uma subscription
      let subscription = await registration.pushManager.getSubscription();
      console.log('🔔 [subscribe] Subscription existente:', !!subscription);

      // Se não existe, cria uma nova
      if (!subscription) {
        console.log('🔔 [subscribe] Criando nova subscription...');
        const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey as unknown as BufferSource,
        });
        console.log('✅ [subscribe] Subscription criada:', subscription.endpoint);
      }

      // Salva no Supabase
      console.log('🔔 [subscribe] Salvando no Supabase...');
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          subscription_object: subscription.toJSON() as any,
        }, {
          onConflict: 'endpoint'
        });

      if (error) {
        console.error('❌ [subscribe] Erro ao salvar no Supabase:', error);
        throw error;
      }

      console.log('✅ [subscribe] Salvo no Supabase com sucesso!');
      setIsSubscribed(true);
      setPermission('granted'); // Atualiza estado imediatamente
      return true;
    } catch (error) {
      console.error('❌ [subscribe] Erro ao registrar subscription:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, requestPermission]);

  /**
   * Remove a subscription
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove do Supabase
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Erro ao remover subscription:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  /**
   * Limpa subscription do usuário no logout (sem precisar de permissão)
   * Apenas remove do banco de dados
   */
  const cleanupOnLogout = useCallback(async (): Promise<void> => {
    if (!user) {
      return;
    }

    try {
      console.log('🧹 Limpando subscriptions do usuário no logout...');

      // Remove todas as subscriptions deste usuário do banco
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id);

      console.log('✅ Subscriptions limpas do banco de dados');
    } catch (error) {
      console.error('❌ Erro ao limpar subscriptions no logout:', error);
    }
  }, [user]);

  return {
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    cleanupOnLogout,
    isSupported,
  };
};
