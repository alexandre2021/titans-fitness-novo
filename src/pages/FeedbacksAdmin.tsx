import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Lightbulb, Star, Clock, CheckCircle, MessageSquare, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Feedback = {
  id: string;
  user_id: string;
  tipo: 'erro' | 'melhoria' | 'elogio';
  mensagem: string;
  pagina_origem: string | null;
  status: 'pendente' | 'lido' | 'respondido';
  created_at: string;
  user_email?: string;
  user_name?: string;
};

const tipoConfig = {
  erro: {
    icon: Bug,
    label: "Erro",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  melhoria: {
    icon: Lightbulb,
    label: "Melhoria",
    color: "text-amber-600",
    bgColor: "bg-amber-100",
  },
  elogio: {
    icon: Star,
    label: "Elogio",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
};

const statusConfig = {
  pendente: {
    icon: Clock,
    label: "Pendente",
    variant: "secondary" as const,
  },
  lido: {
    icon: CheckCircle,
    label: "Lido",
    variant: "outline" as const,
  },
  respondido: {
    icon: MessageSquare,
    label: "Respondido",
    variant: "default" as const,
  },
};

const FeedbacksAdmin = () => {
  const queryClient = useQueryClient();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");

  // Buscar feedbacks com informações do usuário
  const { data: feedbacks, isLoading, refetch } = useQuery<Feedback[]>({
    queryKey: ['feedbacks-admin', filtroTipo, filtroStatus],
    queryFn: async () => {
      let query = supabase
        .from('feedbacks')
        .select('*')
        .order('created_at', { ascending: false });

      if (filtroTipo !== 'todos') {
        query = query.eq('tipo', filtroTipo);
      }
      if (filtroStatus !== 'todos') {
        query = query.eq('status', filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Buscar informações dos usuários
      const feedbacksComUsuarios = await Promise.all(
        (data || []).map(async (feedback) => {
          // Tenta buscar em professores
          const { data: professor } = await supabase
            .from('professores')
            .select('nome_completo')
            .eq('id', feedback.user_id)
            .single();

          if (professor) {
            return { ...feedback, user_name: professor.nome_completo };
          }

          // Tenta buscar em alunos
          const { data: aluno } = await supabase
            .from('alunos')
            .select('nome_completo')
            .eq('id', feedback.user_id)
            .single();

          return { ...feedback, user_name: aluno?.nome_completo || 'Usuário desconhecido' };
        })
      );

      return feedbacksComUsuarios;
    },
  });

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('feedbacks')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedbacks-admin'] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Contadores
  const contadores = {
    total: feedbacks?.length || 0,
    pendentes: feedbacks?.filter(f => f.status === 'pendente').length || 0,
    erros: feedbacks?.filter(f => f.tipo === 'erro').length || 0,
    melhorias: feedbacks?.filter(f => f.tipo === 'melhoria').length || 0,
    elogios: feedbacks?.filter(f => f.tipo === 'elogio').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedbacks</h1>
          <p className="text-muted-foreground">
            {contadores.pendentes} pendente(s) de {contadores.total} total
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{contadores.erros}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{contadores.melhorias}</p>
                <p className="text-xs text-muted-foreground">Melhorias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{contadores.elogios}</p>
                <p className="text-xs text-muted-foreground">Elogios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{contadores.pendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Tipo</label>
          <Tabs value={filtroTipo} onValueChange={setFiltroTipo}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="erro">Erros</TabsTrigger>
              <TabsTrigger value="melhoria">Melhorias</TabsTrigger>
              <TabsTrigger value="elogio">Elogios</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Status</label>
          <Tabs value={filtroStatus} onValueChange={setFiltroStatus}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="lido">Lidos</TabsTrigger>
              <TabsTrigger value="respondido">Respondidos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Lista de feedbacks */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : feedbacks?.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum feedback encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedbacks?.map((feedback) => {
            const tipo = tipoConfig[feedback.tipo];
            const status = statusConfig[feedback.status];
            const TipoIcon = tipo.icon;
            const StatusIcon = status.icon;

            return (
              <Card key={feedback.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tipo.bgColor}`}>
                        <TipoIcon className={`h-4 w-4 ${tipo.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{feedback.user_name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(feedback.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          {feedback.pagina_origem && ` • ${feedback.pagina_origem}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap mb-4">{feedback.mensagem}</p>

                  {/* Ações */}
                  <div className="flex flex-wrap gap-2">
                    {feedback.status === 'pendente' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: feedback.id, status: 'lido' })}
                      >
                        Marcar como lido
                      </Button>
                    )}
                    {feedback.status !== 'respondido' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: feedback.id, status: 'respondido' })}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Marcar como respondido
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedbacksAdmin;
