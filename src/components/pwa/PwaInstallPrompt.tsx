// src/components/pwa/PwaInstallPrompt.tsx

// Este componente gerencia a lógica para a instalação do PWA (Progressive Web App).
// Ele ouve o evento 'beforeinstallprompt' que o navegador dispara quando
// a aplicação se torna "instalável". Ao capturar este evento, ele previne
// o comportamento padrão do navegador e, em vez disso, exibe um botão
// customizado "Instalar App", dando-nos controle total sobre a experiência do usuário.

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

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

      // Marca que o app foi instalado
      localStorage.setItem('pwa_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;

    // Dispara o prompt nativo do navegador diretamente
    await installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`PWA setup user response: ${outcome}`);

    if (outcome === 'accepted') {
      // Mostra toast de loading que auto-fecha após 8 segundos
      const toastId = toast.loading('Instalando aplicativo... Aguarde alguns segundos');

      setTimeout(() => {
        toast.dismiss(toastId);
      }, 8000);
    }

    setInstallPromptEvent(null); // O prompt só pode ser usado uma vez.
  };

  // Mostra o botão apenas quando o prompt estiver disponível
  if (!installPromptEvent) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button onClick={handleInstallClick} className="flex items-center gap-2 shadow-lg bg-secondary hover:bg-secondary/90 text-secondary-foreground">
        <Download className="h-4 w-4" />
        Instalar App
      </Button>
    </div>
  );
};

export default PwaInstallPrompt;