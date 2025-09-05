// src/components/pwa/PwaInstallPrompt.tsx

// Este componente gerencia a lógica para a instalação do PWA (Progressive Web App).
// Ele ouve o evento 'beforeinstallprompt' que o navegador dispara quando
// a aplicação se torna "instalável". Ao capturar este evento, ele previne
// o comportamento padrão do navegador e, em vez disso, exibe um botão
// customizado "Instalar App", dando-nos controle total sobre a experiência do usuário.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

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

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;

    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`PWA setup user response: ${outcome}`);
    setInstallPromptEvent(null); // O prompt só pode ser usado uma vez.
  };

  // Mostra o botão apenas em dispositivos móveis quando o prompt estiver disponível
  if (!installPromptEvent || !isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button onClick={handleInstallClick} className="flex items-center gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground">
        <Download className="h-4 w-4" />
        Instalar App
      </Button>
    </div>
  );
};

export default PwaInstallPrompt;