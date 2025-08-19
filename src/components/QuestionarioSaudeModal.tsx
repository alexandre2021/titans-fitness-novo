// src/components/QuestionarioSaudeModal.tsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-center">
            <DrawerTitle>Questionário de Saúde</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {modalContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-center">Questionário de Saúde</DialogTitle>
        </DialogHeader>
        {modalContent}
      </DialogContent>
    </Dialog>
  );
};

export default QuestionarioSaudeModal;