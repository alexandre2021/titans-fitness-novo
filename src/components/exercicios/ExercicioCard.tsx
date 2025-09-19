// components/exercicios/ExercicioCard.tsx
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, ChevronDown, Eye, Edit, Copy, Trash2 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Tables } from '@/integrations/supabase/types';

type Exercicio = Tables<"exercicios">;

interface ExercicioCardProps {
  exercicio: Exercicio;
  onCriarCopia?: (exercicioId: string) => void;
  onExcluir?: (exercicioId: string) => void;
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
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleDetalhes = () => navigate(`/exercicios-pt/detalhes/${exercicio.id}`);
  const handleEditar = () => navigate(`/exercicios-pt/editar/${exercicio.id}`);

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {isDesktop ? (
                  <Button variant="outline" size="sm" className="flex-shrink-0">
                    Ações <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="default" className="h-10 w-10 rounded-full p-0 flex-shrink-0 [&_svg]:size-6">
                    <MoreVertical />
                  </Button>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDetalhes}>
                  <Eye className="mr-2 h-5 w-5" />
                  <span className="text-base">Ver Detalhes</span>
                </DropdownMenuItem>
                {exercicio.tipo === 'personalizado' && onExcluir && (
                  <>
                    <DropdownMenuItem onClick={handleEditar}>
                      <Edit className="mr-2 h-5 w-5" />
                      <span className="text-base">Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExcluir(exercicio.id)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-5 w-5" />
                      <span className="text-base">Excluir</span>
                    </DropdownMenuItem>
                  </>
                )}
                {exercicio.tipo === 'padrao' && onCriarCopia && (
                  <DropdownMenuItem onClick={() => onCriarCopia && onCriarCopia(exercicio.id)}>
                    <Copy className="mr-2 h-5 w-5" />
                    <span className="text-base">Criar Cópia Personalizada</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </>
  );
};