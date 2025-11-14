import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

// VAPID Public Key - deve ser gerada com: npx web-push generate-vapid-keys
// Será configurada como variável de ambiente
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UseNotificationPermissionReturn {
  permission: NotificationPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
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
    if (!isSupported || !user) {
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID_PUBLIC_KEY não configurada');
      return false;
    }

    setIsLoading(true);

    try {
      // Primeiro, garante que tem permissão
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return false;
      }

      // Aguarda o service worker estar pronto
      const registration = await navigator.serviceWorker.ready;

      // Verifica se já existe uma subscription
      let subscription = await registration.pushManager.getSubscription();

      // Se não existe, cria uma nova
      if (!subscription) {
        const vapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey as unknown as BufferSource,
        });
      }

      // Salva no Supabase
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          subscription_object: subscription.toJSON() as any,
        }, {
          onConflict: 'endpoint'
        });

      if (error) throw error;

      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error('Erro ao registrar subscription:', error);
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

  return {
    permission,
    isSubscribed,
    isLoading,
    requestPermission,
    subscribe,
    unsubscribe,
    isSupported,
  };
};
