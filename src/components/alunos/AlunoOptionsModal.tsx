import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Eye, FileText, BarChart3, Dumbbell, UserMinus } from 'lucide-react';

interface AlunoOptionsModalProps {
  alunoId: string;
  onDesvincular: () => void;
}

export const AlunoOptionsModal = ({ alunoId, onDesvincular }: AlunoOptionsModalProps) => {
  const navigate = useNavigate();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleNavigation(`/alunos-rotinas/${alunoId}`)}>
          <Dumbbell className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Rotinas</span>
            <span className="text-xs text-muted-foreground">Rotinas de treino personalizadas</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation(`/detalhes-aluno/${alunoId}`)}>
          <Eye className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Detalhes</span>
            <span className="text-xs text-muted-foreground">Informações pessoais do aluno</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation(`/alunos-parq/${alunoId}`)}>
          <FileText className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>PAR-Q</span>
            <span className="text-xs text-muted-foreground">Questionário de prontidão para atividade física</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation(`/alunos-avaliacoes/${alunoId}`)}>
          <BarChart3 className="h-4 w-4 mr-2" />
          <div className="flex flex-col">
            <span>Avaliações</span>
            <span className="text-xs text-muted-foreground">Medidas corporais e evolução física</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onDesvincular}
          className="text-orange-600 focus:text-orange-700"
        >
          <UserMinus className="h-4 w-4 mr-2" />
          <span>Remover</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};