// src/pages/IndexAluno.tsx

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAlunoProfile } from '@/hooks/useAlunoProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dumbbell, BarChart3, User, Calendar, ArrowRight, Target, TrendingUp, CheckCircle, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface professor {
  nome_completo: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
}

interface RotinaAtiva {
  id: string;
  nome: string;
  objetivo: string;
  data_inicio: string;
}

interface UltimaAtividade {
  treino_nome: string;
  data_execucao: string;
  status: string;
  sessao_numero: number;
  modo_execucao?: 'professor' | 'aluno' | null;
}

interface CustomizedLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}

const IndexAluno = () => {
  const { user } = useAuth();
  const { profile: alunoProfile, loading: alunoLoading } = useAlunoProfile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rotinaAtiva, setRotinaAtiva] = useState<RotinaAtiva | null>(null);
  const [progresso, setProgresso] = useState({ concluidas: 0, pausadas: 0, total: 0 });
  const [ultimaAtividade, setUltimaAtividade] = useState<UltimaAtividade | null>(null);
  const [treinos7dias, setTreinos7dias] = useState(0);
  const [professor, setprofessor] = useState<professor | null>(null);
  const [stats, setStats] = useState({ rotinas: 0, avaliacoes: 0 });

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

  const formatDateForBadge = useCallback((dateString: string | null): string => {
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
  }, []);

  const getStatusBadge = useCallback((status: string, dataExecucao: string | null) => {
    const dateSuffix = formatDateForBadge(dataExecucao);
    switch (status) {
      case 'em_andamento':
        return { texto: 'Em Andamento', cor: 'bg-yellow-100 text-yellow-800' };
      case 'pausada':
        return { texto: `Pausada${dateSuffix}`, cor: 'bg-orange-100 text-orange-800' };
      case 'concluida':
        return { texto: `Concluída${dateSuffix}`, cor: 'bg-green-100 text-green-800' };
      default:
        return { texto: status, cor: 'bg-gray-100 text-gray-800' };
    }
  }, [formatDateForBadge]);

  useEffect(() => {
    if (!user || !alunoProfile) return;

    const fetchData = async () => {
      try {
        // 1. MUDANÇA: Buscar o primeiro professor que o aluno segue
        const { data: relacaoData, error: relacaoError } = await supabase
          .from('alunos_professores')
          .select('professor_id')
          .eq('aluno_id', user.id)
          .limit(1)
          .single();

        if (relacaoData && !relacaoError) {
          const { data: ptData, error: ptError } = await supabase
            .from('professores')
            .select('nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color')
            .eq('id', relacaoData.professor_id)
            .single();
          if (ptError) throw ptError;

          // Constrói a URL pública do avatar do professor
          if (ptData && ptData.avatar_image_url && !ptData.avatar_image_url.startsWith('http')) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(ptData.avatar_image_url);
            ptData.avatar_image_url = urlData.publicUrl;
          }

          setprofessor(ptData);
        }

        // 2. Fetch active routine and its stats
        const { data: rotinaAtiva, error: rotinaError } = await supabase
          .from('rotinas')
          .select('id, nome, objetivo, data_inicio')
          .eq('aluno_id', user.id)
          .eq('status', 'Ativa')
          .limit(1)
          .single();

        if (rotinaAtiva) {
          setRotinaAtiva(rotinaAtiva);

          // Fetch all sessions for the active routine
          const { data: sessoes, error: sessoesError, count: totalSessoes } = await supabase
            .from('execucoes_sessao')
            .select('id, status', { count: 'exact' })
            .eq('rotina_id', rotinaAtiva.id);

          if (sessoesError) throw sessoesError;

          if (sessoes) {
            const concluidas = sessoes.filter(s => s.status === 'concluida').length;
            const pausadas = sessoes.filter(s => s.status === 'pausada').length;
            setProgresso({ concluidas, pausadas, total: totalSessoes || 0 });

            // Find last activity
            const { data: ultimaAtividadeSessao, error: ultimaAtividadeError } = await supabase
              .from('execucoes_sessao')
              .select('status, data_execucao, sessao_numero, modo_execucao, treinos(nome)')
              .eq('rotina_id', rotinaAtiva.id)
              .in('status', ['concluida', 'pausada', 'em_andamento'])
              .not('data_execucao', 'is', null)
              .order('data_execucao', { ascending: false })
              .order('sessao_numero', { ascending: false })
              .limit(1)
              .maybeSingle();

            if (ultimaAtividadeSessao && !ultimaAtividadeError) {
              setUltimaAtividade({
                treino_nome: ultimaAtividadeSessao.treinos?.nome || 'Treino',
                data_execucao: ultimaAtividadeSessao.data_execucao,
                status: ultimaAtividadeSessao.status,
                sessao_numero: ultimaAtividadeSessao.sessao_numero,
                modo_execucao: ultimaAtividadeSessao.modo_execucao as 'professor' | 'aluno' | null,
              });
            }

            // Calculate workouts in the last 7 days
            const { data: sessoesConcluidasRecentes } = await supabase
              .from('execucoes_sessao')
              .select('data_execucao')
              .eq('rotina_id', rotinaAtiva.id)
              .eq('status', 'concluida')
              .not('data_execucao', 'is', null);

            const seteDiasAtras = new Date();
            seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
            const treinosRecentes = (sessoesConcluidasRecentes || []).filter(s => 
              s.data_execucao &&
              new Date(s.data_execucao + 'T00:00:00') >= seteDiasAtras
            ).length;
            setTreinos7dias(treinosRecentes);
          }
        }

        // 3. Fetch other stats
        const { count: avaliacoesCount } = await supabase
          .from('avaliacoes_fisicas')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_id', user.id);
        
        setStats({ rotinas: rotinaAtiva ? 1 : 0, avaliacoes: avaliacoesCount || 0 });

      } catch (error) {
        console.error("Erro ao carregar dashboard do aluno:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, alunoProfile, getStatusBadge, formatDateForBadge]);

  const pendentes = progresso.total - progresso.concluidas - progresso.pausadas;
  const progressoData = [
    { name: 'Concluídas', value: progresso.concluidas, fill: '#10b981' }, 
    { name: 'Pausadas', value: progresso.pausadas, fill: '#eab308' }, // Amarelo para pausado
    { name: 'Pendentes', value: pendentes > 0 ? pendentes : 0, fill: '#e5e7eb' }
  ];

  if (alunoLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-3/4 rounded-lg bg-muted animate-pulse" />
        <div className="h-48 rounded-lg bg-muted animate-pulse" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-24 md:pb-6">
      <h1 className="text-3xl font-bold">
        Olá, {alunoProfile?.nome_completo?.split(' ')[0]}!
      </h1>

      {/* Cards de Informação */}
      {rotinaAtiva ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Principal de Progresso */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Rotina Ativa
              </CardTitle>
              <p className="text-sm text-muted-foreground pt-1">{rotinaAtiva.nome}</p>
            </CardHeader>
            <CardContent className="flex flex-row items-center gap-6">
              <div className="h-28 w-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={progressoData}
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      innerRadius={35}
                      dataKey="value"
                    >
                      {progressoData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    {payload[0].name}
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {payload[0].value}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                  </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                  <span className="text-sm text-muted-foreground">Concluído ({progresso.concluidas})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
                  <span className="text-sm text-muted-foreground">Pausado ({progresso.pausadas})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                  <span className="text-sm text-muted-foreground">Pendentes ({pendentes > 0 ? pendentes : 0})</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Última Atividade */}
          {ultimaAtividade && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5" />
                  Última Atividade
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-start space-y-2">
                <p className="font-semibold">
                  Sessão {ultimaAtividade.sessao_numero}/{progresso.total}
                </p>
                <p className="font-semibold text-lg">{ultimaAtividade.treino_nome}</p>
                {(ultimaAtividade.status === 'concluida' || ultimaAtividade.status === 'pausada') && ultimaAtividade.modo_execucao && (
                  <ModoExecucaoBadge modo={ultimaAtividade.modo_execucao} />
                )}
                <Badge className={getStatusBadge(ultimaAtividade.status, ultimaAtividade.data_execucao).cor}>{getStatusBadge(ultimaAtividade.status, ultimaAtividade.data_execucao).texto}</Badge>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-10">
            <p className="text-lg font-medium">Nenhum treino programado.</p>
            <p className="text-muted-foreground">Aproveite para descansar ou fale com seu personal!</p>
            <Button className="mt-4" onClick={() => navigate('/minhas-rotinas')}>Ver Rotinas</Button>
          </CardContent>
        </Card>
      )}

      {/* Atalhos Rápidos */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate('/avaliacoes-aluno')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5" />Treinos (7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{treinos7dias}</p>
            <p className="text-sm text-muted-foreground">sessões concluídas</p>
          </CardContent>
        </Card>

        <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate('/avaliacoes-aluno')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><BarChart3 className="h-5 w-5" />Avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.avaliacoes}</p>
            <p className="text-sm text-muted-foreground">avaliações realizadas</p>
          </CardContent>
        </Card>

        {professor && (
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" />Meu Personal</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar>
                {professor.avatar_type === 'image' ? (
                  <AvatarImage src={professor.avatar_image_url} />
                ) : (
                  <AvatarFallback style={{ backgroundColor: professor.avatar_color }}>
                    {professor.avatar_letter}
                  </AvatarFallback>
                )}
              </Avatar>
              <p className="font-semibold">{professor.nome_completo}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default IndexAluno;