// src/hooks/useRotinaStorage.ts - CORREÇÃO RACE CONDITION + Log Detalhado

import { useState, useEffect, useCallback } from 'react';
import { RotinaStorage as OriginalRotinaStorage, ConfiguracaoRotina, TreinoTemp, ExercicioTemp } from '@/types/rotina.types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type RotinaStorage = OriginalRotinaStorage & { draftId?: string };

const STORAGE_KEY = 'rotina_em_criacao';

export const useRotinaStorage = (alunoId: string) => {
  const { user } = useAuth();
  const [storage, setStorage] = useState<RotinaStorage>({
    alunoId,
    etapaAtual: 'configuracao'
  });
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Controle de dupla limpeza
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
        if (dados.alunoId === alunoId) {
          console.log('📂 Carregando dados salvos:', dados);
          setStorage(dados);
        } else {
          console.log('🧹 Limpando dados de outro aluno');
          sessionStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados do storage:', error);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoaded(true);
  }, [alunoId]);

  // Salvar no sessionStorage sempre que os dados mudarem
  const salvarStorage = useCallback((novosDados: RotinaStorage) => {
    console.log('💾 Salvando no sessionStorage:', novosDados);
    setStorage(novosDados);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(novosDados));
    
    // Verificação imediata
    const verificacao = sessionStorage.getItem(STORAGE_KEY);
    console.log('🔍 Verificação imediata - dados salvos:', JSON.parse(verificacao || '{}'));
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
 
    // ✅ CORREÇÃO: Se não há treinos, criar a estrutura inicial.
    // Isso garante que os treinos existam no storage ANTES de navegar para a próxima etapa.
    if (treinosAtuais.length === 0) {
      console.log('✨ Criando estrutura de treinos inicial...');
      const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      const treinosIniciais: TreinoTemp[] = [];
      for (let i = 0; i < novaFrequencia; i++) {
        treinosIniciais.push({
          id: `treino_${nomesTreinos[i].toLowerCase()}_${Date.now()}_${i}`,
          nome: `Treino ${nomesTreinos[i]}`,
          grupos_musculares: [],
          observacoes: '',
          ordem: i + 1,
          tempo_estimado_minutos: 60
        });
      }
      treinosAjustados = treinosIniciais;
      isModified = true;
    } else if (frequenciaAntiga && frequenciaAntiga !== novaFrequencia) {
      // Se já existem treinos e a frequência mudou
      
      if (novaFrequencia < frequenciaAntiga) {
        // Diminuiu: Remover treinos excedentes + seus exercícios
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
            const { [treino.id]: removed, ...rest } = exerciciosAjustados;
            exerciciosAjustados = rest;
            isModified = true;
            setUltimaLimpeza(Date.now());
          }
        });
        
      } else if (novaFrequencia > frequenciaAntiga) {
        // Aumentou: Criar novos treinos vazios
        console.log(`📈 Frequência aumentou de ${frequenciaAntiga}x para ${novaFrequencia}x`);
        
        const nomesTreinos = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const novosTreinos = [];
        
        for (let i = frequenciaAntiga; i < novaFrequencia; i++) {
          const novoTreino = {
            id: `treino_${nomesTreinos[i].toLowerCase()}_${Date.now()}_${i}`,
            nome: `Treino ${nomesTreinos[i]}`,
            grupos_musculares: [],
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

  // Verificar compatibilidade de exercício
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
      return false;
    }
  }, []);

  // Limpeza Inteligente de Exercícios
  const salvarTreinos = useCallback(async (novosTreinos: TreinoTemp[]) => {
    console.log('🔍 DEBUGANDO salvarTreinos:');
    console.log('📋 Treinos recebidos:', novosTreinos);

    // Gerar IDs únicos para treinos que não têm
    const treinosComId = novosTreinos.map((treino, index) => {
      if (!treino.id) {
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

    // Helper para comparar arrays
    const arraysSaoDiferentes = (a: string[], b: string[]) => {
      if (a.length !== b.length) return true;
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return JSON.stringify(sortedA) !== JSON.stringify(sortedB);
    };

    // Verificar treinos antigos
    for (const treinoAntigo of treinosAntigos) {
      if (!treinoAntigo.id) continue;

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
          // Verificar se pode executar limpeza
          if (!podeExecutarLimpeza()) {
            console.log(`🚫 Limpeza bloqueada para treino ${treinoAntigo.nome} - muito recente (${Date.now() - ultimaLimpeza}ms atrás)`);
            continue;
          }
          
          setUltimaLimpeza(Date.now());
          
          console.log(`🔄 Grupos musculares do treino ${treinoAntigo.nome} (ID: ${treinoAntigo.id}) alterados:`);
          console.log(`   Antes: [${treinoAntigo.grupos_musculares.join(', ')}]`);
          console.log(`   Depois: [${treinoNovoCorrespondente.grupos_musculares.join(', ')}]`);
          
          // Limpeza inteligente: Verificar compatibilidade de cada exercício
          const exerciciosCompativeis: ExercicioTemp[] = [];
          
          for (const exercicio of exerciciosDoTreino) {
            // Verificar exercício principal
            const exercicio1Compativel = await verificarCompatibilidadeExercicio(
              exercicio.exercicio_1_id, 
              treinoNovoCorrespondente.grupos_musculares
            );
            
            let manterExercicio = false;
            
            if (exercicio.exercicio_2_id) {
              // Série combinada: AMBOS devem ser compatíveis
              const exercicio2Compativel = await verificarCompatibilidadeExercicio(
                exercicio.exercicio_2_id, 
                treinoNovoCorrespondente.grupos_musculares
              );
              
              manterExercicio = exercicio1Compativel && exercicio2Compativel;
              console.log(`   🔍 Série combinada: Ex1=${exercicio1Compativel}, Ex2=${exercicio2Compativel}, Resultado=${manterExercicio}`);
            } else {
              // Série simples: apenas o principal precisa ser compatível
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
      treinos: treinosComId,
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
      [treinoId]: exercicios
    };
    const novoStorage = {
      ...storage,
      exercicios: novosExercicios
    };
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // Converter exercícios por NOME para ID
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

  // Salvar apenas as observações finais da rotina (para o botão Voltar da Revisão)
  const salvarObservacoesRotina = useCallback(async (observacoes: string): Promise<void> => {
    if (!storage.configuracao) return;

    const novoStorage = {
      ...storage,
      configuracao: {
        ...storage.configuracao,
        observacoes_rotina: observacoes
      }
    };
    salvarStorage(novoStorage);
  }, [storage, salvarStorage]);

  // Função para limpar storage
  const limparStorage = useCallback(() => {
    console.log('🧹 Limpando storage completo');
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

  // Funções de validação (usando IDs)
  const temConfiguracao = useCallback(() => {
    return !!storage.configuracao;
  }, [storage.configuracao]);

  const temTreinos = useCallback(() => {
    return !!(storage.treinos && storage.treinos.length > 0);
  }, [storage.treinos]);

  const temExercicios = useCallback(() => {
    if (!storage.treinos || !storage.exercicios) return false;
    for (const treino of storage.treinos) {
      if (!treino.id) continue;
      const exerciciosTreino = storage.exercicios[treino.id] || [];
      if (exerciciosTreino.length === 0) return false;
    }
    return true;
  }, [storage.treinos, storage.exercicios]);

  const podeAvancar = useCallback(() => {
    return temConfiguracao() && temTreinos() && temExercicios();
  }, [temConfiguracao, temTreinos, temExercicios]);

  // Função para obter resumo dos dados (usando IDs)
  const obterResumo = useCallback(() => {
    const totalTreinos = storage.treinos?.length || 0;
    let totalExercicios = 0;
    let totalSeries = 0;

    if (storage.exercicios && storage.treinos) {
      for (const treino of storage.treinos) {
        if (!treino.id) continue;
        const exerciciosTreino = storage.exercicios[treino.id] || [];
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

  // ✅ CORREÇÃO PRINCIPAL: Função salvarComoRascunho SEM navegação automática
  const salvarComoRascunho = useCallback(async (
    data?: Partial<Pick<RotinaStorage, 'configuracao' | 'treinos' | 'exercicios'>> & { observacoesRotina?: string }
  ): Promise<{ success: boolean }> => {
    console.log('🚀 INICIANDO salvarComoRascunho...');
    console.log('👤 Usuário autenticado:', !!user);
    console.log('📝 Dados recebidos:', data);
    
    if (!user) {
      console.error("❌ Usuário não autenticado. Não é possível salvar o rascunho.");
      return { success: false };
    }

    const currentStorage = { ...storage, ...data };
    const { configuracao, treinos, exercicios = {} } = currentStorage;
    const observacoesRotina = data?.observacoesRotina;

    console.log('📦 Storage mesclado:', currentStorage);
    console.log('⚙️ Configuração:', configuracao);
    console.log('🏋️ Treinos:', treinos);
    console.log('💪 Exercícios:', exercicios);

    if (!configuracao || !treinos || treinos.length === 0) {
      console.error("❌ Dados insuficientes para salvar rascunho.");
      console.log('❌ configuracao:', !!configuracao);
      console.log('❌ treinos:', treinos?.length || 0);
      return { success: false };
    }

    try {
      console.log('🔍 Verificando rascunho existente...');
      
      // 1. Verificar se já existe um rascunho para este aluno
      const { data: rascunhoExistente, error: findError } = await supabase
        .from('rotinas')
        .select('id')
        .eq('aluno_id', alunoId)
        .eq('status', 'Rascunho')
        .maybeSingle();

      if (findError) {
        console.error('❌ Erro ao buscar rascunho existente:', findError);
        throw findError;
      }

      console.log('📋 Rascunho existente:', rascunhoExistente);

      const rotinaData = {
        aluno_id: alunoId,
        professor_id: user.id,
        status: 'Rascunho' as const,
        nome: configuracao.nome || 'Rascunho de Rotina',
        objetivo: configuracao.objetivo,
        descricao: configuracao.descricao,
        treinos_por_semana: configuracao.treinos_por_semana,
        dificuldade: configuracao.dificuldade,
        duracao_semanas: configuracao.duracao_semanas,
        valor_total: configuracao.valor_total,
        forma_pagamento: configuracao.forma_pagamento,
        data_inicio: configuracao.data_inicio,
        permite_execucao_aluno: configuracao.permite_execucao_aluno,
        observacoes_pagamento: configuracao.observacoes_pagamento,
        observacoes_rotina: observacoesRotina,
      };

      console.log('💾 Dados da rotina a serem salvos:', rotinaData);

      let rotinaId: string;

      if (rascunhoExistente) {
        // 2a. ATUALIZAR rascunho existente
        console.log(`🔄 Atualizando rascunho existente: ${rascunhoExistente.id}`);
        rotinaId = rascunhoExistente.id;

        const { error: updateError } = await supabase
          .from('rotinas')
          .update(rotinaData)
          .eq('id', rotinaId);
        if (updateError) {
          console.error('❌ Erro ao atualizar rotina:', updateError);
          throw updateError;
        }
        console.log('✅ Rotina atualizada com sucesso');

        // Limpar treinos antigos (cascade deve cuidar do resto)
        console.log('🧹 Limpando treinos antigos...');
        const { error: deleteTreinosError } = await supabase
          .from('treinos')
          .delete()
          .eq('rotina_id', rotinaId);
        if (deleteTreinosError) {
          console.error('❌ Erro ao limpar treinos antigos:', deleteTreinosError);
          throw deleteTreinosError;
        }
        console.log('✅ Treinos antigos removidos');
        
      } else {
        // 2b. CRIAR novo rascunho
        console.log("✨ Criando novo rascunho...");
        const { data: novaRotina, error: insertError } = await supabase
          .from('rotinas')
          .insert(rotinaData)
          .select('id')
          .single();
        if (insertError || !novaRotina) {
          console.error('❌ Erro ao criar rotina:', insertError);
          throw insertError || new Error("Falha ao criar o registro da rotina.");
        }
        rotinaId = novaRotina.id;
        console.log(`✅ Nova rotina criada com ID: ${rotinaId}`);
      }

      // 3. Inserir Treinos e seus filhos (Exercícios e Séries)
      console.log('🏗️ Iniciando criação de treinos...');
      for (const treinoTemp of treinos) {
        console.log(`📝 Criando treino: ${treinoTemp.nome}`);
        
        const { data: treinoCriado, error: treinoError } = await supabase
          .from('treinos')
          .insert({
            rotina_id: rotinaId,
            nome: treinoTemp.nome,
            grupos_musculares: treinoTemp.grupos_musculares.join(','),
            ordem: treinoTemp.ordem,
            tempo_estimado_minutos: treinoTemp.tempo_estimado_minutos,
            observacoes: treinoTemp.observacoes
          })
          .select('id')
          .single();
          
        if (treinoError || !treinoCriado) {
          console.error('❌ Erro ao salvar treino:', treinoError);
          throw treinoError || new Error('Falha ao salvar treino.');
        }
        
        console.log(`✅ Treino criado com ID: ${treinoCriado.id}`);

        const exerciciosDoTreino = exercicios[treinoTemp.id!] || [];
        console.log(`💪 Processando ${exerciciosDoTreino.length} exercícios para ${treinoTemp.nome}`);
        
        for (const exercicioTemp of exerciciosDoTreino) {
          const { series } = exercicioTemp;

          // Construir o objeto explicitamente com as colunas que existem na tabela
          const exercicioParaInserir = {
            treino_id: treinoCriado.id,
            exercicio_1_id: exercicioTemp.exercicio_1_id,
            exercicio_2_id: exercicioTemp.exercicio_2_id || null,
            ordem: exercicioTemp.ordem,
            intervalo_apos_exercicio: exercicioTemp.intervalo_apos_exercicio || null,
            observacoes: exercicioTemp.observacoes || null,
          };
          
          console.log('📋 Inserindo exercício:', exercicioParaInserir);
          
          const { data: exercicioCriado, error: exercicioError } = await supabase
            .from('exercicios_rotina')
            .insert(exercicioParaInserir)
            .select('id')
            .single();
            
          if (exercicioError || !exercicioCriado) {
            console.error('❌ Erro ao salvar exercício:', exercicioError);
            throw exercicioError || new Error(`Falha ao salvar exercício: ${exercicioError?.message}`);
          }
          
          console.log(`✅ Exercício criado com ID: ${exercicioCriado.id}`);

          if (series && series.length > 0) {
            const seriesParaInserir = series.map(s => ({
              exercicio_id: exercicioCriado.id,
              numero_serie: s.numero_serie,
              repeticoes: s.repeticoes ?? 0,
              carga: s.carga ?? null,
              tem_dropset: s.tem_dropset ?? false,
              carga_dropset: s.carga_dropset ?? null,
              intervalo_apos_serie: s.intervalo_apos_serie ?? null,
              observacoes: s.observacoes ?? null,
              repeticoes_1: s.repeticoes_1 ?? null,
              carga_1: s.carga_1 ?? null,
              repeticoes_2: s.repeticoes_2 ?? null,
              carga_2: s.carga_2 ?? null,
            }));
            
            console.log(`📊 Inserindo ${seriesParaInserir.length} séries...`);
            
            const { error: seriesError } = await supabase
              .from('series')
              .insert(seriesParaInserir);
              
            if (seriesError) {
              console.error('❌ Erro ao salvar séries:', seriesError);
              throw seriesError;
            }
            
            console.log(`✅ ${seriesParaInserir.length} séries criadas`);
          }
        }
      }
      
      console.log("🎉 Todos os exercícios e séries salvos com sucesso!");

      // ✅ CORREÇÃO: Limpar o storage local após salvar o rascunho no banco de dados.
      // Isso garante que o banco de dados seja a única fonte da verdade para rascunhos.
      limparStorage();

      console.log('🎯 Rascunho salvo com sucesso! ID:', rotinaId);
      return { success: true };

    } catch (error) {
      console.error("❌ Erro completo ao salvar rascunho:", error);
      
      // Log detalhado do erro para debugging
      if (error instanceof Error) {
        console.error("❌ Nome do erro:", error.name);
        console.error("❌ Mensagem do erro:", error.message);
        console.error("❌ Stack trace:", error.stack);
      }
      
      return { success: false };
    }
  }, [storage, user, alunoId, limparStorage]);

  return {
    storage,
    isLoaded,
    salvarConfiguracao,
    salvarTreinos,
    salvarExerciciosTreino,
    salvarTodosExercicios,
    salvarObservacoesRotina,
    avancarParaRevisao,
    voltarEtapa,
    limparStorage,
    temConfiguracao,
    temTreinos,
    temExercicios,
    podeAvancar,
    obterResumo,
    salvarComoRascunho,
  };
};

export default useRotinaStorage;