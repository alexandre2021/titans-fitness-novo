// ExecucaoExecutarTreino.tsx - VERSÃO CORRIGIDA SEM MODAIS DUPLICADAS

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Executor } from '@/components/rotina/execucao/Executor';
import Modal from 'react-modal';
import { AlertTriangle, X } from 'lucide-react';
import { 
  SessaoData, 
  UserProfile 
} from '@/types/exercicio.types';

interface SessaoSupabase {
  id: string;
  rotina_id: string;
  treino_id: string;
  aluno_id: string;
  status: string;
  data_execucao: string;
  tempo_total_minutos: number | null;
  tempo_decorrido: number | null;
  rotinas: {
    nome: string;
    permite_execucao_aluno: boolean;
  } | null;
  treinos: {
    nome: string;
  } | null;
}

interface AlunoSupabase {
  nome_completo: string;
}

export default function ExecucaoExecutarTreino() {
  const { sessaoId } = useParams<{ sessaoId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ESTADOS
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessaoData, setSessaoData] = useState<SessaoData | null>(null);
  const [modoExecucao, setModoExecucao] = useState<'pt' | 'aluno' | null>(null);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [shouldBlock, setShouldBlock] = useState(false);
  const hasNavigated = useRef(false);

  const shallowCompareSessao = useCallback((a: SessaoData | null, b: SessaoData | null): boolean => {
    if (!a || !b) return false;
    return (
      a.id === b.id &&
      a.rotina_id === b.rotina_id &&
      a.treino_id === b.treino_id &&
      a.aluno_id === b.aluno_id &&
      a.status === b.status &&
      a.data_execucao === b.data_execucao &&
      a.rotinas?.nome === b.rotinas?.nome &&
      a.tempo_decorrido === b.tempo_decorrido &&
      a.rotinas?.permite_execucao_aluno === b.rotinas?.permite_execucao_aluno &&
      a.treinos?.nome === b.treinos?.nome &&
      a.alunos?.nome_completo === b.alunos?.nome_completo
    );
  }, []);

  const sessaoDataMemo = useMemo((): SessaoData | null => {
    if (!sessaoData) return null;
    
    return {
      id: sessaoData.id,
      rotina_id: sessaoData.rotina_id,
      treino_id: sessaoData.treino_id,
      aluno_id: sessaoData.aluno_id,
      status: sessaoData.status,
      data_execucao: sessaoData.data_execucao,
      tempo_total_minutos: sessaoData.tempo_total_minutos,
      tempo_decorrido: sessaoData.tempo_decorrido,
      rotinas: sessaoData.rotinas ? { 
        nome: sessaoData.rotinas.nome, 
        permite_execucao_aluno: sessaoData.rotinas.permite_execucao_aluno 
      } : undefined,
      treinos: sessaoData.treinos ? { nome: sessaoData.treinos.nome } : undefined,
      alunos: sessaoData.alunos ? { nome_completo: sessaoData.alunos.nome_completo } : undefined,
    };
  }, [sessaoData]);

  const determinarModoExecucao = useCallback(async (userId: string, sessao: SessaoData): Promise<'pt' | 'aluno' | null> => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil de usuário não encontrado.');
      }

      const { user_type } = profile;

      if (user_type === 'personal_trainer') {
        const { data: ptData, error: ptError } = await supabase
          .from('personal_trainers')
          .select('id, nome_completo')
          .eq('id', userId)
          .single();

        if (ptError || !ptData) {
          throw new Error('Dados do Personal Trainer não encontrados.');
        }
        
        setUserProfile({
          user_type: 'personal_trainer',
          id: ptData.id,
          nome_completo: ptData.nome_completo
        });
        return 'pt';
      } 
      
      else if (user_type === 'aluno') {
        if (userId !== sessao.aluno_id) {
          toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "Você não tem permissão para executar a sessão de outro aluno.",
          });
          navigate(-1);
          return null;
        }

        if (!sessao.rotinas?.permite_execucao_aluno) {
          toast({
            variant: "destructive",
            title: "Execução não Permitida",
            description: "Esta rotina não permite execução independente. Fale com seu Personal Trainer.",
          });
          navigate(-1);
          return null;
        }

        const { data: alunoData, error: alunoError } = await supabase
          .from('alunos')
          .select('id, nome_completo')
          .eq('id', userId)
          .single();

        if (alunoError || !alunoData) {
          throw new Error('Dados do Aluno não encontrados.');
        }

        setUserProfile({
          user_type: 'aluno',
          id: alunoData.id,
          nome_completo: alunoData.nome_completo
        });
        return 'aluno';
      } 
      
      else {
        throw new Error(`Tipo de usuário '${user_type}' não autorizado para executar treinos.`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error('Erro ao determinar modo de execução:', errorMessage);
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: errorMessage,
      });
      navigate(-1);
      return null;
    }
  }, [navigate, toast]);

  const loadSessionData = useCallback(async () => {
    if (!sessaoId) return;
    
    try {
      setLoading(true);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate('/login');
        return;
      }

      const { data: sessaoRaw, error: sessaoError } = await supabase
        .from('execucoes_sessao')
        .select(`
          id,
          rotina_id,
          treino_id,
          aluno_id,
          status,
          data_execucao,
          tempo_total_minutos,
          tempo_decorrido,
          rotinas!inner (
            nome,
            permite_execucao_aluno
          ),
          treinos!inner (
            nome
          )
        `)
        .eq('id', sessaoId)
        .single();

      if (sessaoError || !sessaoRaw) {
        console.error('Erro ao buscar sessão:', sessaoError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Sessão não encontrada",
        });
        navigate(-1);
        return;
      }

      const sessao = sessaoRaw as SessaoSupabase;

      if (sessao.status === 'pausada') {
        console.log('🔄 Sessão pausada detectada na execução, reativando...');
        
        const { error: updateError } = await supabase
          .from('execucoes_sessao')
          .update({ 
            status: 'em_andamento',
            data_execucao: new Date().toISOString().split('T')[0]
          })
          .eq('id', sessaoId);

        if (updateError) {
          console.error('Erro ao reativar sessão:', updateError);
        } else {
          sessao.status = 'em_andamento';
          console.log('✅ Sessão reativada para em_andamento');
        }
      }

      const { data: alunoRaw, error: alunoError } = await supabase
        .from('alunos')
        .select('nome_completo')
        .eq('id', sessao.aluno_id)
        .single();

      if (alunoError || !alunoRaw) {
        console.error('Erro ao buscar aluno:', alunoError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Dados do aluno não encontrados",
        });
        navigate(-1);
        return;
      }

      const alunoData = alunoRaw as AlunoSupabase;

      const sessaoCompleta: SessaoData = {
        id: sessao.id,
        rotina_id: sessao.rotina_id,
        treino_id: sessao.treino_id,
        aluno_id: sessao.aluno_id,
        status: sessao.status,
        data_execucao: sessao.data_execucao,
        tempo_total_minutos: sessao.tempo_total_minutos,
        tempo_decorrido: sessao.tempo_decorrido,
        rotinas: sessao.rotinas ? {
          nome: sessao.rotinas.nome,
          permite_execucao_aluno: sessao.rotinas.permite_execucao_aluno
        } : undefined,
        treinos: sessao.treinos ? {
          nome: sessao.treinos.nome
        } : undefined,
        alunos: {
          nome_completo: alunoData.nome_completo
        }
      };

      setSessaoData(prev => shallowCompareSessao(prev, sessaoCompleta) ? prev : sessaoCompleta);

      const modo = await determinarModoExecucao(user.id, sessaoCompleta);
      setModoExecucao(modo);

    } catch (error) {
      console.error('Erro ao carregar dados da sessão:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados da sessão",
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [sessaoId, navigate, toast, determinarModoExecucao, shallowCompareSessao]);

  const verificarStatusSessao = useCallback((): boolean => {
    if (!sessaoData) return false;

    if (sessaoData.status === 'concluida') {
      toast({
        variant: "destructive",
        title: "Sessão Finalizada",
        description: "Esta sessão já foi concluída e não pode ser executada novamente.",
      });
      navigate(-1);
      return false;
    }

    if (sessaoData.status === 'cancelada') {
      toast({
        variant: "destructive",
        title: "Sessão Cancelada",
        description: "Esta sessão foi cancelada e não pode ser executada.",
      });
      navigate(-1);
      return false;
    }

    return true;
  }, [sessaoData, navigate, toast]);

  const handleSessaoFinalizada = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    
    if (userProfile?.user_type === 'personal_trainer') {
      navigate(`/alunos-rotinas/${sessaoData?.aluno_id}`);
    } else {
      navigate('/index-aluno');
    }
  }, [userProfile, sessaoData, navigate]);

  // ✅ SOLUÇÃO UNIFICADA: handleSessaoPausada apenas dispara navegação
  const handleSessaoPausada = useCallback(() => {
    if (hasNavigated.current) return;
    
    console.log('⏸️ Botão pausar clicado - disparando navegação que será interceptada');
    
    // Simplesmente dispara a navegação - o blocker vai interceptar e mostrar a modal
    // ✅ CORREÇÃO: Mudar para navigate(-1) para simular o botão "voltar" do navegador
    // e unificar os dois fluxos de pausa.
    navigate(-1);
  }, [navigate, hasNavigated]);

  // Gerenciamento do bloqueio
  useEffect(() => {
    const status = sessaoData?.status;
    const shouldBlockValue = status === 'em_andamento' || status === 'em_aberto';
    console.log('🔒 Status da sessão:', status, '| Deve bloquear:', shouldBlockValue);
    setShouldBlock(shouldBlockValue);
  }, [sessaoData]);

  // ✅ BLOCKER SIMPLIFICADO: Remove lógica do pausedByExecutor
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const shouldBlockNavigation = shouldBlock && !hasNavigated.current;
    console.log('🚫 Tentativa de navegação - shouldBlock:', shouldBlock, 'hasNavigated:', hasNavigated.current);
    return shouldBlockNavigation;
  });

  useEffect(() => {
    console.log('📊 Blocker state:', blocker.state);
    if (blocker.state === 'blocked' && !showPauseDialog) {
      console.log('🛑 Navegação bloqueada pelo botão voltar, mostrando modal');
      setShowPauseDialog(true);
    }
  }, [blocker.state, showPauseDialog]);

  // Fallback para fechar aba/janela
  useEffect(() => {
    if (!shouldBlock) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasNavigated.current) return;
      
      console.log('⚠️ Tentativa de sair da página detectada');
      e.preventDefault();
      e.returnValue = 'Você tem uma sessão de treino em andamento. Tem certeza que deseja sair?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // ✅ MODAL ÚNICA - Também desativa blocker antes de navegar
  const handleConfirmPauseAndExit = useCallback(async () => {
    console.log('✅ Confirmando pausa e saída via botão voltar');
    
    try {
      // DESATIVAR O BLOQUEADOR PRIMEIRO
      setShouldBlock(false);
      
      // Limpar sessionStorage
      sessionStorage.removeItem('rotina_em_criacao');
      
      if (sessaoData?.id && !hasNavigated.current) {
        const { error } = await supabase
          .from('execucoes_sessao')
          .update({ 
            status: 'pausada',
            data_execucao: new Date().toISOString().split('T')[0]
          })
          .eq('id', sessaoData.id);

        if (error) {
          console.error('Erro ao pausar sessão:', error);
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Erro ao pausar a sessão. Tente novamente.",
          });
          return;
        }
      }

      setShowPauseDialog(false);
      hasNavigated.current = true;

      // Aguardar para garantir que o blocker seja desativado
      await new Promise(resolve => setTimeout(resolve, 50));

      if (blocker.state === 'blocked') {
        blocker.proceed();
      }
    } catch (error) {
      console.error('Erro ao confirmar pausa:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao processar solicitação. Tente novamente.",
      });
    }
  }, [blocker, sessaoData, toast]);

  const handleCancelPauseDialog = useCallback(() => {
    console.log('❌ Cancelando saída via botão voltar');
    setShowPauseDialog(false);
    if (blocker.state === 'blocked') {
      blocker.reset?.();
    }
  }, [blocker]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  if (!sessaoData || !userProfile || !modoExecucao) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-foreground mb-4">Dados da sessão não encontrados</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  if (!verificarStatusSessao()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-foreground mb-4">Sessão não disponível</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Executor
        sessaoId={sessaoId!}
        sessaoData={sessaoDataMemo!}
        userProfile={userProfile}
        modoExecucao={modoExecucao}
        onSessaoFinalizada={handleSessaoFinalizada}
        onSessaoPausada={handleSessaoPausada}
      />

      {/* ✅ MODAL ÚNICA - Apenas para botão "voltar" do navegador */}
      <Modal
        isOpen={showPauseDialog}
        onRequestClose={() => {}}
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none shadow-2xl"
        overlayClassName="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-semibold">Pausar e Sair?</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Você está saindo da execução do treino. Seu progresso será salvo e você poderá continuar mais tarde.
          </p>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2">
          <Button variant="outline" onClick={handleCancelPauseDialog}>
            Continuar Treino
          </Button>
          <Button onClick={handleConfirmPauseAndExit}>
            Pausar e Sair
          </Button>
        </div>
      </Modal>
    </div>
  );
}