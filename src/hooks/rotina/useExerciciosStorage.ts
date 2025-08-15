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

const STORAGE_KEY = 'rotina_exercicios';

export const useExerciciosStorage = (alunoId: string) => {
  const rotinaStorage = useRotinaStorage(alunoId);
  const [exerciciosAdicionados, setExerciciosAdicionados] = useState<ExerciciosPorTreino>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar exercícios do sessionStorage
  useEffect(() => {
    const carregarExercicios = () => {
      try {
        const dadosSalvos = sessionStorage.getItem(STORAGE_KEY);
        if (dadosSalvos) {
          const dados = JSON.parse(dadosSalvos) as ExerciciosPorTreino;
          setExerciciosAdicionados(dados);
        }
      } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
        sessionStorage.removeItem(STORAGE_KEY);
      } finally {
        setIsLoaded(true);
      }
    };

    carregarExercicios();
  }, []);

  // Auto-salvar quando exercícios mudarem
  useEffect(() => {
    if (isLoaded && Object.keys(exerciciosAdicionados).length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(exerciciosAdicionados));
      } catch (error) {
        console.error('Erro ao salvar exercícios:', error);
      }
    }
  }, [exerciciosAdicionados, isLoaded]);

  // Adicionar exercício a um treino
  const adicionarExercicio = useCallback((treinoId: string, exercicio: ExercicioRotinaLocal) => {
    setExerciciosAdicionados(prev => ({
      ...prev,
      [treinoId]: [...(prev[treinoId] || []), exercicio]
    }));
  }, []);

  // Remover exercício de um treino
  const removerExercicio = useCallback((treinoId: string, exercicioId: string) => {
    setExerciciosAdicionados(prev => ({
      ...prev,
      [treinoId]: (prev[treinoId] || []).filter(ex => ex.id !== exercicioId)
    }));
  }, []);

  // Atualizar exercício específico
  const atualizarExercicio = useCallback((
    treinoId: string, 
    exercicioId: string, 
    exercicioAtualizado: ExercicioRotinaLocal
  ) => {
    setExerciciosAdicionados(prev => ({
      ...prev,
      [treinoId]: (prev[treinoId] || []).map(ex => 
        ex.id === exercicioId ? exercicioAtualizado : ex
      )
    }));
  }, []);

  // Limpar todos os exercícios
  const limparExercicios = useCallback(() => {
    setExerciciosAdicionados({});
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  // Obter dados dos treinos (da etapa anterior)
  const treinos = rotinaStorage.storage.treinos || [];
  const config = rotinaStorage.storage.configuracao;

  // Dados computados
  const dadosCompletos = {
    nomeRotina: config?.nome || 'Rotina sem nome',
    treinos: treinos.map(treino => ({
      id: treino.nome, // Usando nome como ID temporário
      nome: treino.nome,
      grupos_musculares: treino.grupos_musculares,
      observacoes: treino.observacoes,
      tempo_estimado_minutos: treino.tempo_estimado_minutos,
      exercicios: exerciciosAdicionados[treino.nome] || []
    }))
  };

  const totalExercicios = Object.values(exerciciosAdicionados)
    .reduce((total, exercicios) => total + exercicios.length, 0);

  const treinosComExercicios = treinos.filter(treino => 
    (exerciciosAdicionados[treino.nome]?.length || 0) > 0
  );

  const treinosSemExercicios = treinos.filter(treino => 
    (exerciciosAdicionados[treino.nome]?.length || 0) === 0
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