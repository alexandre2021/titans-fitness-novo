// components/exercicios/ExercicioOptionsModal.tsx
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Eye, Copy, Edit, Trash2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Exercicio = Tables<"exercicios">;

interface ExercicioOptionsModalProps {
  exercicio: Exercicio;
  onCriarCopia?: (exercicioId: string) => void;
  onExcluir?: () => void; // Apenas abre o dialog, não executa a exclusão
}

export const ExercicioOptionsModal = ({ 
  exercicio, 
  onCriarCopia, 
  onExcluir 
}: ExercicioOptionsModalProps) => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const isPersonalizado = exercicio.tipo === 'personalizado';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleNavigation(`/exercicios/detalhes/${exercicio.id}`)}>
          <Eye className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Detalhes</span>
            <span className="text-xs text-muted-foreground">Informações completas do exercício</span>
          </div>
        </DropdownMenuItem>
        
        {!isPersonalizado && onCriarCopia && (
          <DropdownMenuItem onClick={() => onCriarCopia(exercicio.id)}>
            <Copy className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Copiar</span>
              <span className="text-xs text-muted-foreground">Criar versão personalizada</span>
            </div>
          </DropdownMenuItem>
        )}
        
        {isPersonalizado && (
          <DropdownMenuItem onClick={() => handleNavigation(`/exercicios/editar/${exercicio.id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Editar</span>
              <span className="text-xs text-muted-foreground">Modificar exercício personalizado</span>
            </div>
          </DropdownMenuItem>
        )}
        
        {isPersonalizado && onExcluir && (
          <DropdownMenuItem 
            onClick={onExcluir}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span>Excluir</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};