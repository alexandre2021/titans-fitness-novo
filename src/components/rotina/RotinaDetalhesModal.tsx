// src/components/rotina/RotinaDetalhesModal.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';
import { Separator } from '@/components/ui/separator';
import { Dumbbell } from 'lucide-react';

interface Rotina {
  id: string;
  nome: string;
}

interface Treino {
  id: string;
  nome: string;
  grupos_musculares: string[];
  tempo_estimado_minutos: number;
  exercicios: Exercicio[];
}

interface Serie {
  id: string;
  exercicio_id: string;
  numero_serie: number;
}

interface Exercicio {
  id: string;
  treino_id: string;
  exercicio_1_id: string;
  exercicio_2_id?: string;
  tipo: 'simples' | 'combinada';
  series: Serie[];
  intervalo_apos_exercicio?: number;
}

interface RotinaDetalhesModalProps {
  rotina: Rotina | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ResponsiveModal: React.ComponentType<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    children: React.ReactNode;
  }>;
}

const RotinaDetalhesModal: React.FC<RotinaDetalhesModalProps> = ({ rotina, open, onOpenChange, ResponsiveModal }) => {
  const [loading, setLoading] = useState(true);
  const [treinos, setTreinos] = useState<Treino[]>([]);
  const { getExercicioInfo } = useExercicioLookup();

  useEffect(() => {
    if (!rotina || !open) return;

    const fetchDetalhesOtimizado = async () => {
      setLoading(true);
      setTreinos([]);
      try {
        // 1. Buscar todos os treinos da rotina
        const { data: treinosData, error: treinosError } = await supabase
          .from('treinos')
          .select('id, nome, grupos_musculares, tempo_estimado_minutos')
          .eq('rotina_id', rotina.id)
          .order('ordem');

        if (treinosError) throw treinosError;
        if (!treinosData || treinosData.length === 0) {
          setTreinos([]);
          return;
        }

        const treinoIds = treinosData.map(t => t.id);

        // 2. Buscar todos os exercícios para esses treinos de uma só vez
        const { data: exerciciosData, error: exerciciosError } = await supabase
          .from('exercicios_rotina')
          .select('id, treino_id, exercicio_1_id, exercicio_2_id, intervalo_apos_exercicio')
          .in('treino_id', treinoIds)
          .order('ordem');

        if (exerciciosError) throw exerciciosError;

        const exercicioIds = exerciciosData?.map(e => e.id) || [];
        let seriesData: Serie[] = [];

        // 3. Buscar todas as séries para esses exercícios de uma só vez
        if (exercicioIds.length > 0) {
            const { data: fetchedSeries, error: seriesError } = await supabase
                .from('series')
                .select('id, exercicio_id, numero_serie')
                .in('exercicio_id', exercicioIds)
                .order('numero_serie');
            
            if (seriesError) throw seriesError;
            seriesData = (fetchedSeries as Serie[]) || [];
        }

        // 4. Montar a estrutura de dados em memória (operação muito rápida)
        const seriesMap = new Map<string, Serie[]>();
        for (const serie of seriesData) {
            if (!seriesMap.has(serie.exercicio_id)) {
                seriesMap.set(serie.exercicio_id, []);
            }
            seriesMap.get(serie.exercicio_id)!.push(serie);
        }

        const exerciciosMap = new Map<string, Exercicio[]>();
        if (exerciciosData) {
            for (const exercicio of exerciciosData) {
                const exercicioComSeries: Exercicio = {
                    id: exercicio.id,
                    treino_id: exercicio.treino_id,
                    exercicio_1_id: exercicio.exercicio_1_id,
                    exercicio_2_id: exercicio.exercicio_2_id || undefined,
                    tipo: exercicio.exercicio_2_id ? 'combinada' : 'simples',
                    series: seriesMap.get(exercicio.id) || [],
                    intervalo_apos_exercicio: exercicio.intervalo_apos_exercicio || undefined,
                };

                if (!exerciciosMap.has(exercicio.treino_id)) {
                    exerciciosMap.set(exercicio.treino_id, []);
                }
                exerciciosMap.get(exercicio.treino_id)!.push(exercicioComSeries);
            }
        }

        const treinosDetalhados: Treino[] = treinosData.map(treino => ({
          ...treino,
          grupos_musculares: treino.grupos_musculares.split(','),
          exercicios: exerciciosMap.get(treino.id) || []
        }));

        setTreinos(treinosDetalhados);

      } catch (error) {
        console.error("Erro ao buscar detalhes da rotina:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetalhesOtimizado();
  }, [rotina, open]);

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title={rotina?.nome || 'Detalhes da Rotina'}>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : treinos.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground">Nenhum treino encontrado para esta rotina.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {treinos.map((treino) => {
            const exerciciosDoTreino = treino.exercicios || [];
            return (
              <div key={treino.id} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">{treino.nome}</h3>
                <Separator className="my-2" />
                <div className="space-y-3">
                  {exerciciosDoTreino.map((exercicio) => {
                    const exercicio1Info = getExercicioInfo(exercicio.exercicio_1_id);
                    const exercicio2Info = exercicio.exercicio_2_id ? getExercicioInfo(exercicio.exercicio_2_id) : null;
                    const nomeExercicio = exercicio.tipo === 'combinada' && exercicio2Info ? `${exercicio1Info.nome} + ${exercicio2Info.nome}` : exercicio1Info.nome;
                    return (
                      <div key={exercicio.id} className="text-sm flex items-center gap-2">
                        <Dumbbell className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium flex-grow">{nomeExercicio}</span>
                        <span className="text-muted-foreground ml-auto flex-shrink-0">{exercicio.series.length} séries</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ResponsiveModal>
  );
};

export default RotinaDetalhesModal;
