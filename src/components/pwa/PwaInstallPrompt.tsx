// src/components/pwa/PwaInstallPrompt.tsx

// Este componente gerencia a lógica para a instalação do PWA (Progressive Web App).
// Ele ouve o evento 'beforeinstallprompt' que o navegador dispara quando
// a aplicação se torna "instalável". Ao capturar este evento, ele previne
// o comportamento padrão do navegador e, em vez disso, exibe um botão
// customizado "Instalar App", dando-nos controle total sobre a experiência do usuário.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, X } from 'lucide-react';
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

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleShowInstallPrompt = () => {
    if (!installPromptEvent) return;
    setShowGuidance(true);
  };

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;

    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`PWA setup user response: ${outcome}`);
    setInstallPromptEvent(null); // O prompt só pode ser usado uma vez.
    setShowGuidance(false);
  };

  // Mostra o botão apenas quando o prompt estiver disponível
  if (!installPromptEvent) {
    return null;
  }
  const handleClose = () => setShowGuidance(false);

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button onClick={handleShowInstallPrompt} className="flex items-center gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground">
          <Download className="h-4 w-4" />
          Instalar App
        </Button>
      </div>

      <Modal
        isOpen={showGuidance}
        onRequestClose={handleClose}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
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
      </Modal>
    </>
  );
};

export default PwaInstallPrompt;