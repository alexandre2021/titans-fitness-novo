// src/hooks/useRotinaStorage.ts - CORREÇÃO USANDO IDs + Limpeza Inteligente

import { useState, useEffect, useCallback } from 'react';
import { RotinaStorage, ConfiguracaoRotina, TreinoTemp, ExercicioTemp } from '@/types/rotina.types';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'rotina_em_criacao';

export const useRotinaStorage = (alunoId: string) => {
  const [storage, setStorage] = useState<RotinaStorage>({
    alunoId,
    etapaAtual: 'configuracao'
  });
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 🚫 CONTROLE DE DUPLA LIMPEZA
  const [ultimaLimpeza, setUltimaLimpeza] = useState<number>(0);
  const INTERVALO_LIMPEZA = 2000; // 2 segundos

  const podeExecutarLimpeza = useCallback(() => {
    return Date.now() - ultimaLimpeza > INTERVALO_LIMPEZA;
  }, [ultimaLimpeza]);

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
    console.log('🔥 SALVANDO no sessionStorage:', novosados);
    const verificacao = sessionStorage.getItem(STORAGE_KEY);
    console.log('🔥 VERIFICAÇÃO imediata:', JSON.parse(verificacao || '{}'));
  }, []);

  // Função para salvar configuração com ajuste automático de treinos
  const salvarConfiguracao = useCallback((configuracao: ConfiguracaoRotina) => {
    console.log('🔧 Salvando configuração:', configuracao);
    
    const frequenciaAntiga = storage.configuracao?.treinos_por_semana;
    const novaFrequencia = configuracao.treinos_por_semana;
    const treinosAtuais = storage.treinos || [];
    const exerciciosAtuais = storage.exercicios || {};
    
    let treinosAjustados = [...treinosAtuais];
    let exerciciosAjustados = { ...exerciciosAtuais };
    let isModified = false;

    console.log(`🔍 Frequência: ${frequenciaAntiga || 'nova'} → ${novaFrequencia}`);

    // Se já existem treinos e a frequência mudou
    if (frequenciaAntiga && frequenciaAntiga !== novaFrequencia && treinosAtuais.length > 0) {
      
      if (novaFrequencia < frequenciaAntiga) {
        // 📉 DIMINUIU: Remover treinos excedentes + seus exercícios
        console.log(`📉 Frequência diminuiu de ${frequenciaAntiga}x para ${novaFrequencia}x`);
        
        const treinosParaManter = treinosAtuais.slice(0, novaFrequencia);
        const treinosParaRemover = treinosAtuais.slice(novaFrequencia);
        
        console.log(`🔹 Mantendo treinos:`, treinosParaManter.map(t => t.nome));
        console.log(`🔸 Removendo treinos:`, treinosParaRemover.map(t => t.nome));
        
        treinosAjustados = treinosParaManter;
        
        // Remover exercícios dos treinos excluídos
        treinosParaRemover.forEach(treino => {
          if (treino.id && exerciciosAjustados[treino.id]) {
            console.log(`🗑️ Removendo exercícios do treino ${treino.nome} (ID: ${treino.id})`);
            // Criar nova referência para exerciciosAjustados
            const { [treino.id]: removed, ...rest } = exerciciosAjustados;
            exerciciosAjustados = rest;
            isModified = true;
            
            // Marcar limpeza executada (remoção por frequência não precisa throttling)
            setUltimaLimpeza(Date.now());
          }
        });
        
      } else if (novaFrequencia > frequenciaAntiga) {
        // 📈 AUMENTOU: Criar novos treinos vazios
        console.log(`📈 Frequência aumentou de ${frequenciaAntiga}x para ${novaFrequencia}x`);
        
        const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const novosTreinos = [];
        
        // Adicionar treinos vazios para completar a nova frequência
        for (let i = frequenciaAntiga; i < novaFrequencia; i++) {
          const novoTreino = {
            id: `treino_${nomesTreinos[i].toLowerCase()}_${Date.now()}_${i}`,
            nome: `Treino ${nomesTreinos[i]}`,
            grupos_musculares: [], // VAZIO - PT deve configurar
            observacoes: '',
            ordem: i + 1,
            tempo_estimado_minutos: 60
          };
          
          novosTreinos.push(novoTreino);
          console.log(`➕ Criando treino vazio: ${novoTreino.nome} (ID: ${novoTreino.id})`);
        }
        
        treinosAjustados = [...treinosAtuais, ...novosTreinos];
        isModified = true;
      }
    }

    const novoStorage = {
      ...storage,
      configuracao,
      etapaAtual: 'treinos' as const,
      ...(isModified && {
        treinos: treinosAjustados,
        exercicios: exerciciosAjustados
      })
    };

    if (isModified) {
      console.log('🔄 Treinos ajustados automaticamente:', treinosAjustados.map(t => ({ nome: t.nome, grupos: t.grupos_musculares.length })));
      console.log('🔄 Exercícios após ajuste:', Object.keys(exerciciosAjustados));
    }
    
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // 🧠 FUNÇÃO PARA VERIFICAR COMPATIBILIDADE DE EXERCÍCIO
  const verificarCompatibilidadeExercicio = useCallback(async (exercicioId: string, gruposPermitidos: string[]): Promise<boolean> => {
    try {
      const { data: exercicio, error } = await supabase
        .from('exercicios')
        .select('grupo_muscular')
        .eq('id', exercicioId)
        .single();

      if (error || !exercicio) {
        console.warn(`⚠️ Exercício ${exercicioId} não encontrado, assumindo incompatível`);
        return false;
      }

      const grupoDoExercicio = exercicio.grupo_muscular;
      const compativel = gruposPermitidos.includes(grupoDoExercicio);
      
      console.log(`🔍 Exercício ${exercicioId}: grupo=${grupoDoExercicio}, permitidos=[${gruposPermitidos.join(', ')}], compatível=${compativel}`);
      
      return compativel;
    } catch (error) {
      console.error('Erro ao verificar compatibilidade:', error);
      return false; // Em caso de erro, assumir incompatível por segurança
    }
  }, []);

  // 🎯 FUNÇÃO CORRIGIDA - Limpeza Inteligente de Exercícios
  const salvarTreinos = useCallback(async (novosTreinos: TreinoTemp[]) => {
    console.log('🔍 DEBUGANDO salvarTreinos:');
    console.log('📋 Treinos recebidos:', novosTreinos);

    // Gerar IDs únicos para treinos que não têm
    const treinosComId = novosTreinos.map((treino, index) => {
      if (!treino.id) {
        // Gerar ID baseado em nome + timestamp para garantir unicidade
        const id = `treino_${treino.nome.toLowerCase().replace(/\s/g, '_')}_${Date.now()}_${index}`;
        console.log(`🆔 Gerando ID para ${treino.nome}: ${id}`);
        return { ...treino, id };
      }
      return treino;
    });

    const treinosAntigos = storage.treinos || [];
    const exerciciosAtuais = storage.exercicios || {};
    let novosExercicios = { ...exerciciosAtuais };
    let isModified = false;

    console.log('📋 Treinos antigos:', treinosAntigos.map(t => ({ id: t.id, nome: t.nome, grupos: t.grupos_musculares })));
    console.log('📋 Treinos novos:', treinosComId.map(t => ({ id: t.id, nome: t.nome, grupos: t.grupos_musculares })));
    console.log('🎯 Exercícios atuais (chaves):', Object.keys(exerciciosAtuais));

    // Helper para comparar arrays de strings ignorando a ordem
    const arraysSaoDiferentes = (a: string[], b: string[]) => {
      if (a.length !== b.length) return true;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return JSON.stringify(sortedA) !== JSON.stringify(sortedB);
    };

    // Verificar treinos antigos
    for (const treinoAntigo of treinosAntigos) {
      if (!treinoAntigo.id) continue; // Pula treinos sem ID

      const treinoNovoCorrespondente = treinosComId.find(t => t.id === treinoAntigo.id);

      // Caso 1: O treino foi excluído
      if (!treinoNovoCorrespondente) {
        if (novosExercicios[treinoAntigo.id]) {
          delete novosExercicios[treinoAntigo.id];
          isModified = true;
          console.log(`🗑️ Treino ${treinoAntigo.nome} (ID: ${treinoAntigo.id}) excluído. Removendo exercícios associados.`);
        }
        continue;
      }

      // Caso 2: Os grupos musculares do treino foram alterados
      if (arraysSaoDiferentes(treinoAntigo.grupos_musculares, treinoNovoCorrespondente.grupos_musculares)) {
        const exerciciosDoTreino = novosExercicios[treinoAntigo.id] || [];
        
        if (exerciciosDoTreino.length > 0) {
          // 🚫 VERIFICAR se pode executar limpeza
          if (!podeExecutarLimpeza()) {
            console.log(`🚫 Limpeza bloqueada para treino ${treinoAntigo.nome} - muito recente (${Date.now() - ultimaLimpeza}ms atrás)`);
            continue; // Pula a limpeza deste treino
          }
          
          setUltimaLimpeza(Date.now()); // Marcar que limpeza foi executada
          
          console.log(`🔄 Grupos musculares do treino ${treinoAntigo.nome} (ID: ${treinoAntigo.id}) alterados:`);
          console.log(`   Antes: [${treinoAntigo.grupos_musculares.join(', ')}]`);
          console.log(`   Depois: [${treinoNovoCorrespondente.grupos_musculares.join(', ')}]`);
          
          // 🧠 LIMPEZA INTELIGENTE: Verificar compatibilidade de cada exercício
          const exerciciosCompativeis: ExercicioTemp[] = [];
          
          for (const exercicio of exerciciosDoTreino) {
            // Verificar exercício principal
            const exercicio1Compativel = await verificarCompatibilidadeExercicio(
              exercicio.exercicio_1_id, 
              treinoNovoCorrespondente.grupos_musculares
            );
            
            let manterExercicio = false;
            
            if (exercicio.exercicio_2_id) {
              // 🎯 SÉRIE COMBINADA: AMBOS devem ser compatíveis
              const exercicio2Compativel = await verificarCompatibilidadeExercicio(
                exercicio.exercicio_2_id, 
                treinoNovoCorrespondente.grupos_musculares
              );
              
              manterExercicio = exercicio1Compativel && exercicio2Compativel;
              console.log(`   🔍 Série combinada: Ex1=${exercicio1Compativel}, Ex2=${exercicio2Compativel}, Resultado=${manterExercicio}`);
            } else {
              // 🎯 SÉRIE SIMPLES: apenas o principal precisa ser compatível
              manterExercicio = exercicio1Compativel;
              console.log(`   🔍 Série simples: Ex1=${exercicio1Compativel}, Resultado=${manterExercicio}`);
            }
            
            if (manterExercicio) {
              exerciciosCompativeis.push(exercicio);
              console.log(`   ✅ Mantendo exercício ${exercicio.exercicio_1_id}${exercicio.exercicio_2_id ? ' + ' + exercicio.exercicio_2_id : ''}`);
            } else {
              console.log(`   ❌ Removendo exercício ${exercicio.exercicio_1_id}${exercicio.exercicio_2_id ? ' + ' + exercicio.exercicio_2_id : ''} (incompatível)`);
            }
          }
          
          // Atualizar exercícios do treino
          if (exerciciosCompativeis.length !== exerciciosDoTreino.length) {
            novosExercicios = {
              ...novosExercicios,
              [treinoAntigo.id]: exerciciosCompativeis
            };
            isModified = true;
            console.log(`   📊 Resultado: ${exerciciosDoTreino.length} → ${exerciciosCompativeis.length} exercícios`);
          } else {
            console.log(`   📊 Todos os exercícios mantidos (${exerciciosCompativeis.length})`);
          }
        }
      }
    }

    const novoStorage: RotinaStorage = {
      ...storage,
      treinos: treinosComId, // Salvar treinos com IDs
      etapaAtual: 'exercicios' as const,
    };

    // Apenas atualiza o objeto de exercícios se algo foi modificado
    if (isModified) {
      novoStorage.exercicios = novosExercicios;
      console.log('💾 Exercícios atualizados:', Object.keys(novosExercicios));
    }

    salvarStorage(novoStorage);
  }, [storage, salvarStorage, verificarCompatibilidadeExercicio, podeExecutarLimpeza, ultimaLimpeza]);

  // Função para salvar exercícios de um treino (usando ID do treino)
  const salvarExerciciosTreino = useCallback((treinoId: string, exercicios: ExercicioTemp[]) => {
    console.log(`💾 Salvando exercícios para treino ID: ${treinoId}`, exercicios);
    const exerciciosAtuais = storage.exercicios || {};
    const novosExercicios = {
      ...exerciciosAtuais,
      [treinoId]: exercicios // Usar ID do treino como chave
    };
    const novoStorage = {
      ...storage,
      exercicios: novosExercicios
    };
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // 🎯 FUNÇÃO CORRIGIDA - Converter exercícios por NOME para ID
  const salvarTodosExercicios = useCallback((exerciciosPorTreino: Record<string, ExercicioTemp[]>) => {
    console.log('💾 Salvando TODOS exercícios (recebido por nome):', exerciciosPorTreino);
    
    // Converter chaves de NOME para ID
    const exerciciosPorId: Record<string, ExercicioTemp[]> = {};
    const treinos = storage.treinos || [];
    
    Object.entries(exerciciosPorTreino).forEach(([nomeOuId, exercicios]) => {
      // Tentar encontrar treino por nome primeiro
      let treino = treinos.find(t => t.nome === nomeOuId);
      
      // Se não encontrou por nome, tentar por ID
      if (!treino) {
        treino = treinos.find(t => t.id === nomeOuId);
      }
      
      if (treino && treino.id) {
        exerciciosPorId[treino.id] = exercicios;
        console.log(`🔄 Convertendo: "${nomeOuId}" → ID: "${treino.id}"`);
      } else {
        console.warn(`⚠️ Treino não encontrado: ${nomeOuId}`);
      }
    });

    console.log('💾 Exercícios convertidos para IDs:', exerciciosPorId);
    
    const novoStorage = {
      ...storage,
      exercicios: exerciciosPorId
    };
    console.log('📦 Storage final:', novoStorage);
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // Função para avançar para revisão
  const avancarParaRevisao = useCallback(() => {
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

  // Funções de validação (CORRIGIDAS para usar IDs)
  const temConfiguracao = useCallback(() => {
    return !!storage.configuracao;
  }, [storage.configuracao]);

  const temTreinos = useCallback(() => {
    return !!(storage.treinos && storage.treinos.length > 0);
  }, [storage.treinos]);

  const temExercicios = useCallback(() => {
    if (!storage.treinos || !storage.exercicios) return false;
    for (const treino of storage.treinos) {
      if (!treino.id) continue; // Pular treinos sem ID
      const exerciciosTreino = storage.exercicios[treino.id] || []; // Usar ID
      if (exerciciosTreino.length === 0) return false;
    }
    return true;
  }, [storage.treinos, storage.exercicios]);

  const podeAvancar = useCallback(() => {
    return temConfiguracao() && temTreinos() && temExercicios();
  }, [temConfiguracao, temTreinos, temExercicios]);

  // Função para obter resumo dos dados (CORRIGIDA para usar IDs)
  const obterResumo = useCallback(() => {
    const totalTreinos = storage.treinos?.length || 0;
    let totalExercicios = 0;
    let totalSeries = 0;

    if (storage.exercicios && storage.treinos) {
      for (const treino of storage.treinos) {
        if (!treino.id) continue; // Pular treinos sem ID
        const exerciciosTreino = storage.exercicios[treino.id] || []; // Usar ID
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
    salvarTodosExercicios,
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