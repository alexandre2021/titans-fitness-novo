// src/components/QuestionarioSaudeModal.tsx

import { Button } from "@/components/ui/button";
import Modal from 'react-modal';
import { X } from 'lucide-react';

interface QuestionarioSaudeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResponse: (responder: boolean) => void;
  isLoading?: boolean;
}

const QuestionarioSaudeModal = ({ 
  open, 
  onOpenChange, 
  onResponse, 
  isLoading = false 
}: QuestionarioSaudeModalProps) => {
  const handleClose = () => onOpenChange(false);

  const modalContent = (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        
        <p className="text-muted-foreground">
          Quer responder um questionário rápido de saúde? São 7 perguntas simples que ajudam seu personal a criar treinos mais seguros para você. Leva menos de 1 minuto!
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button 
          onClick={() => onResponse(true)}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          Sim, vou responder
        </Button>
        
        <Button 
          variant="ghost"
          onClick={() => onResponse(false)}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? "Finalizando..." : "Prefiro não responder"}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={true}
      shouldCloseOnEsc={true}
      className="bg-white rounded-lg max-w-sm w-full mx-4 outline-none"
      overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <div className="flex items-center justify-between p-6 border-b">
        <div className="w-8"></div> {/* Spacer to help center the title */}
        <h2 className="text-lg font-semibold text-center flex-1">Questionário de Saúde</h2>
        <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-6">
        {modalContent}
      </div>
    </Modal>
  );
};

export default QuestionarioSaudeModal;