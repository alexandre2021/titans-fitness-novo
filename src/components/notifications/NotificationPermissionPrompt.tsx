import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, X } from 'lucide-react';
import Modal from 'react-modal';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { useAuth } from '@/hooks/useAuth';

const PROMPT_DELAY_MS = 30000; // 30 segundos após login
const STORAGE_KEY = 'notification_prompt_dismissed';
const STORAGE_EXPIRY_DAYS = 7; // Perguntar novamente após 7 dias se negado

/**
 * Componente que solicita permissão para notificações push
 *
 * Comportamento:
 * - Aparece após um delay quando usuário está logado
 * - Não aparece se permissão já foi concedida
 * - Não aparece se usuário já negou recentemente
 * - Respeita a escolha do usuário
 */
const NotificationPermissionPrompt = () => {
  const { user } = useAuth();
  const { permission, isSupported, subscribe, isLoading } = useNotificationPermission();
  const [showPrompt, setShowPrompt] = useState(false);

  /**
   * Verifica se deve mostrar o prompt
   */
  useEffect(() => {
    if (!user || !isSupported) {
      return;
    }

    // Se já tem permissão, não mostrar
    if (permission === 'granted') {
      return;
    }

    // Se já foi negado pelo navegador, não insistir
    if (permission === 'denied') {
      return;
    }

    // Verifica se usuário já dismissou recentemente
    const dismissedData = localStorage.getItem(STORAGE_KEY);
    if (dismissedData) {
      try {
        const { timestamp, count } = JSON.parse(dismissedData);
        const daysSinceDismissed = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);

        // Se dismissou mais de 3 vezes, não perguntar novamente
        if (count >= 3) {
          return;
        }

        // Se foi há menos de 7 dias, não perguntar
        if (daysSinceDismissed < STORAGE_EXPIRY_DAYS) {
          return;
        }
      } catch (error) {
        console.error('Erro ao parsear dados de dismiss:', error);
      }
    }

    // Mostra o prompt após um delay
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user, isSupported, permission]);

  /**
   * Handler para aceitar notificações
   */
  const handleAccept = async () => {
    try {
      console.log('🔔 Tentando ativar notificações...');
      const success = await subscribe();
      console.log('🔔 Resultado da subscrição:', success);

      if (success) {
        setShowPrompt(false);
        // Remove do storage se aceitar
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ Notificações ativadas com sucesso!');
      } else {
        console.error('❌ Falha ao ativar notificações');
        alert('Não foi possível ativar as notificações. Por favor, tente novamente ou ative manualmente nas configurações do navegador.');
      }
    } catch (error) {
      console.error('❌ Erro ao ativar notificações:', error);
      alert('Erro ao ativar notificações: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  /**
   * Handler para recusar/adiar notificações
   */
  const handleDismiss = () => {
    setShowPrompt(false);

    // Incrementa contador de dismisses
    const dismissedData = localStorage.getItem(STORAGE_KEY);
    let count = 1;

    if (dismissedData) {
      try {
        const parsed = JSON.parse(dismissedData);
        count = (parsed.count || 0) + 1;
      } catch (error) {
        console.error('Erro ao parsear dados de dismiss:', error);
      }
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        count,
      })
    );
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <Modal
      isOpen={showPrompt}
      onRequestClose={handleDismiss}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
      overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Ativar Notificações
        </h2>
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm">
          Receba notificações instantâneas quando:
        </p>
        <ul className="text-sm space-y-2 ml-4 list-disc text-muted-foreground">
          <li>Você receber novas mensagens</li>
          <li>Seus alunos enviarem mensagens importantes</li>
          <li>Houver atualizações relevantes para você</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Você pode desativar as notificações a qualquer momento nas configurações do seu navegador.
        </p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-6 border-t">
        <Button variant="outline" onClick={handleDismiss} className="w-full sm:w-auto">
          <BellOff className="h-4 w-4 mr-2" />
          Agora não
        </Button>
        <Button
          onClick={handleAccept}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <Bell className="h-4 w-4 mr-2" />
          {isLoading ? 'Ativando...' : 'Permitir Notificações'}
        </Button>
      </div>
    </Modal>
  );
};

export default NotificationPermissionPrompt;
