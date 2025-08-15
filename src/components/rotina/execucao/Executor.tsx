// src/components/rotina/execucao/Executor.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Clock, Play, Pause, Square, AlertTriangle } from 'lucide-react';
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
  sessaoData: SessaoData;
  userProfile: UserProfile;
  modoExecucao: 'pt' | 'aluno';
  onSessaoFinalizada: () => void;
}

export const Executor = ({ 
  sessaoId, 
  sessaoData, 
  userProfile, 
  modoExecucao,
  onSessaoFinalizada 
}: Props) => {
  // Estados dos modais
  const [modalIntervaloSerie, setModalIntervaloSerie] = useState(false);
  const [modalIntervaloExercicio, setModalIntervaloExercicio] = useState(false);
  const [modalDetalhesVisible, setModalDetalhesVisible] = useState(false);
  const [modalHistoricoVisible, setModalHistoricoVisible] = useState(false);
  const [modalPausarVisible, setModalPausarVisible] = useState(false);
  const [modalFinalizarIncompleta, setModalFinalizarIncompleta] = useState(false);
  
  const [exercicioSelecionado, setExercicioSelecionado] = useState('');
  const [dadosCronometroSerie, setDadosCronometroSerie] = useState<CronometroSerieData | null>(null);
  const [dadosCronometroExercicio, setDadosCronometroExercicio] = useState<CronometroExercicioData | null>(null);
  
  const [finalizando, setFinalizando] = useState(false);
  const [pausando, setPausando] = useState(false);
  const [sessaoPausada, setSessaoPausada] = useState(false);
  const [cronometroPausado, setCronometroPausado] = useState(false);

  // ✅ Reset local instantâneo ao entrar na execução
  useEffect(() => {
    console.log('🚀 Entrando na execução - Resetando estados locais');
    setSessaoPausada(false);
    setCronometroPausado(false);
  }, [sessaoId]);

  // Hook principal
  const {
    exercicios,
    loading,
    tempoSessao,
    atualizarSerieExecutada,
    pausarSessao,
    salvarExecucaoCompleta,
  } = useExercicioExecucao(sessaoData, modoExecucao, cronometroPausado);

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
    setModalPausarVisible(false);
    setPausando(true);
    const sucesso = await pausarSessao();
    if (sucesso) {
      onSessaoFinalizada();
    }
    setPausando(false);
  }, [pausarSessao, onSessaoFinalizada]);

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

  const completarSerie = useCallback((exercicioIndex: number, serieIndex: number) => {
    atualizarSerieExecutada(exercicioIndex, serieIndex, { executada: true });
    
    const exercicio = exercicios[exercicioIndex];
    const serie = exercicio.series[serieIndex];
    
    const ehUltimaSerie = exercicioUtils.ehUltimaSerie(serie, exercicio.series);
    const ehUltimoExercicio = exercicioUtils.ehUltimoExercicio(exercicioIndex, exercicios.length);
    
    if (!ehUltimaSerie) {
      const intervaloSerie = serie.intervalo_apos_serie || EXERCICIO_CONSTANTS.INTERVALO_PADRAO_SERIE;
      setDadosCronometroSerie({ intervalo: intervaloSerie });
      setModalIntervaloSerie(true);
    } else if (!ehUltimoExercicio) {
      const intervaloExercicio = exercicio.intervalo_apos_exercicio || EXERCICIO_CONSTANTS.INTERVALO_PADRAO_EXERCICIO;
      const proximoExercicio = exercicios[exercicioIndex + 1];
      setDadosCronometroExercicio({
        intervalo: intervaloExercicio,
        exercicioAtual: lookup[exercicio.exercicio_1_id]?.nome || '',
        proximoExercicio: lookup[proximoExercicio.exercicio_1_id]?.nome || ''
      });
      setModalIntervaloExercicio(true);
    }
  }, [exercicios, atualizarSerieExecutada, lookup]);

  const finalizarSessao = useCallback(async () => {
    // Verificação de completude apenas para aluno
    if (modoExecucao === 'aluno') {
      const totalSeries = exercicios.reduce((total, exercicio) => {
        return total + exercicio.series.length;
      }, 0);
      
      const seriesExecutadas = exercicios.reduce((total, exercicio) => {
        return total + exercicio.series.filter(serie => serie.executada).length;
      }, 0);
      
      const percentual = Math.round((seriesExecutadas / totalSeries) * 100);
      
      if (percentual !== 100) {
        setModalFinalizarIncompleta(true);
        return;
      }
    }
    
    // Finalizar direto
    setFinalizando(true);
    const sucesso = await salvarExecucaoCompleta();
    
    if (sucesso) {
      onSessaoFinalizada();
    }
    
    setFinalizando(false);
  }, [modoExecucao, exercicios, salvarExecucaoCompleta, onSessaoFinalizada]);

  const forcarFinalizacao = useCallback(async () => {
    setModalFinalizarIncompleta(false);
    setFinalizando(true);
    
    const sucesso = await salvarExecucaoCompleta();
    if (sucesso) {
      onSessaoFinalizada();
    }
    
    setFinalizando(false);
  }, [salvarExecucaoCompleta, onSessaoFinalizada]);

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
              onClick={finalizarSessao}
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

      {/* Modal de Pausar */}
      <Dialog open={modalPausarVisible} onOpenChange={setModalPausarVisible}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pausar Sessão</DialogTitle>
            <DialogDescription>
              O progresso atual será salvo. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col space-y-3 pt-4">
            <Button 
              variant="outline"
              onClick={pausarESair}
              disabled={pausando}
              className="w-full"
            >
              {pausando ? 'Salvando...' : 'Pausar e Sair'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalPausarVisible(false)}
              className="w-full"
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Finalizar Incompleta (apenas para aluno) */}
      {modoExecucao === 'aluno' && (
        <Dialog open={modalFinalizarIncompleta} onOpenChange={setModalFinalizarIncompleta}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>Finalizar Sessão Incompleta</span>
              </DialogTitle>
              <DialogDescription>
                {(() => {
                  const totalSeries = exercicios.reduce((total, exercicio) => {
                    return total + exercicio.series.length;
                  }, 0);
                  
                  const seriesExecutadas = exercicios.reduce((total, exercicio) => {
                    return total + exercicio.series.filter(serie => serie.executada).length;
                  }, 0);
                  
                  const seriesRestantes = totalSeries - seriesExecutadas;
                  const percentual = Math.round((seriesExecutadas / totalSeries) * 100);
                  
                  return (
                    <div className="space-y-3">
                      <p>
                        {seriesExecutadas === 0 
                          ? 'Nenhuma série foi executada.'
                          : `Ainda restam ${seriesRestantes} série${seriesRestantes !== 1 ? 's' : ''} por executar.`
                        }
                      </p>
                      
                      <p className="text-sm text-muted-foreground">
                        Deseja mesmo finalizar a sessão?
                      </p>
                      
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm font-medium">
                          📊 Progresso: {seriesExecutadas}/{totalSeries} séries ({percentual}%)
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col space-y-3 pt-4">
              <Button 
                variant="destructive"
                onClick={forcarFinalizacao}
                disabled={finalizando}
                className="w-full"
              >
                {finalizando ? 'Finalizando...' : 'Finalizar Mesmo Assim'}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setModalFinalizarIncompleta(false)}
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};