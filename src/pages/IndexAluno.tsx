// src/pages/IndexAluno.tsx

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAlunoProfile } from '@/hooks/useAlunoProfile';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dumbbell, BarChart3, User, Calendar, Target, TrendingUp, Shield, ClipboardList, Loader2, MoreVertical, Check, X, Ban, AlertTriangle, Trash2, MessageSquareText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, isToday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

type Agendamento = Tables<'agendamentos'> & {
  professores: {
    nome_completo: string;
    avatar_type: string | null;
    avatar_image_url: string | null;
    avatar_letter: string | null;
    avatar_color: string | null;
  } | null;
};

const CORES_STATUS_AGENDAMENTO: Record<string, string> = {
  'pendente': 'bg-red-100 text-red-800 border-red-200',
  'confirmado': 'bg-green-100 text-green-800 border-green-200',
  'recusado': 'bg-red-100 text-red-800 border-red-200',
  'cancelado': 'bg-orange-100 text-orange-800 border-orange-200',
  'concluido': 'bg-gray-100 text-gray-800 border-gray-200'
};

const IndexAluno = () => {
  const { user } = useAuth();
  const { profile: alunoProfile, loading: alunoLoading } = useAlunoProfile();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [treinos7dias, setTreinos7dias] = useState(0);
  const [stats, setStats] = useState({ rotinas: 0, avaliacoes: 0, professores: 0 });
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Agendamento[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [agendamentosTab, setAgendamentosTab] = useState('semana');

  // Estados para o modal de recusa
  const [agendamentoParaRecusar, setAgendamentoParaRecusar] = useState<Agendamento | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');
 
  // ✅ NOVO: Estado para o modal de exclusão
  const [agendamentoParaExcluir, setAgendamentoParaExcluir] = useState<Agendamento | null>(null);
 
 


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

  const fetchAgendamentos = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('agendamentos')
      .select('*, professores(nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color)')
      .eq('aluno_id', user.id)
      .in('status', ['confirmado', 'pendente'])
      .gte('data_hora_inicio', new Date().toISOString())
      .order('data_hora_inicio', { ascending: true });

    if (error) {
      console.error("Erro ao buscar próximos agendamentos do aluno:", error);
    } else {
      setProximosAgendamentos(data as Agendamento[] || []);
    }
  }, [user]);

  const agendamentosFiltrados = useMemo(() => {
    const agora = new Date();
    const futuros = proximosAgendamentos.filter(ag => new Date(ag.data_hora_inicio) >= agora);

    if (agendamentosTab === 'hoje') {
      return futuros.filter(ag => isToday(new Date(ag.data_hora_inicio)));
    }
    if (agendamentosTab === 'semana') {
      return futuros.filter(ag => isThisWeek(new Date(ag.data_hora_inicio), { weekStartsOn: 1 }));
    }
    return futuros.filter(ag => !isThisWeek(new Date(ag.data_hora_inicio), { weekStartsOn: 1 }));
  }, [proximosAgendamentos, agendamentosTab]);

  useEffect(() => {
    if (user) {
      fetchAgendamentos();
    }
  }, [user, fetchAgendamentos]);

  useEffect(() => {
    if (!user || !alunoProfile) return;

    const fetchData = async () => {
      try {
        // ✅ NOVO: Atualiza agendamentos passados para 'concluido' antes de buscar os dados.
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ status: 'concluido' })
          .eq('aluno_id', user.id)
          .in('status', ['pendente', 'confirmado'])
          .lt('data_hora_inicio', new Date().toISOString());

        if (updateError) console.error("Erro ao atualizar agendamentos passados (aluno):", updateError);

        // ✅ NOVO: Exclui agendamentos recusados que já passaram.
        const { error: deleteError } = await supabase
          .from('agendamentos')
          .delete()
          .eq('aluno_id', user.id)
          .eq('status', 'recusado')
          .lt('data_hora_inicio', new Date().toISOString());

        if (deleteError) console.error("Erro ao excluir agendamentos recusados (aluno):", deleteError);

        // Fetch active routine
        const { data: rotinaAtiva, error: rotinaError } = await supabase
          .from('rotinas')
          .select('id, nome, objetivo, data_inicio')
          .eq('aluno_id', user.id)
          .eq('status', 'Ativa')
          .limit(1);

        // 3. Fetch other stats
        const { count: avaliacoesCount } = await supabase
          .from('avaliacoes_fisicas')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_id', user.id);
        
        const { count: professoresCount } = await supabase
          .from('alunos_professores')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_id', user.id);

        // Calculate workouts in the last 7 days
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
        const { count: treinosRecentesCount } = await supabase
          .from('execucoes_sessao')
          .select('*', { count: 'exact', head: true })
          .eq('aluno_id', user.id)
          .eq('status', 'concluida')
          .gte('data_execucao', seteDiasAtras.toISOString().split('T')[0]);

        setTreinos7dias(treinosRecentesCount || 0);
        setStats({ 
          rotinas: rotinaAtiva?.length || 0, 
          avaliacoes: avaliacoesCount || 0,
          professores: professoresCount || 0,
        });

      } catch (error) {
        console.error("Erro ao carregar dashboard do aluno:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, alunoProfile]);

  const handleUpdateStatus = async (agendamentoId: string, status: 'confirmado' | 'recusado' | 'cancelado', motivo?: string) => {
    setSavingId(agendamentoId);
    const { error } = await supabase
      .from('agendamentos')
      .update({ status, notas_aluno: status === 'recusado' ? motivo : null })
      .eq('id', agendamentoId);

    if (error) {
      toast.error("Erro ao atualizar status", { description: error.message });
    } else {
      toast.success(`Agendamento ${status} com sucesso!`);
      // Atualiza a lista de agendamentos para refletir a mudança
      if (status === 'recusado') {
        // Se recusou, remove o item da lista da UI
        setProximosAgendamentos(prev => prev.filter(ag => ag.id !== agendamentoId));
      } else {
        // Se confirmou, apenas atualiza o status
        setProximosAgendamentos(prev =>
          prev.map(ag => (ag.id === agendamentoId ? { ...ag, status } : ag))
        );
      }
      if (status === 'recusado') {
        setAgendamentoParaRecusar(null);
        setMotivoRecusa('');
      }
    }
    setSavingId(null);
  };

  if (alunoLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Carregando painel...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <h1 className="text-3xl font-bold">
        Olá, {alunoProfile?.nome_completo?.split(' ')[0]}!
      </h1>

      {/* Botão Flutuante para Agenda */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        <Button
          onClick={() => navigate('/calendario')}
          className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
          aria-label="Agenda"
        >
          <Calendar />
        </Button>
        <Button
          onClick={() => navigate('/calendario')}
          className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
          size="lg"
        >
          <Calendar />
          Agenda
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/minhas-rotinas')}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm font-medium">
              Rotinas
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rotinas}</div>
            <p className="text-xs text-muted-foreground">rotina ativa</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/minhas-rotinas')}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm font-medium">
              Treinos (7d)
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{treinos7dias}</p>
            <p className="text-sm text-muted-foreground">sessões concluídas</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/avaliacoes-aluno')}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm font-medium">
              Avaliações
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.avaliacoes}</p>
            <p className="text-sm text-muted-foreground">avaliações realizadas</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/professores')}>
          <CardHeader>
            <CardTitle className="flex flex-row items-center justify-between space-y-0 pb-2 text-sm font-medium">
              Professores
              <User className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.professores}</div>
            <p className="text-xs text-muted-foreground">professores que você segue</p>
          </CardContent>
        </Card>
      </div>

      {/* NOVA SEÇÃO: Próximos Agendamentos */}
      <div className="grid gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Tabs value={agendamentosTab} onValueChange={setAgendamentosTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="hoje">Hoje</TabsTrigger>
                <TabsTrigger value="semana">Esta Semana</TabsTrigger>
                <TabsTrigger value="proximos">Próximos</TabsTrigger>
              </TabsList>
              {agendamentosFiltrados.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
                  {agendamentosFiltrados.map((ag) => (
                    <div key={ag.id} className="p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                            {ag.professores?.avatar_type === 'image' && ag.professores.avatar_image_url ? (
                              <AvatarImage src={ag.professores.avatar_image_url} alt={ag.professores.nome_completo} />
                            ) : (
                              <AvatarFallback style={{ backgroundColor: ag.professores?.avatar_color || '#ccc' }} className="text-white font-semibold">{ag.professores?.avatar_letter}</AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{ag.professores?.nome_completo}</p>
                            <div className="space-y-1 mt-1">
                              <p className="text-sm text-muted-foreground">
                                {ag.tipo === 'sessao_treino' ? 'Sessão de Treino' : 'Avaliação Física'}
                              </p>
                              <Badge className={`${CORES_STATUS_AGENDAMENTO[ag.status]} text-xs`}>{ag.status}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-medium text-sm">{format(new Date(ag.data_hora_inicio), "dd/MM/yy")}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(ag.data_hora_inicio), "HH:mm", { locale: ptBR })}</p>
                          </div>
                          {ag.status !== 'recusado' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="default" size="icon" className="h-8 w-8 rounded-full p-0 flex-shrink-0" disabled={!!savingId}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {ag.status === 'pendente' && (<> <DropdownMenuItem onClick={() => handleUpdateStatus(ag.id, 'confirmado')}><Check className="mr-2 h-4 w-4" /><span>Confirmar</span></DropdownMenuItem> <DropdownMenuItem onClick={() => setAgendamentoParaRecusar(ag)}><X className="mr-2 h-4 w-4" /><span>Recusar</span></DropdownMenuItem> </>)}
                                {ag.status === 'confirmado' && <DropdownMenuItem onClick={() => setAgendamentoParaRecusar(ag)}><X className="mr-2 h-4 w-4" /><span>Recusar</span></DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </div>
                      {ag.notas_professor && (<div className="mt-3 pt-3 border-t border-dashed flex items-start gap-2 text-sm text-muted-foreground"><MessageSquareText className="h-4 w-4 mt-0.5 flex-shrink-0" /><p className="italic">"{ag.notas_professor}"</p></div>)}
                    </div>
                  ))}
                </div>
              ) : (<p className="text-sm text-muted-foreground text-center py-4">Nenhum agendamento para este período.</p>)}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Modal para Recusar Agendamento */}
      <Dialog open={!!agendamentoParaRecusar} onOpenChange={() => setAgendamentoParaRecusar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Agendamento</DialogTitle>
            <DialogDescription>
              Informe o motivo da recusa ao professor
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Ex: Não consigo neste horário, podemos remarcar para as 11h?"
            value={motivoRecusa}
            onChange={(e) => setMotivoRecusa(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAgendamentoParaRecusar(null)} disabled={!!savingId}>Voltar</Button>
            <Button
              variant="destructive"
              onClick={() => agendamentoParaRecusar && handleUpdateStatus(agendamentoParaRecusar.id, 'recusado', motivoRecusa)}
              disabled={!!savingId || !motivoRecusa.trim()}
            >
              {savingId === agendamentoParaRecusar?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default IndexAluno;