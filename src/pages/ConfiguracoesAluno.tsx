// src/pages/ConfiguracoesAluno.tsx

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';

const ConfiguracoesAluno = () => {
  const {
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    isSupported,
  } = useNotificationPermission();

  const [isToggling, setIsToggling] = useState(false);

  const handleNotificationToggle = async (enabled: boolean) => {
    setIsToggling(true);
    try {
      if (enabled) {
        const success = await subscribe();
        if (success) {
          toast.success('Notificações ativadas com sucesso!');
        } else {
          toast.error('Não foi possível ativar as notificações. Verifique as permissões do navegador.');
        }
      } else {
        const success = await unsubscribe();
        if (success) {
          toast.success('Notificações desativadas.');
        } else {
          toast.error('Erro ao desativar notificações.');
        }
      }
    } catch (error) {
      console.error('Erro ao alternar notificações:', error);
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsToggling(false);
    }
  };

  const getNotificationStatus = () => {
    if (!isSupported) {
      return {
        text: 'Não suportado neste navegador',
        color: 'text-muted-foreground',
        icon: BellOff,
      };
    }
    if (permission === 'denied') {
      return {
        text: 'Bloqueado pelo navegador',
        color: 'text-destructive',
        icon: BellOff,
      };
    }
    if (isSubscribed) {
      return {
        text: 'Ativadas',
        color: 'text-green-600',
        icon: Bell,
      };
    }
    return {
      text: 'Desativadas',
      color: 'text-muted-foreground',
      icon: BellOff,
    };
  };

  const status = getNotificationStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configurações
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências do aplicativo
        </p>
      </div>

      {/* Seção: Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Receba notificações sobre novas mensagens dos seus professores
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status das Notificações */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-5 w-5 ${status.color}`} />
              <div>
                <p className="font-medium">Status</p>
                <p className={`text-sm ${status.color}`}>{status.text}</p>
              </div>
            </div>
          </div>

          {/* Toggle de Notificações */}
          {isSupported && permission !== 'denied' && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="notifications-toggle" className="text-base font-medium cursor-pointer">
                  Notificações Push
                  {isLoading && <span className="ml-2 text-xs text-muted-foreground">(verificando...)</span>}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receba alertas quando você receber novas mensagens
                </p>
              </div>
              <Switch
                id="notifications-toggle"
                checked={isSubscribed}
                onCheckedChange={handleNotificationToggle}
                disabled={isLoading || isToggling}
              />
            </div>
          )}

          {/* Mensagem de ajuda se bloqueado */}
          {permission === 'denied' && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/10">
              <p className="text-sm font-medium text-destructive mb-2">
                Notificações bloqueadas
              </p>
              <p className="text-sm text-muted-foreground">
                Você bloqueou as notificações deste site. Para ativá-las novamente,
                acesse as configurações do navegador e permita notificações para este site.
              </p>
            </div>
          )}

          {/* Mensagem se não suportado */}
          {!isSupported && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">
                Notificações não disponíveis
              </p>
              <p className="text-sm text-muted-foreground">
                Seu navegador não suporta notificações push. Considere usar um navegador
                moderno como Chrome, Firefox, Safari ou Edge para receber notificações.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Placeholder para futuras configurações */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle>Outras Configurações</CardTitle>
          <CardDescription>
            Mais opções serão adicionadas em breve
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Em desenvolvimento: preferências de unidades, idioma, tema, etc.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracoesAluno;
