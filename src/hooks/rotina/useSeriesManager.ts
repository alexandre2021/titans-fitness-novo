// src/hooks/rotina/useSeriesManager.ts

import { useCallback } from 'react';
import { ExercicioRotinaLocal, SerieConfig } from '@/types/rotina.types';
import { ExerciciosPorTreino } from './useExerciciosStorage';

interface UseSeriesManagerProps {
  exerciciosAdicionados: ExerciciosPorTreino;
  setExerciciosAdicionados: (exercicios: ExerciciosPorTreino | ((prev: ExerciciosPorTreino) => ExerciciosPorTreino)) => void;
}

export const useSeriesManager = ({ 
  exerciciosAdicionados, 
  setExerciciosAdicionados 
}: UseSeriesManagerProps) => {

  // Helper para atualizar exercício específico
  const atualizarExercicioNoTreino = useCallback((
    treinoId: string, 
    exercicioId: string, 
    atualizador: (exercicio: ExercicioRotinaLocal) => ExercicioRotinaLocal
  ) => {
    setExerciciosAdicionados(prev => {
      const exerciciosDoTreino = prev[treinoId] || [];
      
      const exerciciosAtualizados = exerciciosDoTreino.map(exercicio => 
        exercicio.id === exercicioId ? atualizador(exercicio) : exercicio
      );

      return {
        ...prev,
        [treinoId]: exerciciosAtualizados
      };
    });
  }, [setExerciciosAdicionados]);

  // Adicionar série a um exercício
  const adicionarSerie = useCallback((treinoId: string, exercicioId: string) => {
    atualizarExercicioNoTreino(treinoId, exercicioId, (exercicio) => {
      const novaSerie: SerieConfig = {
        id: `serie-${exercicio.series.length + 1}-${Date.now()}`,
        numero_serie: exercicio.series.length + 1,
        repeticoes: 12,
        carga: 0,
        intervalo_apos_serie: 90,
        tem_dropset: false,
        // Para séries combinadas
        ...(exercicio.tipo === 'combinada' && {
          repeticoes_1: 12,
          carga_1: 0,
          repeticoes_2: 12,
          carga_2: 0
        })
      };

      return {
        ...exercicio,
        series: [...exercicio.series, novaSerie]
      };
    });
  }, [atualizarExercicioNoTreino]);

  // Remover série de um exercício
  const removerSerie = useCallback((treinoId: string, exercicioId: string, serieId: string) => {
    atualizarExercicioNoTreino(treinoId, exercicioId, (exercicio) => {
      if (exercicio.series.length <= 1) {
        console.warn('Não é possível remover a única série');
        return exercicio;
      }

      const seriesAtualizadas = exercicio.series
        .filter(s => s.id !== serieId)
        .map((serie, index) => ({ 
          ...serie, 
          numero_serie: index + 1
        }));

      return {
        ...exercicio,
        series: seriesAtualizadas
      };
    });
  }, [atualizarExercicioNoTreino]);

  // Atualizar campo de uma série simples
  const atualizarSerie = useCallback((
    treinoId: string, 
    exercicioId: string, 
    serieId: string, 
    campo: keyof SerieConfig, 
    valor: number | string | boolean
  ) => {
    atualizarExercicioNoTreino(treinoId, exercicioId, (exercicio) => {
      const seriesAtualizadas = exercicio.series.map(serie =>
        serie.id === serieId ? { ...serie, [campo]: valor } : serie
      );

      return {
        ...exercicio,
        series: seriesAtualizadas
      };
    });
  }, [atualizarExercicioNoTreino]);

  // Atualizar série combinada (correção do bug)
  const atualizarSerieCombinada = useCallback((
    treinoId: string,
    exercicioId: string,
    serieId: string,
    exercicioIndex: 0 | 1, // 0 para primeiro exercício, 1 para segundo
    campo: 'repeticoes' | 'carga',
    valor: number
  ) => {
    atualizarExercicioNoTreino(treinoId, exercicioId, (exercicio) => {
      const seriesAtualizadas = exercicio.series.map(serie => {
        if (serie.id === serieId) {
          const campoAtualizar = exercicioIndex === 0 
            ? `${campo}_1` as keyof SerieConfig
            : `${campo}_2` as keyof SerieConfig;

          return {
            ...serie,
            [campoAtualizar]: valor
          };
        }
        return serie;
      });

      return {
        ...exercicio,
        series: seriesAtualizadas
      };
    });
  }, [atualizarExercicioNoTreino]);

  // Toggle dropset em uma série
  const toggleDropSet = useCallback((treinoId: string, exercicioId: string, serieId: string) => {
    atualizarExercicioNoTreino(treinoId, exercicioId, (exercicio) => {
      const seriesAtualizadas = exercicio.series.map(serie => {
        if (serie.id === serieId) {
          const novoDropSet = !serie.tem_dropset;
          
          return {
            ...serie,
            tem_dropset: novoDropSet,
            carga_dropset: novoDropSet ? Math.max(0, (serie.carga || 0) * 0.8) : undefined
          };
        }
        return serie;
      });

      return {
        ...exercicio,
        series: seriesAtualizadas
      };
    });
  }, [atualizarExercicioNoTreino]);

  // Atualizar dropset
  const atualizarDropSet = useCallback((
    treinoId: string, 
    exercicioId: string, 
    serieId: string, 
    campo: 'repeticoes' | 'carga_reduzida', 
    valor: number
  ) => {
    atualizarExercicioNoTreino(treinoId, exercicioId, (exercicio) => {
      const seriesAtualizadas = exercicio.series.map(serie => {
        if (serie.id === serieId) {
          return {
            ...serie,
            ...(campo === 'carga_reduzida' && { carga_dropset: valor })
          };
        }
        return serie;
      });

      return {
        ...exercicio,
        series: seriesAtualizadas
      };
    });
  }, [atualizarExercicioNoTreino]);

  // Atualizar intervalo após exercício
  const atualizarIntervaloExercicio = useCallback((
    treinoId: string, 
    exercicioId: string, 
    intervalo: number
  ) => {
    atualizarExercicioNoTreino(treinoId, exercicioId, (exercicio) => ({
      ...exercicio,
      intervalo_apos_exercicio: intervalo
    }));
  }, [atualizarExercicioNoTreino]);

  // Validar série
  const validarSerie = useCallback((serie: SerieConfig): string[] => {
    const erros: string[] = [];
    
    if (!serie.repeticoes || serie.repeticoes < 1) {
      erros.push('Repetições deve ser maior que 0');
    }
    
    if (serie.carga !== undefined && serie.carga < 0) {
      erros.push('Carga não pode ser negativa');
    }

    if (serie.tem_dropset && serie.carga_dropset !== undefined) {
      if (serie.carga_dropset < 0) {
        erros.push('Carga do dropset não pode ser negativa');
      }
      if (serie.carga_dropset >= (serie.carga || 0)) {
        erros.push('Carga do dropset deve ser menor que a carga principal');
      }
    }

    return erros;
  }, []);

  // Obter estatísticas das séries de um exercício
  const obterEstatisticasSeries = useCallback((treinoId: string, exercicioId: string) => {
    const exercicios = exerciciosAdicionados[treinoId] || [];
    const exercicio = exercicios.find(ex => ex.id === exercicioId);
    
    if (!exercicio) return null;

    const totalSeries = exercicio.series.length;
    const seriesComDropset = exercicio.series.filter(s => s.tem_dropset).length;
    const cargaMedia = exercicio.series.reduce((acc, s) => acc + (s.carga || 0), 0) / totalSeries;

    return {
      totalSeries,
      seriesComDropset,
      cargaMedia: isNaN(cargaMedia) ? 0 : cargaMedia,
      tipo: exercicio.tipo
    };
  }, [exerciciosAdicionados]);

  return {
    // Séries básicas
    adicionarSerie,
    removerSerie,
    atualizarSerie,
    
    // Séries combinadas
    atualizarSerieCombinada,
    
    // Drop sets
    toggleDropSet,
    atualizarDropSet,
    
    // Intervalos
    atualizarIntervaloExercicio,
    
    // Helpers
    validarSerie,
    obterEstatisticasSeries
  };
};

export default useSeriesManager;