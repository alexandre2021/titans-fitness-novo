// src/components/OnboardingContinuarModal.tsx

import { useEffect } from 'react';
import Modal from 'react-modal';
import { Button } from "@/components/ui/button";
import { Info, X } from 'lucide-react';

// Configurar o elemento raiz para o Modal (acessibilidade)
if (typeof window !== 'undefined') {
  Modal.setAppElement('#root');
}

interface OnboardingContinuarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResponse: (response: boolean) => void;
  isLoading: boolean;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
}

const OnboardingContinuarModal = ({
  open, onOpenChange, onResponse, isLoading,
  title, description, confirmText, cancelText
}: OnboardingContinuarModalProps) => {
  const handleClose = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onRequestClose={handleClose}
      shouldCloseOnOverlayClick={!isLoading}
      shouldCloseOnEsc={!isLoading}
      className="bg-white rounded-lg p-0 max-w-md w-[90%] sm:w-full sm:mx-4 outline-none shadow-xl"
      overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="flex items-center justify-between p-4 sm:p-6 border-b">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500" />
          <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose} className="h-9 w-9 sm:h-8 sm:w-8 p-0">
          <X className="h-5 w-5 sm:h-4 sm:w-4" />
        </Button>
      </div>
      <div className="p-4 sm:p-6"><p className="text-base sm:text-base text-gray-700 leading-relaxed">{description}</p></div>
      <div className="flex justify-end gap-3 p-4 sm:p-6 border-t">
        <Button variant="outline" onClick={() => onResponse(false)} disabled={isLoading} className="text-base sm:text-base px-6 py-2">{cancelText}</Button>
        <Button onClick={() => onResponse(true)} disabled={isLoading} className="text-base sm:text-base px-6 py-2">{confirmText}</Button>
      </div>
    </Modal>
  );
};

export default OnboardingContinuarModal;