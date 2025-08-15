// src/utils/exercicioLookup.ts
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExercicioInfo {
  nome: string;
  equipamento: string;
}

interface ExercicioLookup {
  [id: string]: ExercicioInfo;
}

/**
 * Hook para fazer lookup de exercícios por ID
 * ✅ Evita loops infinitos com useMemo
 * ✅ Tipagem correta
 * ✅ Cache simples para performance
 */
export const useExercicioLookup = (exercicioIds: (string | undefined)[] = []) => {
  const [lookup, setLookup] = useState<ExercicioLookup>({});
  const [loading, setLoading] = useState(false);

  // ✅ Memoizar IDs válidos para evitar loop infinito
  const idsValidos = useMemo(() => {
    return exercicioIds
      .filter((id): id is string => Boolean(id?.trim()))
      .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicatas
  }, [exercicioIds]);

  useEffect(() => {
    // Se não há IDs válidos, limpar lookup
    if (idsValidos.length === 0) {
      setLookup({});
      return;
    }

    // Buscar exercícios
    const buscarExercicios = async () => {
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('exercicios')
          .select('id, nome, equipamento')
          .in('id', idsValidos);

        if (error) {
          console.error('❌ Erro no lookup de exercícios:', error);
          return;
        }

        if (data) {
          const novoLookup: ExercicioLookup = {};
          data.forEach(exercicio => {
            novoLookup[exercicio.id] = {
              nome: exercicio.nome || 'Exercício sem nome',
              equipamento: exercicio.equipamento || 'Sem equipamento'
            };
          });
          setLookup(novoLookup);
        }
      } catch (error) {
        console.error('❌ Erro no lookup de exercícios:', error);
        setLookup({});
      } finally {
        setLoading(false);
      }
    };

    buscarExercicios();
  }, [idsValidos]); // ✅ Dependência correta com memoização

  /**
   * Função para buscar info de um exercício específico
   */
  const getExercicioInfo = (id: string | undefined): ExercicioInfo | null => {
    if (!id) return null;
    return lookup[id] || null;
  };

  /**
   * Função para buscar nome do exercício (fallback)
   */
  const getNomeExercicio = (id: string | undefined): string => {
    const info = getExercicioInfo(id);
    return info?.nome || 'Exercício';
  };

  /**
   * Função para buscar equipamento (fallback)
   */
  const getEquipamentoExercicio = (id: string | undefined): string => {
    const info = getExercicioInfo(id);
    return info?.equipamento || '';
  };

  return {
    lookup,
    loading,
    getExercicioInfo,
    getNomeExercicio,
    getEquipamentoExercicio
  };
};