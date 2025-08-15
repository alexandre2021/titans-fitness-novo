// src/hooks/useRotinaStorage.ts

import { useState, useEffect, useCallback } from 'react';
import { RotinaStorage, ConfiguracaoRotina, TreinoTemp, ExercicioTemp } from '@/types/rotina.types';

const STORAGE_KEY = 'rotina_em_criacao';


export const useRotinaStorage = (alunoId: string) => {
  const [storage, setStorage] = useState<RotinaStorage>({
    alunoId,
    etapaAtual: 'configuracao'
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar dados do sessionStorage na inicialização
  useEffect(() => {
    const dadosSalvos = sessionStorage.getItem(STORAGE_KEY);
    if (dadosSalvos) {
      try {
        const dados = JSON.parse(dadosSalvos) as RotinaStorage;
        // Verificar se é do mesmo aluno
        if (dados.alunoId === alunoId) {
          setStorage(dados);
        } else {
          // Limpar dados de outro aluno
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do storage:', error);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoaded(true);
  }, [alunoId]);

  // Salvar no sessionStorage sempre que os dados mudarem
  const salvarStorage = useCallback((novosados: RotinaStorage) => {
    setStorage(novosados);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(novosados));
    // ✅ LOGS DE DEPURAÇÃO
    console.log('🔥 SALVANDO no sessionStorage:', novosados);
    const verificacao = sessionStorage.getItem(STORAGE_KEY);
    console.log('🔥 VERIFICAÇÃO imediata:', JSON.parse(verificacao || '{}'));
  }, []);

  // Função para salvar configuração
  const salvarConfiguracao = useCallback((configuracao: ConfiguracaoRotina) => {
    const novoStorage = {
      ...storage,
      configuracao,
      etapaAtual: 'treinos' as const
    };
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // Função para salvar treinos
  const salvarTreinos = useCallback((treinos: TreinoTemp[]) => {
    const novoStorage = {
      ...storage,
      treinos,
      etapaAtual: 'exercicios' as const
    };
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);



  // Função para salvar exercícios de um treino
  const salvarExerciciosTreino = useCallback((treinoId: string, exercicios: ExercicioTemp[]) => {
    const exerciciosAtuais = storage.exercicios || {};
    const novosExercicios = {
      ...exerciciosAtuais,
      [treinoId]: exercicios
    };
    const novoStorage = {
      ...storage,
      exercicios: novosExercicios
    };
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // Função para salvar TODOS os exercícios de uma vez
  const salvarTodosExercicios = useCallback((exerciciosPorTreino: Record<string, ExercicioTemp[]>) => {
    console.log('💾 Salvando TODOS exercícios:', exerciciosPorTreino);
    const novoStorage = {
      ...storage,
      exercicios: exerciciosPorTreino
    };
    console.log('📦 Storage DEPOIS:', novoStorage);
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // Função para avançar para revisão
  const avancarParaRevisao = useCallback(() => {
    // Primeiro, carregar storage atual do sessionStorage
    const storageAtual = sessionStorage.getItem(STORAGE_KEY);
    const dadosCompletos = storageAtual ? JSON.parse(storageAtual) : storage;

    const novoStorage = {
      ...dadosCompletos,
      etapaAtual: 'revisao' as const
    };

    console.log('🎯 Avançando para revisão com dados:', novoStorage);
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // Função para limpar storage
  const limparStorage = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setStorage({
      alunoId,
      etapaAtual: 'configuracao'
    });
  }, [alunoId]);

  // Função para voltar para etapa anterior
  const voltarEtapa = useCallback(() => {
    let etapaAnterior: RotinaStorage['etapaAtual'] = 'configuracao';
    
    switch (storage.etapaAtual) {
      case 'treinos':
        etapaAnterior = 'configuracao';
        break;
      case 'exercicios':
        etapaAnterior = 'treinos';
        break;
      case 'revisao':
        etapaAnterior = 'exercicios';
        break;
    }

    const novoStorage = {
      ...storage,
      etapaAtual: etapaAnterior
    };
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // Funções de validação
  const temConfiguracao = useCallback(() => {
    return !!storage.configuracao;
  }, [storage.configuracao]);

  const temTreinos = useCallback(() => {
    return !!(storage.treinos && storage.treinos.length > 0);
  }, [storage.treinos]);

  const temExercicios = useCallback(() => {
    if (!storage.treinos || !storage.exercicios) return false;
    for (const treino of storage.treinos) {
      const exerciciosTreino = storage.exercicios[treino.nome] || [];
      if (exerciciosTreino.length === 0) return false;
    }
    return true;
  }, [storage.treinos, storage.exercicios]);

  // Função para saber se pode avançar de etapa
  const podeAvancar = useCallback(() => {
    return temConfiguracao() && temTreinos() && temExercicios();
  }, [temConfiguracao, temTreinos, temExercicios]);

  // Função para obter resumo dos dados
  const obterResumo = useCallback(() => {
    const totalTreinos = storage.treinos?.length || 0;
    let totalExercicios = 0;
    let totalSeries = 0;

    if (storage.exercicios && storage.treinos) {
      for (const treino of storage.treinos) {
        const exerciciosTreino = storage.exercicios[treino.nome] || [];
        totalExercicios += exerciciosTreino.length;
        
        for (const exercicio of exerciciosTreino) {
          totalSeries += exercicio.series?.length || 0;
        }
      }
    }

    return {
      totalTreinos,
      totalExercicios,
      totalSeries,
      configuracao: storage.configuracao,
      etapaAtual: storage.etapaAtual
    };
  }, [storage]);

  return {
    storage,
    isLoaded,
    salvarConfiguracao,
    salvarTreinos,
    salvarExerciciosTreino,
    salvarTodosExercicios, // ← NOVA FUNÇÃO
    avancarParaRevisao,
    voltarEtapa,
    limparStorage,
    temConfiguracao,
    temTreinos,
    temExercicios,
    podeAvancar,
    obterResumo
  };
};

export default useRotinaStorage;