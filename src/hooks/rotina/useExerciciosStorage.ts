// src/hooks/rotina/useExerciciosStorage.ts

import { useState, useEffect, useCallback } from 'react';
import { useRotinaStorage } from '../useRotinaStorage';
import { ExercicioRotinaLocal, SerieConfig } from '@/types/rotina.types';

export interface DropSetConfig {
  id: string;
  carga_reduzida: number;
  repeticoes: number;
}

export type ExerciciosPorTreino = {
  [treinoId: string]: ExercicioRotinaLocal[];
};

export const useExerciciosStorage = (alunoId: string) => {
  const rotinaStorage = useRotinaStorage(alunoId);
  const [exerciciosAdicionados, setExerciciosAdicionados] = useState<ExerciciosPorTreino>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // 🔥 SINCRONIZAR com storage principal (sem storage próprio)
  useEffect(() => {
    if (rotinaStorage.isLoaded) {
      // Carregar exercícios do storage principal e converter para ExercicioRotinaLocal[]
      const exerciciosDoStorage = rotinaStorage.storage.exercicios || {};
      
      // Converter de ExercicioTemp para ExercicioRotinaLocal
      const exerciciosConvertidos: ExerciciosPorTreino = {};
      Object.entries(exerciciosDoStorage).forEach(([treinoId, exercicios]) => {
        exerciciosConvertidos[treinoId] = exercicios.map(ex => ({
          id: ex.id || `exercicio-${Date.now()}`,
          exercicio_1_id: ex.exercicio_1_id,
          exercicio_2_id: ex.exercicio_2_id,
          tipo: (ex.tipo as 'simples' | 'combinada') || 'simples',
          ordem: ex.ordem,
          observacoes: ex.observacoes,
          intervalo_apos_exercicio: ex.intervalo_apos_exercicio,
          series: ex.series?.map(s => ({
            id: `serie-${s.numero_serie}-${Date.now()}`,
            numero_serie: s.numero_serie,
            repeticoes: s.repeticoes,
            carga: s.carga,
            tem_dropset: s.tem_dropset,
            carga_dropset: s.carga_dropset,
            intervalo_apos_serie: s.intervalo_apos_serie,
            observacoes: s.observacoes,
            repeticoes_1: s.repeticoes_1,
            carga_1: s.carga_1,
            repeticoes_2: s.repeticoes_2,
            carga_2: s.carga_2
          })) || []
        }));
      });
      
      console.log('🔄 Sincronizando exercícios do storage principal:', exerciciosConvertidos);
      setExerciciosAdicionados(exerciciosConvertidos);
      setIsLoaded(true);
    }
  }, [rotinaStorage.isLoaded, rotinaStorage.storage.exercicios]);

  // Adicionar exercício a um treino
  const adicionarExercicio = useCallback((treinoId: string, exercicio: ExercicioRotinaLocal) => {
    const novosExercicios = {
      ...exerciciosAdicionados,
      [treinoId]: [...(exerciciosAdicionados[treinoId] || []), exercicio]
    };
    
    console.log(`➕ Adicionando exercício ao treino ${treinoId}:`, exercicio);
    setExerciciosAdicionados(novosExercicios);
    
    // Converter para ExercicioTemp[] antes de salvar
    const exerciciosTemp = novosExercicios[treinoId].map(ex => ({
      id: ex.id,
      exercicio_1_id: ex.exercicio_1_id,
      exercicio_2_id: ex.exercicio_2_id,
      ordem: ex.ordem,
      observacoes: ex.observacoes,
      intervalo_apos_exercicio: ex.intervalo_apos_exercicio,
      tipo: ex.tipo,
      series: ex.series.map(s => ({
        numero_serie: s.numero_serie,
        repeticoes: s.repeticoes,
        carga: s.carga,
        tem_dropset: s.tem_dropset,
        carga_dropset: s.carga_dropset,
        intervalo_apos_serie: s.intervalo_apos_serie,
        observacoes: s.observacoes,
        repeticoes_1: s.repeticoes_1,
        carga_1: s.carga_1,
        repeticoes_2: s.repeticoes_2,
        carga_2: s.carga_2
      }))
    }));
    
    // Salvar no storage principal
    rotinaStorage.salvarExerciciosTreino(treinoId, exerciciosTemp);
  }, [exerciciosAdicionados, rotinaStorage]);

  // Remover exercício de um treino
  const removerExercicio = useCallback((treinoId: string, exercicioId: string) => {
    const exerciciosAtualizados = (exerciciosAdicionados[treinoId] || []).filter(ex => ex.id !== exercicioId);
    const novosExercicios = {
      ...exerciciosAdicionados,
      [treinoId]: exerciciosAtualizados
    };
    
    console.log(`🗑️ Removendo exercício ${exercicioId} do treino ${treinoId}`);
    setExerciciosAdicionados(novosExercicios);
    
    // Converter para ExercicioTemp[] antes de salvar
    const exerciciosTemp = exerciciosAtualizados.map(ex => ({
      id: ex.id,
      exercicio_1_id: ex.exercicio_1_id,
      exercicio_2_id: ex.exercicio_2_id,
      ordem: ex.ordem,
      observacoes: ex.observacoes,
      intervalo_apos_exercicio: ex.intervalo_apos_exercicio,
      tipo: ex.tipo,
      series: ex.series.map(s => ({
        numero_serie: s.numero_serie,
        repeticoes: s.repeticoes,
        carga: s.carga,
        tem_dropset: s.tem_dropset,
        carga_dropset: s.carga_dropset,
        intervalo_apos_serie: s.intervalo_apos_serie,
        observacoes: s.observacoes,
        repeticoes_1: s.repeticoes_1,
        carga_1: s.carga_1,
        repeticoes_2: s.repeticoes_2,
        carga_2: s.carga_2
      }))
    }));
    
    // Salvar no storage principal
    rotinaStorage.salvarExerciciosTreino(treinoId, exerciciosTemp);
  }, [exerciciosAdicionados, rotinaStorage]);

  // Atualizar exercício específico
  const atualizarExercicio = useCallback((
    treinoId: string, 
    exercicioId: string, 
    exercicioAtualizado: ExercicioRotinaLocal
  ) => {
    const exerciciosAtualizados = (exerciciosAdicionados[treinoId] || []).map(ex => 
      ex.id === exercicioId ? exercicioAtualizado : ex
    );
    const novosExercicios = {
      ...exerciciosAdicionados,
      [treinoId]: exerciciosAtualizados
    };
    
    console.log(`🔄 Atualizando exercício ${exercicioId} do treino ${treinoId}:`, exercicioAtualizado);
    setExerciciosAdicionados(novosExercicios);
    
    // Converter para ExercicioTemp[] antes de salvar
    const exerciciosTemp = exerciciosAtualizados.map(ex => ({
      id: ex.id,
      exercicio_1_id: ex.exercicio_1_id,
      exercicio_2_id: ex.exercicio_2_id,
      ordem: ex.ordem,
      observacoes: ex.observacoes,
      intervalo_apos_exercicio: ex.intervalo_apos_exercicio,
      tipo: ex.tipo,
      series: ex.series.map(s => ({
        numero_serie: s.numero_serie,
        repeticoes: s.repeticoes,
        carga: s.carga,
        tem_dropset: s.tem_dropset,
        carga_dropset: s.carga_dropset,
        intervalo_apos_serie: s.intervalo_apos_serie,
        observacoes: s.observacoes,
        repeticoes_1: s.repeticoes_1,
        carga_1: s.carga_1,
        repeticoes_2: s.repeticoes_2,
        carga_2: s.carga_2
      }))
    }));
    
    // Salvar no storage principal
    rotinaStorage.salvarExerciciosTreino(treinoId, exerciciosTemp);
  }, [exerciciosAdicionados, rotinaStorage]);

  // Limpar todos os exercícios
  const limparExercicios = useCallback(() => {
    console.log('🧹 Limpando todos os exercícios');
    setExerciciosAdicionados({});
    // O storage principal já tem sua própria limpeza
  }, []);

  // Obter dados dos treinos (da etapa anterior)
  const treinos = rotinaStorage.storage.treinos || [];
  const config = rotinaStorage.storage.configuracao;

  // Dados computados
  const dadosCompletos = {
    nomeRotina: config?.nome || 'Rotina sem nome',
    treinos: treinos.map(treino => ({
      id: treino.id,
      nome: treino.nome,
      grupos_musculares: treino.grupos_musculares,
      observacoes: treino.observacoes,
      tempo_estimado_minutos: treino.tempo_estimado_minutos,
      exercicios: exerciciosAdicionados[treino.id] || []
    }))
  };

  const totalExercicios = Object.values(exerciciosAdicionados)
    .reduce((total, exercicios) => total + exercicios.length, 0);

  const treinosComExercicios = treinos.filter(treino => 
    (exerciciosAdicionados[treino.id]?.length || 0) > 0
  );

  const treinosSemExercicios = treinos.filter(treino => 
    (exerciciosAdicionados[treino.id]?.length || 0) === 0
  );

  const isFormValido = treinos.length > 0 && treinosSemExercicios.length === 0;

  return {
    // Estado
    exerciciosAdicionados,
    setExerciciosAdicionados,
    isLoaded,
    
    // Dados da rotina
    treinos,
    config,
    dadosCompletos,
    
    // Estatísticas
    totalExercicios,
    treinosComExercicios,
    treinosSemExercicios,
    isFormValido,
    
    // Ações
    adicionarExercicio,
    removerExercicio,
    atualizarExercicio,
    limparExercicios
  };
};

export default useExerciciosStorage;