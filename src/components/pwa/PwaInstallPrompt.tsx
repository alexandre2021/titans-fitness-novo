// src/components/pwa/PwaInstallPrompt.tsx

// Este componente gerencia a lógica para a instalação do PWA (Progressive Web App).
// Ele ouve o evento 'beforeinstallprompt' que o navegador dispara quando
// a aplicação se torna "instalável". Ao capturar este evento, ele previne
// o comportamento padrão do navegador e, em vez disso, exibe um botão
// customizado "Instalar App", dando-nos controle total sobre a experiência do usuário.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Smartphone } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';

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

  // Mostra o botão apenas em dispositivos móveis quando o prompt estiver disponível
  if (!installPromptEvent || !isMobile) {
    return null;
  }

  const GuidanceContent = () => (
    <>
      <div className="p-4 md:p-0">
        <p className="text-muted-foreground">
          A instalação leva apenas alguns segundos. Após instalar, feche o navegador e abra o app pelo novo ícone na sua tela inicial para uma experiência completa!
        </p>
      </div>
      {isMobile ? (
        <DrawerFooter>
          <Button onClick={handleInstallClick}>Ok, instalar!</Button>
          <Button variant="outline" onClick={() => setShowGuidance(false)}>Cancelar</Button>
        </DrawerFooter>
      ) : (
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setShowGuidance(false)}>Cancelar</Button>
          <Button onClick={handleInstallClick}>Ok, instalar!</Button>
        </DialogFooter>
      )}
    </>
  );

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button onClick={handleShowInstallPrompt} className="flex items-center gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground">
          <Download className="h-4 w-4" />
          Instalar App
        </Button>
      </div>

      {isMobile ? (
        <Drawer open={showGuidance} onOpenChange={setShowGuidance}>
          <DrawerContent><DrawerHeader className="text-left"><DrawerTitle className="flex items-center gap-2"><Smartphone /> Instalar o Titans Fitness</DrawerTitle><DrawerDescription>Tenha acesso rápido e offline ao app.</DrawerDescription></DrawerHeader><GuidanceContent /></DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={showGuidance} onOpenChange={setShowGuidance}>
          <DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Smartphone /> Instalar o Titans Fitness</DialogTitle><DialogDescription>Tenha acesso rápido e offline ao app.</DialogDescription></DialogHeader><GuidanceContent /></DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default PwaInstallPrompt;