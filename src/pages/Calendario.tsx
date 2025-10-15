import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, isToday, getMonth, getYear, startOfMonth, endOfMonth, getDay, addMonths, subMonths, addDays, subDays, startOfDay } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { ptBR } from 'date-fns/locale';
import { useForm, Controller } from 'react-hook-form';
import { useMediaQuery } from '@/hooks/use-media-query';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, ChevronLeft, ChevronRight, Plus, Loader2, AlertTriangle, User, Dumbbell, BarChart3, X } from 'lucide-react';
import * as z from 'zod';

import type { Tables } from '@/integrations/supabase/types';

type AvatarInfo = {
  nome_completo: string;
  avatar_type: string | null;
  avatar_image_url: string | null;
  avatar_letter: string | null;
  avatar_color: string | null;
};

type Agendamento = Tables<'agendamentos'> & {
  alunos: AvatarInfo | null;
  professores: AvatarInfo | null;
};

type AlunoSeguidor = {
  id: string;
  nome_completo: string;
};

const CORES_STATUS_AGENDAMENTO: Record<string, string> = {
  'pendente': 'bg-orange-400 text-white',
  'confirmado': 'bg-green-400 text-white',
  'recusado': 'bg-red-400 text-white',
  'concluido': 'bg-blue-400 text-white'
};

const agendamentoSchema = z.object({
  aluno_id: z.string().uuid("Por favor, selecione um aluno."),
  tipo: z.enum(['sessao_treino', 'avaliacao_fisica']),
  data: z.string().min(1, "A data é obrigatória."),
  hora: z.string().min(1, "A hora é obrigatória."),
  notas: z.string().optional(),
});

type AgendamentoFormData = z.infer<typeof agendamentoSchema>;

