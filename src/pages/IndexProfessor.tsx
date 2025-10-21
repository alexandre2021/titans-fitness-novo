// src/pages/IndexProfessor.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, // Mantido para Alunos
  BookCopy, // Novo para Modelos
  FileText, // Novo para Rotinas
  Calendar,
  Dumbbell, // Novo para Exercícios
  BarChart3,
  MoreVertical,
  RefreshCw,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import * as z from 'zod';

type Agendamento = Tables<'agendamentos'> & {
  alunos: {
    nome_completo: string;
    avatar_type: string | null;
    avatar_image_url: string | null;
    avatar_letter: string | null;
    avatar_color: string | null;
  } | null;
};

interface DashboardStats {
  alunosAtivos: number;
  rotinasAtivas: number;
  exerciciosPersonalizados: number;
  avaliacoesUltimoAno: number;
}

const reagendarSchema = z.object({
  data: z.string().min(1, "Data é obrigatória."),
  hora: z.string().min(1, "Hora é obrigatória."),
});

type ReagendarFormData = z.infer<typeof reagendarSchema>;

const today = new Date().toISOString().split('T')[0];

const CORES_STATUS_AGENDAMENTO: Record<string, string> = {
  'pendente': 'bg-orange-400 text-white',
  'confirmado': 'bg-green-400 text-white',
  'recusado': 'bg-red-400 text-white',
  'concluido': 'bg-blue-400 text-white'
};

