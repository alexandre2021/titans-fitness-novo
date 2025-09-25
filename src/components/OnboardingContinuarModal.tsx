// src/components/OnboardingContinuarModal.tsx

import Modal from 'react-modal';
import { Button } from "@/components/ui/button";
import { Info, X } from 'lucide-react';

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
      className="bg-white rounded-lg p-0 max-w-md w-full mx-4 outline-none shadow-xl"
      overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-6"><p className="text-sm text-gray-600 leading-relaxed">{description}</p></div>
      <div className="flex justify-end gap-3 p-6 border-t">
        <Button variant="outline" onClick={() => onResponse(false)} disabled={isLoading}>{cancelText}</Button>
        <Button onClick={() => onResponse(true)} disabled={isLoading}>{confirmText}</Button>
      </div>
    </Modal>
  );
};

export default OnboardingContinuarModal;