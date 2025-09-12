// src/hooks/useExercicioExecucao.ts
import { useCallback, useEffect, useState } from 'react';
import { MENSAGENS, SESSAO_STATUS } from '@/constants/exercicio.constants';
import { supabase } from '@/integrations/supabase/client';
import { ExercicioData, SerieData, SessaoData } from '@/types/exercicio.types';
import { useToast } from '@/hooks/use-toast';
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
  modoExecucao: 'pt' | 'aluno', 
  cronometroPausado: boolean = false,
  navigate: (path: string) => void
) => {
  const [exercicios, setExercicios] = useState<ExercicioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempoSessao, setTempoSessao] = useState(0);
  const [sessaoInvalida, setSessaoInvalida] = useState(false);
  const { toast } = useToast();

  // Carregar tempo salvo da sessão pausada
  useEffect(() => {
    if (sessaoData?.status === 'pausada' && sessaoData.tempo_decorrido) {
      console.log(`⏰ Resumindo sessão. Tempo inicial: ${sessaoData.tempo_decorrido}s`);
      setTempoSessao(sessaoData.tempo_decorrido);
    } else {
      // Inicia do zero para sessões novas ou não pausadas
      setTempoSessao(0);
    }
  }, [sessaoData]);

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
    let cancelado = false;

    const validarEcarregarExercicios = async () => {
      // Helper para centralizar o tratamento de erros e redirecionamento
      const handleInvalidSession = (title: string, description: string) => {
        if (cancelado) return;
        toast({ title, description, variant: "destructive" });
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
          handleInvalidSession("Execução não permitida", "Você não tem permissão para iniciar esta rotina. Fale com seu Personal Trainer.");
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
              repeticoes_executadas: 0,
              carga_executada: 0,
              carga_dropset_executada: 0,
              observacoes: '',
              executada: false
            };
            
            if (progressoSerie) {
              if (ex.exercicio_2_id) {
                // Série combinada - usar repeticoes_1/repeticoes_2 para exercícios separados.
                // Não preencher repeticoes_executadas/carga_executada aqui, pois são para séries simples.
                return {
                  ...serieBase,
                  repeticoes_1: progressoSerie.repeticoes_executadas_1 || 0,
                  carga_1: progressoSerie.carga_executada_1 || 0,
                  repeticoes_2: progressoSerie.repeticoes_executadas_2 || 0,
                  carga_2: progressoSerie.carga_executada_2 || 0,
                  carga_dropset_executada: progressoSerie.carga_dropset || 0,
                  observacoes: progressoSerie.observacoes || '',
                  executada: progressoSerie.repeticoes_executadas_1 !== null || progressoSerie.repeticoes_executadas_2 !== null
                };
              } else {
                // Série simples
                return {
                  ...serieBase,
                  repeticoes_executadas: progressoSerie.repeticoes_executadas_1 || 0,
                  carga_executada: progressoSerie.carga_executada_1 || 0,
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
        toast({ title: "Erro", description: "Não foi possível carregar os dados da sessão.", variant: "destructive" });
        setSessaoInvalida(true);
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    };

    validarEcarregarExercicios();
    return () => { cancelado = true; };
  }, [sessaoData, modoExecucao, navigate, toast]);

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
              const isExecuted = dadosSerie.repeticoes_executadas !== undefined || dadosSerie.carga_executada !== undefined ||
                                 dadosSerie.repeticoes_1 !== undefined || dadosSerie.carga_1 !== undefined ||
                                 dadosSerie.repeticoes_2 !== undefined || dadosSerie.carga_2 !== undefined;

              if (isExecuted) {
                novaSerie.executada = true;
                // ✅ CORREÇÃO: Se for série combinada, popular os campos genéricos
                // para que as funções de contagem funcionem corretamente.
                if (ex.exercicio_2_id) {
                  novaSerie.repeticoes_executadas = dadosSerie.repeticoes_1 ?? novaSerie.repeticoes_1 ?? 0;
                }
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
      console.log(`🔍 Verificando se rotina ${rotinaId} está completa (ignorando a sessão recém-concluída ${sessaoConcluidaId})`);
      
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

      // Contar sessões pendentes, ignorando a que acabamos de concluir.
      const sessoesPendentes = sessoes.filter(s => 
        s.id !== sessaoConcluidaId && // Ignora a sessão atual
        (s.status === 'em_aberto' || 
         s.status === 'em_andamento' || 
         s.status === 'pausada')
      );
      const totalSessoes = sessoes.length;

      console.log(`📊 Status das sessões:`, {
        total: totalSessoes,
        pendentes: sessoesPendentes.length,
        concluidasEstimadas: totalSessoes - sessoesPendentes.length 
      });

      const rotinaCompleta = sessoesPendentes.length === 0 && totalSessoes > 0;
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
      console.log('🚨 ATENÇÃO: A função arquivarRotinaCompleta foi chamada com o rotinaId:', rotinaId);
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
              series (*),
              exercicio_1:exercicios!exercicio_1_id(id, nome, equipamento),
              exercicio_2:exercicios!exercicio_2_id(id, nome, equipamento)
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

      // ✅ CORREÇÃO FINAL: Lógica FIFO robusta que deleta todos os excedentes de uma vez
      if (rotinasArquivadas && rotinasArquivadas.length >= 4) {
        console.log(`--- INÍCIO LÓGICA FIFO ---`);
        console.log(`Total de rotinas arquivadas encontradas: ${rotinasArquivadas.length}. Limite é 4.`);

        const rotinasOrdenadas = rotinasArquivadas.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        const LIMITE_ROTINAS = 4;
        
        // Calcula quantas rotinas precisam ser removidas para ficar com (LIMITE - 1) antes de adicionar a nova.
        const numeroParaDeletar = rotinasOrdenadas.length - (LIMITE_ROTINAS - 1);
        
        if (numeroParaDeletar > 0) {
          const rotinasParaDeletar = rotinasOrdenadas.slice(0, numeroParaDeletar);
          console.log(`Calculado que ${numeroParaDeletar} rotina(s) precisam ser deletadas.`);
          console.log('Rotinas a serem deletadas:', rotinasParaDeletar.map(r => ({ id: r.id, created_at: r.created_at })));

          const idsParaDeletar = rotinasParaDeletar.map(r => r.id);
          const urlsPdfParaDeletar = rotinasParaDeletar.map(r => r.pdf_url).filter((url): url is string => !!url);

          // 1. Deletar os PDFs associados do Cloudflare
          if (urlsPdfParaDeletar.length > 0) {
            console.log(`Deletando ${urlsPdfParaDeletar.length} PDFs do Cloudflare...`);
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            if (accessToken) {
              const deletePdfPromises = urlsPdfParaDeletar.map(async (pdfUrl) => {
                const filename = pdfUrl.split('/').pop()?.split('?')[0];
                if (!filename) {
                  console.warn(`⚠️ Não foi possível extrair nome do arquivo de: ${pdfUrl}`);
                  return;
                }
                try {
                  const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/delete-media', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                    body: JSON.stringify({ filename, bucket_type: 'rotinas' })
                  });
                  if (!response.ok) {
                    console.error(`Falha ao deletar PDF ${filename}: ${await response.text()}`);
                  } else {
                    console.log(`✅ PDF ${filename} deletado.`);
                  }
                } catch (e) {
                  console.error(`❌ Erro na chamada para deletar PDF ${filename}:`, e);
                }
              });
              await Promise.allSettled(deletePdfPromises);
            } else {
              console.warn('⚠️ Usuário não autenticado, pulando deleção de PDFs.');
            }
          }

          // 2. Deletar os registros do banco de dados de uma só vez
          if (idsParaDeletar.length > 0) {
            console.log(`Deletando ${idsParaDeletar.length} registros da tabela 'rotinas_arquivadas'...`);
            const { error: deleteError } = await supabase.from('rotinas_arquivadas').delete().in('id', idsParaDeletar);

            if (deleteError) {
              console.error('❌ Erro ao deletar registros do banco:', deleteError);
              throw new Error("Falha ao limpar rotinas antigas do banco de dados.");
            } else {
              console.log('✅ Registros antigos deletados do banco com sucesso.');
            }
          }
        }
        console.log(`--- FIM LÓGICA FIFO ---`);
      }
      // --- FIM DA LÓGICA FIFO ---

      // 2. Buscar execuções da rotina
      const { data: execucoes, error: execucoesError } = await supabase
        .from('execucoes_sessao')
        .select('*, execucoes_series(*)')
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

      // ✅ CORREÇÃO: A função de PDF espera um objeto com a chave "rotina".
      const payloadParaPDF = {
        rotina: rotinaCompleta, // `rotinaCompleta` já contém os dados do PT
        execucoes: execucoes || []
      };

      const pdfResponse = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/gerar-pdf-conclusao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payloadParaPDF)
      });

      if (!pdfResponse.ok) {
        console.error('❌ Erro ao gerar PDF:', await pdfResponse.text());
        return false;
      }

      const { pdf_base64 } = (await pdfResponse.json()) as PdfResponse;
      console.log('✅ PDF gerado com sucesso!');

      // 4. ✅ CORREÇÃO: Upload do PDF para Cloudflare R2 usando a função 'upload-media'
      console.log('☁️ Fazendo upload do PDF para Cloudflare...');
      const filename = `rotina_${rotinaId}_${Date.now()}.pdf`;
      
      // Converter base64 para Blob
      const pdfBlob = await (await fetch(`data:application/pdf;base64,${pdf_base64}`)).blob();

      // Obter URL pré-assinada da função 'upload-media'
      const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
        body: {
          action: 'generate_upload_url',
          filename: filename,
          contentType: 'application/pdf',
          bucket_type: 'rotinas'
        }
      });

      if (presignedError || !presignedData.signedUrl) {
        throw new Error(presignedError?.message || 'Não foi possível obter URL de upload para o PDF.');
      }

      // Upload direto para Cloudflare R2
      const uploadResponse = await fetch(presignedData.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: pdfBlob
      });

      if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.text();
        console.error('Erro no corpo da resposta do upload do PDF:', errorBody);
        throw new Error(`Erro no upload do PDF: ${uploadResponse.status}`);
      }

      const pdfUrl = presignedData.path; // Usar o caminho retornado pela função
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

      // ✅ MELHORIA: A exclusão em cascata deve ser feita no banco de dados (ON DELETE CASCADE).
      // Esta única chamada deletará a rotina e todos os seus dados relacionados (treinos, exercícios, séries, sessões, etc.).
      const { error: deleteError } = await supabase
        .from('rotinas')
        .delete()
        .eq('id', rotinaId);

      if (deleteError) throw new Error(`Falha ao remover a rotina da base ativa: ${deleteError.message}`);

      console.log('🎉 Processo de arquivamento concluído com sucesso!');
      return true;

    } catch (error) {
      console.error('❌ Erro no processo de arquivamento:', error);
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
          observacoes: `Concluído em modo ${modoExecucao.toUpperCase()} - ${totalSeriesExecutadas} séries realizadas`
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
        console.log('🎉 Rotina completa detectada! Iniciando processo completo...');
        
        // Atualizar status primeiro
        const statusAtualizado = await atualizarStatusRotina(sessaoData.rotina_id);
        if (statusAtualizado) {
          console.log('✅ Status atualizado, iniciando arquivamento...');
          
          // 🚨 CORREÇÃO PRINCIPAL: Executar arquivamento automático
          const arquivamentoConcluido = await arquivarRotinaCompleta(sessaoData.rotina_id);
          if (arquivamentoConcluido) {
            console.log('🎉 Rotina arquivada automaticamente com sucesso!');
          } else {
            console.error('❌ Falha no arquivamento automático da rotina');
            // Não falha a finalização da sessão por causa do arquivamento
          }
        } else {
          console.error('❌ Falha ao atualizar status da rotina');
        }
      }

      return true; // Retorna sucesso

    } catch (error) {
      console.error('❌ Erro ao finalizar sessão:', error);
      toast({
        title: "Erro ao Finalizar",
        description: "Não foi possível salvar a sessão. Tente novamente.",
        variant: "destructive"
      });
      return false; // Retorna falha
    } finally {
      setLoading(false);
    }
  }, [exercicios, sessaoData, tempoSessao, modoExecucao, verificarRotinaCompleta, atualizarStatusRotina, arquivarRotinaCompleta, sessaoInvalida, toast]);

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