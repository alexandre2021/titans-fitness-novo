// src/hooks/useExercicioLookup.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExercicioInfo } from '@/types/rotina.types';

// Cache global para persistir entre remontagens
let exerciciosCache: ExercicioInfo[] = [];
let cacheCarregado = false;
let promiseCarregamento: Promise<void> | null = null;

const carregarExerciciosGlobal = async (): Promise<void> => {
  if (cacheCarregado) return;
  
  if (promiseCarregamento) {
    return promiseCarregamento;
  }

  promiseCarregamento = (async () => {
    try {
      console.log('🔄 Carregando exercícios do Supabase...');
      const { data, error } = await supabase
        .from('exercicios')
        .select('id, nome, equipamento, grupo_muscular, dificuldade, tipo, descricao')
        .eq('is_ativo', true)
        .order('nome');

      if (error) throw error;

      exerciciosCache = (data || []).map(ex => ({
        id: ex.id,
        nome: ex.nome,
        equipamento: ex.equipamento || 'Desconhecido',
        grupo_muscular: ex.grupo_muscular || 'Desconhecido',
        dificuldade: ex.dificuldade || 'Desconhecida',
        tipo: ex.tipo || 'padrao',
        descricao: ex.descricao || ''
      }));

      cacheCarregado = true;
      console.log('✅ Cache de exercícios carregado:', exerciciosCache.length);
    } catch (error) {
      console.error('Erro ao carregar exercícios:', error);
      exerciciosCache = [];
    } finally {
      promiseCarregamento = null;
    }
  })();

  return promiseCarregamento;
};

export function useExercicioLookup() {
  const [loading, setLoading] = useState(!cacheCarregado);

  useEffect(() => {
    if (!cacheCarregado) {
      carregarExerciciosGlobal().finally(() => {
        setLoading(false);
      });
    }
  }, []);

  const getExercicioInfo = (id: string): ExercicioInfo => {
    if (!cacheCarregado) {
      return {
        id,
        nome: 'Carregando...',
        equipamento: 'Carregando...',
        grupo_muscular: 'Carregando...',
        dificuldade: 'Carregando...',
      };
    }

    const exercicio = exerciciosCache.find(ex => ex.id === id);
    if (exercicio) {
      return exercicio;
    }

    return {
      id,
      nome: 'Exercício não encontrado',
      equipamento: 'Desconhecido',
      grupo_muscular: 'Desconhecido',
      dificuldade: 'Desconhecida',
    };
  };

  return { getExercicioInfo };
}