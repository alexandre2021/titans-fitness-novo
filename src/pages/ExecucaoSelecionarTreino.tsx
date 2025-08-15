// src/pages/ExecucaoSelecionarTreino.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, CheckCircle, Clock, Target, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { MENSAGENS, SESSAO_STATUS } from '@/constants/exercicio.constants';
import { useToast } from '@/hooks/use-toast';
import { 
  Rotina, 
  Treino, 
  UltimaSessao, 
  AlunoData, 
  SessaoEmAndamento 
} from '@/types/exercicio.types';

// Tipagem para dados vindos do Supabase
interface SessaoSupabase {
  id: string;
  treino_id: string;
  data_execucao: string;
  sessao_numero: number;
  status: string;
  treinos: {
    nome: string;
  };
}

// Tipagem estendida para treinos com contadores
interface TreinoComContadores extends Treino {
  sessoes_disponiveis: number;
  sessoes_concluidas: number;
  tem_em_andamento: boolean;
  tem_pausada: boolean;
  sessoes_pausadas_count: number; // ← NOVO
  sessoes_em_andamento_count: number; // ← NOVO
  sessao_em_andamento_id?: string;
}

// Interface para dados das sessões expandidas
interface SessaoDetalhada {
  id: string;
  sessao_numero: number;
  status: string;
  data_execucao?: string;
}

