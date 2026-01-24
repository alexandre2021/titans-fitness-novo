// src/components/rotina/execucao/shared/CronometroExercicio.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, X } from 'lucide-react';
import Modal from 'react-modal';

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
  intervaloExercicio: number | null;
  exercicioAtual?: string;
  proximoExercicio?: { nome1: string; nome2?: string | null };
}

export const CronometroExercicio = ({
  visible,
  onClose,
  onComplete,
  intervaloExercicio,
  exercicioAtual,
  proximoExercicio
}: Props) => {
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

  // ✅ Verifica se está nos últimos 10 segundos
  const tempoUrgente = tempo > 0 && tempo <= 10;

  // ✅ COMPONENTE DE CONTEÚDO REUTILIZÁVEL
  const CronometroContent = () => (
    <div className="flex flex-col items-center space-y-6 py-6">
      {/* Exercício atual e próximo */}
      <div className="w-full space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Exercício atual:</p>
          <p className="font-medium text-foreground text-base line-clamp-2">
            {exercicioAtual}
          </p>
        </div>
        
        <div className="flex items-center justify-center">
          <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Próximo:</p>
          <p className="font-medium text-foreground text-base line-clamp-2">
            {proximoExercicio?.nome2
              ? `${proximoExercicio.nome1} + ${proximoExercicio.nome2}`
              : proximoExercicio?.nome1}
          </p>
        </div>
      </div>

      {/* Timer */}
      <div className={`font-mono font-bold text-6xl transition-colors ${
        tempoUrgente
          ? 'text-red-600 animate-pulse'
          : 'text-foreground'
      }`}>
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

  return (
    <Modal
      isOpen={visible}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
      overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="flex items-center justify-center relative p-6 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
          <Clock className="h-5 w-5" />
          <span>Intervalo entre exercícios</span>
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-6">
        <CronometroContent />
      </div>
    </Modal>
  );
};