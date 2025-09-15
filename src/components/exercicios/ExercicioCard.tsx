// components/exercicios/ExercicioCard.tsx
import { useState } from 'react';
import Modal from 'react-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ExercicioOptionsModal } from './ExercicioOptionsModal';
import { Tables } from '@/integrations/supabase/types';
import { AlertTriangle, Trash2 } from 'lucide-react';

type Exercicio = Tables<"exercicios">;

interface ExercicioCardProps {
  exercicio: Exercicio;
  onCriarCopia?: (exercicioId: string) => void;
  onExcluir?: (exercicioId: string) => Promise<void>;
}

const CORES_GRUPOS_MUSCULARES: { [key: string]: string } = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800', 
  'Pernas': 'bg-green-100 text-green-800',
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-violet-100 text-violet-800',
  'Panturrilha': 'bg-indigo-100 text-indigo-800'
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

  const handleCancelar = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
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

      {/* Modal de Confirmação de Exclusão - React Modal BLOQUEADA */}
      <Modal
        isOpen={showDeleteDialog}
        onRequestClose={() => {}} // Não permite fechar
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Excluir Exercício</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Tem certeza que deseja excluir o exercício{" "}
            <span className="font-semibold text-gray-900">
              "{exercicio.nome}"
            </span>?
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Esta ação não pode ser desfeita e todos os dados do exercício serão removidos.
          </p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={handleCancelar}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleExcluir} 
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Excluir
              </>
            )}
          </Button>
        </div>
      </Modal>
    </>
  );
};