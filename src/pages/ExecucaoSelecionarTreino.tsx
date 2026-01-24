// src/pages/ExecucaoSelecionarTreino.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Play, CheckCircle, Clock, Target, Calendar, ListChecks, User, Shield } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";
import { 
  Rotina, 
  UltimaSessao, 
  AlunoData
} from '@/types/exercicio.types';

// Nova tipagem para a lista de sessões
interface SessaoParaLista {
  id: string;
  data_execucao: string;
  sessao_numero: number;
  status: string;
  modo_execucao: 'professor' | 'aluno' | null;
  treinos: {
    nome: string;
  };
}

export default function ExecucaoSelecionarTreino() {
  const { rotinaId } = useParams<{ rotinaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Estados
  const [loading, setLoading] = useState(true);
  const [rotina, setRotina] = useState<Rotina | null>(null);
  const [aluno, setAluno] = useState<AlunoData | null>(null);
  const [ultimaSessao, setUltimaSessao] = useState<UltimaSessao | null>(null);
  const [sessoes, setSessoes] = useState<SessaoParaLista[]>([]);

  // ✅ FUNÇÕES UTILITÁRIAS MIGRADAS
  const calcularDiasDesde = useCallback((dataStr: string): number => {
    const data = new Date(dataStr);
    const hoje = new Date();
    return Math.floor((hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));
  }, []);

  // ✅ BUSCAR ÚLTIMA SESSÃO
  const buscarUltimaSessao = useCallback(async (alunoId: string, currentRotinaId: string): Promise<string | null> => {
    try {
      const { data: ultimaExecucao, error } = await supabase // ✅ Busca a última sessão com data
        .from('execucoes_sessao')
        .select('data_execucao, treino_id, sessao_numero, status, modo_execucao')
        .eq('aluno_id', alunoId)
        .eq('rotina_id', currentRotinaId)
        .in('status', ['concluida', 'pausada', 'em_andamento'])
        .not('data_execucao', 'is', null)
        .order('data_execucao', { ascending: false })
        // Adiciona ordenação secundária para garantir consistência se houver múltiplas sessões no mesmo dia
        .order('sessao_numero', { ascending: false })
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
        dias_desde_execucao: calcularDiasDesde(ultimaExecucao.data_execucao),
        sessao_numero: ultimaExecucao.sessao_numero,
        status: ultimaExecucao.status,
        modo_execucao: ultimaExecucao.modo_execucao as 'professor' | 'aluno' | null,
      };
      setUltimaSessao(ultimaSessaoData);
      return ultimaSessaoData.treino_nome;
    } catch (error) {
      console.error('Erro ao buscar sessão:', error);
      setUltimaSessao(null);
      return null;
    }
  }, [calcularDiasDesde]);

  // ✅ CARREGAR DADOS
  const loadData = useCallback(async (currentRotinaId: string) => {
    try {
      setLoading(true);

      // Verificar autenticação
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("Usuário não autenticado");
      }

      // Buscar rotina
      const { data: rotinaData, error: rotinaError } = await supabase
        .from('rotinas')
        .select('id, nome, descricao, aluno_id, status')
        .eq('id', currentRotinaId)
        .single();

      if (rotinaError || !rotinaData) {
        throw new Error("Rotina não encontrada");
      }
      setRotina(rotinaData);

      // ✅ CORREÇÃO: Adicionar a busca pelos dados do aluno.
      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('id, nome_completo, email')
        .eq('id', rotinaData.aluno_id)
        .single();

      if (alunoError || !alunoData) {
        throw new Error("Aluno da rotina não encontrado");
      }
      setAluno(alunoData);

      // ✅ CORREÇÃO: Revertido para a busca direta e funcional das sessões.
      const { data: sessoesData, error: rpcError } = await supabase
        .from('execucoes_sessao')
        .select('id, sessao_numero, status, data_execucao, modo_execucao, treinos(nome)')
        .eq('rotina_id', currentRotinaId)
        .eq('aluno_id', rotinaData.aluno_id) // ✅ CORREÇÃO: Usar o ID do aluno da rotina
        .order('sessao_numero', { ascending: true });

      if (rpcError) {
        console.error("Erro ao buscar treinos e sessões:", rpcError);
        toast.error("Erro ao carregar as sessões da rotina.");
        setSessoes([]);
      } else {
        setSessoes((sessoesData as SessaoParaLista[]) || []);
      }

      // ✅ CORREÇÃO: Buscar última sessão para exibir no contexto da rotina
      await buscarUltimaSessao(rotinaData.aluno_id, currentRotinaId);

    } catch (error: unknown) {
      console.error('Erro ao carregar dados:', error);
      let errorMessage = "Erro ao carregar dados da rotina";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error("Erro", {
        description: errorMessage
      })
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [navigate, buscarUltimaSessao]);

  // ✅ INICIAR SESSÃO
  const handleIniciarSessao = async (sessao: SessaoParaLista) => {
    try {
      if (sessao.status === 'concluida') {
        toast.error("Sessão Concluída", {
          description: "Esta sessão já foi finalizada e não pode ser executada novamente."
        })
        return;
      }

      // ✅ CORREÇÃO: Reativar sessões pausadas E em_aberto
      if (sessao.status === 'em_aberto' || sessao.status === 'pausada') {
        const hoje = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('execucoes_sessao')
          .update({ 
            status: 'em_andamento', // ✅ Sempre define como em_andamento
            data_execucao: hoje 
          })
          .eq('id', sessao.id);
        
        if (error) throw error;
      }

      // Navega para a tela de execução
      navigate(`/execucao-rotina/executar-treino/${sessao.id}`);
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      toast.error("Erro", {
        description: "Não foi possível iniciar a sessão de treino."
      })
    }
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

  const formatDateForBadge = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      // Adiciona T00:00:00 para evitar problemas de fuso horário que podem mudar o dia
      const date = new Date(dateString + 'T00:00:00');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return ` em ${day}/${month}`;
    } catch (error) {
      console.error("Erro ao formatar data para badge:", error);
      return '';
    }
  };

  // ✅ FORMATAR STATUS DAS SESSÕES
  const getStatusBadge = (status: string, dataExecucao: string | null) => {
    const dateSuffix = formatDateForBadge(dataExecucao);
    switch (status) {
      case 'em_aberto':
        return { texto: 'Em Aberto', cor: 'bg-red-100 text-red-800' };
      case 'em_andamento':
        return { texto: 'Em Andamento', cor: 'bg-yellow-100 text-yellow-800' };
      case 'pausada':
        return { texto: `Pausada${dateSuffix}`, cor: 'bg-orange-100 text-orange-800' };
      case 'concluida':
        return { texto: `Concluída${dateSuffix}`, cor: 'bg-green-100 text-green-800' };
      default:
        return { texto: status, cor: 'bg-gray-100 text-gray-800' };
    }
  };

  const ModoExecucaoBadge = ({ modo }: { modo: 'professor' | 'aluno' | null }) => {
    if (!modo) return null;
  
    const isAssistido = modo === 'professor';
    const Icon = isAssistido ? Shield : User;
    const text = isAssistido ? 'Modo Assistido' : 'Modo Aluno';
    const colorClasses = 'bg-slate-200 text-slate-800 border-slate-300';
  
    return (
      <Badge variant="outline" className={`text-xs ${colorClasses} flex items-center w-fit`}>
        <Icon className="h-3 w-3 mr-1" />
        <span>{text}</span>
      </Badge>
    );
  };

  // ✅ CARREGAR DADOS
  useEffect(() => {
    if (!rotinaId) return;
    // Passamos rotinaId diretamente para garantir que a função use o valor mais recente
    loadData(rotinaId);
  }, [rotinaId, loadData]);

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
    <div className="space-y-6">
      {/* HEADER */}
      {isDesktop && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Execução de Rotina</h1>
              <p className="text-muted-foreground">Execução da Rotina '{rotina?.nome}'</p>
            </div>
          </div>
        </div>
      )}

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
              <div className="flex items-center space-x-2 mb-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">ÚLTIMA ATIVIDADE</span>
              </div>
              <div className="flex flex-col items-start gap-1.5">
                <p className="text-foreground font-medium">
                  Sessão {ultimaSessao.sessao_numero}/{sessoes.length} - {ultimaSessao.treino_nome}                  
                </p>
                {(ultimaSessao.status === 'concluida' || ultimaSessao.status === 'pausada') && <ModoExecucaoBadge modo={ultimaSessao.modo_execucao} />}
                <Badge className={getStatusBadge(ultimaSessao.status, ultimaSessao.data_execucao).cor}>{getStatusBadge(ultimaSessao.status, ultimaSessao.data_execucao).texto}</Badge>
              </div>
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

        </CardContent>
      </Card>

      {/* SELEÇÃO DE TREINO */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <span>Sessões de Treino</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 pb-20 md:pb-0">
            {sessoes.map((sessao) => {
              const statusInfo = getStatusBadge(sessao.status, sessao.data_execucao);
              const isConcluida = sessao.status === 'concluida';
              const isPausada = sessao.status === 'pausada';
              return (
                <Card
                  key={sessao.id}
                  className={`transition-all duration-200 ${isConcluida ? 'bg-muted/50' : 'hover:bg-accent'}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          Sessão {sessao.sessao_numero}/{sessoes.length}
                        </p>
                        <h3 className={`text-lg font-semibold ${isConcluida ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {sessao.treinos.nome}
                        </h3>
                        {isConcluida || isPausada ? (
                          <div className="flex flex-col items-start gap-1.5 pt-1">
                            <ModoExecucaoBadge modo={sessao.modo_execucao} />
                            <Badge className={statusInfo.cor}>{statusInfo.texto}</Badge>
                          </div>
                        ) : (
                          <div className="pt-1">
                            <Badge className={statusInfo.cor}>{statusInfo.texto}</Badge>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        <Button
                          size={isDesktop ? "sm" : "icon"}
                          onClick={() => handleIniciarSessao(sessao)}
                          disabled={isConcluida}
                          className={`${isConcluida ? 'bg-muted text-muted-foreground' : ''} ${!isDesktop ? 'rounded-full' : ''}`}
                          aria-label={sessao.status === 'em_andamento' || sessao.status === 'pausada' ? 'Continuar' : 'Treinar'}
                        >
                          {isDesktop ? (
                            <>
                              {sessao.status === 'em_andamento' || sessao.status === 'pausada' ? 'Continuar' : 'Treinar'}
                              {!isConcluida && <Play className="h-4 w-4 ml-2" />}
                              {isConcluida && <CheckCircle className="h-4 w-4 ml-2" />}
                            </>
                          ) : (
                            isConcluida 
                              ? <CheckCircle className="h-5 w-5" /> 
                              : <Play className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}