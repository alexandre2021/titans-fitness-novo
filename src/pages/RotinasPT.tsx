import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMediaQuery } from '@/hooks/use-media-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge'; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Users, Target, Clock, Plus, FileText, MoreVertical, Eye, Play, Ban, Activity, Trash2, BicepsFlexed, Repeat, User as UserIcon, Info, Search, Filter, X, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
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
}

interface RotinasAgrupadas {
  [alunoId: string]: {
    aluno: {
      id: string;
      nome_completo: string;
      avatar_image_url: string | null;
      avatar_type: string | null;
      avatar_letter: string | null;
      avatar_color: string | null;
    };
    rotinas: RotinaCardProps[];
  };
}

const RotinasPT = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [allRotinas, setAllRotinas] = useState<Rotina[]>([]);
  const [alunos, setAlunos] = useState<AlunoInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'atual' | 'rascunho'>('atual');
  const [alunoFiltro, setAlunoFiltro] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({ objetivo: 'todos', frequencia: 'todos' });

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showStatusInfoDialog, setShowStatusInfoDialog] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Estados para exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rotinaParaExcluir, setRotinaParaExcluir] = useState<RotinaCardProps | null>(null);

  // Estados para o novo fluxo de criação
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null);
  const [showCriarOpcoesModal, setShowCriarOpcoesModal] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [temModelos, setTemModelos] = useState(false);
  const [isCheckingRotina, setIsCheckingRotina] = useState<string | null>(null); // ID do aluno sendo verificado

  useEffect(() => {
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
          .order('created_at', { ascending: false });

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

  const rotinasFiltradas = useMemo(() => {
    let rotinas: RotinaCardProps[] = [];
    const statusMap = {
      atual: ['Ativa', 'Bloqueada'],
      rascunho: ['Rascunho'],
    };

    const rotinasAtuais = allRotinas
      .filter(r => (statusMap[activeTab] || []).includes(r.status || ''))
      .filter(r => alunoFiltro === 'todos' || r.aluno_id === alunoFiltro)
      .filter(r => r.alunos) // Garante que o aluno existe
      // Novos filtros
      .filter(r => busca === '' || r.nome.toLowerCase().includes(busca.toLowerCase()))
      .filter(r => filtros.objetivo === 'todos' || r.objetivo === filtros.objetivo)
      .filter(r => filtros.frequencia === 'todos' || String(r.treinos_por_semana) === filtros.frequencia)
      .map(r => ({
        id: r.id,
        nome: r.nome,
        status: r.status!,
        data_inicio: r.data_inicio,
        duracao_semanas: r.duracao_semanas,
        aluno_id: r.alunos!.id,
        aluno: r.alunos!,
        objetivo: r.objetivo,
        dificuldade: r.dificuldade,
        treinos_por_semana: r.treinos_por_semana,
        descricao: r.descricao,
      }));

    rotinas = rotinasAtuais;

    return rotinas.reduce((acc, rotina) => {
      const { aluno_id, aluno } = rotina;
      if (!acc[aluno_id]) {
        acc[aluno_id] = {
          aluno: {
            ...aluno
          },
          rotinas: [],
        };
      }
      acc[aluno_id].rotinas.push(rotina);
      return acc;
    }, {} as RotinasAgrupadas);
  }, [allRotinas, activeTab, alunoFiltro, busca, filtros]);

  const rotinasAtuaisCount = useMemo(() => {
    return allRotinas.filter(r => r.status === 'Ativa' || r.status === 'Bloqueada').length;
  }, [allRotinas]);

  const rotinasRascunhoCount = useMemo(() => {
    return allRotinas.filter(r => r.status === 'Rascunho').length;
  }, [allRotinas]);

  const ALUNOS_OPTIONS = useMemo(() => {
    const options = alunos.map(a => ({ value: a.id, label: a.nome_completo }));
    return [{ value: 'todos', label: 'Todos' }, ...options];
  }, [alunos]);

  const temFiltrosAtivos = filtros.objetivo !== 'todos' || filtros.frequencia !== 'todos' || busca !== '' || alunoFiltro !== 'todos';

  // Apenas os filtros que estão dentro do painel colapsável
  const temFiltrosAvancadosAtivos = filtros.objetivo !== 'todos' || filtros.frequencia !== 'todos' || alunoFiltro !== 'todos';

  const limparFiltros = () => { setBusca(''); setAlunoFiltro('todos'); setFiltros({ objetivo: 'todos', frequencia: 'todos' }); };

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

  const handleAbrirModalSelecaoAluno = () => {
    setIsCreateModalOpen(true);
  };

  const handleSelectAlunoParaNovaRotina = async (alunoId: string) => {
    if (isCheckingRotina) return; // Evita cliques duplos
    setIsCheckingRotina(alunoId);

    // Simula uma pequena espera para melhorar a percepção do usuário
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verifica se o aluno selecionado já tem uma rotina ativa ou rascunho
    const temRotinaAtiva = allRotinas.some(r => r.aluno_id === alunoId && (r.status === 'Ativa' || r.status === 'Bloqueada'));
    const temRascunho = allRotinas.some(r => r.aluno_id === alunoId && r.status === 'Rascunho');

    if (temRotinaAtiva) {
      toast.error("Aluno já possui uma rotina ativa.", { description: "Finalize ou exclua a rotina atual antes de criar uma nova para este aluno." });
      setIsCheckingRotina(null);
      return;
    }
    if (temRascunho) {
      toast.error("Já existe um rascunho para este aluno.", { description: "Continue a edição do rascunho existente ou exclua-o para criar uma nova rotina." });
      setIsCheckingRotina(null);
      return;
    }

    // Em vez de navegar, fecha o primeiro modal, guarda o aluno e abre o segundo
    setIsCreateModalOpen(false);
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'atual' | 'rascunho')} className="w-full space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="atual">Atual ({rotinasAtuaisCount})</TabsTrigger>
            <TabsTrigger value="rascunho">Rascunho ({rotinasRascunhoCount})</TabsTrigger>
          </TabsList>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome da rotina..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="default"
              onClick={() => setShowFilters(!showFilters)}
              className="flex-shrink-0 md:hidden relative h-10 w-10 rounded-full p-0 [&_svg]:size-6"
              aria-label="Mostrar filtros"
            >
              <Filter />
              {temFiltrosAtivos && <span className="absolute top-[-2px] left-[-2px] block h-3 w-3 rounded-full bg-secondary ring-2 ring-white" />}
            </Button>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="hidden md:flex items-center gap-2 relative">
              <Filter className="h-4 w-4" /> Filtros
              {temFiltrosAtivos && <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-secondary ring-1 ring-background" />}
            </Button>
          </div>

          {showFilters && (
            <div className="p-4 border rounded-lg bg-background">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="space-y-2 flex-1">
                  <Label htmlFor="filtro-aluno">Aluno</Label>
                  <CustomSelect
                    inputId="filtro-aluno"
                    value={ALUNOS_OPTIONS.find(opt => opt.value === alunoFiltro)}
                    onChange={(option) => setAlunoFiltro(option ? String(option.value) : 'todos')}
                    options={ALUNOS_OPTIONS} />
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="filtro-objetivo">Objetivo</Label>
                  <CustomSelect inputId="filtro-objetivo" value={OBJETIVOS_OPTIONS.find(opt => opt.value === filtros.objetivo)} onChange={(option) => setFiltros(prev => ({ ...prev, objetivo: option ? String(option.value) : 'todos' }))} options={OBJETIVOS_OPTIONS} />
                  <CustomSelect inputId="filtro-objetivo" value={FILTRO_OBJETIVOS_OPTIONS.find(opt => opt.value === filtros.objetivo)} onChange={(option) => setFiltros(prev => ({ ...prev, objetivo: option ? String(option.value) : 'todos' }))} options={FILTRO_OBJETIVOS_OPTIONS} />
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="filtro-frequencia">Frequência</Label>
                  <CustomSelect inputId="filtro-frequencia" value={FREQUENCIAS_OPTIONS.find(opt => opt.value === filtros.frequencia)} onChange={(option) => setFiltros(prev => ({ ...prev, frequencia: option ? String(option.value) : 'todos' }))} options={FREQUENCIAS_OPTIONS} />
                  <CustomSelect inputId="filtro-frequencia" value={FILTRO_FREQUENCIAS_OPTIONS.find(opt => opt.value === filtros.frequencia)} onChange={(option) => setFiltros(prev => ({ ...prev, frequencia: option ? String(option.value) : 'todos' }))} options={FILTRO_FREQUENCIAS_OPTIONS} />
                </div>
                {temFiltrosAtivos && ( // O botão de limpar continua usando a mesma lógica
                  <Button variant="outline" size="sm" onClick={limparFiltros} className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0"><X className="h-4 w-4" /> Limpar</Button>
                )}
              </div>
            </div>
          )}
        </div>

        <TabsContent value={activeTab} className="mt-0">
          {Object.keys(rotinasFiltradas).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhuma rotina encontrada</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Não há rotinas com o status "{activeTab}" para o filtro selecionado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 pb-32 md:pb-20">
              {Object.values(rotinasFiltradas).map(({ aluno, rotinas }) => (
                <Card key={aluno.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
                          <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />
                        ) : (
                          <AvatarFallback style={{ backgroundColor: aluno.avatar_color || '#ccc' }} className="text-white font-semibold">
                            {aluno.avatar_letter}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {aluno.nome_completo}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rotinas.map(rotina => {
                      const isRascunho = rotina.status === 'Rascunho';
                      const isAtiva = rotina.status === 'Ativa';
                      const isBloqueada = rotina.status === 'Bloqueada';
                      return (
                        <div key={rotina.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold">{rotina.nome}</h4>
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 mb-2">
                                <UserIcon className="h-3 w-3" />
                                <span>Criada por você</span>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={isAtiva ? 'bg-green-100 text-green-800' : isBloqueada ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                                  {rotina.status}
                                </Badge>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="default" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4" onClick={(e) => e.stopPropagation()} disabled={isUpdatingStatus}><MoreVertical /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {isRascunho ? (
                                  <DropdownMenuItem onClick={() => handleContinuarRascunho(rotina)}><Play className="mr-2 h-5 w-5" /><span className="text-base">Continuar</span></DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => navigate(`/alunos-rotinas/${rotina.aluno_id}/${rotina.id}`)}><Eye className="mr-2 h-5 w-5" /><span className="text-base">Detalhes</span></DropdownMenuItem>
                                )}
                                {isAtiva && <DropdownMenuItem onClick={() => navigate(`/execucao-rotina/selecionar-treino/${rotina.id}`, { state: { modo: 'professor' } })}><Play className="mr-2 h-5 w-5" /><span className="text-base">Treinar</span></DropdownMenuItem> }
                                {isAtiva && <DropdownMenuItem onClick={() => handleUpdateRotinaStatus(rotina, 'Bloqueada')}><Ban className="mr-2 h-5 w-5" /><span className="text-base">Bloquear</span></DropdownMenuItem> }
                                {isBloqueada && <DropdownMenuItem onClick={() => handleUpdateRotinaStatus(rotina, 'Ativa')}><Activity className="mr-2 h-5 w-5" /><span className="text-base">Reativar</span></DropdownMenuItem> }                                
                                <DropdownMenuItem onClick={() => handleExcluirRotina(rotina)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-5 w-5" /><span className="text-base">Excluir</span></DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Objetivo</p><p className="font-medium capitalize">{rotina.objetivo}</p></div></div>
                            <div className="flex items-center gap-2"><BicepsFlexed className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Dificuldade</p><p className="font-medium capitalize">{rotina.dificuldade}</p></div></div>
                            <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Duração</p><p className="font-medium">{rotina.duracao_semanas} semanas</p></div></div>
                            <div className="flex items-center gap-2"><Repeat className="h-4 w-4 text-muted-foreground" /><div><p className="text-sm text-muted-foreground">Frequência</p><p className="font-medium">{rotina.treinos_por_semana}x por semana</p></div></div>
                          </div>

                          {rotina.descricao && (
                            <div className="pt-3 border-t">
                              <p className="text-sm text-muted-foreground mb-1">Descrição:</p>
                              <p className="text-sm">{rotina.descricao}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Botão Flutuante para Nova Rotina */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            {/* Botão para Mobile */}
            <Button
              onClick={handleAbrirModalSelecaoAluno}
              className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
              aria-label="Nova Rotina"
            >
              <Plus />
            </Button>
          </DialogTrigger>
          <DialogTrigger asChild>
            {/* Botão para Desktop */}
            <Button
              onClick={handleAbrirModalSelecaoAluno}
              className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
              size="lg"
            ><Plus /> Nova Rotina</Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px] rounded-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Rotina</DialogTitle>
              <p className="text-sm text-muted-foreground pt-1">Selecione o aluno para quem você deseja criar a nova rotina.</p>
            </DialogHeader>
            <div className="py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {alunos.map(aluno => (
                  <button
                    key={aluno.id}
                    onClick={() => handleSelectAlunoParaNovaRotina(aluno.id)}
                    disabled={!!isCheckingRotina}
                    className="w-full flex items-center p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors text-left disabled:cursor-not-allowed disabled:opacity-70">
                    <Avatar className="h-10 w-10 mr-4">
                      {aluno.avatar_type === 'image' && aluno.avatar_image_url ? (
                        <AvatarImage src={aluno.avatar_image_url} alt={aluno.nome_completo} />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: aluno.avatar_color || '#ccc' }} className="text-white font-semibold">
                          {aluno.avatar_letter}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <p className="font-medium flex-1">{aluno.nome_completo}</p>
                    {isCheckingRotina === aluno.id && (
                      <div className="ml-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal de Informações sobre Status */}
      <AlertDialog open={showStatusInfoDialog} onOpenChange={setShowStatusInfoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Situação das Rotinas</AlertDialogTitle>
            <AlertDialogDescription>
              Entenda o significado de cada status das rotinas de treino.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-blue-800 mb-1">Rascunho</p>
                <p className="text-sm text-muted-foreground">
                  Rotina em processo de criação pelo professor, ainda não finalizada.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-green-800 mb-1">Ativa</p>
                <p className="text-sm text-muted-foreground">
                  Aluno pode acessar e executar os treinos normalmente.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-red-800 mb-1">Bloqueada</p>
                <p className="text-sm text-muted-foreground">
                  Acesso aos treinos foi suspenso temporariamente pelo professor.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Encerrada</p>
                <p className="text-sm text-muted-foreground">
                  Rotina concluída ou cancelada, movida para o histórico do aluno.
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

    </div>
  );
};

export default RotinasPT;