// src/components/rotina/execucao/shared/CronometroExercicio.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
  intervaloExercicio: number | null;
  exercicioAtual: string;
  proximoExercicio: string;
}

export const CronometroExercicio = ({
  visible,
  onClose,
  onComplete,
  intervaloExercicio,
  exercicioAtual,
  proximoExercicio
}: Props) => {
  const isMobile = useIsMobile();
  const [tempo, setTempo] = useState<number>(0);
  const [iniciado, setIniciado] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Atualiza o tempo quando o modal abre
  useEffect(() => {
    if (visible && intervaloExercicio !== null && intervaloExercicio > 0) {
      setTempo(intervaloExercicio);
      setIniciado(true);
    } else if (!visible) {
      // Reset quando fecha
      setIniciado(false);
      setTempo(0);
    }
  }, [visible, intervaloExercicio]);

  // ✅ Contagem regressiva precisa
  useEffect(() => {
    if (!visible || !iniciado || tempo <= 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setTimeout(() => {
      setTempo((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, iniciado, tempo]);

  // ✅ Dispara onComplete quando chegou a 0
  useEffect(() => {
    if (tempo === 0 && visible && iniciado) {
      onComplete?.();
    }
  }, [tempo, visible, iniciado, onComplete]);

  const formatarTempo = (segundos: number) => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ✅ COMPONENTE DE CONTEÚDO REUTILIZÁVEL
  const CronometroContent = () => (
    <div className="flex flex-col items-center space-y-6 py-6">
      {/* Exercício atual e próximo */}
      <div className="w-full space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Exercício atual:</p>
          <p className={`font-medium text-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
            {exercicioAtual}
          </p>
        </div>
        
        <div className="flex items-center justify-center">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Próximo:</p>
          <p className={`font-medium text-foreground ${isMobile ? 'text-sm' : 'text-base'}`}>
            {proximoExercicio}
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className={`font-mono font-bold text-foreground ${isMobile ? 'text-5xl' : 'text-6xl'}`}>
        {formatarTempo(tempo)}
      </div>
      
      <Button 
        onClick={onClose}
        variant="outline"
        size="lg"
        className="w-full"
      >
        Pular intervalo
      </Button>
    </div>
  );

  // 📱 MOBILE: Drawer que desliza de baixo
  if (isMobile) {
    return (
      <Drawer open={visible} onOpenChange={onClose}>
        <DrawerContent className="px-4 pb-4 max-h-[85vh]">
          <DrawerHeader className="text-center pb-4 relative">
            {/* Botão X para fechar */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
            
            <DrawerTitle className="flex items-center justify-center space-x-2 text-primary">
              <Clock className="h-5 w-5" />
              <span>Intervalo entre exercícios</span>
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="px-2 overflow-y-auto">
            <CronometroContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // 💻 DESKTOP: Modal tradicional no centro
  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="relative">
          {/* Botão X para fechar */}
          <button
            onClick={onClose}
            className="absolute right-6 top-4 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          
          <DialogTitle className="flex items-center justify-center space-x-2 text-primary">
            <Clock className="h-5 w-5" />
            <span>Intervalo entre exercícios</span>
          </DialogTitle>
        </DialogHeader>
        
        <CronometroContent />
      </DialogContent>
    </Dialog>
  );
};