import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserPlus, Users, Plus, Mail, MailCheck, Trash2, Send, ChevronDown, ChevronRight } from "lucide-react";
import { useAlunos } from "@/hooks/useAlunos";
import { useAuth } from "@/hooks/useAuth";
import { AlunoCard } from "@/components/alunos/AlunoCard";
import { FiltrosAlunos } from "@/components/alunos/FiltrosAlunos";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ConvitePendente {
  id: string;
  email_convidado: string;
  tipo_convite: string;
  status: string;
  created_at: string;
  expires_at: string;
}

const AlunosPT = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { alunos, loading, filtros, setFiltros, desvincularAluno } = useAlunos();
  const [convitesPendentes, setConvitesPendentes] = useState<ConvitePendente[]>([]);
  const [convitesCollapsed, setConvitesCollapsed] = useState(true);

  // Carregar convites pendentes
  const carregarConvitesPendentes = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: convites } = await supabase
        .from('convites')
        .select('id, email_convidado, tipo_convite, status, created_at, expires_at')
        .eq('personal_trainer_id', user.id)
        .eq('status', 'pendente')
        .order('created_at', { ascending: false })
        .limit(10);

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

      toast({
        title: "Convite cancelado",
        description: `O convite para ${email} foi cancelado.`,
      });
    } catch (error) {
      console.error('Erro ao cancelar convite:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o convite.",
        variant: "destructive",
      });
    }
  };

  // Carregar convites ao montar o componente
  useEffect(() => {
    carregarConvitesPendentes();
  }, [carregarConvitesPendentes]);

  const handleConvidarAluno = () => {
    navigate("/convite-aluno");
  };

  const formatarDataRelativa = (data: string) => {
    const agora = new Date();
    const dataConvite = new Date(data);

    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const diaConvite = new Date(dataConvite.getFullYear(), dataConvite.getMonth(), dataConvite.getDate());

    const diferencaMs = hoje.getTime() - diaConvite.getTime();
    const diferencaDias = Math.round(diferencaMs / (1000 * 60 * 60 * 24));

    if (diferencaDias === 0) return 'Hoje';
    if (diferencaDias === 1) return 'Ontem';
    if (diferencaDias > 1 && diferencaDias < 7) return `${diferencaDias} dias atrás`;
    
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
        <div>
          <h1 className="text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">
            Gerencie seus alunos e acompanhe seu progresso
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-4">
        {/* Mobile: Header compacto */}
        <div className="flex items-center justify-between md:hidden">
          <div>
            <h1 className="text-3xl font-bold">Alunos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus alunos
            </p>
          </div>
        </div>

        {/* Desktop: Header tradicional */}
        <div className="hidden md:flex md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alunos</h1>
            <p className="text-muted-foreground">
              Gerencie seus alunos e acompanhe seu progresso
            </p>
          </div>
        </div>
      </div>

      {/* Convites Pendentes */}
      {convitesPendentes.length > 0 && (
        <Collapsible open={!convitesCollapsed} onOpenChange={(open) => setConvitesCollapsed(!open)}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer bg-white">
                <CardTitle className="flex items-center gap-2">
                  {convitesCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4 rotate-90" />
                  )}
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
            </CollapsibleTrigger>
            <CollapsibleContent>
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
                        onClick={() => cancelarConvite(convite.id, convite.email_convidado)}
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
                    onClick={handleConvidarAluno}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Enviar Novo Convite
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {(alunos.length === 0 && convitesPendentes.length === 0 && filtros.busca === '' && filtros.situacao === 'todos' && filtros.genero === 'todos') ? (
        // Estado vazio - nenhum aluno cadastrado e nenhum convite pendente
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-center">
              Convide seu primeiro aluno para:
            </h3>
            <p className="text-green-600 text-lg text-center mb-1">
              ✓ Fazer avaliações;
            </p>
            <p className="text-green-600 text-lg text-center mb-1">
              ✓ Criar rotinas de treino;
            </p>
            <p className="text-green-600 text-lg text-center mb-1">
              ✓ Trocar mensagens;
            </p>
            <p className="text-green-600 text-lg text-center mb-6">
              ✓ Agendar sessões.
            </p>
            <Button onClick={handleConvidarAluno} size="lg" className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Convidar Aluno
            </Button>
          </CardContent>
        </Card>
      ) : (alunos.length === 0 && convitesPendentes.length > 0 && filtros.busca === '' && filtros.situacao === 'todos' && filtros.genero === 'todos') ? (
        // Estado com convites pendentes mas sem alunos
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum aluno</h3>
            <p className="text-muted-foreground text-center">
              Aguardando resposta dos convites enviados
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros e busca */}
          <FiltrosAlunos filtros={filtros} onFiltrosChange={setFiltros} />

          {/* Estatísticas */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{alunos.length} aluno(s) encontrado(s)</span>
          </div>

          {/* Lista de alunos */}
          {alunos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum aluno encontrado</h3>
                <p className="text-muted-foreground text-center">
                  Tente ajustar os filtros ou termos de busca
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {alunos.map((aluno) => (
                <AlunoCard 
                  key={aluno.id} 
                  aluno={aluno} 
                  onDesvincular={desvincularAluno}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Botão Flutuante para Convidar Aluno */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        {/* Mobile: Round floating button */}
        <Button
          onClick={handleConvidarAluno}
          className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
          aria-label="Convidar Aluno"
        >
          <UserPlus />
        </Button>

        {/* Desktop: Standard floating button */}
        <Button
          onClick={handleConvidarAluno}
          className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
          size="lg"
        >
          <UserPlus />
          Convidar Aluno
        </Button>
      </div>
    </div>
  );
};

export default AlunosPT;