const Calendario = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ user_type: string } | null>(null);
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [viewMode, setViewMode] = useState<'semanal' | 'mensal' | 'diaria'>(isDesktop ? 'semanal' : 'diaria');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  // Estados para o modal de criação (Professor)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [alunosSeguidores, setAlunosSeguidores] = useState<AlunoSeguidor[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Estados para o modal de recusa (Aluno)
  const [agendamentoParaRecusar, setAgendamentoParaRecusar] = useState<Agendamento | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const form = useForm<AgendamentoFormData>({
    resolver: zodResolver(agendamentoSchema),
    defaultValues: {
      aluno_id: '',
      tipo: 'sessao_treino',
      data: '',
      hora: '',
      notas: '',
    }
  });

  const fetchAlunosSeguidores = useCallback(async () => {
    if (!user || profile?.user_type !== 'professor') return;

    const { data, error } = await supabase
      .from('alunos_professores')
      .select('alunos(id, nome_completo)')
      .eq('professor_id', user.id);

    if (error) {
      toast.error("Erro ao buscar lista de alunos.");
    } else {
      const alunosFormatados = data.map(item => item.alunos).filter(Boolean) as AlunoSeguidor[];
      setAlunosSeguidores(alunosFormatados);
    }
  }, [user, profile]);


  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (error) {
        toast.error("Erro ao buscar perfil do usuário.", { description: error.message });
        setLoading(false);
      } else if (data) {
        setProfile(data);
      }
    };

    fetchUserProfile();
  }, [user]);

  const fetchAgendamentos = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);

    try {
      const userIdField = profile.user_type === 'professor' ? 'professor_id' : 'aluno_id';

      // Atualiza agendamentos passados para 'concluido'
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq(userIdField, user.id)
        .in('status', ['pendente', 'confirmado'])
        .lt('data_hora_inicio', new Date().toISOString());

      if (updateError) console.error("Calendario: Erro ao atualizar agendamentos passados:", updateError);

      // Exclui agendamentos recusados que já passaram
      const { error: deleteError } = await supabase
        .from('agendamentos')
        .delete()
        .eq(userIdField, user.id)
        .eq('status', 'recusado')
        .lt('data_hora_inicio', new Date().toISOString());

      if (deleteError) console.error("Calendario: Erro ao excluir agendamentos recusados:", deleteError);
    } catch (e) {
      console.error("Calendario: Erro na limpeza de agendamentos antigos:", e);
    }

    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const agora = new Date().toISOString();
    let query = supabase
      .from('agendamentos')
      .select('*, alunos(nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color), professores(nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color)')
      .gte('data_hora_inicio', start.toISOString())
      .lte('data_hora_inicio', end.toISOString())
      .or(`status.neq.recusado,data_hora_inicio.gte.${agora}`);

    if (profile.user_type === 'professor') {
      query = query.eq('professor_id', user.id);
    } else if (profile.user_type === 'aluno') {
      query = query.eq('aluno_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao buscar agendamentos", { description: error.message });
    } else {
      setAgendamentos(data as Agendamento[] || []);
    }
    setLoading(false);
  }, [user, profile, currentDate]);

  useEffect(() => {
    if (profile) {
      fetchAgendamentos();
    }
  }, [profile, fetchAgendamentos]);

  const handleDayClick = (day: Date) => {
    // Se estiver no mobile, na visão semanal, muda para a visão diária do dia clicado.
    if (!isDesktop && viewMode === 'semanal') {
      setCurrentDate(day);
      setViewMode('diaria');
      return;
    }

    // Se estiver no desktop, na visão mensal, muda para a visão semanal do dia clicado.
    if (isDesktop && viewMode === 'mensal') {
      setCurrentDate(day);
      setViewMode('semanal');
      return;
    }

    // Comportamento padrão (abrir modal) para desktop (visão semanal) ou mobile (visão diária).
    const agendamentosDoDia = agendamentos.filter(ag => isSameDay(new Date(ag.data_hora_inicio), day));
    if (agendamentosDoDia.length > 0) {
      setSelectedDay(day);
      setIsDayModalOpen(true);
    }
  };

  const handleUpdateStatus = async (agendamentoId: string, status: 'confirmado' | 'recusado', motivo?: string) => {
    setIsSaving(true);
    const { error } = await supabase
      .from('agendamentos')
      .update({ status, notas_aluno: motivo })
      .eq('id', agendamentoId);

    if (error) {
      toast.error("Erro ao atualizar status", { description: error.message });
    } else {
      toast.success(`Agendamento ${status} com sucesso!`);
      fetchAgendamentos(); // Re-fetch para atualizar a UI
      if (status === 'recusado') {
        setAgendamentoParaRecusar(null);
        setMotivoRecusa('');
      }
      setIsDayModalOpen(false);
    }
    setIsSaving(false);
  };

  const handleDeleteAgendamento = async (agendamentoId: string) => {
    setIsSaving(true);
    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', agendamentoId);

    if (error) {
      toast.error("Erro ao excluir agendamento", { description: error.message });
    } else {
      toast.success("Agendamento excluído com sucesso!");
      fetchAgendamentos(); // Re-fetch para atualizar a UI
      setIsDayModalOpen(false);
    }
    setIsSaving(false);
  };

  const handleCreateAgendamento = async (data: AgendamentoFormData) => {
    if (!user) return;
    setIsSaving(true);

    // Cria a data e hora no fuso horário local do usuário
    const dataHoraInicioLocal = new Date(`${data.data}T${data.hora}`);
    if (dataHoraInicioLocal < new Date()) {
      toast.error("Não é possível agendar no passado.");
      setIsSaving(false);
      return;
    }
    const dataHoraInicio = dataHoraInicioLocal;
    const dataHoraFim = new Date(dataHoraInicio.getTime() + 60 * 60 * 1000); // Adiciona 1h

    const { error } = await supabase.from('agendamentos').insert({
      professor_id: user.id,
      aluno_id: data.aluno_id as string,
      tipo: data.tipo,
      status: 'pendente',
      data_hora_inicio: dataHoraInicio.toISOString(),
      data_hora_fim: dataHoraFim.toISOString(),
      notas_professor: data.notas as string,
    });

    if (error) {
      toast.error("Erro ao criar agendamento", { description: error.message });
    } else {
      toast.success("Agendamento enviado para o aluno!");
      fetchAgendamentos();
      setIsCreateModalOpen(false);
      form.reset();
    }
    setIsSaving(false);
  };

  const calendarDays = useMemo(() => {
    if (viewMode === 'semanal') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    } else { // Mensal
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start, end });
      const startingDayIndex = getDay(start); // 0 = Domingo

      const grid: (Date | null)[] = [];
      for (let i = 0; i < startingDayIndex; i++) {
        grid.push(null);
      }
      days.forEach(day => grid.push(day));
      return grid;
    }
  }, [currentDate, viewMode]);

  const headerTitle = useMemo(() => {
    if (viewMode === 'semanal') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Domingo
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      const startText = format(start, "d 'de' MMM", { locale: ptBR });
      const endText = format(end, "d 'de' MMM 'de' yyyy", { locale: ptBR });
      const formatted = getMonth(start) === getMonth(end)
        ? `${format(start, 'd')} - ${format(end, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
        : `${startText} - ${endText}`;
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } else if (viewMode === 'diaria') {
      const formatted = format(currentDate, "eeee, d 'de' MMMM", { locale: ptBR });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } else {
      const formatted = format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    }
  }, [currentDate, viewMode]);

  // Sincroniza o viewMode com a mudança de tela
  useEffect(() => {
    const newViewMode = isDesktop ? 'semanal' : 'diaria';
    setViewMode(newViewMode);
  }, [isDesktop]);

  const agendamentosDoDia = useMemo(() => {
    if (!selectedDay) return [];
    return agendamentos
      .filter(ag => isSameDay(new Date(ag.data_hora_inicio), selectedDay))
      .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());
  }, [selectedDay, agendamentos]);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-6">
      {isDesktop && (
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(profile?.user_type === 'professor' ? '/index-professor' : '/index-aluno')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Agenda</h1>
            <p className="text-muted-foreground">Gerencie seus compromissos e sessões de treino.</p>
          </div>
        </div>
      )}

      {/* Legenda de Cores */}
      <div className="mt-2 mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${CORES_STATUS_AGENDAMENTO['pendente']?.split(' ')[0]}`}></span>Pendente</div>
        <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${CORES_STATUS_AGENDAMENTO['confirmado']?.split(' ')[0]}`}></span>Confirmado</div>
        <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${CORES_STATUS_AGENDAMENTO['recusado']?.split(' ')[0]}`}></span>Recusado</div>
        <div className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${CORES_STATUS_AGENDAMENTO['concluido']?.split(' ')[0]}`}></span>Concluído</div>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'semanal' | 'mensal' | 'diaria')} className="w-full">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            {isDesktop ? (
              <>
                <TabsTrigger value="semanal">Semanal</TabsTrigger>
                <TabsTrigger value="mensal">Mensal</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="diaria">Diária</TabsTrigger>
                <TabsTrigger value="semanal">Semanal</TabsTrigger>
              </>
            )}
          </TabsList>
          {/* {isDesktop && (
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="semanal">Semanal</TabsTrigger>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
            </TabsList>
          )} */}
          <div className="flex items-center justify-center flex-grow">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(viewMode === 'diaria' ? subDays(currentDate, 1) : viewMode === 'semanal' ? subWeeks(currentDate, 1) : subMonths(currentDate, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold text-center w-64">
              {headerTitle}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(viewMode === 'diaria' ? addDays(currentDate, 1) : viewMode === 'semanal' ? addWeeks(currentDate, 1) : addMonths(currentDate, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Visão Diária (Mobile) */}
        {!isDesktop && viewMode === 'diaria' && (
          <div className="space-y-2">
            {agendamentos.filter(ag => isSameDay(new Date(ag.data_hora_inicio), currentDate)).length > 0 ? (
              agendamentos.filter(ag => isSameDay(new Date(ag.data_hora_inicio), currentDate))
                .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime())
                .map(ag => {
                  const isPastAndResolvable = startOfDay(new Date(ag.data_hora_inicio)) < startOfDay(new Date()) && (ag.status === 'confirmado' || ag.status === 'pendente');
                  const status = isPastAndResolvable ? 'concluido' : ag.status;
                  const corStatus = CORES_STATUS_AGENDAMENTO[status];
                  const contactInfo = profile?.user_type === 'professor' ? ag.alunos : ag.professores;

                  return (
                    <div key={ag.id} className={`p-3 rounded-lg text-left cursor-pointer ${corStatus}`} onClick={() => handleDayClick(currentDate)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 text-xs"><AvatarImage src={contactInfo?.avatar_image_url || undefined} alt={contactInfo?.nome_completo || ''} /><AvatarFallback style={{ backgroundColor: contactInfo?.avatar_color || '#ccc' }} className="text-white font-semibold">{contactInfo?.avatar_letter || '?'}</AvatarFallback></Avatar>
                        <div className="flex-1 min-w-0"><p className="font-semibold truncate">{contactInfo?.nome_completo}</p><p className="text-sm">{format(new Date(ag.data_hora_inicio), "HH:mm")}</p></div>
                      </div>
                    </div>
                  );
                })
            ) : (<div className="text-center py-10"><p className="text-muted-foreground">Nenhum agendamento para hoje.</p></div>)}
          </div>
        )}

        {/* Visão Semanal (Mobile) - Similar à mensal do desktop */}
        {!isDesktop && viewMode === 'semanal' && (
          <div className="p-4 bg-card rounded-lg shadow-sm">
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {weekDays.map(day => (<div key={day} className="font-medium text-muted-foreground">{day}</div>))}
              {calendarDays.map((day, index) => {
                const isDayNull = day === null;
                return (
                <div key={index} className={`p-1 h-24 rounded-md flex flex-col items-center cursor-pointer transition-colors ${!isDayNull ? 'hover:bg-muted' : ''}`} onClick={() => !isDayNull && handleDayClick(day)}>
                  {day && (
                    <>
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}`}>{format(day, 'd')}</span>
                      <div className="mt-1 w-full space-y-1 overflow-y-auto">
                        {agendamentos.filter(ag => isSameDay(new Date(ag.data_hora_inicio), day)).map(ag => {
                          const isPastAndResolvable = startOfDay(new Date(ag.data_hora_inicio)) < startOfDay(new Date()) && (ag.status === 'confirmado' || ag.status === 'pendente');
                          const status = isPastAndResolvable ? 'concluido' : ag.status;
                          return (<div key={ag.id} className={`w-full h-2 rounded-full ${CORES_STATUS_AGENDAMENTO[status] || 'bg-gray-200'}`} />);
                        })}
                      </div>
                    </>
                  )}
                </div>);
              })}
            </div>
          </div>
        )}

        {isDesktop && <>
        <TabsContent value="semanal">
          <div className="p-4 bg-card rounded-lg shadow-sm">
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {calendarDays.map((day, index) => (
                day ? (
                  <div key={day.toString()} className="font-medium text-muted-foreground">
                    <span className="hidden md:inline">{format(day, 'eee', { locale: ptBR })}</span>
                    <span className="md:hidden">{format(day, 'E', { locale: ptBR })}</span>
                  </div>
                ) : <div key={`empty-header-${index}`} />
              ))}
              {calendarDays.map((day, index) => (
                <div key={index} className={`p-1 border-t ${day ? 'hover:bg-muted' : ''} min-h-[10rem]`}>
                  {day && (
                    <>
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full mb-2 mx-auto cursor-pointer ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}`} onClick={() => handleDayClick(day)}>
                        {format(day, 'd')}
                      </div>
                      <div className="w-full space-y-1 overflow-y-auto max-h-48">
                        {agendamentos.filter(ag => isSameDay(new Date(ag.data_hora_inicio), day)).map(ag => {
                          const isPastAndResolvable = startOfDay(new Date(ag.data_hora_inicio)) < startOfDay(new Date()) && (ag.status === 'confirmado' || ag.status === 'pendente');
                          const status = isPastAndResolvable ? 'concluido' : ag.status;

                          const corStatus = CORES_STATUS_AGENDAMENTO[status];

                          return (
                            <div key={ag.id} className={`p-1.5 rounded-md text-left cursor-pointer ${corStatus}`} onClick={() => handleDayClick(day)}>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5 text-xs">
                                  {ag.alunos?.avatar_type === 'image' && ag.alunos.avatar_image_url ? (
                                    <AvatarImage src={ag.alunos.avatar_image_url} alt={ag.alunos.nome_completo || ''} />
                                  ) : (
                                    <AvatarFallback style={{ backgroundColor: ag.alunos?.avatar_color || '#ccc' }} className="text-white font-semibold">
                                      {ag.alunos?.avatar_letter || ag.alunos?.nome_completo?.charAt(0)}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate">{profile?.user_type === 'professor' ? ag.alunos?.nome_completo : ag.professores?.nome_completo}</p>
                                  <p className="text-xs">{format(new Date(ag.data_hora_inicio), "HH:mm")}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="mensal">
          <div className="p-4 bg-card rounded-lg shadow-sm">
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {weekDays.map(day => (<div key={day} className="font-medium text-muted-foreground">{day}</div>))}
              {calendarDays.map((day, index) => {
                const isDayNull = day === null;
                return (
                <div key={index} className={`p-1 h-24 rounded-md flex flex-col items-center cursor-pointer transition-colors ${!isDayNull ? 'hover:bg-muted' : ''} ${!isDayNull && getMonth(day) !== getMonth(currentDate) ? 'text-muted-foreground/50' : ''}`} onClick={() => !isDayNull && handleDayClick(day)}>
                  {day && (
                    <>
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-primary text-primary-foreground' : ''}`}>{format(day, 'd')}</span>
                      <div className="mt-1 w-full space-y-1 overflow-y-auto">
                        {agendamentos.filter(ag => isSameDay(new Date(ag.data_hora_inicio), day)).map(ag => {
                          const isPastAndResolvable = startOfDay(new Date(ag.data_hora_inicio)) < startOfDay(new Date()) && (ag.status === 'confirmado' || ag.status === 'pendente');
                          const status = isPastAndResolvable ? 'concluido' : ag.status;
                          return (<div key={ag.id} className={`w-full h-2 rounded-full ${CORES_STATUS_AGENDAMENTO[status] || 'bg-gray-200'}`} />);
                        })}
                      </div>
                    </>
                  )}
                </div>);
              })}
            </div>
          </div>
        </TabsContent>
        </>}
      </Tabs>

      {/* Modal de Detalhes do Dia */}
      <Dialog open={isDayModalOpen} onOpenChange={setIsDayModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px] rounded-md">
          <DialogHeader>
            <DialogTitle>Agendamentos para {selectedDay && format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
            {agendamentosDoDia.map(ag => (
              <div key={ag.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      {ag.tipo === 'sessao_treino' ? <Dumbbell className="h-4 w-4" /> : <BarChart3 className="h-4 w-4" />}
                      {ag.tipo === 'sessao_treino' ? 'Sessão de Treino' : 'Avaliação Física'}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {profile?.user_type === 'professor' ? ag.alunos?.nome_completo : ag.professores?.nome_completo}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(ag.data_hora_inicio), "HH:mm")}
                    </p>
                  </div>
                  <Badge className={CORES_STATUS_AGENDAMENTO[(() => {
                      const isPast = new Date(ag.data_hora_inicio) < new Date();
                      if (startOfDay(new Date(ag.data_hora_inicio)) < startOfDay(new Date()) && (ag.status === 'confirmado' || ag.status === 'pendente')) {
                        return 'concluido';
                      }
                      return ag.status;
                    })()
                  ]}>
                    {(() => { const isPast = new Date(ag.data_hora_inicio) < new Date(); if (startOfDay(new Date(ag.data_hora_inicio)) < startOfDay(new Date()) && (ag.status === 'confirmado' || ag.status === 'pendente')) return 'concluido'; return ag.status; })()}
                  </Badge>
                </div>
                {ag.notas_professor && <p className="text-xs mt-2 p-2 bg-muted rounded">Nota: {ag.notas_professor}</p>}
                {ag.status === 'pendente' && profile?.user_type === 'aluno' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => handleUpdateStatus(ag.id, 'confirmado')} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setAgendamentoParaRecusar(ag)} disabled={isSaving}>
                      Recusar
                    </Button>
                  </div>
                )}
                {/* ✅ Botão Excluir para agendamentos concluídos */}
                {((startOfDay(new Date(ag.data_hora_inicio)) < startOfDay(new Date()) && (ag.status === 'confirmado' || ag.status === 'pendente')) || ag.status === 'concluido') && (
                  <div className="flex justify-end mt-3">
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteAgendamento(ag.id)} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Recusar Agendamento (Aluno) */}
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
            <Button variant="ghost" onClick={() => setAgendamentoParaRecusar(null)} disabled={isSaving}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => agendamentoParaRecusar && handleUpdateStatus(agendamentoParaRecusar.id, 'recusado', motivoRecusa)}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Criar Agendamento (Professor) */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px] rounded-md">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateAgendamento)} className="space-y-4">
              <FormField
                control={form.control}
                name="aluno_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aluno</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} required>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecione um aluno" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {alunosSeguidores.map(aluno => (<SelectItem key={aluno.id} value={aluno.id}>{aluno.nome_completo}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Evento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} required>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="sessao_treino">Sessão de Treino</SelectItem>
                        <SelectItem value="avaliacao_fisica">Avaliação Física</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="data" render={({ field }) => (<FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" required min={format(new Date(), 'yyyy-MM-dd')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="hora" render={({ field }) => (<FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" required step="300" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Ex: Levar toalha e garrafa de água." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => { setIsCreateModalOpen(false); form.reset(); }} disabled={isSaving}>Cancelar</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Convite'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Botão Flutuante para Novo Agendamento (Professor) */}
      {profile?.user_type === 'professor' && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onClick={() => {
              fetchAlunosSeguidores();
              setIsCreateModalOpen(true);
            }}
            className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
            aria-label="Novo Agendamento"
          >
            <Plus />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Calendario;
