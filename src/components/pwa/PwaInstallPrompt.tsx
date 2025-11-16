// src/components/pwa/PwaInstallPrompt.tsx

// Este componente gerencia a lógica para a instalação do PWA (Progressive Web App).
// Ele ouve o evento 'beforeinstallprompt' que o navegador dispara quando
// a aplicação se torna "instalável". Ao capturar este evento, ele previne
// o comportamento padrão do navegador e, em vez disso, exibe um botão
// customizado "Instalar App", dando-nos controle total sobre a experiência do usuário.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, X, Loader2, CheckCircle } from 'lucide-react';
import Modal from 'react-modal';

// Estendemos a interface de Event para incluir as propriedades específicas do BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PwaInstallPrompt = () => {
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showGuidance, setShowGuidance] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installComplete, setInstallComplete] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);

      // Se o prompt aparecer novamente, pode significar que o app foi desinstalado
      const wasInstalled = localStorage.getItem('pwa_installed');
      if (wasInstalled === 'true') {
        console.log('🗑️ Detectado possível desinstalação do PWA - limpando dados...');

        // Limpa flag de instalação
        localStorage.removeItem('pwa_installed');

        // Limpa sessionStorage (dados da sessão)
        sessionStorage.clear();

        console.log('✅ Dados de sessão limpos após desinstalação');
      }
    };

    const handleAppInstalled = () => {
      console.log('PWA foi instalado com sucesso!');
      setIsInstalling(false);
      setInstallComplete(true);

      // Marca que o app foi instalado
      localStorage.setItem('pwa_installed', 'true');

      // Fecha o modal de sucesso após 3 segundos
      setTimeout(() => {
        setInstallComplete(false);
        setShowGuidance(false);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleShowInstallPrompt = () => {
    if (!installPromptEvent) return;
    setShowGuidance(true);
  };

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;

    setIsInstalling(true);
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`PWA setup user response: ${outcome}`);

    if (outcome === 'dismissed') {
      // Usuário cancelou a instalação
      setIsInstalling(false);
      setShowGuidance(false);
    }

    setInstallPromptEvent(null); // O prompt só pode ser usado uma vez.
  };

  // Mostra o botão apenas quando o prompt estiver disponível
  if (!installPromptEvent) {
    return null;
  }
  const handleClose = () => setShowGuidance(false);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button onClick={handleShowInstallPrompt} className="flex items-center gap-2 shadow-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground">
          <Download className="h-4 w-4" />
          Instalar App
        </Button>
      </div>

      <Modal
        isOpen={showGuidance}
        onRequestClose={isInstalling || installComplete ? undefined : handleClose}
        shouldCloseOnOverlayClick={!isInstalling && !installComplete}
        shouldCloseOnEsc={!isInstalling && !installComplete}
        className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        {installComplete ? (
          // Estado: Instalação completa
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Instalado com sucesso!</h2>
            <p className="text-sm text-muted-foreground">
              Procure pelo ícone do Titans Fitness na sua tela inicial.
            </p>
          </div>
        ) : isInstalling ? (
          // Estado: Instalando
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Instalando...</h2>
            <p className="text-sm text-muted-foreground">
              Aguarde enquanto o app está sendo instalado. Isso pode levar alguns segundos.
            </p>
          </div>
        ) : (
          // Estado: Prompt inicial
          <>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Smartphone /> Instalar o Titans Fitness
              </h2>
              <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Tenha acesso rápido e offline ao app.</p>
              <p className="text-sm text-muted-foreground">
                A instalação leva apenas alguns segundos. Após instalar, feche o navegador e abra o app pelo novo ícone na sua tela inicial para uma experiência completa!
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">Cancelar</Button>
              <Button onClick={handleInstallClick} className="w-full sm:w-auto">Ok, instalar!</Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default PwaInstallPrompt;