import { SerieConfig } from '@/types/rotina.types';
// src/pages/RotinaRevisao.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Check, User, Calendar, Target, DollarSign, Clock, Dumbbell, Info, AlertCircle, CheckCircle2, BicepsFlexed, ClipboardType } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle 
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useRotinaStorage } from '@/hooks/useRotinaStorage';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';

// Cores para badges
const CORES_GRUPOS_MUSCULARES: {[key: string]: string} = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800',
  'Pernas': 'bg-green-100 text-green-800',
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-green-100 text-green-800',
  'Panturrilha': 'bg-green-100 text-green-800',
  'Trapézio': 'bg-blue-100 text-blue-800'
};

const CORES_DIFICULDADES: {[key: string]: string} = {
  'Baixa': 'bg-green-100 text-green-800',
  'Média': 'bg-yellow-100 text-yellow-800',
  'Alta': 'bg-red-100 text-red-800'
};

type Aluno = Tables<'alunos'>;

// Hook para detectar se é mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Componente responsivo que escolhe entre Modal e Drawer
interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

const ResponsiveCancelModal = ({ open, onOpenChange, title, children }: ResponsiveModalProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};


const RotinaRevisao: React.FC = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const rotinaStorage = useRotinaStorage(alunoId!);
  const { getExercicioInfo } = useExercicioLookup();

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const isDirty = observacoes.trim() !== '';

  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      handleDescartar();
    }
  };

  // All useEffect hooks moved to the top, deduplicated and not after any return
  // Limpeza de storage ao sair da página (hook deve ser chamado sempre, no topo)
  useEffect(() => {
    const handleBeforeUnload = () => {
      rotinaStorage.limparStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [rotinaStorage]);

  // Carregar dados do aluno (sempre no topo)
  useEffect(() => {
    const carregarAluno = async () => {
      if (!alunoId) return;
      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('*')
          .eq('id', alunoId)
          .single();
        if (error || !data) {
          toast({
            title: "Erro",
            description: "Não foi possível carregar os dados do aluno.",
            variant: "destructive"
          });
          navigate('/alunos');
          return;
        }
        setAluno(data);
      } catch (error) {
        console.error('Erro ao carregar aluno:', error);
        navigate('/alunos');
      } finally {
        setLoading(false);
      }
    };
    carregarAluno();
  }, [alunoId, navigate, toast]);

  const handleSalvarRascunho = async () => {
    setFinalizando(true);
    try {
      const { success } = await rotinaStorage.salvarComoRascunho({ observacoesRotina: observacoes });

      if (success) {
        rotinaStorage.limparStorage();
        toast({ title: "Rascunho salvo!", description: "Você pode continuar de onde parou mais tarde." });
        navigate(`/alunos-rotinas/${alunoId}`);
      } else {
        throw new Error("Falha ao salvar rascunho.");
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar o rascunho.", variant: "destructive" });
    } finally {
      setFinalizando(false);
      setShowCancelDialog(false);
    }
  };

  // Verificar se tem dados completos aguardando isLoaded (sempre no topo)
  useEffect(() => {
    if (!rotinaStorage.isLoaded) return;
    if (!rotinaStorage.storage.configuracao || 
        !rotinaStorage.storage.treinos || 
        !rotinaStorage.storage.exercicios) {
      toast({
        title: "Dados incompletos",
        description: "Complete todas as etapas antes de finalizar a rotina.",
        variant: "destructive"
      });
      navigate(`/rotinas-criar/${alunoId}/exercicios`);
      return;
    }
    const { treinos, exercicios } = rotinaStorage.storage;
    const treinosSemExercicios = treinos.filter(treino => 
      !exercicios[treino.id] || exercicios[treino.id].length === 0
    );
    if (treinosSemExercicios.length > 0) {
      toast({
        title: "Exercícios pendentes",
        description: "Todos os treinos devem ter pelo menos 1 exercício.",
        variant: "destructive"
      });
      navigate(`/rotinas-criar/${alunoId}/exercicios`);
      return;
    }
  }, [alunoId, navigate, toast, rotinaStorage.isLoaded, rotinaStorage.storage]);
  const handleFinalizar = async () => {
    if (!user || !aluno) return;

    const { configuracao, treinos, exercicios } = rotinaStorage.storage;
    if (!configuracao || !treinos || !exercicios) return;

    setFinalizando(true);

    try {
      // 1. Criar rotina principal

      const { data: rotinaCriada, error: erroRotina } = await supabase
        .from('rotinas')
        .insert({
          nome: configuracao.nome,
          objetivo: configuracao.objetivo,
          descricao: configuracao.descricao || null,
          aluno_id: alunoId!,
          personal_trainer_id: user.id,
          treinos_por_semana: configuracao.treinos_por_semana,
          dificuldade: configuracao.dificuldade,
          duracao_semanas: configuracao.duracao_semanas,
          valor_total: configuracao.valor_total,
          forma_pagamento: configuracao.forma_pagamento,
          data_inicio: configuracao.data_inicio,
          permite_execucao_aluno: configuracao.permite_execucao_aluno || false,
          observacoes_pagamento: configuracao.observacoes_pagamento || null,
          status: 'Ativa',
          observacoes_rotina: observacoes.trim() ? observacoes : null
        })
        .select()
        .single();

      if (erroRotina || !rotinaCriada) {
        throw new Error('Erro ao criar rotina: ' + erroRotina?.message);
      }

      // ✅ CORREÇÃO: Se a rotina foi criada a partir de um rascunho, deletar o rascunho original.
      const draftId = rotinaStorage.storage.draftId;
      if (draftId) {
        console.log(`🗑️ Deletando rascunho original com ID: ${draftId}`);
        const { error: deleteDraftError } = await supabase.from('rotinas').delete().eq('id', draftId);
        if (deleteDraftError) {
          // Logar o erro mas não interromper o fluxo, pois a rotina principal já foi criada.
          console.error('Falha ao deletar rascunho antigo:', deleteDraftError);
        }
      }

      // 2. Criar treinos
      const treinosParaInserir = treinos.map((treino, index) => ({
        rotina_id: rotinaCriada.id,
        nome: treino.nome,
        grupos_musculares: treino.grupos_musculares.join(','),
        ordem: index + 1,
        tempo_estimado_minutos: treino.tempo_estimado_minutos || null,
        observacoes: treino.observacoes || null
      }));

      const { data: treinosCriados, error: erroTreinos } = await supabase
        .from('treinos')
        .insert(treinosParaInserir)
        .select();

      if (erroTreinos || !treinosCriados) {
        throw new Error('Erro ao criar treinos: ' + erroTreinos?.message);
      }


      // 3. Criar exercícios e séries
      for (const treinoCriado of treinosCriados) {
        const treinoOriginal = treinos.find(t => t.nome === treinoCriado.nome);
        if (!treinoOriginal) continue;

        const exerciciosDoTreino = exercicios[treinoOriginal.id] || [];

        for (let i = 0; i < exerciciosDoTreino.length; i++) {
          const exercicio = exerciciosDoTreino[i];

          // Inserir exercício da rotina
          const { data: exercicioCriado, error: erroExercicio } = await supabase
            .from('exercicios_rotina')
            .insert({
              treino_id: treinoCriado.id,
              exercicio_1_id: exercicio.exercicio_1_id,
              exercicio_2_id: exercicio.exercicio_2_id || null,
              ordem: i + 1,
              intervalo_apos_exercicio: exercicio.intervalo_apos_exercicio || null,
              observacoes: exercicio.observacoes || null
            })
            .select()
            .single();

          if (erroExercicio || !exercicioCriado) {
            throw new Error('Erro ao criar exercício: ' + erroExercicio?.message);
          }

          // Inserir séries
          const seriesParaInserir = exercicio.series.map((serie: SerieConfig) => ({
            exercicio_id: exercicioCriado.id,
            numero_serie: serie.numero_serie,
            repeticoes: serie.repeticoes || 0,
            carga: serie.carga || null,
            tem_dropset: serie.tem_dropset || false,
            carga_dropset: serie.carga_dropset || null,
            intervalo_apos_serie: serie.intervalo_apos_serie || null,
            observacoes: serie.observacoes || null,
            // Para séries combinadas
            repeticoes_1: serie.repeticoes_1 || null,
            carga_1: serie.carga_1 || null,
            repeticoes_2: serie.repeticoes_2 || null,
            carga_2: serie.carga_2 || null
          }));

          const { error: erroSeries } = await supabase
            .from('series')
            .insert(seriesParaInserir);

          if (erroSeries) {
            throw new Error('Erro ao criar séries: ' + erroSeries.message);
          }
        }
      }

      // 4. Criar execuções_sessao para toda a rotina
      console.log('🎯 Gerando sessões da rotina...');

      const duracaoSemanas = configuracao.duracao_semanas;
      const treinosPorSemana = configuracao.treinos_por_semana;
      const dataInicio = new Date(configuracao.data_inicio);

      // Calcular quantas sessões totais
      const totalSessoes = duracaoSemanas * treinosPorSemana;
      const sessoesParaInserir = [];

      for (let sessao = 1; sessao <= totalSessoes; sessao++) {
        // Determinar qual treino usar (ciclo: A, B, C, A, B, C...)
        const treinoIndex = (sessao - 1) % treinosCriados.length;
        const treinoParaSessao = treinosCriados[treinoIndex];
        
        // Calcular data programada (considerando frequência semanal)
        const semanaAtual = Math.floor((sessao - 1) / treinosPorSemana);
        const diaNoTreino = (sessao - 1) % treinosPorSemana;
        const diasParaSomar = (semanaAtual * 7) + (diaNoTreino * Math.floor(7 / treinosPorSemana));
        
        const dataProgramada = new Date(dataInicio);
        dataProgramada.setDate(dataProgramada.getDate() + diasParaSomar);
        
        sessoesParaInserir.push({
          rotina_id: rotinaCriada.id,
          treino_id: treinoParaSessao.id,
          aluno_id: alunoId!,
          sessao_numero: sessao,
          status: 'em_aberto'
        });
      }

      // Inserir todas as sessões
      const { error: erroSessoes } = await supabase
        .from('execucoes_sessao')
        .insert(sessoesParaInserir);

      if (erroSessoes) {
        throw new Error('Erro ao criar sessões: ' + erroSessoes.message);
      }

      console.log(`✅ ${totalSessoes} sessões criadas com sucesso!`);

      // 4. Observações finais já incluídas no insert da rotina

      // 5. Limpar storage e navegar
      rotinaStorage.limparStorage();

      toast({
        title: "Rotina criada com sucesso!",
        description: `A rotina "${configuracao.nome}" foi criada e está ativa.`,
        variant: "default"
      });

      navigate(`/alunos-rotinas/${alunoId}`);

    } catch (error) {
      console.error('Erro ao finalizar rotina:', error);
      toast({
        title: "Erro ao criar rotina",
        description: error instanceof Error ? error.message : "Erro inesperado ao salvar a rotina.",
        variant: "destructive"
      });
    } finally {
      setFinalizando(false);
    }
  };

  // Voltar para lista de rotinas e limpar storage
  const handleDescartar = () => {
    rotinaStorage.limparStorage();
    navigate(`/alunos-rotinas/${alunoId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  const { configuracao, treinos, exercicios } = rotinaStorage.storage;
  if (!configuracao || !treinos || !exercicios) {
    return <div>Dados incompletos</div>;
  }

  // Calcular estatísticas
  const totalExercicios = Object.values(exercicios).reduce((acc, exs) => acc + exs.length, 0);
  const totalSeries = Object.values(exercicios).reduce((acc, exs) => 
    acc + exs.reduce((acc2, ex) => acc2 + ex.series.length, 0), 0
  );
  const tempoEstimadoTotal = treinos.reduce((acc, t) => acc + (t.tempo_estimado_minutos || 0), 0);





  return (
    <div className="space-y-6">
      {/* Header com breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Botão Voltar removido conforme padrão */}
          <span className="text-sm text-gray-600">Nova Rotina</span>
          <span className="text-sm text-gray-500">•</span>
          <span className="text-sm font-medium">Revisão</span>
        </div>
        <div className="text-sm text-gray-500">
          Etapa 4 de 4
        </div>
      </div>

      {/* Informações do aluno (padronizado) */}
      {aluno && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
                  <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />
                ) : (
                  <AvatarFallback style={{ backgroundColor: aluno.avatar_color }} className="text-white font-semibold">
                    {aluno.avatar_letter || aluno.nome_completo.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-lg text-gray-900">{aluno.nome_completo}</span>
                <span className="text-gray-600 text-sm">{aluno.email}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            {aluno.ultimo_objetivo_rotina && (
              <p>Último objetivo: <span className="font-medium">{aluno.ultimo_objetivo_rotina}</span></p>
            )}
          </CardContent>
        </Card>
      )}


      {/* Configuração da rotina */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração da Rotina</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">

              <div className="flex items-center gap-2">
                <ClipboardType className="h-4 w-4 text-gray-600" />
                <div>
                  <span className="text-sm text-gray-600">Nome:</span>
                  <p className="font-medium">{configuracao.nome}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-gray-600" />
                <div>
                  <span className="text-sm text-gray-600">Objetivo:</span>
                  <p className="font-medium">{configuracao.objetivo}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <BicepsFlexed className="h-4 w-4 text-gray-600" />
                <div>
                  <span className="text-sm text-gray-600">Dificuldade:</span>
                  <p className="font-medium">{configuracao.dificuldade}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <div>
                  <span className="text-sm text-gray-600">Duração:</span>
                  <p className="font-medium">{configuracao.duracao_semanas} semanas</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-gray-600" />
                <div>
                  <span className="text-sm text-gray-600">Frequência:</span>
                  <p className="font-medium">{configuracao.treinos_por_semana}x por semana</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-600" />
                <div>
                  <span className="text-sm text-gray-600">Valor:</span>
                  <p className="font-medium">R$ {configuracao.valor_total.toFixed(2)} ({configuracao.forma_pagamento})</p>
                </div>
              </div>
            </div>
          </div>

          {configuracao.descricao && (
            <div className="pt-4 border-t">
              <span className="text-sm text-gray-600">Descrição:</span>
              <p className="mt-1 text-gray-900">{configuracao.descricao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhamento dos treinos */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Detalhamento dos Treinos</h3>
        
        {treinos.map((treino, treinoIndex) => {
          const exerciciosDoTreino = exercicios[treino.id] || [];
          
          return (
            <Card key={treinoIndex}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{treino.nome}</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {treino.grupos_musculares.map(grupo => (
                    <Badge 
                      key={grupo}
                      variant="secondary"
                      className={CORES_GRUPOS_MUSCULARES[grupo] || 'bg-gray-100'}
                    >
                      {grupo}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {exerciciosDoTreino.map((exercicio, exercicioIndex) => {
                  const exercicio1Info = getExercicioInfo(exercicio.exercicio_1_id);
                  const exercicio2Info = exercicio.exercicio_2_id ? getExercicioInfo(exercicio.exercicio_2_id) : null;
                  
                  const nomeExercicio = exercicio.tipo === 'combinada' && exercicio2Info
                    ? `${exercicio1Info.nome} + ${exercicio2Info.nome}`
                    : exercicio1Info.nome;

                  return (
                    <div key={exercicioIndex} className="border-l-4 border-gray-200 pl-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{exercicioIndex + 1}. {nomeExercicio}</span>
                        {exercicio.tipo === 'combinada' && (
                          <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                            Combinada
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>{exercicio.series.length} série(s) configurada(s)</p>
                        {exercicio.intervalo_apos_exercicio && exercicioIndex < exerciciosDoTreino.length - 1 && (
                          <p>Intervalo após exercício: {exercicio.intervalo_apos_exercicio}s</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {treino.tempo_estimado_minutos && (
                  <div className="flex items-center gap-2 pt-2 border-t text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    Tempo estimado: {treino.tempo_estimado_minutos} minutos
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Observações finais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações Finais (Opcional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="observacoes">
              Adicione observações que considerar importantes para esta rotina:
            </Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Foco na postura, progressão gradual da carga, atenção especial aos joelhos..."
              rows={4}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Aviso importante */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900 mb-1">Importante</h4>
              <p className="text-sm text-amber-800">
                Após finalizar, a rotina será ativada. Você poderá bloqueá-la na página de rotinas do aluno de acordo com sua necessidade.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Espaçamento para botões fixos no mobile */}
      <div className="pb-20 md:pb-6"></div>

      {/* Botões de navegação - Desktop */}
      <div className="hidden md:flex justify-between pt-6 gap-2">
        <div>
          <Button variant="ghost" onClick={() => navigate(`/rotinas-criar/${alunoId}/exercicios`)} disabled={finalizando || showCancelDialog} className="flex items-center">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancelClick} disabled={finalizando} className="flex items-center">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={handleFinalizar} 
            disabled={finalizando}
            className="bg-green-600 hover:bg-green-700 text-white px-8"
          >
            {finalizando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Criando rotina...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Finalizar Rotina
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Botões de navegação - Mobile (fixos no rodapé) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden z-50">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {/* Esquerda: Voltar */}
          <Button
            variant="ghost"
            onClick={() => navigate(`/rotinas-criar/${alunoId}/exercicios`)}
            disabled={finalizando}
            size="sm"
            className="px-3"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          
          {/* Direita: Cancelar + Próximo */}
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleCancelClick}
              disabled={finalizando}
              size="sm"
              className="px-3"
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={handleFinalizar}
              disabled={finalizando}
              size="sm"
              className="px-3 bg-green-600 hover:bg-green-700 text-white"
            >
              {finalizando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Finalizar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <ResponsiveCancelModal
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Sair da criação de rotina?"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Suas alterações não salvas serão perdidas. Você também pode salvar seu progresso como um rascunho.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-2">
            <Button variant="outline" onClick={handleDescartar} disabled={finalizando}>
              Descartar Alterações
            </Button>
            <Button onClick={handleSalvarRascunho} disabled={finalizando}>
              {finalizando ? 'Salvando...' : 'Salvar como Rascunho'}
            </Button>
          </div>
        </div>
      </ResponsiveCancelModal>
    </div>
  );
};

export default RotinaRevisao;