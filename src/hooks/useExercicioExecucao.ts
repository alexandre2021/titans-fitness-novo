// src/hooks/useExercicioExecucao.ts
import { useCallback, useEffect, useState } from 'react';
import { MENSAGENS, SESSAO_STATUS } from '@/constants/exercicio.constants';
import { supabase } from '@/integrations/supabase/client';
import { ExercicioData, SerieData, SessaoData } from '@/types/exercicio.types';
import { exercicioUtils } from '@/utils/exercicio.utils';
import { toast } from 'sonner';

// Tipagens para dados do Supabase
interface ExercicioSupabase {
  id: string;
  exercicio_1_id: string;
  exercicio_2_id: string | null;
  ordem: number;
  intervalo_apos_exercicio: number | null;
  exercicio_1: {
    nome: string;
    equipamento: string;
  } | null;
  exercicio_2: {
    nome: string;
    equipamento: string;
  } | null;
  series: SerieSupabase[];
}

interface SerieSupabase {
  id: string;
  numero_serie: number;
  repeticoes: number | null;
  carga: number | null;
  repeticoes_1: number | null;
  carga_1: number | null;
  repeticoes_2: number | null;
  carga_2: number | null;
  tem_dropset: boolean;
  carga_dropset: number | null;
  intervalo_apos_serie: number | null;
}

interface ProgressoSupabase {
  exercicio_rotina_id: string;
  serie_numero: number;
  repeticoes_executadas_1: number | null;
  carga_executada_1: number | null;
  repeticoes_executadas_2: number | null;
  carga_executada_2: number | null;
  carga_dropset: number | null;
  observacoes: string | null;
}

// Interface para tipar a resposta do PDF
interface PdfResponse {
  pdf_base64: string;
}

// Interface expandida para SessaoData com rotina completa
interface SessaoCompleta extends SessaoData {
  rotinas: {
    nome: string;
    permite_execucao_aluno: boolean;
    status: string; // ✅ Adicionando status da rotina
    alunos: {
      nome_completo: string;
    } | null;
  };
  treinos: {
    nome: string;
  } | null;
}

