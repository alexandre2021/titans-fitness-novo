// src/hooks/useExercicioExecucao.ts
import { useCallback, useEffect, useState } from 'react';
import { MENSAGENS, SESSAO_STATUS } from '@/constants/exercicio.constants';
import { supabase } from '@/integrations/supabase/client';
import { ExercicioData, SerieData, SessaoData } from '@/types/exercicio.types';
import { exercicioUtils } from '@/utils/exercicio.utils';

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

export const useExercicioExecucao = (
  sessaoData: SessaoData, 
  modoExecucao: 'pt' | 'aluno', 
  cronometroPausado: boolean = false
) => {
  const [exercicios, setExercicios] = useState<ExercicioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempoSessao, setTempoSessao] = useState(0);

  // Carregar tempo salvo da sessão pausada
  useEffect(() => {
    if (sessaoData?.tempo_total_minutos && sessaoData.tempo_total_minutos > 0) {
      const tempoSalvoSegundos = sessaoData.tempo_total_minutos * 60;
      console.log(`⏰ Carregando tempo salvo: ${sessaoData.tempo_total_minutos}min = ${tempoSalvoSegundos}s`);
      setTempoSessao(tempoSalvoSegundos);
    }
  }, [sessaoData?.tempo_total_minutos]);

  // Timer da sessão (só conta se não estiver pausado)
  useEffect(() => {
    if (cronometroPausado || loading) return;

    const interval = setInterval(() => {
      setTempoSessao(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [cronometroPausado, loading]);

  // Carregar exercícios da rotina e progresso salvo
  useEffect(() => {
    let cancelado = false;
    
    async function carregarExercicios() {
      if (!sessaoData?.treino_id) return;
      
      try {
        setLoading(true);

        // Buscar exercícios do treino
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
          .eq('treino_id', sessaoData.treino_id)
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
              repeticoes_executadas: 0,
              carga_executada: 0,
              carga_dropset_executada: 0,
              observacoes: '',
              executada: false
            };
            
            if (progressoSerie) {
              if (ex.exercicio_2_id) {
                // Série combinada - usar repeticoes_1/repeticoes_2 para exercícios separados
                return {
                  ...serieBase,
                  repeticoes_executadas: progressoSerie.repeticoes_executadas_1 || 0,
                  carga_executada: progressoSerie.carga_executada_1 || 0,
                  repeticoes_1: progressoSerie.repeticoes_executadas_1 || 0,
                  carga_1: progressoSerie.carga_executada_1 || 0,
                  repeticoes_2: progressoSerie.repeticoes_executadas_2 || 0,
                  carga_2: progressoSerie.carga_executada_2 || 0,
                  carga_dropset_executada: progressoSerie.carga_dropset || 0,
                  observacoes: progressoSerie.observacoes || '',
                  executada: Boolean(progressoSerie.repeticoes_executadas_1 || progressoSerie.repeticoes_executadas_2)
                };
              } else {
                // Série simples
                return {
                  ...serieBase,
                  repeticoes_executadas: progressoSerie.repeticoes_executadas_1 || 0,
                  carga_executada: progressoSerie.carga_executada_1 || 0,
                  carga_dropset_executada: progressoSerie.carga_dropset || 0,
                  observacoes: progressoSerie.observacoes || '',
                  executada: Boolean(progressoSerie.repeticoes_executadas_1)
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
        console.error('Erro ao carregar exercícios:', error);
      } finally {
        if (!cancelado) setLoading(false);
      }
    }

    carregarExercicios();
    return () => { cancelado = true; };
  }, [sessaoData.id, sessaoData.treino_id]);

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
              return { ...serie, ...dadosSerie };
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
    try {
      setLoading(true);
      console.log(`⏸️ Pausando sessão - Modo: ${modoExecucao}`);
      
      const tempoTotalMinutos = Math.floor(tempoSessao / 60);
      const totalSeriesExecutadas = exercicioUtils.contarSeriesExecutadas(exercicios);
      
      const { error: updateError } = await supabase
        .from('execucoes_sessao')
        .update({
          status: SESSAO_STATUS.PAUSADA,
          tempo_total_minutos: tempoTotalMinutos,
          modo_execucao: modoExecucao,
          observacoes: `Pausado em modo ${modoExecucao.toUpperCase()} - ${totalSeriesExecutadas} séries realizadas até agora`
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

      console.log(`✅ Sessão pausada com sucesso! Modo: ${modoExecucao} | Séries salvas: ${execucoesSeries.length} | Tempo: ${tempoTotalMinutos}min`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao pausar sessão:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [modoExecucao, tempoSessao, exercicios, sessaoData.id]);

  // Verificar se rotina está completa
  const verificarRotinaCompleta = useCallback(async (rotinaId: string): Promise<boolean> => {
    try {
      console.log('🔍 Verificando se rotina está completa:', rotinaId);
      
      const { data: sessoes, error } = await supabase
        .from('execucoes_sessao')
        .select('status')
        .eq('rotina_id', rotinaId);

      if (error) {
        console.error('❌ Erro ao verificar sessões da rotina:', error);
        return false;
      }

      if (!sessoes || sessoes.length === 0) {
        console.log('⚠️ Nenhuma sessão encontrada para a rotina');
        return false;
      }

      // Contar sessões por status usando strings diretas
      const sessoesPendentes = sessoes.filter(s => 
        s.status === 'em_aberto' || s.status === 'em_andamento' || s.status === 'pausada'
      );
      const sessoesCompletas = sessoes.filter(s => s.status === 'concluida');

      console.log(`📊 Status das sessões:`, {
        total: sessoes.length,
        completas: sessoesCompletas.length,
        pendentes: sessoesPendentes.length,
      });

      const rotinaCompleta = sessoesPendentes.length === 0 && sessoesCompletas.length > 0;
      console.log(rotinaCompleta ? '✅ Rotina COMPLETA!' : '⏳ Rotina ainda em andamento');
      
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

  // Arquivar rotina completa
  const arquivarRotinaCompleta = useCallback(async (rotinaId: string): Promise<boolean> => {
    try {
      console.log('🗄️ Iniciando processo de arquivamento da rotina...');
      
      // 1. Buscar dados completos da rotina para gerar PDF
      const { data: rotinaCompleta, error: rotinaError } = await supabase
        .from('rotinas')
        .select(`
          *,
          alunos (nome_completo, email),
          personal_trainers (nome_completo),
          treinos (
            *,
            exercicios_rotina (
              *,
              series (*)
            )
          )
        `)
        .eq('id', rotinaId)
        .single();

      if (rotinaError || !rotinaCompleta) {
        console.error('❌ Erro ao buscar dados da rotina:', rotinaError);
        return false;
      }

      // --- LÓGICA FIFO PARA ROTINAS ARQUIVADAS ---
      const alunoId = rotinaCompleta.aluno_id;
      console.log(`🔍 Verificando rotinas arquivadas para o aluno: ${alunoId}`);
      const { data: rotinasArquivadas, error: countError } = await supabase
        .from('rotinas_arquivadas')
        .select('id, pdf_url, created_at')
        .eq('aluno_id', alunoId);

      if (countError) {
        console.error('⚠️ Erro ao buscar rotinas arquivadas, o processo de arquivamento continuará, mas a limpeza pode não ocorrer.', countError);
      }

      if (rotinasArquivadas && rotinasArquivadas.length >= 4) {
        console.log(` FIFO: Limite de ${rotinasArquivadas.length} rotinas atingido. Removendo a mais antiga.`);
        
        const maisAntiga = rotinasArquivadas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
        
        console.log(`🗑️ Rotina mais antiga a ser removida: ${maisAntiga.id}, criada em: ${maisAntiga.created_at}`);

        // Deletar PDF associado
        if (maisAntiga.pdf_url) {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                if (!accessToken) throw new Error("Usuário não autenticado para deletar PDF.");

                const deleteResponse = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/delete-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                    body: JSON.stringify({ file_url: maisAntiga.pdf_url, bucket_type: 'rotinas' })
                });

                if (!deleteResponse.ok) {
                    const errorText = await deleteResponse.text();
                    throw new Error(`Falha ao deletar PDF da rotina antiga: ${errorText}`);
                }
                console.log('✅ PDF da rotina antiga deletado com sucesso:', maisAntiga.pdf_url);

            } catch (pdfError) {
                console.error('❌ Erro ao deletar PDF da rotina antiga. O registro no banco será removido mesmo assim.', pdfError);
            }
        }

        // Deletar registro do banco
        const { error: deleteError } = await supabase
          .from('rotinas_arquivadas')
          .delete()
          .eq('id', maisAntiga.id);

        if (deleteError) {
          console.error('❌ Erro ao deletar o registro da rotina arquivada mais antiga:', deleteError);
        } else {
          console.log('✅ Registro da rotina mais antiga deletado do banco de dados.');
        }
      }
      // --- FIM DA LÓGICA FIFO ---

      // 2. Buscar execuções da rotina
      const { data: execucoes, error: execucoesError } = await supabase
        .from('execucoes_sessao')
        .select('*')
        .eq('rotina_id', rotinaId)
        .order('created_at');

      if (execucoesError) {
        console.error('❌ Erro ao buscar execuções:', execucoesError);
        return false;
      }

      // 3. Gerar PDF de conclusão
      console.log('📄 Gerando PDF de conclusão...');
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      if (!accessToken) {
        console.error('❌ Usuário não autenticado para gerar PDF');
        return false;
      }

      const dadosParaPDF = {
        rotina: rotinaCompleta,
        treinos: rotinaCompleta.treinos || [],
        execucoes: execucoes || []
      };

      const pdfResponse = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/gerar-pdf-conclusao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(dadosParaPDF)
      });

      if (!pdfResponse.ok) {
        console.error('❌ Erro ao gerar PDF:', await pdfResponse.text());
        return false;
      }

      const { pdf_base64 } = await pdfResponse.json();
      console.log('✅ PDF gerado com sucesso!');

      // 4. Upload do PDF para Cloudflare R2
      console.log('☁️ Fazendo upload do PDF para Cloudflare...');
      const filename = `rotina_${rotinaId}_${Date.now()}.pdf`;
      
      const uploadResponse = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/upload-imagem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filename,
          image_base64: pdf_base64,
          aluno_id: rotinaCompleta.aluno_id,
          tipo: 'pdf_conclusao',
          bucket_type: 'rotinas'
        })
      });

      if (!uploadResponse.ok) {
        console.error('❌ Erro ao fazer upload do PDF:', await uploadResponse.text());
        return false;
      }

      const { url: pdfUrl } = await uploadResponse.json();
      console.log('✅ PDF uploaded com sucesso:', pdfUrl);

      // 5. Calcular estatísticas para arquivamento
      const dataInicio = rotinaCompleta.data_inicio;
      const dataConclusao = new Date().toISOString().split('T')[0];

      // 6. Inserir na tabela rotinas_arquivadas
      console.log('🗄️ Salvando dados arquivados...');
      const { error: arquivoError } = await supabase
        .from('rotinas_arquivadas')
        .insert({
          aluno_id: rotinaCompleta.aluno_id,
          nome_rotina: rotinaCompleta.nome,
          objetivo: rotinaCompleta.objetivo,
          treinos_por_semana: rotinaCompleta.treinos_por_semana,
          duracao_semanas: rotinaCompleta.duracao_semanas,
          data_inicio: dataInicio,
          data_conclusao: dataConclusao,
          pdf_url: pdfUrl
        });

      if (arquivoError) {
        console.error('❌ Erro ao arquivar rotina:', arquivoError);
        return false;
      }

      console.log('✅ Rotina arquivada com sucesso!');

      // 7. Deletar rotina e dados relacionados (cascata)
      console.log('🗑️ Removendo rotina da base ativa...');
      
      await supabase.from('execucoes_series').delete().in('execucao_sessao_id', 
        execucoes?.map(e => e.id) || []
      );
      
      await supabase.from('execucoes_sessao').delete().eq('rotina_id', rotinaId);
      
      for (const treino of rotinaCompleta.treinos || []) {
        for (const exercicio of treino.exercicios_rotina || []) {
          await supabase.from('series').delete().eq('exercicio_id', exercicio.id);
        }
        await supabase.from('exercicios_rotina').delete().eq('treino_id', treino.id);
      }
      
      await supabase.from('treinos').delete().eq('rotina_id', rotinaId);
      await supabase.from('rotinas').delete().eq('id', rotinaId);

      console.log('🎉 Processo de arquivamento concluído com sucesso!');
      return true;

    } catch (error) {
      console.error('❌ Erro no processo de arquivamento:', error);
      return false;
    }
  }, []);

  // Finalizar sessão completa
  const salvarExecucaoCompleta = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      console.log(`💾 Finalizando sessão definitivamente - Modo: ${modoExecucao}`);
      
      const totalSeriesExecutadas = exercicioUtils.contarSeriesExecutadas(exercicios);
      console.log(`📊 Séries executadas: ${totalSeriesExecutadas}`);

      // Atualizar sessão para concluída
      const tempoTotalMinutos = Math.floor(tempoSessao / 60);
      
      const { error: updateError } = await supabase
        .from('execucoes_sessao')
        .update({
          status: SESSAO_STATUS.CONCLUIDA,
          tempo_total_minutos: tempoTotalMinutos,
          modo_execucao: modoExecucao,
          observacoes: `Concluído em modo ${modoExecucao.toUpperCase()} - ${totalSeriesExecutadas} séries realizadas`
        })
        .eq('id', sessaoData.id);

      if (updateError) {
        throw new Error(`Erro ao finalizar sessão: ${updateError.message}`);
      }

      // Salvar todas as séries
      const execucoesSeries = exercicioUtils.prepararDadosExecucaoSeries(exercicios, sessaoData.id);
      
      if (execucoesSeries.length > 0) {
        const { error: seriesError } = await supabase
          .from('execucoes_series')
          .upsert(execucoesSeries, {
            onConflict: 'execucao_sessao_id,exercicio_rotina_id,serie_numero',
            ignoreDuplicates: false
          });

        if (seriesError) {
          throw new Error(`Erro ao salvar execução das séries: ${seriesError.message}`);
        }
      }

      console.log(`✅ Sessão finalizada com sucesso! Modo: ${modoExecucao} | Séries: ${totalSeriesExecutadas} | Tempo: ${tempoTotalMinutos}min`);

      // Verificar se rotina está completa
      console.log('🔍 Verificando se a rotina está completa...');
      const rotinaCompleta = await verificarRotinaCompleta(sessaoData.rotina_id);
      
      if (rotinaCompleta) {
        console.log('🎉 Rotina completa detectada! Iniciando processo de arquivamento...');
        
        // Primeiro atualizar status para Concluída (para o usuário ver)
        const statusAtualizado = await atualizarStatusRotina(sessaoData.rotina_id);
        
        if (statusAtualizado) {
          console.log('✅ Status atualizado! Iniciando arquivamento completo...');
          
          // Arquivar rotina completa (gerar PDF, upload, arquivar e deletar)
          const arquivada = await arquivarRotinaCompleta(sessaoData.rotina_id);
          
          if (arquivada) {
            console.log('🏆 ROTINA TOTALMENTE CONCLUÍDA E ARQUIVADA!');
            console.log('📄 PDF gerado e salvo no Cloudflare');
            console.log('🗄️ Dados históricos preservados');
            console.log('🗑️ Rotina removida das tabelas ativas');
          } else {
            console.log('⚠️ Rotina marcada como concluída, mas houve erro no arquivamento automático.');
          }
        } else {
          console.log('⚠️ Rotina está completa, mas houve erro ao atualizar status.');
        }
      } else {
        console.log('⏳ Rotina ainda em andamento, continuando normalmente...');
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao finalizar sessão:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [exercicios, sessaoData, tempoSessao, modoExecucao, verificarRotinaCompleta, atualizarStatusRotina, arquivarRotinaCompleta]);

  return {
    exercicios,
    loading,
    tempoSessao,
    atualizarSerieExecutada,
    pausarSessao,
    salvarExecucaoCompleta,
  };
};