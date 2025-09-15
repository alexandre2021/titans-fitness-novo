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
import { exercicioUtils } from '@/utils/exercicio.utils';
import { useExercicioLookup } from '@/utils/exercicioLookup';

// ✅ IMPORTS CORRIGIDOS - componentes shared
import { CronometroSerie } from './shared/CronometroSerie';
import { CronometroExercicio } from './shared/CronometroExercicio';
import { ExercicioDetalhesModal } from './shared/ExercicioDetalhesModal';
import { ExercicioHistoricoModal } from './shared/ExercicioHistoricoModal';
import { RegistroSerieCombinada } from './shared/RegistroSerieCombinada';
import { RegistroSerieSimples } from './shared/RegistroSerieSimples';

interface Props {
  sessaoId: string;
  sessaoData: SessaoData; // ✅ Recebe sessaoData como prop
  userProfile: UserProfile;
  modoExecucao: 'pt' | 'aluno';
  onSessaoFinalizada: () => void;
  onSessaoPausada: () => void;
}
export const Executor = ({ 
  sessaoId, 
  sessaoData, // ✅ Usa a prop
  userProfile, 
  modoExecucao,
  onSessaoFinalizada,
  onSessaoPausada
}: Props) => {
  const navigate = useNavigate();
  
  // Estados dos modais
  const [modalIntervaloSerie, setModalIntervaloSerie] = useState(false);
  const [modalIntervaloExercicio, setModalIntervaloExercicio] = useState(false);
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [modalHistoricoVisible, setModalHistoricoVisible] = useState(false);
  const [modalPausarVisible, setModalPausarVisible] = useState(false);
  
  const [exercicioSelecionado, setExercicioSelecionado] = useState('');
  const [dadosCronometroSerie, setDadosCronometroSerie] = useState<CronometroSerieData | null>(null);
  const [dadosCronometroExercicio, setDadosCronometroExercicio] = useState<CronometroExercicioData | null>(null);
  
  const [finalizando, setFinalizando] = useState(false);
  const [pausando, setPausando] = useState(false);
  const [sessaoPausada, setSessaoPausada] = useState(false);
  const [cronometroPausado, setCronometroPausado] = useState(false);

  // ✅ Efeito para interceptar a saída do navegador (fechar aba, recarregar)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Condição para ativar o bloqueio: treino em andamento
      const isExecuting = !sessaoPausada && !cronometroPausado && !finalizando && !pausando;
      
      if (isExecuting) {
        // Padrão para navegadores modernos
        event.preventDefault();
        // Necessário para alguns navegadores mais antigos (embora a mensagem não seja mais exibida)
        event.returnValue = 'Você tem certeza que quer sair? Seu progresso no treino será perdido.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessaoPausada, cronometroPausado, finalizando, pausando]);

  useEffect(() => {
    console.log('� Entrando na execução - Resetando estados locais');
    setSessaoPausada(false);
    setCronometroPausado(false);
  }, [sessaoId]);

  // Hook principal - ✅ CORRIGIDO: passa sessaoData ao invés de sessaoId
  const {
    exercicios,
    loading,
    tempoSessao,
    atualizarSerieExecutada,
    pausarSessao,
    salvarExecucaoCompleta,
  } = useExercicioExecucao(sessaoData, modoExecucao, cronometroPausado, navigate);

  // 🔥 DEBUG: Log dos exercícios sempre que mudarem
  useEffect(() => {
    console.log('🔥 DEBUG - EXERCÍCIOS ATUALIZADOS:', exercicios);
    exercicios.forEach((exercicio, exIdx) => {
      console.log(`Exercício ${exIdx}:`, {
        exercicio_1_id: exercicio.exercicio_1_id,
        series: exercicio.series.map((serie, sIdx) => ({
          numero: serie.numero_serie,
          executada: serie.executada,
          repeticoes_executadas: serie.repeticoes_executadas,
          carga_executada: serie.carga_executada,
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
  const { lookup } = useExercicioLookup(exercicioIds);

  // Funções
  const temHistorico = useCallback((exercicioNome: string): boolean => {
    return true;
  }, []);

  const mostrarModalPausar = useCallback(() => {
    setModalPausarVisible(true);
  }, []);

  // ✅ Pausar e sair
  const pausarESair = useCallback(async () => {
    setPausando(true);
    try {
      const sucesso = await pausarSessao();
      // A modal é fechada ANTES da navegação para garantir que a UI atualize.
      setModalPausarVisible(false);
      if (sucesso) {
        onSessaoPausada();
      }
    } finally {
      // Garante que o estado de 'pausando' seja resetado mesmo se ocorrer um erro.
      setPausando(false);
    }
  }, [pausarSessao, onSessaoPausada]);


  // ✅ Botão principal (pausar/continuar)
  const handleBotaoPrincipal = useCallback(() => {
    if (sessaoPausada || cronometroPausado) {
      // Continuar: resetar estados locais
      console.log('▶️ Continuando execução local...');
      setSessaoPausada(false);
      setCronometroPausado(false);
    } else {
      // Pausar: mostrar modal de confirmação
      console.log('⏸️ Abrindo modal de pausa...');
      setModalPausarVisible(true);
    }
  }, [sessaoPausada, cronometroPausado]);

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
        setDadosCronometroExercicio({
          intervalo: intervaloExercicio,
          exercicioAtual: lookup[exercicio.exercicio_1_id]?.nome || '',
          proximoExercicio: lookup[proximoExercicio.exercicio_1_id]?.nome || ''
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
  if (loading) {
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
              {modoExecucao === 'pt' ? (
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
                    if (exercicioUtils.ehSerieCombinada(serie)) {
                      return (
                        <RegistroSerieCombinada
                          key={`serie-combinada-${sIndex}`}
                          numero={serie.numero_serie}
                          exercicio1Nome={nome1}
                          exercicio2Nome={nome2 ?? ''}
                          repeticoes1={serie.repeticoes_1}
                          carga1={serie.carga_1}
                          repeticoes2={serie.repeticoes_2}
                          carga2={serie.carga_2}
                          initialReps1={serie.repeticoes_executadas || 0}
                          initialCarga1={serie.carga_executada || 0}
                          initialReps2={serie.repeticoes_2 || 0}
                          initialCarga2={serie.carga_2 || 0}
                          initialObs={serie.observacoes || ''}
                          executada={serie.executada}
                          isPesoCorporal1={exercicio.equipamento_1 === 'Peso Corporal'}
                          isPesoCorporal2={exercicio.equipamento_2 === 'Peso Corporal'}
                          onShowHistorico1={() => {
                            setExercicioSelecionado(exercicio.exercicio_1_id);
                            setModalHistoricoVisible(true);
                          }}
                          onShowDetalhes1={() => {
                            setExercicioSelecionado(exercicio.exercicio_1_id);
                            setModalDetalhesVisible(true);
                          }}
                          onShowHistorico2={() => {
                            setExercicioSelecionado(exercicio.exercicio_2_id ?? '');
                            setModalHistoricoVisible(true);
                          }}
                          onShowDetalhes2={() => {
                            setExercicioSelecionado(exercicio.exercicio_2_id ?? '');
                            setModalDetalhesVisible(true);
                          }}
                          onSave={(reps1, carga1, reps2, carga2, obs) => {
                            console.log('🔥 DEBUG - Salvando série combinada:', {
                              exIndex, sIndex, reps1, carga1, reps2, carga2, obs
                            });
                            atualizarSerieExecutada(exIndex, sIndex, {
                              repeticoes_executadas: reps1,
                              carga_executada: carga1,
                              repeticoes_2: reps2,
                              carga_2: carga2,
                              observacoes: obs,
                              executada: true
                            });
                            completarSerie(exIndex, sIndex);
                          }}
                        />
                      );
                    }
                    
                    return (
                      <RegistroSerieSimples
                        key={`serie-${sIndex}`}
                        numero={serie.numero_serie}
                        repeticoes={serie.repeticoes}
                        carga={serie.carga}
                        temDropset={serie.tem_dropset}
                        cargaDropset={serie.carga_dropset}
                        initialReps={serie.repeticoes_executadas || 0}
                        initialCarga={serie.carga_executada || 0}
                        initialDropsetReps={0}
                        initialDropsetCarga={serie.carga_dropset_executada || 0}
                        initialObs={serie.observacoes || ''}
                        executada={serie.executada}
                        isPesoCorporal={exercicio.equipamento_1 === 'Peso Corporal'}
                        onSave={(reps, carga, dropsetReps, dropsetCarga, obs) => {
                          console.log('🔥 DEBUG - Salvando série simples:', {
                            exIndex, sIndex, reps, carga, dropsetReps, dropsetCarga, obs
                          });
                          atualizarSerieExecutada(exIndex, sIndex, {
                            repeticoes_executadas: reps,
                            carga_executada: carga,
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
              disabled={pausando || finalizando || loading}
              className="flex-1"
            >
              {pausando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Processando...
                </>
              ) : (sessaoPausada || cronometroPausado) ? (
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
              disabled={finalizando || pausando || loading}
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
        exercicioAtual={dadosCronometroExercicio?.exercicioAtual || ''}
        proximoExercicio={dadosCronometroExercicio?.proximoExercicio || ''}
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

      <Modal
        isOpen={modalPausarVisible}
        onRequestClose={() => {}} // Impede o fechamento por ações padrão
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        className="bg-white rounded-lg max-w-sm w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div className="flex items-center p-6 border-b">
          <h2 className="text-lg font-semibold">Pausar Sessão</h2>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            O progresso atual será salvo. O que deseja fazer?
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setModalPausarVisible(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={pausarESair}
              disabled={pausando}
              className="w-full sm:w-auto"
            >
              {pausando ? 'Salvando...' : 'Pausar e Sair'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};