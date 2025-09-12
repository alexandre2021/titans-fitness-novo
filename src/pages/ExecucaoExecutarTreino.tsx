// src/pages/ExecucaoExecutarTreino.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Executor } from '@/components/rotina/execucao/Executor';
import { 
  SessaoData, 
  UserProfile 
} from '@/types/exercicio.types';

// Tipagem específica para dados da sessão do Supabase
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

  // ✅ ESTADOS
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessaoData, setSessaoData] = useState<SessaoData | null>(null);
  const [modoExecucao, setModoExecucao] = useState<'pt' | 'aluno' | null>(null);

  // Função utilitária para comparar campos relevantes de sessão
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

  // ✅ Memoizar sessaoData para evitar looping no Executor
  const sessaoDataMemo = useMemo((): SessaoData | null => {
    if (!sessaoData) return null;
    
    // Cria um novo objeto apenas com campos primitivos para evitar referências instáveis
    return {
      id: sessaoData.id,
      rotina_id: sessaoData.rotina_id,
      treino_id: sessaoData.treino_id,
      aluno_id: sessaoData.aluno_id,
      status: sessaoData.status,
      data_execucao: sessaoData.data_execucao,
      tempo_total_minutos: sessaoData.tempo_total_minutos,
      tempo_decorrido: sessaoData.tempo_decorrido,
      // Passe apenas nomes dos objetos aninhados para evitar referência instável
      rotinas: sessaoData.rotinas ? { 
        nome: sessaoData.rotinas.nome, 
        permite_execucao_aluno: sessaoData.rotinas.permite_execucao_aluno 
      } : undefined,
      treinos: sessaoData.treinos ? { nome: sessaoData.treinos.nome } : undefined,
      alunos: sessaoData.alunos ? { nome_completo: sessaoData.alunos.nome_completo } : undefined,
    };
  }, [sessaoData]);

  // ✅ FUNÇÃO PARA DETERMINAR MODO
  const determinarModoExecucao = useCallback(async (userId: string, sessao: SessaoData): Promise<'pt' | 'aluno' | null> => {
    try {
      // 1. Descobrir o tipo de usuário a partir da tabela de perfis
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        throw new Error('Perfil de usuário não encontrado.');
      }

      const { user_type } = profile;

      // 2. Agir com base no tipo de usuário
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
        // Validações para o aluno
        if (userId !== sessao.aluno_id) {
          toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: "Você não tem permissão para executar a sessão de outro aluno.",
          });
          navigate(-1);
          return null; // Retorna null para indicar falha na validação
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
        // Caso para 'admin' ou outro tipo não esperado
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
      return null; // Retorna null em caso de erro
    }
  }, [navigate, toast]);

  // ✅ FUNÇÃO PARA CARREGAR DADOS
  const loadSessionData = useCallback(async () => {
    if (!sessaoId) return;
    
    try {
      setLoading(true);

      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate('/login');
        return;
      }

      // ✅ BUSCAR DADOS DA SESSÃO SEM JOIN COM ALUNOS
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

      // Cast com tipagem correta
      const sessao = sessaoRaw as SessaoSupabase;

      // ✅ BUSCAR DADOS DO ALUNO SEPARADAMENTE
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

      // ✅ COMBINAR OS DADOS COM TIPAGEM CORRETA
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

      // Só atualiza o estado se realmente mudou
      setSessaoData(prev => shallowCompareSessao(prev, sessaoCompleta) ? prev : sessaoCompleta);

      // Determinar tipo de usuário e modo de execução
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

  // ✅ VERIFICAR SE SESSÃO ESTÁ VÁLIDA
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

  // ✅ CARREGAR DADOS
  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // ✅ CALLBACK DE FINALIZAÇÃO
  const handleSessaoFinalizada = useCallback(() => {
    // Navegação diferenciada baseada no tipo de usuário
    if (userProfile?.user_type === 'personal_trainer') {
      navigate(`/alunos-rotinas/${sessaoData?.aluno_id}`);
    } else {
      navigate('/index-aluno');
    }
  }, [userProfile, sessaoData, navigate]);

  // ✅ NOVO CALLBACK DE PAUSA
  const handleSessaoPausada = useCallback(() => {
    // Navega para a tela de seleção de treino da rotina atual
    if (sessaoData?.rotina_id) {
      navigate(`/execucao-rotina/selecionar-treino/${sessaoData.rotina_id}`);
    } else {
      handleSessaoFinalizada(); // Fallback para a navegação padrão
    }
  }, [sessaoData, navigate, handleSessaoFinalizada]);

  // ✅ LOADING
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

  // ✅ VERIFICAÇÕES DE ERRO
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

  // ✅ VERIFICAR STATUS DA SESSÃO
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

  // ✅ RENDERIZAR COMPONENTE EXECUTOR
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
    </div>
  );
}