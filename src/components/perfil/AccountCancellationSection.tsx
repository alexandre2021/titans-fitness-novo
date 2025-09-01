// src/components/perfil/AccountCancellationSection.tsx

import { useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

// Hook para detectar mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}

const ResponsiveModal = ({ open, onOpenChange, title, description, children }: ResponsiveModalProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {title}
            </DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

// Configurações por tipo de usuário
const getCancellationConfig = (userType: 'personal_trainer' | 'aluno') => {
  if (userType === 'personal_trainer') {
    return {
      warningText: "Todos os alunos vinculados a você serão automaticamente desvinculados, mas suas contas e históricos serão preservados.",
      consequences: [
        "• Sua conta será permanentemente excluída",
        "• Todos os seus exercícios criados serão removidos", 
        "• Rotinas ativas serão canceladas automaticamente",
        "• Alunos vinculados serão automaticamente desvinculados",
        "• Históricos dos alunos serão preservados",
        "• Esta ação não pode ser desfeita"
      ]
    };
  } else {
    return {
      warningText: "Seu histórico de treinos e avaliações físicas serão permanentemente removidos.",
      consequences: [
        "• Sua conta será permanentemente excluída",
        "• Todas as suas avaliações físicas serão removidas",
        "• Histórico de treinos será deletado",
        "• PDFs de rotinas arquivadas serão removidos",
        "• Você será desvinculado do seu Personal Trainer",
        "• Esta ação não pode ser desfeita"
      ]
    };
  }
};

interface AccountCancellationSectionProps {
  userType: 'personal_trainer' | 'aluno';
}

export const AccountCancellationSection = ({ userType }: AccountCancellationSectionProps) => {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const config = getCancellationConfig(userType);

  const handleAccountCancellation = async () => {
    if (confirmationText.toLowerCase() !== 'cancelar conta') {
      toast({
        title: "Erro de confirmação",
        description: "Digite exatamente 'CANCELAR CONTA' para confirmar.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setIsDeleting(true);

    try {
      // Chama a Edge Function para cancelar a conta
      const { error } = await supabase.functions.invoke('cancel-account', {
        body: { user_type: userType }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao cancelar conta');
      }

      toast({
        title: "Conta cancelada",
        description: "Sua conta foi cancelada com sucesso. Você será redirecionado para a página inicial.",
      });

      // Fazer logout e redirecionar
      await signOut();
      navigate('/');

    } catch (error) {
      console.error('Erro ao cancelar conta:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível cancelar a conta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Cancelar conta</h4>
            <p className="text-sm text-muted-foreground">
              Esta ação é permanente e não pode ser desfeita. Todos os seus dados serão removidos definitivamente.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Importante:</strong> {config.warningText}
              </p>
            </div>
          </div>
          
          <Button 
            variant="destructive" 
            onClick={() => setShowCancelModal(true)}
            className="w-full md:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cancelar Conta
          </Button>
        </CardContent>
      </Card>

      {/* Modal de confirmação */}
      <ResponsiveModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        title="Cancelar Conta Definitivamente"
        description="Esta ação é irreversível e todos os seus dados serão permanentemente removidos."
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">O que acontecerá:</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {config.consequences.map((consequence, index) => (
                <li key={index}>{consequence}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Para confirmar, digite <strong>CANCELAR CONTA</strong>:
            </Label>
            <Input
              id="confirmation"
              placeholder="CANCELAR CONTA"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={isDeleting}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCancelModal(false);
                setConfirmationText('');
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAccountCancellation}
              disabled={isDeleting || confirmationText.toLowerCase() !== 'cancelar conta'}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Cancelando..." : "Confirmar Cancelamento"}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
};