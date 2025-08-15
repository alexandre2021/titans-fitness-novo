// src/components/rotina/execucao/shared/CronometroSerie.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
  intervaloSerie: number | null; // ✅ CORRIGIDO: era intervaloSerie
}

export const CronometroSerie = ({ visible, onClose, onComplete, intervaloSerie }: Props) => {
  const [tempo, setTempo] = useState<number>(0);
  const [iniciado, setIniciado] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Atualiza o tempo quando o modal abre
  useEffect(() => {
    if (visible && intervaloSerie !== null && intervaloSerie > 0) {
      setTempo(intervaloSerie);
      setIniciado(true);
    } else if (!visible) {
      // Reset quando fecha
      setIniciado(false);
      setTempo(0);
    }
  }, [visible, intervaloSerie]);

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

  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center space-x-2 text-primary">
            <Clock className="h-5 w-5" />
            <span>Intervalo entre séries</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-6 py-6">
          <div className="text-6xl font-mono font-bold text-foreground">
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
      </DialogContent>
    </Dialog>
  );
};