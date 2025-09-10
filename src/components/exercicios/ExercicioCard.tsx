// components/exercicios/ExercicioCard.tsx
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { ExercicioOptionsModal } from './ExercicioOptionsModal';
import { Tables } from '@/integrations/supabase/types';

type Exercicio = Tables<"exercicios">;

interface ExercicioCardProps {
  exercicio: Exercicio;
  onCriarCopia?: (exercicioId: string) => void;
  onExcluir?: (exercicioId: string) => Promise<void>;
}

const CORES_GRUPOS_MUSCULARES: { [key: string]: string } = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800', 
  'Pernas': 'bg-green-100 text-green-800',        // Verde (mantém)
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-violet-100 text-violet-800',     // Roxo/violeta - bem diferente
  'Panturrilha': 'bg-indigo-100 text-indigo-800'
};

// Componente responsivo para confirmação
const ResponsiveDeleteConfirmation = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  isDeleting, 
  title,
  description
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
  title: string;
  description: React.ReactNode;
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="text-sm text-muted-foreground">{description}</div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={onConfirm}
                  disabled={isDeleting}
                  variant="destructive"
                >
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            variant="destructive"
          >
            {isDeleting ? "Excluindo..." : "Excluir"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const ExercicioCard = ({ 
  exercicio, 
  onCriarCopia, 
  onExcluir 
}: ExercicioCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleExcluir = async () => {
    if (!onExcluir) return;
    
    setIsDeleting(true);
    try {
      await onExcluir(exercicio.id);
      toast({
        title: "Exercício excluído",
        description: "O exercício foi removido com sucesso.",
      });
      setShowDeleteDialog(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir o exercício. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const corGrupoMuscular = exercicio.grupo_muscular 
    ? CORES_GRUPOS_MUSCULARES[exercicio.grupo_muscular] || 'bg-gray-100 text-black'
    : 'bg-gray-100 text-black';

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 pr-1 md:pr-4">
              <h3 className="font-semibold text-foreground line-clamp-2 mb-2 h-[3.25rem]">
                {exercicio.nome}
              </h3>
              
              {exercicio.descricao && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {exercicio.descricao}
                </p>
              )}
              
              <div className="flex flex-wrap gap-1 md:gap-2">
                {exercicio.grupo_muscular && (
                  <Badge className={`text-xs border-0 ${corGrupoMuscular}`}>
                    {exercicio.grupo_muscular}
                  </Badge>
                )}
                {exercicio.equipamento && (
                  <Badge className={`text-xs bg-gray-100 text-black`}>
                    {exercicio.equipamento}
                  </Badge>
                )}
                {exercicio.dificuldade && (
                  <Badge className="text-xs bg-gray-100 text-black border-0">
                    {exercicio.dificuldade}
                  </Badge>
                )}
              </div>
            </div>

            <ExercicioOptionsModal 
              exercicio={exercicio}
              onCriarCopia={onCriarCopia}
              onExcluir={() => setShowDeleteDialog(true)}
            />
          </div>
        </CardContent>
      </Card>

      <ResponsiveDeleteConfirmation
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleExcluir}
        isDeleting={isDeleting}
        title="Excluir Exercício"
        description={
          <span>
            Tem certeza que deseja excluir o exercício <strong>{exercicio.nome}</strong>. Esta ação não pode ser desfeita e todos os dados do exercício serão removidos.
          </span>
        }
      />
    </>
  );
};