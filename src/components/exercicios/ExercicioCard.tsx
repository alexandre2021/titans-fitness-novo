import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { Wrench, Copy, Edit, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ExercicioCardProps {
  exercicio: Tables<'exercicios'>;
  onCriarCopia?: (exercicioId: string) => void;
  onExcluir?: (exercicioId: string) => void;
  activeTab: 'padrao' | 'personalizados';
}

const GRUPO_CORES: { [key: string]: string } = {
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

export const ExercicioCard = ({ exercicio, onCriarCopia, onExcluir, activeTab }: ExercicioCardProps) => {
  const navigate = useNavigate();

  const handleNavigateToDetails = () => {
    navigate(`/exercicios/detalhes/${exercicio.id}`, { state: { fromTab: activeTab } });
  };

  const handleNavigateToEdit = () => {
    navigate(`/exercicios/editar/${exercicio.id}`);
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={handleNavigateToDetails}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 pr-1 md:pr-4">
            <h3 className="font-semibold text-foreground truncate mb-2">{exercicio.nome}</h3>
            {exercicio.descricao && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exercicio.descricao}</p>
            )}
            <div className="flex flex-wrap gap-1 md:gap-2">
              {exercicio.grupo_muscular && <Badge className={`text-xs border-0 ${GRUPO_CORES[exercicio.grupo_muscular] || 'bg-gray-100 text-black'}`}>{exercicio.grupo_muscular}</Badge>}
              {exercicio.equipamento && <Badge className="text-xs bg-gray-100 text-black">{exercicio.equipamento}</Badge>}
              {exercicio.dificuldade && <Badge className="text-xs bg-gray-100 text-black border-0">{exercicio.dificuldade}</Badge>}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <Wrench className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {exercicio.tipo === 'padrao' && onCriarCopia && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCriarCopia(exercicio.id); }}>
                  <Copy className="mr-2 h-4 w-4" />
                  <span>Criar Cópia</span>
                </DropdownMenuItem>
              )}
              {exercicio.tipo === 'personalizado' && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleNavigateToEdit(); }}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Editar</span>
                  </DropdownMenuItem>
                  {onExcluir && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExcluir(exercicio.id); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Excluir</span></DropdownMenuItem>}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};