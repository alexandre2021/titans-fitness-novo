// components/exercicios/ExercicioCard.tsx
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { ExercicioOptionsModal } from './ExercicioOptionsModal';
import { Tables } from '@/integrations/supabase/types';

type Exercicio = Tables<"exercicios">;

interface ExercicioCardProps {
  exercicio: Exercicio;
  onCriarCopia?: (exercicioId: string) => void;
  onExcluir?: (exercicioId: string) => Promise<void>;
}

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

  const getEquipmentColor = (equipamento: string | null) => {
    // Todas as badges de equipamento terão fundo cinza claro e texto preto
    return 'bg-gray-100 text-black';
  };

  const getDifficultyColor = (dificuldade: string | null) => {
    // Todas as badges de dificuldade terão fundo cinza claro e texto preto
    return 'bg-gray-100 text-black';
  };

  const getDifficultyStyle = (dificuldade: string | null) => {
    switch (dificuldade) {
      case 'Baixa':
        return { backgroundColor: '#22C55E', color: 'white' };
      case 'Média':
        return { backgroundColor: '#EAB308', color: 'white' };
      case 'Alta':
        return { backgroundColor: '#EF4444', color: 'white' };
      default:
        return {};
    }
  };

  const getGrupoMuscularStyle = (grupo: string | null) => {
    switch (grupo) {
      case 'Peito':
        return { backgroundColor: '#F87171', color: 'white' };
      case 'Costas':
        return { backgroundColor: '#60A5FA', color: 'white' };
      case 'Pernas':
        return { backgroundColor: '#34D399', color: 'white' };
      case 'Ombros':
        return { backgroundColor: '#FBBF24', color: 'white' };
      case 'Bíceps':
        return { backgroundColor: '#A78BFA', color: 'white' };
      case 'Tríceps':
        return { backgroundColor: '#F472B6', color: 'white' };
      case 'Abdômen':
        return { backgroundColor: '#F59E42', color: 'white' };
      case 'Glúteos':
        return { backgroundColor: '#34D399', color: 'white' }; // Mesma cor de Pernas
      case 'Panturrilha':
        return { backgroundColor: '#34D399', color: 'white' }; // Mesma cor de Pernas
      case 'Trapézio':
        return { backgroundColor: '#60A5FA', color: 'white' }; // Mesma cor de Costas
      default:
        return {};
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 pr-1 md:pr-4">
              <h3 className="font-semibold text-foreground truncate mb-2">
                {exercicio.nome}
              </h3>
              
              {exercicio.descricao && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {exercicio.descricao}
                </p>
              )}
              
              <div className="flex flex-wrap gap-1 md:gap-2">
                {exercicio.grupo_muscular && (
                  <Badge className="text-xs bg-gray-100 text-black border-0">
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
                {/* Badge 'Personalizado' removido */}
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Exercício</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o exercício <strong>{exercicio.nome}</strong>? 
              Esta ação não pode ser desfeita e todos os dados do exercício serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};