export default function ExecucaoSelecionarTreino() {
  const { rotinaId } = useParams<{ rotinaId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ✅ ESTADOS MIGRADOS DO RN
  const [loading, setLoading] = useState(true);
  const [rotina, setRotina] = useState<Rotina | null>(null);
  const [aluno, setAluno] = useState<AlunoData | null>(null);
  const [treinos, setTreinos] = useState<TreinoComContadores[]>([]);
  const [ultimaSessao, setUltimaSessao] = useState<UltimaSessao | null>(null);
  const [treinoSugerido, setTreinoSugerido] = useState<string>('');
  const [treinoExpandido, setTreinoExpandido] = useState<string | null>(null);
  const [sessoesDetalhadas, setSessoesDetalhadas] = useState<{[treinoId: string]: SessaoDetalhada[]}>({});

  // ✅ ESTADOS PARA MODAIS
  const [modalVisible, setModalVisible] = useState(false);
  const [sessoesEmAndamento, setSessoesEmAndamento] = useState<SessaoEmAndamento[]>([]);
  const [treinoSelecionado, setTreinoSelecionado] = useState<TreinoComContadores | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [tipoModal, setTipoModal] = useState<'continuar_ou_nova' | 'escolher_sessao'>('continuar_ou_nova');

  // ✅ FUNÇÕES UTILITÁRIAS MIGRADAS
  const calcularDiasDesde = useCallback((dataStr: string): number => {
    const data = new Date(dataStr);
    const hoje = new Date();
    return Math.floor((hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));
  }, []);
  // ...
  // Buscar sessões detalhadas para o treino expandido
  const buscarSessoesDetalhadas = useCallback(async (treinoId: string) => {
    console.log('📡 Buscando sessões detalhadas:', { rotinaId, treinoId });
    const { data: sessoes, error } = await supabase
      .from('execucoes_sessao')
      .select('id, sessao_numero, status, data_execucao')
      .eq('rotina_id', rotinaId)
      .eq('treino_id', treinoId)
      .order('sessao_numero', { ascending: true });
    console.log('📊 Resultado busca sessões:', { sessoes, error });
    if (error || !sessoes) return [];
    return sessoes.map((sessao: SessaoDetalhada) => ({
      id: sessao.id,
      sessao_numero: sessao.sessao_numero,
      status: sessao.status,
      data_execucao: sessao.data_execucao
    }));
  }, [rotinaId]);

  // ✅ TOGGLE EXPANSÃO DO TREINO (corrigido para evitar closure e garantir fetch)
  const toggleExpansaoTreino = useCallback((treinoId: string) => {
    setTreinoExpandido(prev => {
      if (prev === treinoId) {
        console.log('⬆️ Recolhendo treino', { treinoId });
        return null;
      } else {
        console.log('⬇️ Expandindo treino', { treinoId });
        // Buscar sessões detalhadas se ainda não existem
        if (!sessoesDetalhadas[treinoId]) {
          buscarSessoesDetalhadas(treinoId).then(sessoes => {
            setSessoesDetalhadas(prevDetalhadas => ({
              ...prevDetalhadas,
              [treinoId]: sessoes
            }));
          });
        }
        return treinoId;
      }
    });
  }, [sessoesDetalhadas, buscarSessoesDetalhadas]);

  // ✅ FORMATAR STATUS DAS SESSÕES
  const formatarStatusSessao = useCallback((status: string): { texto: string; cor: string } => {
    switch (status) {
      case SESSAO_STATUS.NAO_INICIADA:
        return { texto: 'Em aberto', cor: 'bg-blue-100 text-blue-800' };
      case SESSAO_STATUS.EM_ANDAMENTO:
        return { texto: 'Em andamento', cor: 'bg-green-100 text-green-800' };
      case SESSAO_STATUS.PAUSADA:
        return { texto: 'Pausada', cor: 'bg-orange-100 text-orange-800' };
      case SESSAO_STATUS.CONCLUIDA:
        return { texto: 'Concluída', cor: 'bg-gray-100 text-gray-800' };
      default:
        return { texto: status, cor: 'bg-gray-100 text-gray-800' };
    }
  }, []);

  // ✅ BUSCAR SESSÕES EM ANDAMENTO
  const buscarSessoesEmAndamento = useCallback(async (treinoId: string): Promise<SessaoEmAndamento[]> => {
    try {
      const { data: sessoesRaw, error } = await supabase
        .from('execucoes_sessao')
        .select(`
          id,
          treino_id,
          data_execucao,
          sessao_numero,
          status,
          treinos!inner(nome)
        `)
        .eq('rotina_id', rotinaId)
        .eq('treino_id', treinoId)
        .in('status', [SESSAO_STATUS.EM_ANDAMENTO, SESSAO_STATUS.PAUSADA])
        .order('sessao_numero', { ascending: true });

      if (error || !sessoesRaw) {
        console.error('Erro ao buscar sessões em andamento:', error);
        return [];
      }

      // Casting com tipagem correta
      const sessoes = sessoesRaw as SessaoSupabase[];

      return sessoes.map(sessao => ({
        id: sessao.id,
        treino_id: sessao.treino_id,
        treino_nome: sessao.treinos?.nome || `Treino ${sessao.treino_id}`,
        data_execucao: sessao.data_execucao,
        sessao_numero: sessao.sessao_numero,
        status: sessao.status
      }));
    } catch (error) {
      console.error('Erro ao buscar sessões em andamento:', error);
      return [];
    }
  }, [rotinaId]);

  // ✅ BUSCAR PRÓXIMA SESSÃO DISPONÍVEL
  const buscarProximaSessaoDisponivel = useCallback(async (treinoId: string) => {
    try {
      const { data: sessao, error } = await supabase
        .from('execucoes_sessao')
        .select('id, sessao_numero')
        .eq('rotina_id', rotinaId)
        .eq('treino_id', treinoId)
        .eq('status', SESSAO_STATUS.NAO_INICIADA)
        .order('sessao_numero', { ascending: true })
        .limit(1)
        .single();

      if (error || !sessao) {
        return null;
      }

      return sessao;
    } catch (error) {
      console.error('Erro ao buscar sessão disponível:', error);
      return null;
    }
  }, [rotinaId]);

  // ✅ CONTAR SESSÕES POR TREINO - ATUALIZADA COM CONTADORES
  const contarSessoesPorTreino = useCallback(async (treinoId: string) => {
    try {
      console.log('🔍 Contando sessões para:', { rotinaId, treinoId });
      
      const { data: sessoes, error } = await supabase
        .from('execucoes_sessao')
        .select('status')
        .eq('rotina_id', rotinaId)
        .eq('treino_id', treinoId);

      console.log('📊 Resultado query:', { sessoes, error });

      if (error || !sessoes) {
        return { 
          disponiveis: 0, 
          concluidas: 0, 
          emAndamento: false, 
          pausadas: false,
          pausadasCount: 0,
          emAndamentoCount: 0
        };
      }

      console.log('📊 Status das sessões:', sessoes.map(s => s.status));

      const concluidas = sessoes.filter(s => s.status === SESSAO_STATUS.CONCLUIDA).length;
      const naoIniciadas = sessoes.filter(s => s.status === SESSAO_STATUS.NAO_INICIADA).length;
      const emAndamento = sessoes.filter(s => s.status === SESSAO_STATUS.EM_ANDAMENTO).length;
      const pausadas = sessoes.filter(s => s.status === SESSAO_STATUS.PAUSADA).length;

      return {
        disponiveis: naoIniciadas,
        concluidas: concluidas,
        emAndamento: emAndamento > 0,
        pausadas: pausadas > 0,
        pausadasCount: pausadas,     // ← NOVO: Contador de pausadas
        emAndamentoCount: emAndamento // ← NOVO: Contador em andamento
      };
    } catch (error) {
      console.error('Erro ao contar sessões:', error);
      return { 
        disponiveis: 0, 
        concluidas: 0, 
        emAndamento: false, 
        pausadas: false,
        pausadasCount: 0,
        emAndamentoCount: 0
      };
    }
  }, [rotinaId]);

  // ✅ BUSCAR ÚLTIMA SESSÃO
  const buscarUltimaSessao = useCallback(async (alunoId: string): Promise<string | null> => {
    try {
      const { data: ultimaExecucao, error } = await supabase
        .from('execucoes_sessao')
        .select('data_execucao, treino_id')
        .eq('aluno_id', alunoId)
        .eq('status', SESSAO_STATUS.CONCLUIDA)
        .order('data_execucao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !ultimaExecucao) {
        setUltimaSessao(null);
        return null;
      }

      const { data: treino } = await supabase
        .from('treinos')
        .select('nome')
        .eq('id', ultimaExecucao.treino_id)
        .single();

      const ultimaSessaoData: UltimaSessao = {
        treino_nome: treino?.nome || `Treino ${ultimaExecucao.treino_id}`,
        data_execucao: ultimaExecucao.data_execucao,
        dias_desde_execucao: calcularDiasDesde(ultimaExecucao.data_execucao)
      };
      setUltimaSessao(ultimaSessaoData);
      return ultimaSessaoData.treino_nome;
    } catch (error) {
      console.error('Erro ao buscar sessão:', error);
      setUltimaSessao(null);
      return null;
    }
  }, [calcularDiasDesde]);

  // ✅ CALCULAR TREINO SUGERIDO
  const calcularTreinoSugerido = useCallback((ultimoTreino: string | null, treinosLista: TreinoComContadores[]): string => {
    if (!treinosLista.length) return '';

    // Considera treinos com sessões disponíveis OU pausadas
    const treinosDisponiveis = [...treinosLista]
      .filter(t => t.sessoes_disponiveis > 0 || t.sessoes_pausadas_count > 0)
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    if (!treinosDisponiveis.length) return '';

    if (!ultimoTreino) {
      // Se não há último treino, sugere o primeiro disponível
      return treinosDisponiveis[0]?.nome || '';
    }

    const treinoAtualIndex = treinosDisponiveis.findIndex(t => t.nome === ultimoTreino);

    if (treinoAtualIndex === -1) {
      // Se não encontrou, sugere o primeiro disponível
      return treinosDisponiveis[0]?.nome || '';
    }

    const proximoIndex = (treinoAtualIndex + 1) % treinosDisponiveis.length;
    return treinosDisponiveis[proximoIndex]?.nome || '';
  }, []);

  // ✅ CARREGAR DADOS
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        navigate('/login');
        return;
      }

      // Buscar rotina
      const { data: rotinaData, error: rotinaError } = await supabase
        .from('rotinas')
        .select('id, nome, descricao, aluno_id, status')
        .eq('id', rotinaId)
        .eq('personal_trainer_id', user.id)
        .single();

      if (rotinaError || !rotinaData) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Rotina não encontrada",
        });
        navigate(-1);
        return;
      }
      setRotina(rotinaData);

      // Buscar aluno
      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('nome_completo, email')
        .eq('id', rotinaData.aluno_id)
        .single();

      if (alunoError || !alunoData) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Dados do aluno não encontrados",
        });
        navigate(-1);
        return;
      }
      setAluno(alunoData);

      // Buscar treinos
      const { data: treinosData, error: treinosError } = await supabase
        .from('treinos')
        .select('id, nome, grupos_musculares, ordem')
        .eq('rotina_id', rotinaId)
        .order('ordem');

      if (treinosError) {
        console.error('Erro ao buscar treinos:', treinosError);
        setTreinos([]);
        return;
      }

      // Enriquecer treinos com contagem de sessões
      const treinosEnriquecidos = await Promise.all(
        (treinosData || []).map(async (treino) => {
          const contagem = await contarSessoesPorTreino(treino.id);
          const sessoesEmAndamento = await buscarSessoesEmAndamento(treino.id);

          return {
            ...treino,
            sessoes_disponiveis: contagem.disponiveis,
            sessoes_concluidas: contagem.concluidas,
            tem_em_andamento: contagem.emAndamento,
            tem_pausada: contagem.pausadas,
            sessoes_pausadas_count: contagem.pausadasCount,     // ← NOVO
            sessoes_em_andamento_count: contagem.emAndamentoCount, // ← NOVO
            sessao_em_andamento_id: sessoesEmAndamento[0]?.id
          };
        })
      );

      setTreinos(treinosEnriquecidos);

      // Buscar última sessão e calcular sugestão
      const ultimoTreino = await buscarUltimaSessao(rotinaData.aluno_id);
      const sugerido = calcularTreinoSugerido(ultimoTreino, treinosEnriquecidos);
      setTreinoSugerido(sugerido);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar dados da rotina",
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [rotinaId, navigate, toast, contarSessoesPorTreino, buscarSessoesEmAndamento, buscarUltimaSessao, calcularTreinoSugerido]);

  // ✅ INICIAR TREINO
  const iniciarTreino = async (treino: TreinoComContadores) => {
    try {
      if (treino.sessoes_disponiveis === 0 && !treino.tem_em_andamento && !treino.tem_pausada) {
        toast({
          variant: "destructive",
          title: "Treino Completo",
          description: `Todas as sessões do ${treino.nome} foram concluídas`,
        });
        return;
      }

      const sessoesAtivas = await buscarSessoesEmAndamento(treino.id);
      
      if (sessoesAtivas.length > 0) {
        if (treino.sessoes_disponiveis > 0) {
          setTreinoSelecionado(treino);
          setSessoesEmAndamento(sessoesAtivas);
          setTipoModal('continuar_ou_nova');
          setModalVisible(true);
          return;
        }
        
        if (sessoesAtivas.length === 1) {
          navigate(`/execucao-rotina/executar-treino/${sessoesAtivas[0].id}`);
          return;
        }
        
        setTreinoSelecionado(treino);
        setSessoesEmAndamento(sessoesAtivas);
        setTipoModal('escolher_sessao');
        setModalVisible(true);
        return;
      }

      await iniciarNovaSessao(treino);

    } catch (error) {
      console.error('Erro ao iniciar treino:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro inesperado ao iniciar treino",
      });
    }
  };

  // ✅ INICIAR NOVA SESSÃO
  const iniciarNovaSessao = async (treino: TreinoComContadores) => {
    try {
      if (!rotina) return;

      const sessaoDisponivel = await buscarProximaSessaoDisponivel(treino.id);
      
      if (!sessaoDisponivel) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Nenhuma sessão disponível para este treino",
        });
        return;
      }

      const hoje = new Date().toISOString().split('T')[0];
      
      const { data: sessaoAtualizada, error: updateError } = await supabase
        .from('execucoes_sessao')
        .update({
          status: SESSAO_STATUS.EM_ANDAMENTO,
          data_execucao: hoje
        })
        .eq('id', sessaoDisponivel.id)
        .select('id')
        .single();

      if (updateError || !sessaoAtualizada) {
        console.error('Erro ao atualizar sessão:', updateError);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível iniciar a sessão de treino",
        });
        return;
      }

      console.log('Sessão iniciada com sucesso:', sessaoAtualizada.id);
      navigate(`/execucao-rotina/executar-treino/${sessaoAtualizada.id}`);

    } catch (error) {
      console.error('Erro ao iniciar nova sessão:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro inesperado ao iniciar nova sessão",
      });
    }
  };

  // ✅ CONTINUAR SESSÃO EXISTENTE
  const continuarSessao = () => {
    if (sessoesEmAndamento.length === 0) return;
    
    const sessaoParaContinuar = sessoesEmAndamento[0];
    setModalVisible(false);
    navigate(`/execucao-rotina/executar-treino/${sessaoParaContinuar.id}`);
  };

  // ✅ CONTINUAR SESSÃO ESPECÍFICA
  const continuarSessaoEspecifica = (sessaoId: string) => {
    setModalVisible(false);
    navigate(`/execucao-rotina/executar-treino/${sessaoId}`);
  };

  // ✅ NOVA SESSÃO
  const criarNovaSessao = async () => {
    if (!treinoSelecionado) return;

    setModalLoading(true);
    setModalVisible(false);
    await iniciarNovaSessao(treinoSelecionado);
    setModalLoading(false);
  };

  // ✅ FORMATAÇÃO DE DATA
  const formatarDataUltimaSessao = useCallback((dataISO: string, dias: number): string => {
    const [ano, mes, dia] = dataISO.split('-');
    const dataLocal = new Date(Number(ano), Number(mes) - 1, Number(dia));
    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const diaSemana = diasSemana[dataLocal.getDay()];
    const diaStr = dataLocal.getDate().toString().padStart(2, '0');
    const mesStr = meses[dataLocal.getMonth()];

    return `${diaSemana}, ${diaStr}/${mesStr} (${dias} ${dias === 1 ? 'dia' : 'dias'})`;
  }, []);

  // ✅ CARREGAR DADOS
  useEffect(() => {
    if (!rotinaId) return;
    loadData();
  }, [loadData, rotinaId]);

  // ✅ LOADING
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!rotina || !aluno) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-foreground mb-4">Dados não encontrados</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/alunos-rotinas/${rotina.aluno_id}`)}
            className="text-primary hover:text-primary/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Execução de Treino</h1>
            <p className="text-muted-foreground">{aluno.nome_completo}</p>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE CONTEXTO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <span>Contexto da Rotina</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ultimaSessao ? (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">ÚLTIMA SESSÃO</span>
              </div>
              <p className="text-foreground font-medium">
                {ultimaSessao.treino_nome} - {formatarDataUltimaSessao(ultimaSessao.data_execucao, ultimaSessao.dias_desde_execucao)}
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">PRIMEIRA SESSÃO</span>
              </div>
              <p className="text-foreground font-medium">Nenhuma sessão executada ainda</p>
            </div>
          )}

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {ultimaSessao ? 'PRÓXIMA SESSÃO (SUGERIDO)' : 'TREINO SUGERIDO'}
              </span>
            </div>
            <p className="text-primary font-semibold text-lg">{treinoSugerido}</p>
          </div>
        </CardContent>
      </Card>

      {/* SELEÇÃO DE TREINO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-primary" />
            <span>Selecionar Treino</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {treinos.map((treino) => {
            const isSugerido = treino.nome === treinoSugerido;
            const isCompleto = treino.sessoes_disponiveis === 0 && !treino.tem_em_andamento && !treino.tem_pausada;
            const emAndamentoBadge = treino.tem_em_andamento;
            const pausadaBadge = treino.tem_pausada;
            const grupos = treino.grupos_musculares ? treino.grupos_musculares.split(', ') : [];

            // Log de diagnóstico ANTES do return JSX
            if (typeof window !== 'undefined') {
              console.log('🔍 Condição renderização:', {
                treinoId: treino.id,
                treinoExpandido,
                idsIguais: treinoExpandido === treino.id,
                temSessoes: !!sessoesDetalhadas[treino.id],
                sessoes: sessoesDetalhadas[treino.id]
              });
            }

            return (
              <Card
                key={treino.id}
                className={`cursor-pointer transition-all duration-200 ${
                  isSugerido 
                    ? 'border-primary bg-primary/5 hover:bg-primary/10' 
                    : isCompleto 
                      ? 'opacity-60 cursor-not-allowed bg-muted' 
                      : 'hover:bg-accent'
                }`}
                onClick={() => !isCompleto && iniciarTreino(treino)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className={`text-lg font-semibold ${
                          isSugerido ? 'text-primary' : isCompleto ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {treino.nome}
                        </h3>
                        
                        <div className="flex items-center space-x-2">
                          {isSugerido && !isCompleto && (
                            <Badge variant="secondary" className="bg-primary text-primary-foreground">
                              SUGERIDO
                            </Badge>
                          )}
                          
                          {emAndamentoBadge && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              EM ANDAMENTO ({treino.sessoes_em_andamento_count})
                            </Badge>
                          )}
                          
                          {pausadaBadge && (
                            <Badge variant="secondary" className="bg-orange-600 text-white font-medium">
                              PAUSADA ({treino.sessoes_pausadas_count})
                            </Badge>
                          )}
                          
                          {isCompleto && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              COMPLETO
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 mb-3">
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{treino.sessoes_concluidas} concluídas • {treino.sessoes_disponiveis} disponíveis</span>
                        </div>
                      </div>
                      
                      {grupos.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {grupos.map((grupo, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {grupo}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Botão Ver Sessões */}
                      <div className="flex justify-start mt-3 pt-3 border-t border-gray-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Evita disparar o onClick do card
                            toggleExpansaoTreino(treino.id);
                          }}
                          className="text-xs text-muted-foreground hover:text-foreground p-1 h-auto bg-gray-200 hover:bg-gray-300 border border-gray-300"
                        >
                          {treinoExpandido === treino.id ? (
                            <>
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              Ocultar sessões
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Ver sessões
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="ml-4">
                      {isCompleto ? (
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      ) : (
                        <Play className={`h-6 w-6 ${isSugerido ? 'text-primary' : 'text-muted-foreground'}`} />
                      )}
                    </div>
                  </div>

                  {/* Sessões Expandidas */}
                  {treinoExpandido === treino.id && sessoesDetalhadas[treino.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {sessoesDetalhadas[treino.id].length === 0 ? (
                        <div className="text-center text-muted-foreground">Nenhuma sessão encontrada para este treino.</div>
                      ) : (
                        <div className="space-y-3">
                          {sessoesDetalhadas[treino.id].map(sessao => {
                            const statusInfo = formatarStatusSessao(sessao.status);
                            return (
                              <div key={sessao.id} className="flex items-center justify-between p-3 rounded-md bg-white border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-lg">Sessão {sessao.sessao_numero}</span>
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      statusInfo.texto === 'Concluída'
                                        ? 'bg-green-100 text-green-800'
                                        : statusInfo.texto === 'Pausada'
                                          ? 'bg-orange-600 text-white font-medium'
                                          : statusInfo.cor
                                    }`}
                                  >
                                    {statusInfo.texto}
                                  </span>
                                </div>
                                {sessao.data_execucao && (
                                  <span className="text-sm text-muted-foreground">{new Date(sessao.data_execucao).toLocaleDateString('pt-BR')}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* MODALS */}
      {tipoModal === 'continuar_ou_nova' ? (
        <Dialog open={modalVisible} onOpenChange={setModalVisible}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {sessoesEmAndamento.length > 0 && sessoesEmAndamento[0].status === SESSAO_STATUS.PAUSADA
                  ? 'Sessão Pausada'
                  : 'Sessão em Andamento'}
              </DialogTitle>
              <DialogDescription>
                {sessoesEmAndamento.length > 0
                  ? (
                      (sessoesEmAndamento[0].status === SESSAO_STATUS.PAUSADA
                        ? 'Você tem uma sessão pausada. Deseja continuar de onde parou ou iniciar uma nova sessão?'
                        : MENSAGENS.CONTINUAR_OU_NOVA)
                      + `\n\n${sessoesEmAndamento[0].treino_nome} - Sessão ${sessoesEmAndamento[0].sessao_numero} - Iniciada em ${new Date(sessoesEmAndamento[0].data_execucao).toLocaleDateString('pt-BR')}`
                    )
                  : MENSAGENS.CONTINUAR_OU_NOVA
                }
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col space-y-3 pt-4">
              <Button 
                onClick={continuarSessao}
                disabled={modalLoading}
                className="w-full"
              >
                Continuar
              </Button>
              <Button 
                variant="outline"
                onClick={criarNovaSessao}
                disabled={modalLoading}
                className="w-full"
              >
                {modalLoading ? 'Criando...' : 'Nova Sessão'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <div className={`fixed inset-0 z-50 ${modalVisible ? 'block' : 'hidden'}`}>
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalVisible(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Play className="h-5 w-5 text-primary" />
                  <span>Escolher Sessão</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Você tem múltiplas sessões em andamento. Escolha qual continuar:
                </p>
                
                <div className="space-y-2">
                  {sessoesEmAndamento.map((sessao) => (
                    <Card
                      key={sessao.id}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => continuarSessaoEspecifica(sessao.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Sessão {sessao.sessao_numero}</p>
                            <p className="text-sm text-muted-foreground">
                              Iniciada em {new Date(sessao.data_execucao).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Play className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setModalVisible(false)}
                >
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}