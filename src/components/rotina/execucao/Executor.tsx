// src/components/rotina/execucao/Executor.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Play, Pause, Square, X } from 'lucide-react';
import Modal from 'react-modal';
import { EXERCICIO_CONSTANTS, MENSAGENS } from '@/constants/exercicio.constants';
import { useExercicioExecucao } from '@/hooks/useExercicioExecucao';
import { 
  CronometroSerieData, 
  CronometroExercicioData, 
  SessaoData, 
  UserProfile 
} from '@/types/exercicio.types';
import { exercicioUtils } from '@/utils/exercicio.utils'; // This path is probably fine
import { useExercicioLookup } from '@/hooks/useExercicioLookup'; // Correcting the import path

// ✅ IMPORTS CORRIGIDOS - componentes shared
import { CronometroSerie } from './shared/CronometroSerie';
import { CronometroExercicio } from './shared/CronometroExercicio';
import { ExercicioDetalhesModal } from './shared/ExercicioDetalhesModal';
import { ExercicioHistoricoModal } from './shared/ExercicioHistoricoModal';
import { RegistroSerieCombinada } from './shared/RegistroSerieCombinada';
import { ExercicioInfo } from '@/types/rotina.types';
import { RegistroSerieSimples } from './shared/RegistroSerieSimples';

