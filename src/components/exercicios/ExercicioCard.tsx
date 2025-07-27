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
    switch (equipamento) {
      case 'Barra':
        return 'bg-blue-100 text-blue-800';
      case 'Halteres':
        return 'bg-purple-100 text-purple-800';
      case 'Máquina':
        return 'bg-indigo-100 text-indigo-800';
      case 'Peso Corporal':
        return 'bg-orange-100 text-orange-800';
      case 'Cabo':
        return 'bg-teal-100 text-teal-800';
      case 'Kettlebell':
        return 'bg-red-100 text-red-800';
      case 'Fitas de Suspensão':
        return 'bg-yellow-100 text-yellow-800';
      case 'Elásticos':
        return 'bg-pink-100 text-pink-800';
      case 'Bola Suíça':
        return 'bg-green-100 text-green-800';
      case 'Bolas Medicinais':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyColor = (dificuldade: string | null) => {
    switch (dificuldade) {
      case 'Baixa':
        return 'text-white'; // Verde
      case 'Média':
        return 'text-white'; // Amarelo
      case 'Alta':
        return 'text-white'; // Vermelho
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 pr-2 md:pr-4">
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
                  <Badge 
                    className="text-xs border-0"
                    style={getGrupoMuscularStyle(exercicio.grupo_muscular)}
                  >
                    {exercicio.grupo_muscular}
                  </Badge>
                )}
                
                {exercicio.equipamento && (
                  <Badge className={`text-xs ${getEquipmentColor(exercicio.equipamento)}`}>
                    {exercicio.equipamento}
                  </Badge>
                )}
                
                {exercicio.dificuldade && (
                  <Badge 
                    className="text-xs border-0"
                    style={getDifficultyStyle(exercicio.dificuldade)}
                  >
                    {exercicio.dificuldade}
                  </Badge>
                )}
                
                {exercicio.tipo === 'personalizado' && (
                  <Badge className="text-xs bg-purple-100 text-purple-800">
                    Personalizado
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