export const useExercicioExecucao = (
  sessaoData: SessaoData | null,
  modoExecucao: 'professor' | 'aluno', 
  cronometroPausado: boolean = false,
  navigate: (path: string) => void,
) => {
  const [exercicios, setExercicios] = useState<ExercicioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempoSessao, setTempoSessao] = useState(0);
  const [sessaoInvalida, setSessaoInvalida] = useState(false);

  // Timer da sessão (só conta se não estiver pausado)
  useEffect(() => {
    if (cronometroPausado || loading || sessaoInvalida) return;

    const interval = setInterval(() => {
      setTempoSessao(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [cronometroPausado, loading, sessaoInvalida]);

  // Carregar exercícios da rotina e progresso salvo
  useEffect(() => {
    // ✅ NOVO: Define o tempo inicial ao carregar os dados da sessão
    if (sessaoData) {
      const tempoInicial = sessaoData.tempo_decorrido ?? 0;
      setTempoSessao(tempoInicial);
      if (tempoInicial > 0) {
        console.log(`⏰ Resumindo sessão. Tempo inicial: ${tempoInicial}s`);
      }
    }
    let cancelado = false;

    const validarEcarregarExercicios = async () => {
      // Helper para centralizar o tratamento de erros e redirecionamento
      const handleInvalidSession = (title: string, description: string) => {
        if (cancelado) return;
        toast.error(title, { description });
        setSessaoInvalida(true);
        if (sessaoData) {
          const redirectPath = modoExecucao === 'aluno' ? '/minhas-rotinas' : `/alunos-rotinas/${sessaoData.aluno_id}`;
          navigate(redirectPath);
        } else {
          navigate(modoExecucao === 'aluno' ? '/minhas-rotinas' : '/alunos');
        }
      };

      if (!sessaoData) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setSessaoInvalida(false);

      try {
        // ✅ 1. Buscar dados completos da sessão incluindo rotina
        const { data: sessaoCompleta, error: sessaoError } = await supabase
          .from('execucoes_sessao')
          .select(`
            *,
            rotinas!inner (
              nome,
              permite_execucao_aluno,
              status,
              alunos (
                nome_completo
              )
            ),
            treinos (
              nome
            )
          `)
          .eq('id', sessaoData.id)
          .single();

        if (sessaoError || !sessaoCompleta) {
          console.error('❌ Erro ao buscar dados da sessão:', sessaoError);
          handleInvalidSession("Sessão não encontrada", "Não foi possível carregar os dados desta sessão.");
          return;
        }

        // ✅ Verificação de robustez: Checar se a junção com 'alunos' funcionou
        if (!sessaoCompleta.rotinas?.alunos || typeof sessaoCompleta.rotinas.alunos.nome_completo !== 'string') {
          console.error('❌ Falha na junção: não foi possível carregar os dados do aluno para a sessão.', sessaoCompleta);
          handleInvalidSession("Erro de Dados da Sessão", "O aluno associado a esta sessão não foi encontrado. A sessão pode estar corrompida.");
          return;
        }

        const sessaoComRotina = sessaoCompleta as SessaoCompleta;

        // ✅ 2. Validar status da rotina
        const statusRotina = sessaoComRotina.rotinas?.status;
        if (statusRotina === 'Cancelada' || statusRotina === 'Bloqueada') {
          console.log(`🚫 Acesso bloqueado. Status da rotina: ${sessaoComRotina.rotinas?.status}`);
          handleInvalidSession("Rotina Indisponível", `Esta rotina foi ${statusRotina.toLowerCase()} e não pode mais ser executada.`);
          return;
        }

        // ✅ 3. Validar permissão de execução do aluno
        if (modoExecucao === 'aluno' && !sessaoComRotina.rotinas?.permite_execucao_aluno) {
          console.log(`🚫 Acesso bloqueado. Aluno não tem permissão para executar esta rotina.`);
          handleInvalidSession("Execução não permitida", "Você não tem permissão para iniciar esta rotina. Fale com seu Professor.");
          return;
        }

        // ✅ 4. Buscar exercícios da rotina
        const { data: exerciciosData, error } = await supabase
          .from('exercicios_rotina')
          .select(`
            id,
            exercicio_1_id,
            exercicio_2_id,
            ordem,
            intervalo_apos_exercicio,
            exercicio_1:exercicios!exercicio_1_id(nome, equipamento),
            exercicio_2:exercicios!exercicio_2_id(nome, equipamento),
            series (
              id,
              numero_serie,
              repeticoes,
              carga,
              repeticoes_1,
              carga_1,
              repeticoes_2,
              carga_2,
              tem_dropset,
              carga_dropset,
              intervalo_apos_serie
            )
          `)
          .eq('treino_id', sessaoCompleta.treino_id) // ✅ Usando sessaoCompleta.treino_id
          .order('ordem');

        if (error) throw new Error(`Erro ao carregar exercícios: ${error.message}`);
        if (!exerciciosData || exerciciosData.length === 0) {
          if (!cancelado) setExercicios([]);
          return;
        }

        // Buscar progresso salvo da sessão
        const { data: progressoSalvo, error: progressoError } = await supabase
          .from('execucoes_series')
          .select(`
            exercicio_rotina_id,
            serie_numero,
            repeticoes_executadas_1,
            carga_executada_1,
            repeticoes_executadas_2,
            carga_executada_2,
            carga_dropset,
            observacoes
          `)
          .eq('execucao_sessao_id', sessaoData.id);

        if (progressoError) {
          console.warn('⚠️ Erro ao buscar progresso (continuando sem progresso):', progressoError);
        }

        // Criar mapa de progresso
        const mapaProgresso = new Map<string, ProgressoSupabase>();
        if (progressoSalvo && progressoSalvo.length > 0) {
          progressoSalvo.forEach(prog => {
            const chave = `${prog.exercicio_rotina_id}-${prog.serie_numero}`;
            mapaProgresso.set(chave, prog);
          });
        }

        // Formatar dados para interface
        const exerciciosFormatados: ExercicioData[] = (exerciciosData as ExercicioSupabase[]).map((ex) => {
          const ex1 = ex.exercicio_1 || { nome: '', equipamento: '' };
          const ex2 = ex.exercicio_2 || { nome: '', equipamento: '' };
          
          const seriesComProgresso: SerieData[] = (ex.series || []).map((serie) => {
            const chaveProgresso = `${ex.id}-${serie.numero_serie}`;
            const progressoSerie = mapaProgresso.get(chaveProgresso);
            
            // Série base com dados planejados
            const serieBase: SerieData = {
              id: serie.id,
              numero_serie: serie.numero_serie,
              repeticoes: serie.repeticoes || undefined,
              carga: serie.carga || undefined,
              repeticoes_1: serie.repeticoes_1 || undefined,
              carga_1: serie.carga_1 || undefined,
              repeticoes_2: serie.repeticoes_2 || undefined,
              carga_2: serie.carga_2 || undefined,
              tem_dropset: serie.tem_dropset,
              carga_dropset: serie.carga_dropset || undefined,
              intervalo_apos_serie: serie.intervalo_apos_serie || undefined,
              // Dados de execução iniciais
              carga_dropset_executada: 0,
              observacoes: '',
              executada: false
            };
            
            if (progressoSerie) {
              if (ex.exercicio_2_id) {
                // Série combinada
                return {
                  ...serieBase,
                  repeticoes_executadas_1: progressoSerie.repeticoes_executadas_1 || 0,
                  carga_executada_1: progressoSerie.carga_executada_1 || 0,
                  repeticoes_executadas_2: progressoSerie.repeticoes_executadas_2 || 0,
                  carga_executada_2: progressoSerie.carga_executada_2 || 0,
                  carga_dropset_executada: progressoSerie.carga_dropset || 0,
                  observacoes: progressoSerie.observacoes || '',
                  executada: progressoSerie.repeticoes_executadas_1 !== null || progressoSerie.repeticoes_executadas_2 !== null
                };
              } else {
                // Série simples (usa os campos _1 do banco)
                return {
                  ...serieBase,
                  repeticoes_executadas_1: progressoSerie.repeticoes_executadas_1 || 0,
                  carga_executada_1: progressoSerie.carga_executada_1 || 0,
                  carga_dropset_executada: progressoSerie.carga_dropset || 0,
                  observacoes: progressoSerie.observacoes || '',
                  executada: progressoSerie.repeticoes_executadas_1 !== null
                };
              }
            }
            
            // Retorna série base sem progresso
            return serieBase;
          }).sort((a, b) => a.numero_serie - b.numero_serie);

          const exercicioFormatado: ExercicioData = {
            id: ex.id,
            exercicio_1_id: ex.exercicio_1_id,
            exercicio_2_id: ex.exercicio_2_id || undefined,
            ordem: ex.ordem,
            intervalo_apos_exercicio: ex.intervalo_apos_exercicio || undefined,
            equipamento_1: ex1.equipamento || undefined,
            equipamento_2: ex2.equipamento || undefined,
            series: seriesComProgresso
          };
          
          return exercicioFormatado;
        });

        if (!cancelado) setExercicios(exerciciosFormatados);

      } catch (error) {
        console.error("Erro ao carregar dados da sessão:", error);
        toast.error("Erro", { description: "Não foi possível carregar os dados da sessão." });
        setSessaoInvalida(true);
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    };

    validarEcarregarExercicios();
    return () => { cancelado = true; };
  }, [sessaoData, modoExecucao, navigate]);

  // Atualizar série executada
  const atualizarSerieExecutada = useCallback((
    exercicioIndex: number, 
    serieIndex: number, 
    dadosSerie: Partial<SerieData>
  ) => {
    setExercicios(prev => prev.map((ex, exIndex) => {
      if (exIndex === exercicioIndex) {
        return {
          ...ex,
          series: ex.series.map((serie, sIndex) => {
            if (sIndex === serieIndex) {              
              const novaSerie = { ...serie, ...dadosSerie };

              // Lógica Definitiva: Uma série é considerada executada se os dados de execução
              // (repetições ou carga) são passados, mesmo que sejam 0.
              const isExecuted = dadosSerie.repeticoes_executadas_1 !== undefined || dadosSerie.carga_executada_1 !== undefined ||
                                 dadosSerie.repeticoes_2 !== undefined || dadosSerie.carga_2 !== undefined;

              if (isExecuted) {
                novaSerie.executada = true;
              }

              return novaSerie;
            }
            return serie;
          })
        };
      }
      return ex;
    }));
  }, []);

  // Pausar sessão
  const pausarSessao = useCallback(async (): Promise<boolean> => {
    if (sessaoInvalida || !sessaoData) return false;

    try {
      setLoading(true);
      console.log(`⏸️ Pausando sessão - Modo: ${modoExecucao}`);
      
      const totalSeriesExecutadas = exercicioUtils.contarSeriesExecutadas(exercicios);
      
      const { error: updateError } = await supabase
        .from('execucoes_sessao')
        .update({
          status: SESSAO_STATUS.PAUSADA,
          tempo_decorrido: tempoSessao,
          modo_execucao: modoExecucao,
          observacoes: `Pausado em modo ${modoExecucao === 'professor' ? 'PT' : 'ALUNO'} - ${totalSeriesExecutadas} séries realizadas até agora`
        })
        .eq('id', sessaoData.id);

      if (updateError) {
        throw new Error(`Erro ao pausar sessão: ${updateError.message}`);
      }

      const execucoesSeries = exercicioUtils.prepararDadosExecucaoSeries(exercicios, sessaoData.id);
      
      if (execucoesSeries.length > 0) {
        const { error: seriesError } = await supabase
          .from('execucoes_series')
          .upsert(execucoesSeries, {
            onConflict: 'execucao_sessao_id,exercicio_rotina_id,serie_numero',
            ignoreDuplicates: false
          });

        if (seriesError) {
          throw new Error(`Erro ao salvar progresso das séries: ${seriesError.message}`);
        }
      }

      console.log(`✅ Sessão pausada com sucesso! Modo: ${modoExecucao} | Séries salvas: ${execucoesSeries.length} | Tempo: ${tempoSessao}s`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao pausar sessão:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [modoExecucao, tempoSessao, exercicios, sessaoData, sessaoInvalida]);

  // Verificar se rotina está completa
  const verificarRotinaCompleta = useCallback(async (
    rotinaId: string, 
    sessaoConcluidaId: string
  ): Promise<boolean> => {
     try {
       console.log(`🔍 Verificando se rotina ${rotinaId} está completa...`);
       
       const { data: sessoes, error } = await supabase
         .from('execucoes_sessao')
         .select('id, status')
         .eq('rotina_id', rotinaId);
 
       if (error) {
         console.error('❌ Erro ao verificar sessões da rotina:', error);
         return false;
       }
 
       if (!sessoes || sessoes.length === 0) {
         console.log('⚠️ Nenhuma sessão encontrada para a rotina');
         return false;
       }
 
       // A rotina está completa se todas as *outras* sessões já estiverem concluídas.
       // Esta abordagem é mais robusta e não depende de race conditions.
       const outrasSessoesNaoConcluidas = sessoes.filter(
         s => s.id !== sessaoConcluidaId && s.status !== 'concluida'
       );

       const rotinaCompleta = outrasSessoesNaoConcluidas.length === 0;
 
       console.log(`📊 Verificação de completude: ${rotinaCompleta ? '✅ ROTINA COMPLETA' : '⏳ Rotina ainda em andamento'}`);

       return rotinaCompleta;
     } catch (error) {
       console.error('❌ Erro ao verificar conclusão da rotina:', error);
       return false;
     }
  }, []);

  // Atualizar status da rotina para Concluída
  const atualizarStatusRotina = useCallback(async (rotinaId: string): Promise<boolean> => {
    try {
      console.log('🔄 Atualizando status da rotina para Concluída...');
      
      const { error } = await supabase
        .from('rotinas')
        .update({ status: 'Concluída' })
        .eq('id', rotinaId);

      if (error) {
        console.error('❌ Erro ao atualizar status da rotina:', error);
        return false;
      }

      console.log('✅ Status da rotina atualizado para Concluída com sucesso!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao atualizar status da rotina:', error);
      return false;
    }
  }, []);

  // ✅ CORREÇÃO: Finalizar sessão completa COM arquivamento automático
  const salvarExecucaoCompleta = useCallback(async (): Promise<boolean> => {
    if (sessaoInvalida || !sessaoData) return false;

    try {
      setLoading(true);
      console.log(`💾 Finalizando sessão definitivamente - Modo: ${modoExecucao}`);
      
      const totalSeriesExecutadas = exercicioUtils.contarSeriesExecutadas(exercicios);
      const tempoTotalMinutos = Math.floor(tempoSessao / 60);
      
      // 1. Atualizar sessão para concluída
      const { error: updateError } = await supabase
        .from('execucoes_sessao')
        .update({
          status: SESSAO_STATUS.CONCLUIDA,
          tempo_total_minutos: tempoTotalMinutos,
          tempo_decorrido: 0, // ✅ Zera o tempo decorrido ao concluir
          modo_execucao: modoExecucao,
          observacoes: `Concluído em modo ${modoExecucao === 'professor' ? 'PT' : 'ALUNO'} - ${totalSeriesExecutadas} séries realizadas`
        })
        .eq('id', sessaoData.id);

      if (updateError) throw new Error(`Erro ao finalizar sessão: ${updateError.message}`);

      // 2. Salvar todas as séries
      const execucoesSeries = exercicioUtils.prepararDadosExecucaoSeries(exercicios, sessaoData.id);
      
      if (execucoesSeries.length > 0) {
        const { error: seriesError } = await supabase
          .from('execucoes_series')
          .upsert(execucoesSeries, {
            onConflict: 'execucao_sessao_id,exercicio_rotina_id,serie_numero',
            ignoreDuplicates: false
          });

        if (seriesError) throw new Error(`Erro ao salvar execução das séries: ${seriesError.message}`);
      }

      console.log(`✅ Sessão finalizada com sucesso! Modo: ${modoExecucao} | Séries: ${totalSeriesExecutadas} | Tempo: ${tempoTotalMinutos}min`);

      // 3. ✅ CORREÇÃO: Verificar se a rotina inteira foi concluída e processar arquivamento
      const rotinaCompleta = await verificarRotinaCompleta(sessaoData.rotina_id, sessaoData.id);
      if (rotinaCompleta) {
        console.log('🎉 Rotina completa detectada! Atualizando status...');
        
        // Atualizar status primeiro
        const statusAtualizado = await atualizarStatusRotina(sessaoData.rotina_id);
        if (!statusAtualizado) {
          console.error('❌ Falha ao atualizar status da rotina');
          // Não falha a finalização da sessão por causa disso, mas loga o erro.
        }
      }

      return true; // Retorna sucesso

    } catch (error) {
      console.error('❌ Erro ao finalizar sessão:', error);
      toast.error("Erro ao Finalizar", {
        description: "Não foi possível salvar a sessão. Tente novamente.",
      });
      return false; // Retorna falha
    } finally {
      setLoading(false);
    }
  }, [exercicios, sessaoData, tempoSessao, modoExecucao, verificarRotinaCompleta, atualizarStatusRotina, sessaoInvalida]);

  return {
    exercicios,
    sessaoData, // Retorna os dados da sessão para o componente usar
    loading,
    tempoSessao,
    atualizarSerieExecutada,
    pausarSessao,
    salvarExecucaoCompleta,
  };
};