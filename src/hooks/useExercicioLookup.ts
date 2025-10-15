import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExercicioInfo } from '@/types/rotina.types';

// Cache global para persistir entre remontagens
const exerciciosCache = new Map<string, ExercicioInfo>();
let cachePromise: Promise<void> | null = null;

const carregarExercicios = () => {
  if (cachePromise) {
    return cachePromise;
  }

  cachePromise = (async () => {
    try {
      console.log('🔄 Carregando exercícios do Supabase...');
      const { data, error } = await supabase
        .from('exercicios')
        .select('id, nome, equipamento, grupo_muscular, dificuldade, tipo, descricao')
        .eq('is_ativo', true)
        .order('nome');

      if (error) throw error;

      exerciciosCache.clear();
      (data || []).forEach(e => {
        exerciciosCache.set(e.id, {
          id: e.id,
          nome: e.nome || 'Exercício sem nome',
          equipamento: e.equipamento || 'Desconhecido',
          grupo_muscular: e.grupo_muscular || 'Desconhecido',
          dificuldade: e.dificuldade || 'Desconhecida',
          tipo: e.tipo || 'padrao',
          descricao: e.descricao || '',
        });
      });
      console.log(`✅ Cache de exercícios carregado: ${exerciciosCache.size} exercícios`);
    } catch (error) {
      console.error('Erro ao carregar exercícios:', error);
      exerciciosCache.clear();
    }
  })();

  return cachePromise;
};

export function useExercicioLookup() {
  const [loading, setLoading] = useState(exerciciosCache.size === 0);

  useEffect(() => {
    if (exerciciosCache.size === 0) {
      carregarExercicios().finally(() => {
        setLoading(false);
      });
    }
  }, []);

  const getExercicioInfo = useCallback((id: string | null | undefined): ExercicioInfo => {
    if (!id) return { id: '', nome: 'Exercício inválido', equipamento: '', grupo_muscular: '', dificuldade: '', tipo: 'padrao', descricao: '' };
    return exerciciosCache.get(id) || { id, nome: 'Exercício não encontrado', equipamento: 'Desconhecido', grupo_muscular: 'Desconhecido', dificuldade: 'Desconhecida', tipo: 'padrao', descricao: '' };
  }, []);

  const allExercicios = useMemo(() => Array.from(exerciciosCache.values()), []);

  return { getExercicioInfo, allExercicios, loading };
}

// Inicia o carregamento assim que o módulo é importado
carregarExercicios();