// src/pages/IndexPT.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Dumbbell, 
  Activity, 
  Calendar,
  Plus,
  TrendingUp,
  Clock,
  Target,
  Cake,
  Mail,
  MailCheck,
  Trash2,
  Send
} from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface DashboardStats {
  alunosAtivos: number;
  rotinasAtivas: number; 
  sessoesHoje: number;
  exerciciosPersonalizados: number;
}

interface SessaoHoje {
  id: string;
  aluno_nome: string;
  treino_nome: string;
  status: string;
  data_execucao: string;
}

interface AlunoDestaque {
  id: string;
  nome_completo: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color?: string;
  data_nascimento?: string;
  tipo: 'aniversariante' | 'novo';
}

interface ConvitePendente {
  id: string;
  email_convidado: string;
  tipo_convite: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const IndexPT = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    alunosAtivos: 0,
    rotinasAtivas: 0,
    sessoesHoje: 0,
    exerciciosPersonalizados: 0
  });
  const [sessoesHoje, setSessoesHoje] = useState<SessaoHoje[]>([]);
  const [alunosDestaque, setAlunosDestaque] = useState<AlunoDestaque[]>([]);
  const [convitesPendentes, setConvitesPendentes] = useState<ConvitePendente[]>([]);

  // Carregar convites pendentes
  const carregarConvitesPendentes = useCallback(async () => {
    if (!user?.id) return;
    console.log("ID do PT logado (carregarConvitesPendentes):", user.id);

    try {
      const { data: convites } = await supabase
        .from('convites')
        .select('id, email_convidado, tipo_convite, status, created_at, expires_at')
        .eq('personal_trainer_id', user.id)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(5);

      if (convites) {
        setConvitesPendentes(convites);
      }
    } catch (error) {
      console.error('Erro ao carregar convites pendentes:', error);
    }
  }, [user?.id]);

  // Cancelar convite
  const cancelarConvite = async (conviteId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('convites')
        .update({ status: 'cancelado' })
        .eq('id', conviteId);

      if (error) throw error;

      // Remover da lista local
      setConvitesPendentes(prev => prev.filter(c => c.id !== conviteId));

      toast.success("Convite cancelado", {
        description: `O convite para ${email} foi cancelado.`,
      });
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      toast.error("Erro", {
        description: "Não foi possível cancelar o convite.",
      });
    }
  };

  // Carregar estatísticas principais
  const carregarStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Alunos ativos
      const { count: alunosAtivos } = await supabase
        .from('alunos')
        .select('*', { count: 'exact', head: true })
        .eq('personal_trainer_id', user.id)
        .eq('status', 'ativo');

      // Rotinas ativas
      const { count: rotinasAtivas } = await supabase
        .from('rotinas')
        .select('*', { count: 'exact', head: true })
        .eq('personal_trainer_id', user.id)
        .eq('status', 'Ativa');

      // Sessões de hoje - Query simplificada usando aluno_id diretamente
      const hoje = new Date().toISOString().split('T')[0];
      
      // Primeiro buscar IDs dos alunos do PT
      const { data: meuAlunos } = await supabase
        .from('alunos')
        .select('id')
        .eq('personal_trainer_id', user.id)
        .eq('status', 'ativo');

      const alunoIds = meuAlunos?.map(a => a.id) || [];
      let sessoesHojeCount = 0;

      if (alunoIds.length > 0) {
        const { count: sessoesHoje } = await supabase
          .from('execucoes_sessao')
          .select('*', { count: 'exact', head: true })
          .in('aluno_id', alunoIds)
          .eq('data_execucao', hoje)
          .in('status', ['em_aberto', 'em_andamento', 'pausada']);

        sessoesHojeCount = sessoesHoje || 0;
      }

      // Exercícios personalizados
      const { count: exerciciosPersonalizados } = await supabase
        .from('exercicios')
        .select('*', { count: 'exact', head: true })
        .eq('pt_id', user.id)
        .eq('is_ativo', true);

      setStats({
        alunosAtivos: alunosAtivos || 0,
        rotinasAtivas: rotinasAtivas || 0,
        sessoesHoje: sessoesHojeCount,
        exerciciosPersonalizados: exerciciosPersonalizados || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  }, [user?.id]);

  // Carregar sessões de hoje
  const carregarSessoesHoje = useCallback(async () => {
    if (!user?.id) return;

    try {
      const hoje = new Date().toISOString().split('T')[0];
      
      // 1. Buscar alunos do PT
      const { data: meuAlunos } = await supabase
        .from('alunos')
        .select('id, nome_completo')
        .eq('personal_trainer_id', user.id)
        .eq('status', 'ativo');

      if (!meuAlunos?.length) {
        setSessoesHoje([]);
        return;
      }

      const alunoIds = meuAlunos.map(a => a.id);

      // 2. Buscar sessões do dia para esses alunos
      const { data: sessoes } = await supabase
        .from('execucoes_sessao')
        .select('id, status, data_execucao, aluno_id, treino_id')
        .in('aluno_id', alunoIds)
        .eq('data_execucao', hoje)
        .in('status', ['em_aberto', 'em_andamento', 'pausada'])
        .order('created_at', { ascending: true })
        .limit(5);

      if (!sessoes?.length) {
        setSessoesHoje([]);
        return;
      }

      // 3. Buscar nomes dos treinos
      const treinoIds = sessoes.map(s => s.treino_id).filter(Boolean);
      const { data: treinos } = await supabase
        .from('treinos')
        .select('id, nome')
        .in('id', treinoIds);

      // 4. Montar resultado
      const sessoesFormatadas: SessaoHoje[] = sessoes.map(sessao => {
        const aluno = meuAlunos.find(a => a.id === sessao.aluno_id);
        const treino = treinos?.find(t => t.id === sessao.treino_id);

        return {
          id: sessao.id,
          aluno_nome: aluno?.nome_completo || 'Aluno',
          treino_nome: treino?.nome || 'Treino',
          status: sessao.status || 'em_aberto',
          data_execucao: sessao.data_execucao || hoje
        };
      });

      setSessoesHoje(sessoesFormatadas);
    } catch (error) {
      console.error('Erro ao carregar sessões de hoje:', error);
    }
  }, [user?.id]);

  // Carregar alunos em destaque
  const carregarAlunosDestaque = useCallback(async () => {
    if (!user?.id) return;

    try {
      const alunos: AlunoDestaque[] = [];

      // Aniversariantes do mês
      const mesAtual = new Date().getMonth() + 1;
      const { data: aniversariantes } = await supabase
        .from('alunos')
        .select('id, nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color, data_nascimento')
        .eq('personal_trainer_id', user.id)
        .eq('status', 'ativo')
        .not('data_nascimento', 'is', null);

      if (aniversariantes) {
        aniversariantes.forEach(aluno => {
          if (aluno.data_nascimento) {
            const mesAniversario = new Date(aluno.data_nascimento).getMonth() + 1;
            if (mesAniversario === mesAtual) {
              alunos.push({
                id: aluno.id,
                nome_completo: aluno.nome_completo,
                avatar_type: aluno.avatar_type || 'letter',
                avatar_image_url: aluno.avatar_image_url || undefined,
                avatar_letter: aluno.avatar_letter || undefined,
                avatar_color: aluno.avatar_color || undefined,
                data_nascimento: aluno.data_nascimento,
                tipo: 'aniversariante'
              });
            }
          }
        });
      }

      // Novos alunos (últimos 7 dias)
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const { data: novosAlunos } = await supabase
        .from('alunos')
        .select('id, nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color, created_at')
        .eq('personal_trainer_id', user.id)
        .eq('status', 'ativo')
        .gte('created_at', seteDiasAtras.toISOString())
        .order('created_at', { ascending: false })
        .limit(3);

      if (novosAlunos) {
        novosAlunos.forEach(aluno => {
          alunos.push({
            id: aluno.id,
            nome_completo: aluno.nome_completo,
            avatar_type: aluno.avatar_type || 'letter',
            avatar_image_url: aluno.avatar_image_url || undefined,
            avatar_letter: aluno.avatar_letter || undefined,
            avatar_color: aluno.avatar_color || undefined,
            tipo: 'novo'
          });
        });
      }

      setAlunosDestaque(alunos.slice(0, 6));
    } catch (error) {
      console.error('Erro ao carregar alunos em destaque:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      await Promise.all([
        carregarStats(),
        carregarSessoesHoje(),
        carregarAlunosDestaque(),
        carregarConvitesPendentes()
      ]);
      setLoading(false);
    };

    carregarDados();
  }, [carregarStats, carregarSessoesHoje, carregarAlunosDestaque, carregarConvitesPendentes]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'em_andamento': return 'bg-blue-100 text-blue-800';
      case 'pausada': return 'bg-yellow-100 text-yellow-800';
      case 'em_aberto': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'em_andamento': return 'Em andamento';
      case 'pausada': return 'Pausada';
      case 'em_aberto': return 'Agendada';
      default: return status;
    }
  };

  const formatarDataRelativa = (data: string) => {
    const agora = new Date();
    const dataConvite = new Date(data);

    // Zera a hora, minuto e segundo para comparar apenas os dias (no fuso horário local)
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const diaConvite = new Date(dataConvite.getFullYear(), dataConvite.getMonth(), dataConvite.getDate());

    const diferencaMs = hoje.getTime() - diaConvite.getTime();
    const diferencaDias = Math.round(diferencaMs / (1000 * 60 * 60 * 24));

    if (diferencaDias === 0) return 'Hoje';
    if (diferencaDias === 1) return 'Ontem';
    if (diferencaDias > 1 && diferencaDias < 7) return `${diferencaDias} dias atrás`;
    
    // Para datas mais antigas, formata para o padrão BR
    return new Intl.DateTimeFormat('pt-BR').format(dataConvite);
  };

  const getConviteIcon = (tipo: string) => {
    return tipo === 'cadastro' ? <Mail className="h-4 w-4" /> : <MailCheck className="h-4 w-4" />;
  };

  const getConviteDescricao = (tipo: string) => {
    return tipo === 'cadastro' ? 'Convite de cadastro' : 'Convite de vínculo';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {isDesktop && (
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.user_metadata?.full_name || 'Personal Trainer'}!
          </p>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.alunosAtivos}</div>
            <p className="text-xs text-muted-foreground">
              alunos com rotinas ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotinas Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rotinasAtivas}</div>
            <p className="text-xs text-muted-foreground">
              em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessoesHoje}</div>
            <p className="text-xs text-muted-foreground">
              treinos programados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Exercícios</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.exerciciosPersonalizados}</div>
            <p className="text-xs text-muted-foreground">
              exercícios personalizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Coluna Esquerda - Atividades de Hoje */}
        <div className="md:col-span-2 space-y-6">
          {/* Convites Pendentes */}
          {convitesPendentes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Convites Pendentes
                  <Badge 
                    variant="secondary" 
                    className={`ml-auto text-white ${convitesPendentes.length === 1 ? 'rounded-full w-6 h-6 flex items-center justify-center p-0 md:rounded-full md:w-6 md:h-6' : ''}`}
                    style={{ backgroundColor: '#AA1808' }}
                  >
                    {convitesPendentes.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {convitesPendentes.map((convite) => (
                    <div key={convite.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getConviteIcon(convite.tipo_convite)}
                        <div className="flex flex-col">
                          <span className="font-medium">{convite.email_convidado}</span>
                          <span className="text-sm text-muted-foreground">
                            {getConviteDescricao(convite.tipo_convite)} • {formatarDataRelativa(convite.created_at)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { void cancelarConvite(convite.id, convite.email_convidado); }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/convite-aluno")}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Enviar Novo Convite
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessões de Hoje */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Treinos de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sessoesHoje.length > 0 ? (
                <div className="space-y-3">
                  {sessoesHoje.map((sessao) => (
                    <div key={sessao.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{sessao.aluno_nome}</span>
                          <span className="text-sm text-muted-foreground">{sessao.treino_nome}</span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(sessao.status)}>
                        {getStatusText(sessao.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum treino programado para hoje</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Alunos em Destaque */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Alunos em Destaque
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alunosDestaque.length > 0 ? (
                <div className="space-y-3">
                  {alunosDestaque.map((aluno) => (
                    <div key={aluno.id} className="flex items-center gap-3 p-2 border rounded-lg">
                      <Avatar className="h-10 w-10">
                        {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
                          <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />
                        ) : (
                          <AvatarFallback 
                            style={{ backgroundColor: aluno.avatar_color || '#6366f1' }}
                            className="text-white font-semibold"
                          >
                            {aluno.avatar_letter || aluno.nome_completo.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{aluno.nome_completo}</p>
                        <div className="flex items-center gap-1">
                          {aluno.tipo === 'aniversariante' && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 text-xs">
                              <Cake className="h-3 w-3 mr-1" />
                              Aniversário
                            </Badge>
                          )}
                          {aluno.tipo === 'novo' && (
                            <Badge variant="outline" className="bg-green-50 text-green-800 text-xs">
                              Novo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum destaque no momento</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IndexPT;