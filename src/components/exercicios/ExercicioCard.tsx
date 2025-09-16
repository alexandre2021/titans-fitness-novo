// components/exercicios/ExercicioCard.tsx
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
              onExcluir={() => onExcluir?.(exercicio.id)}
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};