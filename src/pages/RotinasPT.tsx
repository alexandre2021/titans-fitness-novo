import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useMediaQuery } from '@/hooks/use-media-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Users, Target, Clock, Plus, FileText, MoreVertical, Eye, Play, Ban, Activity, Trash2, BicepsFlexed, Repeat, User as UserIcon, Info, Search, Filter, X, Loader2, CalendarCheck } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { ExercicioModelo } from './RotinaCriacao';
import CustomSelect from '@/components/ui/CustomSelect';
import type { Tables } from '@/integrations/supabase/types';
import { FILTRO_FREQUENCIAS_OPTIONS, FILTRO_OBJETIVOS_OPTIONS } from '@/constants/rotinas';

type AlunoInfo = {
  id: string;
  nome_completo: string;
  avatar_image_url: string | null;
  avatar_type: string | null;
  avatar_letter: string | null;
  avatar_color: string | null;
};

type Rotina = Tables<'rotinas'> & {
  alunos: AlunoInfo | null;
};

interface RotinaCardProps {
  id: string;
  nome: string;
  status: string;
  data_inicio: string;
  duracao_semanas: number;
  aluno_id: string;
  aluno: AlunoInfo;
  objetivo: string | null;
  dificuldade: string | null;
  descricao: string | null;
  treinos_por_semana: number;
  updated_at: string;
}

