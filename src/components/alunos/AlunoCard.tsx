import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import { AlunoOptionsModal } from './AlunoOptionsModal';

// Hook para detectar se é mobile
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

// Componente responsivo que escolhe entre Modal e Drawer
interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

const ResponsiveModal = ({ open, onOpenChange, title, children }: ResponsiveModalProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

interface Aluno {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  genero?: string;
  onboarding_completo: boolean;
  status: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
}

interface AlunoCardProps {
  aluno: Aluno;
  onExcluir: (id: string) => Promise<boolean>;
}

export const AlunoCard = ({ aluno, onExcluir }: AlunoCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleExcluir = async () => {
    setIsDeleting(true);
    const success = await onExcluir(aluno.id);
    
    if (success) {
      toast({
        title: "Aluno excluído",
        description: "O aluno foi removido com sucesso.",
      });
      setShowDeleteDialog(false);
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o aluno. Tente novamente.",
        variant: "destructive",
      });
    }
    setIsDeleting(false);
  };

  const renderAvatar = () => {
    if (aluno.avatar_type === 'image' && aluno.avatar_image_url) {
      return <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />;
    }
    
    return (
      <AvatarFallback 
        style={{ backgroundColor: aluno.avatar_color }}
        className="text-white font-semibold"
      >
        {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
      </AvatarFallback>
    );
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <Avatar className="h-12 w-12">
                {renderAvatar()}
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {aluno.nome_completo}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {aluno.email}
                </p>
                <div className="mt-2">
                  <Badge 
                    variant={aluno.onboarding_completo ? "default" : "secondary"}
                    className={aluno.onboarding_completo ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                  >
                    {aluno.onboarding_completo ? "Ativo" : "Pendente"}
                  </Badge>
                </div>
              </div>
            </div>

            <AlunoOptionsModal 
              alunoId={aluno.id}
              onExcluir={() => setShowDeleteDialog(true)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão - Versão Responsiva */}
      <ResponsiveModal
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Excluir Aluno"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir o aluno <strong>{aluno.nome_completo}</strong>? 
            Esta ação não pode ser desfeita e todos os dados do aluno serão removidos.
          </p>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExcluir}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </Button>
          </div>
        </div>
      </ResponsiveModal>
    </>
  );
};