const IndexProfessor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    alunosAtivos: 0,
    rotinasAtivas: 0,
    exerciciosPersonalizados: 0,
    avaliacoesUltimoAno: 0,
  });
  const [proximosAgendamentos, setProximosAgendamentos] = useState<Agendamento[]>([]);
  const [agendamentoParaReagendar, setAgendamentoParaReagendar] = useState<Agendamento | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [agendamentosTab, setAgendamentosTab] = useState('semana');

  const reagendarForm = useForm<ReagendarFormData>({ resolver: zodResolver(reagendarSchema) });

  const carregarDados = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // ✅ NOVO: Atualiza agendamentos passados para 'concluido' antes de buscar os dados.
      const { error: updateError } = await supabase
        .from('agendamentos')
        .update({ status: 'concluido' })
        .eq('professor_id', user.id)
        .in('status', ['pendente', 'confirmado'])
        .lt('data_hora_inicio', new Date().toISOString());

      if (updateError) console.error("Erro ao atualizar agendamentos passados:", updateError);

      // ✅ NOVO: Exclui agendamentos recusados que já passaram.
      const { error: deleteError } = await supabase
        .from('agendamentos')
        .delete()
        .eq('professor_id', user.id)
        .eq('status', 'recusado')
        .lt('data_hora_inicio', new Date().toISOString());

      if (deleteError) console.error("Erro ao excluir agendamentos recusados:", deleteError);

      const umAnoAtras = new Date();
      umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

      const [
        { count: seguidores },
        { count: rotinasAtivas },
        { count: exerciciosPersonalizados },
        { count: avaliacoesUltimoAno }
      ] = await Promise.all([
        supabase.from('alunos_professores').select('aluno_id', { count: 'exact', head: true }).eq('professor_id', user.id),
        supabase.from('rotinas').select('id', { count: 'exact', head: true }).eq('professor_id', user.id).eq('status', 'Ativa'),
        supabase.from('exercicios').select('id', { count: 'exact', head: true }).eq('professor_id', user.id).eq('is_ativo', true),
        supabase.from('avaliacoes_fisicas').select('id', { count: 'exact', head: true })
          .eq('professor_id', user.id)
          .gte('data_avaliacao', umAnoAtras.toISOString()),
      ]);
      
      // Busca apenas os próximos agendamentos
      const { data: agendamentosData, error: agendamentosError } = await supabase
        .from('agendamentos')
        .select('*, alunos(nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color)')
        .eq('professor_id', user.id)
        .in('status', ['confirmado', 'pendente', 'recusado'])
        .order('data_hora_inicio', { ascending: true });

      if (agendamentosError) {
        console.error("Erro ao buscar agendamentos:", agendamentosError);
        throw agendamentosError;
      }

      setStats({
        alunosAtivos: seguidores || 0,
        rotinasAtivas: rotinasAtivas || 0,
        exerciciosPersonalizados: exerciciosPersonalizados || 0,
        avaliacoesUltimoAno: avaliacoesUltimoAno || 0,
      });
      setProximosAgendamentos(agendamentosData as Agendamento[] || []);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const agendamentosFiltrados = useMemo(() => {
    const agora = new Date();
    const futuros = proximosAgendamentos.filter(ag => new Date(ag.data_hora_inicio) >= agora || ag.status === 'recusado');

    if (agendamentosTab === 'hoje') {
      return futuros.filter(ag => isToday(new Date(ag.data_hora_inicio)));
    }
    if (agendamentosTab === 'semana') {
      return futuros.filter(ag => isThisWeek(new Date(ag.data_hora_inicio), { weekStartsOn: 1 }));
    }
    if (agendamentosTab === 'proximos') {
      return futuros.filter(ag => !isThisWeek(new Date(ag.data_hora_inicio), { weekStartsOn: 1 }));
    }
    return [];
  }, [proximosAgendamentos, agendamentosTab]);


  const handleExcluirAgendamento = async (agendamentoId: string) => {
    const { error } = await supabase.from('agendamentos').delete().eq('id', agendamentoId);
    if (error) {
      toast.error("Erro ao excluir agendamento.", { description: error.message });
    } else {
      toast.success("Agendamento excluído com sucesso.");
      setProximosAgendamentos(prev => prev.filter(ag => ag.id !== agendamentoId));
    }
  };

  const handleReagendar = (agendamento: Agendamento) => {
    setAgendamentoParaReagendar(agendamento);
    reagendarForm.reset({ data: '', hora: '' });
  };

  const handleConfirmarReagendamento = async (data: ReagendarFormData) => {
    if (!agendamentoParaReagendar) return;
    setIsSaving(true);

    const dataHoraInicio = new Date(`${data.data}T${data.hora}`);
    const dataHoraFim = new Date(dataHoraInicio.getTime() + 60 * 60 * 1000); // Adiciona 1h

    const { data: updatedAgendamento, error } = await supabase
      .from('agendamentos')
      .update({
        status: 'pendente',
        data_hora_inicio: dataHoraInicio.toISOString(),
        data_hora_fim: dataHoraFim.toISOString(),
        notas_aluno: null, // Limpa a nota de recusa anterior
      })
      .eq('id', agendamentoParaReagendar.id)
      .select('*, alunos(nome_completo, avatar_type, avatar_image_url, avatar_letter, avatar_color)')
      .single();

    if (error) {
      // toast.error("Erro ao reagendar", { description: error.message });
    } else {
      // toast.success("Convite de reagendamento enviado!");
      setProximosAgendamentos(prev =>
        prev.map(ag => (ag.id === agendamentoParaReagendar.id ? (updatedAgendamento as Agendamento) : ag))
      );
      setAgendamentoParaReagendar(null);
    }

    setIsSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando Inicial...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      {isDesktop && (
        <div>
          <h1 className="text-3xl font-bold">Inicial</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.user_metadata?.full_name || 'Professor(a)'}!
          </p>
        </div>
      )}

      {/* Botão Flutuante para Agenda */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        <Button
          onClick={() => navigate('/calendario')}
          className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
          aria-label="Agenda"
        >
          <Calendar />
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/alunos">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alunos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.alunosAtivos}</div>
              <p className="text-xs text-muted-foreground">
                total de alunos que te seguem
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/exercicios" state={{ activeTab: 'personalizados' }}>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exercícios</CardTitle>
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.exerciciosPersonalizados}</div>
              <p className="text-xs text-muted-foreground">
                exercícios personalizados
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/rotinas">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rotinas</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rotinasAtivas}</div>
              <p className="text-xs text-muted-foreground">
                em andamento
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/avaliacoes">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avaliacoesUltimoAno}</div>
              <p className="text-xs text-muted-foreground">
                realizadas no último ano
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-2 sm:px-6">
            <Tabs value={agendamentosTab} onValueChange={setAgendamentosTab}>
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="hoje">Hoje</TabsTrigger>
                <TabsTrigger value="semana">Esta Semana</TabsTrigger>
                <TabsTrigger value="proximos">Próximos</TabsTrigger>
              </TabsList>
            {agendamentosFiltrados.length > 0 ? (
              <div className="space-y-4 max-h-[400px] overflow-y-auto p-1">
                {agendamentosFiltrados.map(ag => (
                  <div key={ag.id} className="p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          {ag.alunos?.avatar_type === 'image' && ag.alunos.avatar_image_url ? (
                            <AvatarImage src={ag.alunos.avatar_image_url} alt={ag.alunos.nome_completo || ''} />
                          ) : (
                            <AvatarFallback style={{ backgroundColor: ag.alunos?.avatar_color || '#ccc' }} className="text-white font-semibold">{ag.alunos?.avatar_letter}</AvatarFallback>
                          )}
                        </Avatar>
                        <div className="space-y-1">
                          <p className="font-medium truncate">{ag.alunos?.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">
                            {ag.tipo === 'sessao_treino' ? 'Sessão de Treino' : 'Avaliação Física'}
                          </p>
                          <Badge className={`${CORES_STATUS_AGENDAMENTO[ag.status]} text-xs`}>{ag.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-medium text-sm">{format(new Date(ag.data_hora_inicio), "dd/MM/yy")}</p>
                          <p className="text-sm text-muted-foreground">{format(new Date(ag.data_hora_inicio), "HH:mm")}</p>
                        </div>
                        {(ag.status === 'recusado' || ag.status === 'pendente' || ag.status === 'confirmado') && new Date(ag.data_hora_inicio) > new Date() && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4">
                                <MoreVertical />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleReagendar(ag)}><RefreshCw className="mr-2 h-4 w-4" /><span>Reagendar</span></DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExcluirAgendamento(ag.id)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    {ag.status === 'recusado' && (
                      <div className="mt-2 pt-2 border-t border-dashed">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Motivo da recusa:</p>
                        <p className="text-sm text-muted-foreground pl-2 italic">
                          {ag.notas_aluno ? `"${ag.notas_aluno}"` : 'Não informado'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum agendamento encontrado</h3>
                </div>
            )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!agendamentoParaReagendar} onOpenChange={() => setAgendamentoParaReagendar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Compromisso</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha uma nova data e hora para o compromisso com <strong>{agendamentoParaReagendar?.alunos?.nome_completo}</strong>.
          </p>
          <Form {...reagendarForm}>
            <form onSubmit={reagendarForm.handleSubmit(handleConfirmarReagendamento)} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={reagendarForm.control}
                  name="data"
                  render={({ field }) => <FormItem><FormLabel>Nova Data</FormLabel><FormControl><Input type="date" required min={today} {...field} /></FormControl><FormMessage /></FormItem>}
                />
                <FormField
                  control={reagendarForm.control}
                  name="hora"
                  render={({ field }) => <FormItem><FormLabel>Nova Hora</FormLabel><FormControl><Input type="time" required step="300" {...field} /></FormControl><FormMessage /></FormItem>}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAgendamentoParaReagendar(null)} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reenviar Convite'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
};

export default IndexProfessor;