const RotinasPT = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [allRotinas, setAllRotinas] = useState<Rotina[]>([]);
  const [alunos, setAlunos] = useState<AlunoInfo[]>([]);
  const [busca, setBusca] = useState('');
  const [activeTabs, setActiveTabs] = useState<Record<string, string>>({});
  const [nestedActiveTabs, setNestedActiveTabs] = useState<Record<string, string>>({});

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusInfoDialog, setShowStatusInfoDialog] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Controla o modal de seleção de aluno
  
  // Estados para exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rotinaParaExcluir, setRotinaParaExcluir] = useState<RotinaCardProps | null>(null);

  const [buscaAlunoModal, setBuscaAlunoModal] = useState('');
  // Estados para o novo fluxo de criação (consolidados)
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null);
  const [showCriarOpcoesModal, setShowCriarOpcoesModal] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [temModelos, setTemModelos] = useState(false);
  const [isCheckingRotina, setIsCheckingRotina] = useState<string | null>(null); // ID do aluno sendo verificado

  useEffect(() => {
    // Limpa o sessionStorage ao montar a página para evitar carregar rascunhos de outros contextos
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('rotina_em_criacao_')) sessionStorage.removeItem(key);
    });
    const fetchRotinasAtivas = async () => {
      if (!user) return;

      try {
        // Etapa 1: Buscar os IDs de todos os alunos que seguem o professor logado.
        const { data: alunosData, error: alunosError } = await supabase
          .from('alunos_professores')
          .select('alunos(*)')
          .eq('professor_id', user.id);

        if (alunosError) {
          throw new Error(`Erro ao buscar alunos: ${alunosError.message}`);
        }

        const alunosList = (alunosData?.map(item => item.alunos).filter(Boolean) as AlunoInfo[]) || [];
        setAlunos(alunosList);

        const alunoIds = alunosList.map(aluno => aluno.id);

        if (alunoIds.length === 0) {
          setAllRotinas([]);
          return;
        }

        // Etapa 2: Buscar todas as rotinas (não arquivadas).
        const { data: rotinasData, error: rotinasError } = await supabase
          .from('rotinas')
          .select('*, alunos(id, nome_completo, avatar_image_url, avatar_type, avatar_letter, avatar_color)')
          .in('aluno_id', alunoIds)
          .order('updated_at', { ascending: false });

        if (rotinasError) throw rotinasError;

        setAllRotinas((rotinasData as Rotina[]) || []);
      } catch (error) {
        console.error("Erro ao buscar rotinas ativas:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchRotinasAtivas();
  }, [user]);

  // Verifica se o professor tem modelos quando o modal de opções é aberto
  useEffect(() => {
    if (!showCriarOpcoesModal || !user) return;

    const checkForModels = async () => {
      setLoadingModelos(true);
      try {
        const { count, error } = await supabase.from('modelos_rotina').select('*', { count: 'exact', head: true }).eq('professor_id', user.id);
        if (error) throw error;
        setTemModelos((count || 0) > 0);
      } catch (error) {
        setTemModelos(false);
      } finally {
        setLoadingModelos(false);
      }
    };
    void checkForModels();
  }, [showCriarOpcoesModal, user]);

  const alunosComRotinasFiltradas = useMemo(() => {
    // 1. Filtra os alunos primeiro
    const alunosFiltrados = alunos.filter(aluno => {
      if (busca !== '' && !aluno.nome_completo.toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });

    // 2. Para cada aluno, agrupa e filtra suas rotinas
    return alunosFiltrados.map(aluno => {
      const rotinasDoAluno = allRotinas.filter(r => r.aluno_id === aluno.id);

      // Se o aluno não tem nenhuma rotina, não o exibe na lista.
      if (rotinasDoAluno.length === 0) {
        return null;
      }

      const rotinasAgrupadas = {
        rascunho: rotinasDoAluno.filter(r => r.status === 'Rascunho'),
        atual: rotinasDoAluno.filter(r => ['Ativa', 'Bloqueada'].includes(r.status || '')),
        encerradas: rotinasDoAluno.filter(r => ['Concluída', 'Cancelada'].includes(r.status || '')),
      };

      return { aluno, rotinas: rotinasAgrupadas };
    }).filter(Boolean) as { aluno: AlunoInfo; rotinas: { rascunho: Rotina[]; atual: Rotina[]; encerradas: Rotina[] } }[]; // filter(Boolean) remove os nulos
  }, [allRotinas, alunos, busca]);

  const rotinaCounts = useMemo(() => {
    return {
      ativas: allRotinas.filter(r => r.status === 'Ativa').length,
      bloqueadas: allRotinas.filter(r => r.status === 'Bloqueada').length,
      rascunho: allRotinas.filter(r => r.status === 'Rascunho').length,
      encerradas: allRotinas.filter(r => r.status === 'Concluída' || r.status === 'Cancelada').length,
    };
  }, [allRotinas]);

  const alunosFiltradosModal = useMemo(() => {
    if (!buscaAlunoModal) return alunos;
    return alunos.filter(aluno =>
      aluno.nome_completo.toLowerCase().includes(buscaAlunoModal.toLowerCase())
    );
  }, [alunos, buscaAlunoModal]);


  const handleUpdateRotinaStatus = async (rotina: RotinaCardProps, novoStatus: 'Ativa' | 'Bloqueada') => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('rotinas')
        .update({ status: novoStatus })
        .eq('id', rotina.id)
        .eq('professor_id', user?.id);
  
      if (error) throw error;

      // Atualizar lista local
      setAllRotinas(prev => prev.map(r => 
        r.id === rotina.id ? { ...r, status: novoStatus } : r
      ));
    } catch (error) {
      console.error(`Erro ao alterar status para ${novoStatus}:`, error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExcluirRotina = (rotina: RotinaCardProps) => {
    setRotinaParaExcluir(rotina);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!rotinaParaExcluir || !user) return;

    setIsUpdatingStatus(true); // Reutilizando o estado de loading
    try {
      const { error } = await supabase
        .from('rotinas')
        .delete()
        .eq('id', rotinaParaExcluir.id)
        .eq('professor_id', user.id);

      if (error) throw error;

      // Atualiza o estado local para remover a rotina da UI
      setAllRotinas(prev => prev.filter(r => r.id !== rotinaParaExcluir.id));
      toast.success("Rotina excluída com sucesso.");

    } catch (error) {
      console.error("Erro ao excluir rotina:", error);
      toast.error("Erro ao excluir rotina", {
        description: "Não foi possível remover a rotina. Tente novamente.",
      });
    } finally {
      setIsUpdatingStatus(false);
      setShowDeleteDialog(false);
      setRotinaParaExcluir(null);
    }
  };

  const handleModalSelecaoAlunoOpenChange = (open: boolean) => {
    setIsCreateModalOpen(open);
    if (!open) {
      setBuscaAlunoModal(''); // Limpa a busca ao fechar o modal
    }
  };

  const handleNovaRotinaParaAluno = async (alunoId: string) => {
    if (isCheckingRotina) return; // Evita cliques duplos
    setIsCheckingRotina(alunoId);

    // Verifica se o aluno selecionado já tem uma rotina ativa ou rascunho
    const temRotinaAtiva = allRotinas.some(r => r.aluno_id === alunoId && (r.status === 'Ativa' || r.status === 'Bloqueada'));
    const temRascunho = allRotinas.some(r => r.aluno_id === alunoId && r.status === 'Rascunho');

    if (temRotinaAtiva) {
      toast.error("Rotina já existente", { description: "Este aluno já possui uma rotina (ativa ou bloqueada). Finalize ou exclua a rotina atual antes de criar uma nova." });
      setIsCheckingRotina(null);
      return;
    }
    if (temRascunho) {
      toast.error("Rascunho existente", { description: "Continue a edição do rascunho na aba 'Rascunho' ou exclua-o para criar uma nova rotina." });
      setIsCheckingRotina(null);
      return;
    }

    // Guarda o aluno e abre o modal de opções de criação
    setIsCheckingRotina(null); // Reseta o estado de verificação
    setAlunoSelecionado(alunoId);
    setShowCriarOpcoesModal(true);
  };

  const handleCriarDoZero = () => {
    if (!alunoSelecionado) return;
    setShowCriarOpcoesModal(false);
    sessionStorage.removeItem(`rotina_em_criacao_${alunoSelecionado}`);
    navigate(`/rotinas-criar/${alunoSelecionado}`, { state: { from: '/rotinas' } });
  };

  const handleUsarModelo = () => {
    if (!alunoSelecionado) return;
    setShowCriarOpcoesModal(false);
    sessionStorage.removeItem(`rotina_em_criacao_${alunoSelecionado}`);
    navigate(`/selecionar-modelo?alunoId=${alunoSelecionado}`, { state: { from: '/rotinas' } });
  };

  const handleContinuarRascunho = async (rotina: RotinaCardProps) => {
    try {
      // 1. Buscar todos os dados do rascunho
      const { data: rotinaDb, error: rotinaError } = await supabase.from('rotinas').select('*').eq('id', rotina.id).single();
      if (rotinaError) throw rotinaError;

      const { data: treinos, error: treinosError } = await supabase.from('treinos').select('*').eq('rotina_id', rotina.id).order('ordem');
      if (treinosError) throw treinosError;

      const exerciciosPorTreino: Record<string, ExercicioModelo[]> = {};
      for (const treino of treinos) {
        const { data: exerciciosDb, error: exerciciosError } = await supabase.from('exercicios_rotina').select('*, series(*)').eq('treino_id', treino.id).order('ordem');
        if (exerciciosError) throw exerciciosError;

        exerciciosPorTreino[treino.id] = exerciciosDb.map((ex): ExercicioModelo => ({
          id: ex.id,
          exercicio_1_id: ex.exercicio_1_id,
          exercicio_2_id: ex.exercicio_2_id ?? undefined,
          tipo: ex.exercicio_2_id ? 'combinada' : 'simples',
          series: (ex.series as Tables<'series'>[]).map(s => ({
            id: s.id,
            numero_serie: s.numero_serie,
            repeticoes: s.repeticoes ?? undefined, carga: s.carga ?? undefined,
            repeticoes_1: s.repeticoes_1 ?? undefined, carga_1: s.carga_1 ?? undefined,
            repeticoes_2: s.repeticoes_2 ?? undefined, carga_2: s.carga_2 ?? undefined,
            tem_dropset: s.tem_dropset ?? undefined, carga_dropset: s.carga_dropset ?? undefined,
            intervalo_apos_serie: s.intervalo_apos_serie ?? undefined,
          })).sort((a, b) => a.numero_serie - b.numero_serie),
          intervalo_apos_exercicio: ex.intervalo_apos_exercicio ?? undefined
        }));
      }

      // 2. Montar o objeto para o sessionStorage
      const rotinaStorageData = {
        draftId: rotinaDb.id,
        configuracao: {
          nome: rotinaDb.nome || '',
          objetivo: rotinaDb.objetivo || '',
          dificuldade: rotinaDb.dificuldade || '',
          duracao_semanas: rotinaDb.duracao_semanas ?? undefined,
          treinos_por_semana: rotinaDb.treinos_por_semana ?? undefined,
          data_inicio: rotinaDb.data_inicio || new Date().toISOString().split('T')[0],
          descricao: rotinaDb.descricao || ''
        },
        treinos: treinos.map(t => ({ ...t, grupos_musculares: t.grupos_musculares ? t.grupos_musculares.split(',') : [] })),
        exercicios: exerciciosPorTreino,
        etapaAtual: 'configuracao',
      };

      // 3. Salvar no sessionStorage e navegar
      sessionStorage.setItem(`rotina_em_criacao_${rotina.aluno_id}`, JSON.stringify(rotinaStorageData));
      navigate(`/rotinas-criar/${rotina.aluno_id}`);

    } catch (error) {
      toast.error("Erro ao carregar rascunho", { description: "Não foi possível carregar os dados do rascunho. Tente novamente." });
    }
  };

  const handleVerDetalhesEncerrada = (rotina: RotinaCardProps) => {
    try {
      // Navega para a página de detalhes da rotina, que pode lidar com rotinas de qualquer status
      navigate(`/alunos-rotinas/${rotina.aluno_id}/${rotina.id}`);
    } catch (error) {
      toast.error("Erro ao carregar rascunho", { description: "Não foi possível carregar os dados do rascunho. Tente novamente." });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Carregando rotinas...</p>
        </div>
      </div>
    );
  }

return (
  <div className="space-y-6">
    {isDesktop && (
      <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Rotinas</h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowStatusInfoDialog(true)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Informações sobre status das rotinas"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground">Gerencie as rotinas de todos os seus alunos.</p>
      </div>
    )}

    {/* Card de Estatísticas */}
    {allRotinas.length > 0 && (
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 divide-x divide-border text-center">
            <div className="px-2">
              <p className="text-2xl font-bold">{rotinaCounts.ativas}</p>
              <p className="text-xs font-medium text-muted-foreground">Ativas</p>
            </div>
            <div className="px-2">
              <p className="text-2xl font-bold">{rotinaCounts.bloqueadas}</p>
              <p className="text-xs font-medium text-muted-foreground">Bloqueadas</p>
            </div>
            <div className="px-2">
              <p className="text-2xl font-bold">{rotinaCounts.rascunho}</p>
              <p className="text-xs font-medium text-muted-foreground">Rascunhos</p>
            </div>
            <div className="px-2">
              <p className="text-2xl font-bold">{rotinaCounts.encerradas}</p>
              <p className="text-xs font-medium text-muted-foreground">Encerradas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}

    {allRotinas.length > 0 && (
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome do aluno..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-10"
              />
          </div>
        </div>
      </div>
    )}

      {alunos.length === 0 ? (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum aluno encontrado</h3>
        </CardContent>
      </Card>
      ) : alunosComRotinasFiltradas.length === 0 ? (
        <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              {busca ? (
                <Users className="h-16 w-16 text-muted-foreground mb-4" />
              ) : (
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              )}
              <h3 className="text-xl font-semibold mb-2">{busca ? 'Nenhum aluno encontrado' : 'Nenhuma rotina encontrada'}</h3>
              {busca && <p className="text-muted-foreground">Nenhum aluno corresponde à sua busca.</p>}
            </CardContent>
        </Card>
    ) : (
      <div className="space-y-6 pb-32 md:pb-20 max-w-5xl mx-auto">
        {alunosComRotinasFiltradas.map(({ aluno, rotinas }) => (
          <Card key={aluno.id} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
                    <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />
                  ) : (
                    <AvatarFallback style={{ backgroundColor: aluno.avatar_color || '#ccc' }} className="text-white font-medium text-sm">
                      {aluno.avatar_letter || aluno.nome_completo?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Link to={`/alunos-rotinas/${aluno.id}`} className="hover:underline">
                  {aluno.nome_completo}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <Tabs 
                value={activeTabs[aluno.id] || 'atual'} 
                onValueChange={(tab) => setActiveTabs(prev => ({ ...prev, [aluno.id]: tab }))}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="atual">Atual ({rotinas.atual.length})</TabsTrigger>
                  <TabsTrigger value="rascunho">Rascunho ({rotinas.rascunho.length})</TabsTrigger>
                  <TabsTrigger value="encerradas">Encerradas ({rotinas.encerradas.length})</TabsTrigger>
                </TabsList>

                {(['atual', 'rascunho', 'encerradas'] as const).map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-4">
                    {rotinas[tab].length === 0 ? (
                      <Card className="border-dashed min-h-[180px]">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">
                            {tab === 'atual' && 'Nenhuma rotina atual'}
                            {tab === 'rascunho' && 'Nenhum rascunho'}
                            {tab === 'encerradas' && 'Nenhuma rotina encerrada'}
                          </h3>
                        </CardContent>
                      </Card>
                    ) : tab === 'encerradas' ? (
                      <Tabs
                        value={nestedActiveTabs[aluno.id] || '1ano'} 
                        onValueChange={(nestedTab) => setNestedActiveTabs(prev => ({ ...prev, [aluno.id]: nestedTab }))}
                        className="w-full"
                      >
                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                          <TabsTrigger value="1ano" className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Último ano</TabsTrigger>
                          <TabsTrigger value="2anos" className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">2 anos</TabsTrigger>
                          <TabsTrigger value="3anos" className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">3 anos</TabsTrigger>
                          <TabsTrigger value="todas" className="relative h-9 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-semibold text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none">Todas</TabsTrigger>
                        </TabsList>
                        {(['1ano', '2anos', '3anos', 'todas'] as const).map(periodo => {
                          const getFilteredRotinas = () => {
                            const now = new Date();
                            if (periodo === '1ano') {
                              const oneYearAgo = new Date(new Date().setFullYear(now.getFullYear() - 1));
                              return rotinas.encerradas.filter(r => new Date(r.updated_at) >= oneYearAgo);
                            }
                            if (periodo === '2anos') {
                              const twoYearsAgo = new Date(new Date().setFullYear(now.getFullYear() - 2));
                              return rotinas.encerradas.filter(r => new Date(r.updated_at) >= twoYearsAgo);
                            }
                            if (periodo === '3anos') {
                              const threeYearsAgo = new Date(new Date().setFullYear(now.getFullYear() - 3));
                              return rotinas.encerradas.filter(r => new Date(r.updated_at) >= threeYearsAgo);
                            }
                            return rotinas.encerradas;
                          };
                          
                          const filteredRotinas = getFilteredRotinas();
                          
                          return (
                            <TabsContent key={periodo} value={periodo} className="mt-4">
                              {filteredRotinas.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                  <p>Nenhuma rotina encerrada neste período.</p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {filteredRotinas.map(rotina => {
                                    const rotinaCardProps: RotinaCardProps = { id: rotina.id, nome: rotina.nome, status: rotina.status!, data_inicio: rotina.data_inicio, duracao_semanas: rotina.duracao_semanas, aluno_id: aluno.id, aluno: aluno, objetivo: rotina.objetivo, dificuldade: rotina.dificuldade, treinos_por_semana: rotina.treinos_por_semana, descricao: rotina.descricao, updated_at: rotina.updated_at };
                                    return (
                                      <div key={rotina.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start justify-between mb-4">
                                          <div className="flex-1 min-w-0">
                                            <h4 className="text-lg font-semibold">{rotina.nome}</h4>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 mb-2"><UserIcon className="h-3 w-3" /><span>Criada por você</span></div>
                                            <div className="flex items-center gap-2 mb-2 mt-2">
                                              <Badge className={rotina.status === 'Concluída' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>{rotina.status}</Badge>
                                            </div>
                                          </div>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4" onClick={(e) => e.stopPropagation()} disabled={isUpdatingStatus}><MoreVertical /></Button></DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleVerDetalhesEncerrada(rotinaCardProps)}><Eye className="mr-2 h-5 w-5" /><span className="text-base">Ver Detalhes</span></DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handleExcluirRotina(rotinaCardProps)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-5 w-5" /><span className="text-base">Excluir</span></DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                          <div className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Objetivo</p><p className="font-medium capitalize">{rotina.objetivo}</p></div></div>
                                          <div className="flex items-center gap-2"><BicepsFlexed className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Dificuldade</p><p className="font-medium capitalize">{rotina.dificuldade}</p></div></div>
                                          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Duração</p><p className="font-medium">{rotina.duracao_semanas} semanas</p></div></div>
                                          <div className="flex items-center gap-2"><Repeat className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Frequência</p><p className="font-medium">{rotina.treinos_por_semana}x por semana</p></div></div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t">
                                          <div className="flex items-center gap-2 text-sm">
                                            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">Encerrada em:</span><span className="font-medium">{new Date(rotina.updated_at).toLocaleDateString('pt-BR')}</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </TabsContent>
                          )
                        })}
                      </Tabs>
                    ) : (
                      <div className="space-y-4">
                        {rotinas[tab].map(rotina => {
                          const rotinaCardProps: RotinaCardProps = { id: rotina.id, nome: rotina.nome, status: rotina.status!, data_inicio: rotina.data_inicio, duracao_semanas: rotina.duracao_semanas, aluno_id: aluno.id, aluno: aluno, objetivo: rotina.objetivo, dificuldade: rotina.dificuldade, treinos_por_semana: rotina.treinos_por_semana, descricao: rotina.descricao, updated_at: rotina.updated_at };
                          const isRascunho = rotina.status === 'Rascunho';
                          const isAtiva = rotina.status === 'Ativa';
                          const isBloqueada = rotina.status === 'Bloqueada';
                        return (
                            <div key={rotina.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-lg font-semibold">{rotina.nome}</h4>
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 mb-2"><UserIcon className="h-3 w-3" /><span>Criada por você</span></div>
                                  <div className="flex items-center gap-2 mb-2 mt-2"><Badge className={isAtiva ? 'bg-green-100 text-green-800' : isBloqueada ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>{rotina.status}</Badge></div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4" onClick={(e) => e.stopPropagation()} disabled={isUpdatingStatus}><MoreVertical /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {isRascunho ? (<DropdownMenuItem onClick={() => handleContinuarRascunho(rotinaCardProps)}><Play className="mr-2 h-5 w-5" /><span className="text-base">Continuar Edição</span></DropdownMenuItem>) : (<DropdownMenuItem onClick={() => navigate(`/alunos-rotinas/${rotina.aluno_id}/${rotina.id}`)}><Eye className="mr-2 h-5 w-5" /><span className="text-base">Detalhes</span></DropdownMenuItem>)}
                                    {isAtiva && <DropdownMenuItem onClick={() => navigate(`/execucao-rotina/selecionar-treino/${rotina.id}`, { state: { modo: 'professor' } })}><Play className="mr-2 h-5 w-5" /><span className="text-base">Treinar</span></DropdownMenuItem>}
                                    {isAtiva && <DropdownMenuItem onClick={() => handleUpdateRotinaStatus(rotinaCardProps, 'Bloqueada')}><Ban className="mr-2 h-5 w-5" /><span className="text-base">Bloquear</span></DropdownMenuItem>}
                                    {isBloqueada && <DropdownMenuItem onClick={() => handleUpdateRotinaStatus(rotinaCardProps, 'Ativa')}><Activity className="mr-2 h-5 w-5" /><span className="text-base">Reativar</span></DropdownMenuItem>}
                                    <DropdownMenuItem onClick={() => handleExcluirRotina(rotinaCardProps)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-5 w-5" /><span className="text-base">Excluir</span></DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Objetivo</p><p className="font-medium capitalize">{rotina.objetivo}</p></div></div>
                                <div className="flex items-center gap-2"><BicepsFlexed className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Dificuldade</p><p className="font-medium capitalize">{rotina.dificuldade}</p></div></div>
                                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Duração</p><p className="font-medium">{rotina.duracao_semanas} semanas</p></div></div>
                                <div className="flex items-center gap-2"><Repeat className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Frequência</p><p className="font-medium">{rotina.treinos_por_semana}x por semana</p></div></div>
                              </div>
                              {rotina.descricao && (<div className="pt-3 border-t"><p className="text-sm text-muted-foreground mb-1">Descrição:</p><p className="text-sm">{rotina.descricao}</p></div>)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    )}

    {/* Modal de Confirmação de Exclusão */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Rotina?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a rotina "{rotinaParaExcluir?.nome}"? Esta ação não pode ser desfeita e todos os dados associados (treinos, exercícios, séries) serão removidos permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setRotinaParaExcluir(null)} disabled={isUpdatingStatus}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" onClick={handleConfirmarExclusao} disabled={isUpdatingStatus}>
            {isUpdatingStatus ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</> : 'Excluir'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Modal de Opções de Criação */}
    <Dialog open={showCriarOpcoesModal} onOpenChange={setShowCriarOpcoesModal}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px] rounded-md">
        <DialogHeader>
          <DialogTitle>Como criar a rotina?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Button onClick={handleCriarDoZero} className="w-full" size="lg">
            Rotina em Branco
          </Button>
          {loadingModelos ? (
            <Button disabled className="w-full" size="lg">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando modelos...
            </Button>
          ) : temModelos ? (
            <Button onClick={handleUsarModelo} className="w-full" variant="outline" size="lg">
              Usar um Modelo
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground pt-2">
              Dica: Crie modelos de rotina para agilizar seu trabalho.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Botão FAB Global para Nova Rotina */}
    {alunos.length > 0 && (
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40">
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
          aria-label="Criar nova rotina"
          title="Criar nova rotina"
        >
          <Plus />
        </Button>
      </div>
    )}

    {/* Modal de Seleção de Aluno para Nova Rotina */}
    <Dialog open={isCreateModalOpen} onOpenChange={handleModalSelecaoAlunoOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] sm:max-w-[425px] rounded-md flex flex-col max-h-[80vh]"
        onOpenAutoFocus={e => {
          e.preventDefault();
          (e.currentTarget as HTMLElement)?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Nova Rotina</DialogTitle>
          <DialogDescription>
            Selecione um aluno para criar uma nova rotina.
          </DialogDescription>
        </DialogHeader>
        <div className="relative flex-1 flex flex-col min-h-0">
          <div className="relative mb-4 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome..."
              value={buscaAlunoModal}
              onChange={e => setBuscaAlunoModal(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
              <div className="space-y-2">
                {alunosFiltradosModal.length > 0 ? (
                  alunosFiltradosModal.map(aluno => (
                    <button
                      key={aluno.id}
                      onClick={() => handleNovaRotinaParaAluno(aluno.id)}
                      disabled={isCheckingRotina === aluno.id}
                      className={buttonVariants({ variant: 'ghost', className: 'w-full h-auto justify-start p-3 text-left' })}
                    >
                      <Avatar className="h-11 w-11 mr-4">
                        {aluno.avatar_image_url ? (
                          <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo || ''} />
                        ) : null}
                        <AvatarFallback style={{ backgroundColor: aluno.avatar_color || '#ccc' }} className="text-white font-semibold">
                          {aluno.avatar_letter || aluno.nome_completo?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{aluno.nome_completo}</span>
                      {isCheckingRotina === aluno.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno encontrado.</p>
                )}
              </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
);
};

export default RotinasPT;