interface Props {
  sessaoId: string;
  sessaoData: SessaoData; // ✅ Recebe sessaoData como prop
  userProfile: UserProfile;
  modoExecucao: 'professor' | 'aluno';
  onSessaoFinalizada: () => void;
  onShowPauseDialog: () => void; // Novo callback para mostrar o modal
  onTimeUpdate: (time: number) => void; // Novo callback para enviar o tempo atual
}
export const Executor = ({ 
  sessaoId, 
  sessaoData, // ✅ Usa a prop
  userProfile, 
  modoExecucao,
  onSessaoFinalizada,
  onShowPauseDialog,
  onTimeUpdate,
}: Props) => {
  const navigate = useNavigate();
  
  // Estados dos modais
  const [modalIntervaloSerie, setModalIntervaloSerie] = useState(false);
  const [modalIntervaloExercicio, setModalIntervaloExercicio] = useState(false);
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [modalHistoricoVisible, setModalHistoricoVisible] = useState(false);
  
  const [exercicioSelecionado, setExercicioSelecionado] = useState('');
  const [dadosCronometroSerie, setDadosCronometroSerie] = useState<CronometroSerieData | null>(null);
  const [dadosCronometroExercicio, setDadosCronometroExercicio] = useState<CronometroExercicioData | null>(null);
  
  const [finalizando, setFinalizando] = useState(false);
  const [sessaoPausada, setSessaoPausada] = useState(false);
  const [cronometroPausado, setCronometroPausado] = useState(false);

  // ✅ Efeito para interceptar a saída do navegador (fechar aba, recarregar)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Condição para ativar o bloqueio: treino em andamento
      const isExecuting = !sessaoPausada && !cronometroPausado && !finalizando;
      
      if (isExecuting) {
        // Padrão para navegadores modernos
        event.preventDefault();
        // Necessário para alguns navegadores mais antigos (embora a mensagem não seja mais exibida)
        event.returnValue = 'Você tem certeza que quer sair? Seu progresso no treino será perdido.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessaoPausada, cronometroPausado, finalizando]);

  useEffect(() => {
    console.log('� Entrando na execução - Resetando estados locais');
    setSessaoPausada(false);
    setCronometroPausado(false);
  }, [sessaoId]);

  // Hook principal - ✅ CORRIGIDO: passa sessaoData ao invés de sessaoId
  const {
    exercicios,
    loading: exerciciosLoading,
    tempoSessao,
    atualizarSerieExecutada,
    pausarSessao,
    salvarExecucaoCompleta,
  } = useExercicioExecucao(sessaoData, modoExecucao, cronometroPausado, navigate);
  
  // ✅ NOVO: Efeito para notificar a página pai sobre a atualização do tempo
  useEffect(() => {
    if (onTimeUpdate) {
      onTimeUpdate(tempoSessao);
    }
  }, [tempoSessao, onTimeUpdate]);
  // 🔥 DEBUG: Log dos exercícios sempre que mudarem
  useEffect(() => {
    console.log('🔥 DEBUG - EXERCÍCIOS ATUALIZADOS:', exercicios);
    exercicios.forEach((exercicio, exIdx) => {
      console.log(`Exercício ${exIdx}:`, {
        exercicio_1_id: exercicio.exercicio_1_id,
        exercicio_2_id: exercicio.exercicio_2_id,
        isCombinada: !!exercicio.exercicio_2_id,
        series: exercicio.series.map((serie, sIdx) => ({
          numero: serie.numero_serie,
          executada: serie.executada,
          repeticoes_executadas_1: serie.repeticoes_executadas_1,
          carga_executada_1: serie.carga_executada_1,
          observacoes: serie.observacoes
        }))
      });
    });
  }, [exercicios]);

  // Lookup de nomes dos exercícios
  const exercicioIds: string[] = React.useMemo(() => {
    return Array.from(new Set(
      exercicios.flatMap(e => [e.exercicio_1_id, e.exercicio_2_id])
        .filter((id): id is string => typeof id === 'string')
    ));
  }, [exercicios]);
  const { getExercicioInfo, loading: lookupLoading } = useExercicioLookup();

  const lookup = React.useMemo(() => {
    const newLookup: { [key: string]: ExercicioInfo } = {};
    exercicioIds.forEach(id => {
      newLookup[id] = getExercicioInfo(id);
    });
    return newLookup;
  }, [exercicioIds, getExercicioInfo]);

  // Funções
  const temHistorico = useCallback((exercicioNome: string): boolean => {
    return true;
  }, []);

  // Combina os estados de loading
  const loading = exerciciosLoading || lookupLoading;

  // ✅ Botão principal (pausar/continuar)
  const handleBotaoPrincipal = () => {
    if (sessaoPausada || cronometroPausado) {
      // Continuar: resetar estados locais
      console.log('▶️ Continuando execução local...');
      setSessaoPausada(false);
      setCronometroPausado(false);
    } else {
      // ✅ CHAMADA DIRETA - sem modal local
      console.log('⏸️ Pausando via callback...');
      onShowPauseDialog(); // Chama o novo callback para abrir o modal
    }
  };

  // ✅ FUNÇÃO SIMPLIFICADA - finalizarSessao (igual ao PT)
  const finalizarSessao = useCallback(async () => {
    console.log('🔥 DEBUG - INICIANDO finalizarSessao');
    console.log('🔥 DEBUG - modoExecucao:', modoExecucao);
    console.log('🔥 DEBUG - SEM VERIFICAÇÃO DE COMPLETUDE - Finalizando direto...');
    
    // Finalizar direto (igual ao PT)
    console.log('🔥 DEBUG - Chamando salvarExecucaoCompleta...');
    setFinalizando(true);
    const sucesso = await salvarExecucaoCompleta();
    
    if (sucesso) {
      console.log('🔥 DEBUG - Execução salva com sucesso!');
      onSessaoFinalizada();
    } else {
      console.log('🔥 DEBUG - ERRO ao salvar execução!');
    }
    
    setFinalizando(false);
  }, [modoExecucao, salvarExecucaoCompleta, onSessaoFinalizada]);

  // ✅ AGORA completarSerie pode usar finalizarSessao
  const completarSerie = useCallback((exercicioIndex: number, serieIndex: number) => {
    console.log('🔥 DEBUG - COMPLETANDO SÉRIE:', { exercicioIndex, serieIndex });
    
    atualizarSerieExecutada(exercicioIndex, serieIndex, { executada: true });
    
    const exercicio = exercicios[exercicioIndex];
    const serie = exercicio.series[serieIndex];
    
    console.log('🔥 DEBUG - Série sendo completada:', {
      numero_serie: serie.numero_serie,
      executada_antes: serie.executada,
      exercicioIndex,
      serieIndex
    });
    
    const ehUltimaSerie = exercicioUtils.ehUltimaSerie(serie, exercicio.series);
    const ehUltimoExercicio = exercicioUtils.ehUltimoExercicio(exercicioIndex, exercicios.length);
    
    console.log('🔥 DEBUG - Flags:', { ehUltimaSerie, ehUltimoExercicio });
    
    // ✅ VERIFICAR SE TODAS AS SÉRIES ESTÃO COMPLETAS
    const verificarSessaoCompleta = () => {
      // Simular o estado após esta série ser marcada como executada
      const exerciciosAtualizados = exercicios.map((ex, exIdx) => {
        if (exIdx === exercicioIndex) {
          return {
            ...ex,
            series: ex.series.map((s, sIdx) => {
              if (sIdx === serieIndex) {
                return { ...s, executada: true };
              }
              return s;
            })
          };
        }
        return ex;
      });

      // Verificar se todas as séries estão executadas
      const totalSeries = exerciciosAtualizados.reduce((total, ex) => total + ex.series.length, 0);
      const seriesExecutadas = exerciciosAtualizados.reduce((total, ex) => 
        total + ex.series.filter(s => s.executada).length, 0
      );

      console.log('🔥 DEBUG - verificarSessaoCompleta:', {
        totalSeries,
        seriesExecutadas,
        todasCompletas: seriesExecutadas === totalSeries,
        exerciciosAtualizados: exerciciosAtualizados.map(ex => ({
          series: ex.series.map(s => ({ numero: s.numero_serie, executada: s.executada }))
        }))
      });

      return seriesExecutadas === totalSeries;
    };

    // ✅ LÓGICA DE INTERVALOS E FINALIZAÇÃO SIMPLIFICADA
    if (!ehUltimaSerie) {
      console.log('🔥 DEBUG - Não é última série, iniciando intervalo...');
      // Intervalo entre séries
      const intervaloSerie = serie.intervalo_apos_serie || EXERCICIO_CONSTANTS.INTERVALO_PADRAO_SERIE;
      setDadosCronometroSerie({ intervalo: intervaloSerie });
      setModalIntervaloSerie(true);
    } else {
      console.log('🔥 DEBUG - É ÚLTIMA SÉRIE, verificando se sessão está completa...');
      // ✅ ÚLTIMA SÉRIE DE QUALQUER EXERCÍCIO
      // Primeiro: verificar se TODAS as séries estão completas
      if (verificarSessaoCompleta()) {
        console.log('🔥 DEBUG - SESSÃO COMPLETA! Finalizando automaticamente...');
        // 🚀 FINALIZAR AUTOMATICAMENTE (sem verificação de completude)
        setTimeout(() => {
          finalizarSessao();
        }, 500); // Pequeno delay para melhor UX (mostrar série como completa primeiro)
      } else if (!ehUltimoExercicio) {
        console.log('🔥 DEBUG - Ainda há exercícios, iniciando intervalo entre exercícios...');
        // Só mostra intervalo entre exercícios se ainda há exercícios não executados
        // E se não é o último exercício por índice
        const intervaloExercicio = exercicio.intervalo_apos_exercicio || EXERCICIO_CONSTANTS.INTERVALO_PADRAO_EXERCICIO;
        const proximoExercicio = exercicios[exercicioIndex + 1];

        const nomeAtual1 = lookup[exercicio.exercicio_1_id]?.nome || '';
        const nomeAtual2 = exercicio.exercicio_2_id ? (lookup[exercicio.exercicio_2_id]?.nome || null) : null;
        const nomeCompletoAtual = nomeAtual2 ? `${nomeAtual1} + ${nomeAtual2}` : nomeAtual1;

        const proximoNome1 = lookup[proximoExercicio.exercicio_1_id]?.nome || '';
        const proximoNome2 = proximoExercicio.exercicio_2_id ? (lookup[proximoExercicio.exercicio_2_id]?.nome || null) : null;
        setDadosCronometroExercicio({
          intervalo: intervaloExercicio,
          exercicioAtual: nomeCompletoAtual,
          proximoExercicio: { nome1: proximoNome1, nome2: proximoNome2 }
        });
        setModalIntervaloExercicio(true);
      } else {
        console.log('🔥 DEBUG - É último exercício mas sessão não está completa, aguardando...');
      }
      // Se ehUltimoExercicio = true mas verificarSessaoCompleta() = false,
      // significa que há outros exercícios ainda não executados, então não faz nada
    }
  }, [exercicios, atualizarSerieExecutada, lookup, finalizarSessao]); // ✅ finalizarSessao nas dependências

  // Loading
  if (loading) { // This will now use the combined loading state
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{MENSAGENS.CARREGANDO}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {sessaoData?.treinos?.nome || sessaoData?.rotinas?.nome || 'Treino'}
              </h1>
              {modoExecucao === 'professor' ? (
                sessaoData?.alunos?.nome_completo && (
                  <p className="text-muted-foreground mt-1">
                    {sessaoData.alunos.nome_completo}
                  </p>
                )
              ) : (
                <p className="text-muted-foreground mt-1">
                  Olá, {userProfile.nome_completo}!
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-xl font-mono text-foreground">
                {exercicioUtils.formatarTempo(tempoSessao)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Exercícios */}
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        {exercicios.map((exercicio, exIndex) => {
          // Lookup dos nomes
          const nome1 = lookup[exercicio.exercicio_1_id]?.nome || 'Exercício';
          const nome2 = exercicio.exercicio_2_id ? (lookup[exercicio.exercicio_2_id]?.nome || 'Exercício') : null;
          
          return (
            <Card key={`exercicio-${exIndex}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-secondary">
                    {nome2 ? `${nome1} + ${nome2}` : nome1}
                  </h3>
                  {!exercicio.exercicio_2_id && (
                    <div className="flex items-center space-x-2">
                      {temHistorico(exercicio.exercicio_1_id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setExercicioSelecionado(exercicio.exercicio_1_id);
                            setModalHistoricoVisible(true);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M7 16l4-4 4 4 4-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setExercicioSelecionado(exercicio.exercicio_1_id);
                          setModalDetalhesVisible(true);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                          <path d="M12 6h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  {exercicio.series.map((serie, sIndex) => {
                    // ✅ CORREÇÃO: A verificação do tipo de série é feita no objeto 'exercicio' pai.
                    if (exercicio.exercicio_2_id) {
                      const info1 = lookup[exercicio.exercicio_1_id];
                      const info2 = lookup[exercicio.exercicio_2_id];
                      return (
                        <RegistroSerieCombinada
                          key={`serie-combinada-${sIndex}`}
                          numero={serie.numero_serie}
                          exercicio1Nome={nome1}
                          exercicio2Nome={nome2 ?? ''}
                          repeticoes1={serie.repeticoes_1 || 0}
                          carga1={serie.carga_1 || 0}
                          repeticoes2={serie.repeticoes_2 || 0}
                          carga2={serie.carga_2 || 0}
                          initialReps1={serie.repeticoes_executadas_1 || 0}
                          initialCarga1={serie.carga_executada_1 || 0}
                          initialReps2={serie.repeticoes_executadas_2 || 0}
                          initialCarga2={serie.carga_executada_2 || 0}
                          initialObs={serie.observacoes || ''}
                          executada={serie.executada}
                          isPesoCorporal1={info1?.equipamento === 'Peso Corporal'}
                          isPesoCorporal2={info2?.equipamento === 'Peso Corporal'}
                          onShowHistorico1={() => {
                            setExercicioSelecionado(exercicio.exercicio_1_id);
                            setModalHistoricoVisible(true);
                          }}
                          onShowDetalhes1={() => {
                            setExercicioSelecionado(exercicio.exercicio_1_id);
                            setModalDetalhesVisible(true);
                          }}
                          onShowHistorico2={() => {
                            if (exercicio.exercicio_2_id) setExercicioSelecionado(exercicio.exercicio_2_id);
                            setModalHistoricoVisible(true);
                          }}
                          onShowDetalhes2={() => {
                            if (exercicio.exercicio_2_id) setExercicioSelecionado(exercicio.exercicio_2_id);
                            setModalDetalhesVisible(true);
                          }}
                          onSave={(reps1, carga1, reps2, carga2, obs) => {
                            atualizarSerieExecutada(exIndex, sIndex, {
                              repeticoes_executadas_1: reps1,
                              carga_executada_1: carga1,
                              repeticoes_executadas_2: reps2,
                              carga_executada_2: carga2,
                              observacoes: obs,
                              executada: true
                            });
                            completarSerie(exIndex, sIndex);
                          }}
                        />
                      );
                    }
                    const info1 = lookup[exercicio.exercicio_1_id];
                    return (
                      <RegistroSerieSimples
                        key={`serie-${sIndex}`}
                        numero={serie.numero_serie}
                        repeticoes={serie.repeticoes || 0}
                        carga={serie.carga || 0}
                        temDropset={serie.tem_dropset}
                        cargaDropset={serie.carga_dropset || 0}
                        initialReps={serie.repeticoes_executadas_1 || 0}
                        initialCarga={serie.carga_executada_1 || 0}
                        initialDropsetReps={0}
                        initialDropsetCarga={serie.carga_dropset_executada || 0}
                        initialObs={serie.observacoes || ''}
                        executada={serie.executada}
                        isPesoCorporal={info1?.equipamento === 'Peso Corporal'}
                        onSave={(reps, carga, dropsetCarga, obs) => {
                          atualizarSerieExecutada(exIndex, sIndex, {
                            repeticoes_executadas_1: reps,
                            carga_executada_1: carga,
                            carga_dropset_executada: dropsetCarga,
                            observacoes: obs,
                            executada: true
                          });
                          completarSerie(exIndex, sIndex);
                        }}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer com botões */}
      <div className="border-t bg-card">
        <div className="container max-w-4xl mx-auto p-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleBotaoPrincipal}
              disabled={finalizando || loading}
              className="flex-1"
            >
              {(sessaoPausada || cronometroPausado) ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Continuar
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </>
              )}
            </Button>

            <Button
              size="lg"
              onClick={() => {
                console.log('🔥 DEBUG - BOTÃO FINALIZAR CLICADO');
                finalizarSessao();
              }}
              disabled={finalizando || loading}
              className="flex-1"
            >
              {finalizando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Finalizando...
                </>
              ) : (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Finalizar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CronometroSerie
        visible={modalIntervaloSerie}
        onClose={() => setModalIntervaloSerie(false)}
        onComplete={() => {
          setModalIntervaloSerie(false);
          setDadosCronometroSerie(null);
        }}
        intervaloSerie={dadosCronometroSerie?.intervalo || null}
      />

      <CronometroExercicio
        visible={modalIntervaloExercicio}
        onClose={() => setModalIntervaloExercicio(false)}
        onComplete={() => {
          setModalIntervaloExercicio(false);
          setDadosCronometroExercicio(null);
        }}
        intervaloExercicio={dadosCronometroExercicio?.intervalo || null}
        exercicioAtual={dadosCronometroExercicio?.exercicioAtual}
        proximoExercicio={dadosCronometroExercicio?.proximoExercicio}
      />

      <ExercicioDetalhesModal
        visible={modalDetalhesVisible}
        exercicioId={exercicioSelecionado}
        onClose={() => setModalDetalhesVisible(false)}
      />

      <ExercicioHistoricoModal
        visible={modalHistoricoVisible}
        exercicioId={exercicioSelecionado}
        treinoId={sessaoData.treino_id}
        alunoId={sessaoData.aluno_id}
        onClose={() => setModalHistoricoVisible(false)}
      />
    </div>
  );
};