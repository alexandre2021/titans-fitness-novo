import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Modal from 'react-modal';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, Plus, Search, Filter, Dumbbell, ShieldAlert, Info, AlertTriangle, Trash2, X, MoreVertical, Copy, Edit, Eye } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useExercicios } from "@/hooks/useExercicios";
import CustomSelect from "@/components/ui/CustomSelect";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/use-media-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const GRUPOS_MUSCULARES = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'];
const EQUIPAMENTOS = ['Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo', 'Kettlebell', 'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais', 'Landmine', 'Bola Bosu'];
const DIFICULDADES = ['Baixa', 'Média', 'Alta'];

const GRUPOS_MUSCULARES_OPTIONS = [{ value: 'todos', label: 'Todos' }, ...GRUPOS_MUSCULARES.map(o => ({ value: o, label: o }))];
const EQUIPAMENTOS_OPTIONS = [{ value: 'todos', label: 'Todos' }, ...EQUIPAMENTOS.map(d => ({ value: d, label: d }))];
const DIFICULDADES_OPTIONS = [{ value: 'todos', label: 'Todas' }, ...DIFICULDADES.map(f => ({ value: f, label: f }))];

const GRUPO_CORES: { [key: string]: string } = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800',
  'Pernas': 'bg-green-100 text-green-800',
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-violet-100 text-violet-800',
  'Panturrilha': 'bg-indigo-100 text-indigo-800'
};

Modal.setAppElement('#root');

const ExerciciosPT = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const ADMIN_EMAIL = 'contato@titans.fitness';
  const isAdmin = user?.email === ADMIN_EMAIL;
  const LIMITE_EXERCICIOS_PERSONALIZADOS = 100;
  
  const {
    exerciciosPadrao,
    exerciciosPersonalizados,
    initialLoadComplete,
    excluirExercicio,
    totalPersonalizados,
    refetch
  } = useExercicios();

  const [filtros, setFiltros] = useState({
    grupoMuscular: 'todos',
    equipamento: 'todos',
    dificuldade: 'todos'
  });
  const [activeTab, setActiveTab] = useState<"padrao" | "personalizados">(location.state?.activeTab || "padrao");
  const [showFilters, setShowFilters] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isLimitInfoOpen, setIsLimitInfoOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exercicioParaExcluir, setExercicioParaExcluir] = useState<Tables<'exercicios'> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busca, setBusca] = useState("");
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const deletingRef = useRef(false);

  // Efeito para sincronizar a aba com o estado da navegação
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTopButton(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  const handleNovoExercicio = () => {
    if (totalPersonalizados >= LIMITE_EXERCICIOS_PERSONALIZADOS) {
      toast.error("Limite atingido", {
        description: `Você atingiu o limite de ${LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados. Para criar novos, remova algum exercício antigo.`,
      })
      return;
    }
    navigate("/exercicios-pt/novo");
  };

  const handleNovoExercicioPadrao = () => {
    navigate("/exercicios-pt/novo-padrao");
  };

  const handleCriarCopia = (exercicioId: string) => {
    if (totalPersonalizados >= LIMITE_EXERCICIOS_PERSONALIZADOS) {
      toast.error("Limite atingido", {
        description: `Você atingiu o limite de ${LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados. Para criar novos, remova algum exercício antigo.`,
      })
      return;
    }
    navigate(`/exercicios-pt/copia/${exercicioId}`);
  };

  const handleExcluirExercicio = async (exercicioId: string) => {
    const exercicio = exerciciosPersonalizados.find(e => e.id === exercicioId);
    if (exercicio) {
      setExercicioParaExcluir(exercicio);
      setShowDeleteDialog(true);
    }
  };

  const handleConfirmarExclusao = useCallback(async () => {
    if (!exercicioParaExcluir || isDeleting || deletingRef.current) return;

    setIsDeleting(true);
    deletingRef.current = true;

    try {
      await excluirExercicio(exercicioParaExcluir.id);

      // Resetar estados sem mostrar toast (o hook já mostra)
      setExercicioParaExcluir(null);
      setIsDeleting(false);
      deletingRef.current = false;
      setShowDeleteDialog(false);

    } catch (error) {
      console.error("Erro ao excluir exercício:", error);
      
      // Em caso de erro, resetar estados (o hook já mostra o toast de erro)
      setIsDeleting(false);
      deletingRef.current = false;
    }
  }, [exercicioParaExcluir, isDeleting, excluirExercicio]);

  const handleCancelarExclusao = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
    setExercicioParaExcluir(null);
  };

  // Filtrar exercícios
  const exerciciosAtivos = activeTab === "padrao" ? exerciciosPadrao : exerciciosPersonalizados;
  const exerciciosFiltrados = exerciciosAtivos.filter((exercicio) => {
    const matchesBusca = !busca || 
      exercicio.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      exercicio.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      exercicio.grupo_muscular?.toLowerCase().includes(busca.toLowerCase());
    
    const matchesFiltros = 
      (filtros.grupoMuscular === 'todos' || exercicio.grupo_muscular === filtros.grupoMuscular) &&
      (filtros.equipamento === 'todos' || exercicio.equipamento === filtros.equipamento) &&
      (filtros.dificuldade === 'todos' || exercicio.dificuldade === filtros.dificuldade);

    return matchesBusca && matchesFiltros;
  });

  const temFiltrosAvancadosAtivos = filtros.grupoMuscular !== 'todos' || filtros.equipamento !== 'todos' || filtros.dificuldade !== 'todos';

  const temFiltrosAtivos = temFiltrosAvancadosAtivos || busca !== '';

  const limparFiltros = () => {
    setFiltros({ grupoMuscular: 'todos', equipamento: 'todos', dificuldade: 'todos' });
    setBusca('');
  };

  const canAddMore = totalPersonalizados < LIMITE_EXERCICIOS_PERSONALIZADOS;

  if (!initialLoadComplete) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando exercícios...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      {isDesktop && (
        <div className="items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Exercícios</h1>
            <p className="text-muted-foreground">
              Gerencie seus exercícios padrão e personalizados
            </p>
          </div>
        </div>
      )}

      {/* Abas */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "padrao" | "personalizados")}>
        <TabsList>
          <TabsTrigger value="padrao">
            Padrão ({exerciciosPadrao.length})
          </TabsTrigger>
          <TabsTrigger value="personalizados">
            Personalizados ({exerciciosPersonalizados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="padrao" className="space-y-4 mt-4">
          {/* Busca e Filtros */}
          <div className="space-y-4">
            <div className="flex gap-2 md:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar exercícios..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="default"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-shrink-0 relative h-10 w-10 rounded-full p-0 [&_svg]:size-6"
                aria-label="Mostrar filtros"
              >
                <Filter />
                {temFiltrosAvancadosAtivos && (
                  <span className="absolute top-[-2px] left-[-2px] block h-3 w-3 rounded-full bg-secondary ring-2 ring-white" />
                )}
              </Button>
            </div>

            <div className="hidden md:flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar exercícios..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 relative"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {temFiltrosAvancadosAtivos && (
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-secondary ring-1 ring-background" />
                )}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 border rounded-lg bg-background">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="space-y-2 flex-1"> 
                  <Label htmlFor="filtro-grupo">Grupo Muscular</Label>
                  <CustomSelect
                    inputId="filtro-grupo"
                    value={GRUPOS_MUSCULARES_OPTIONS.find(opt => opt.value === filtros.grupoMuscular)}
                    onChange={(option) => setFiltros(prev => ({ ...prev, grupoMuscular: option ? String(option.value) : 'todos' }))}
                    options={GRUPOS_MUSCULARES_OPTIONS}
                  />
                </div>
                <div className="space-y-2 flex-1"> 
                  <Label htmlFor="filtro-equipamento">Equipamento</Label>
                  <CustomSelect
                    inputId="filtro-equipamento"
                    value={EQUIPAMENTOS_OPTIONS.find(opt => opt.value === filtros.equipamento)}
                    onChange={(option) => setFiltros(prev => ({ ...prev, equipamento: option ? String(option.value) : 'todos' }))}
                    options={EQUIPAMENTOS_OPTIONS}
                  />
                </div>
                <div className="space-y-2 flex-1"> 
                  <Label htmlFor="filtro-dificuldade">Dificuldade</Label>
                  <CustomSelect
                    inputId="filtro-dificuldade"
                    value={DIFICULDADES_OPTIONS.find(opt => opt.value === filtros.dificuldade)}
                    onChange={(option) => setFiltros(prev => ({ ...prev, dificuldade: option ? String(option.value) : 'todos' }))}
                    options={DIFICULDADES_OPTIONS}
                  />
                </div>
                {temFiltrosAtivos && (
                  <Button variant="outline" size="sm" onClick={limparFiltros} className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{exerciciosFiltrados.length} exercício(s) encontrado(s)</span>
          </div>

          {exerciciosFiltrados.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {exerciciosPadrao.length === 0 ? 'Nenhum exercício padrão disponível' : 'Nenhum exercício encontrado'}
                </h3>
                <p className="text-muted-foreground text-center">
                  {exerciciosPadrao.length === 0 
                    ? 'Os exercícios padrão ainda não foram carregados no sistema'
                    : 'Tente ajustar os filtros ou termos de busca'
                  }
                </p>
                {exerciciosPadrao.length === 0 && (
                  <Button onClick={refetch} variant="outline" className="mt-4">
                    Tentar Novamente
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-20 md:pb-0">
              {exerciciosFiltrados.map((exercicio) => {
                const corGrupo = exercicio.grupo_muscular ? GRUPO_CORES[exercicio.grupo_muscular] || 'bg-gray-100 text-black' : 'bg-gray-100 text-black';
                return (
                  <Card key={exercicio.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/exercicios-pt/detalhes/${exercicio.id}`, { state: { fromTab: 'padrao' } })}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 pr-1 md:pr-4">
                          <h3 className="font-semibold text-foreground truncate mb-2">{exercicio.nome}</h3>
                          {exercicio.descricao && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exercicio.descricao}</p>
                          )}
                          <div className="flex flex-wrap gap-1 md:gap-2">
                            {exercicio.grupo_muscular && <Badge className={`text-xs border-0 ${corGrupo}`}>{exercicio.grupo_muscular}</Badge>}
                            {exercicio.equipamento && <Badge className="text-xs bg-gray-100 text-black">{exercicio.equipamento}</Badge>}
                            {exercicio.dificuldade && <Badge className="text-xs bg-gray-100 text-black border-0">{exercicio.dificuldade}</Badge>}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="default" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4" onClick={(e) => e.stopPropagation()}><MoreVertical /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/exercicios-pt/detalhes/${exercicio.id}`, { state: { fromTab: 'padrao' } }); }}>
                              <Eye className="mr-2 h-4 w-4" /><span>Ver Detalhes</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCriarCopia(exercicio.id); }}>
                              <Copy className="mr-2 h-4 w-4" /><span>Criar Cópia</span>
                            </DropdownMenuItem>
                            {isAdmin && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/exercicios-pt/editar-padrao/${exercicio.id}`); }}>
                                <Edit className="mr-2 h-4 w-4 text-secondary" /><span>Editar Padrão</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personalizados" className="space-y-4 mt-4">
          {/* Similar ao padrão mas com ExercicioCard para excluir */}
          <div className="space-y-4">
            <div className="flex gap-2 md:hidden">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar exercícios..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="default"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-shrink-0 relative h-10 w-10 rounded-full p-0 [&_svg]:size-6"
                aria-label="Mostrar filtros"
              >
                <Filter />
                {temFiltrosAvancadosAtivos && (
                  <span className="absolute top-[-2px] left-[-2px] block h-3 w-3 rounded-full bg-secondary ring-2 ring-white" />
                )}
              </Button>
            </div>

            <div className="hidden md:flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar exercícios..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 relative"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {temFiltrosAvancadosAtivos && (
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-secondary ring-1 ring-background" />
                )}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 border rounded-lg bg-background">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="space-y-2 flex-1"> 
                  <Label htmlFor="filtro-grupo-p">Grupo Muscular</Label>
                  <CustomSelect
                    inputId="filtro-grupo-p"
                    value={GRUPOS_MUSCULARES_OPTIONS.find(opt => opt.value === filtros.grupoMuscular)}
                    onChange={(option) => setFiltros(prev => ({ ...prev, grupoMuscular: option ? String(option.value) : 'todos' }))}
                    options={GRUPOS_MUSCULARES_OPTIONS}
                  />
                </div>
                <div className="space-y-2 flex-1"> 
                  <Label htmlFor="filtro-equipamento-p">Equipamento</Label>
                  <CustomSelect
                    inputId="filtro-equipamento-p"
                    value={EQUIPAMENTOS_OPTIONS.find(opt => opt.value === filtros.equipamento)}
                    onChange={(option) => setFiltros(prev => ({ ...prev, equipamento: option ? String(option.value) : 'todos' }))}
                    options={EQUIPAMENTOS_OPTIONS}
                  />
                </div>
                <div className="space-y-2 flex-1"> 
                  <Label htmlFor="filtro-dificuldade-p">Dificuldade</Label>
                  <CustomSelect
                    inputId="filtro-dificuldade-p"
                    value={DIFICULDADES_OPTIONS.find(opt => opt.value === filtros.dificuldade)}
                    onChange={(option) => setFiltros(prev => ({ ...prev, dificuldade: option ? String(option.value) : 'todos' }))}
                    options={DIFICULDADES_OPTIONS}
                  />
                </div>
                {temFiltrosAtivos && (
                  <Button variant="outline" size="sm" onClick={limparFiltros} className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                    <X className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          )}

          {exerciciosPersonalizados.length === 0 && busca === '' && filtros.grupoMuscular === 'todos' ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum exercício personalizado</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Crie exercícios personalizados a partir dos exercícios padrão ou do zero
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <span>{exerciciosFiltrados.length} exercício(s) encontrado(s)</span>
                <span>•</span>
                <span>{totalPersonalizados} de {LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados</span>
              </div>

              <div className="flex md:hidden items-center justify-between text-sm text-muted-foreground">
                <span>{exerciciosFiltrados.length} encontrado(s)</span>
                <span>{totalPersonalizados}/{LIMITE_EXERCICIOS_PERSONALIZADOS} personalizados</span>
              </div>

              {exerciciosFiltrados.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum exercício encontrado</h3>
                    <p className="text-muted-foreground text-center">
                      Tente ajustar os filtros ou termos de busca
                    </p>
                  </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {exerciciosFiltrados.map((exercicio) => {
                    const corGrupo = exercicio.grupo_muscular ? GRUPO_CORES[exercicio.grupo_muscular] || 'bg-gray-100 text-black' : 'bg-gray-100 text-black';
                    return (
                      <Card key={exercicio.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/exercicios-pt/detalhes/${exercicio.id}`, { state: { fromTab: 'personalizados' } })}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0 pr-1 md:pr-4">
                              <h3 className="font-semibold text-foreground truncate mb-2">{exercicio.nome}</h3>
                              {exercicio.descricao && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{exercicio.descricao}</p>
                              )}
                              <div className="flex flex-wrap gap-1 md:gap-2">
                                {exercicio.grupo_muscular && <Badge className={`text-xs border-0 ${corGrupo}`}>{exercicio.grupo_muscular}</Badge>}
                                {exercicio.equipamento && <Badge className="text-xs bg-gray-100 text-black">{exercicio.equipamento}</Badge>}
                                {exercicio.dificuldade && <Badge className="text-xs bg-gray-100 text-black border-0">{exercicio.dificuldade}</Badge>}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="default" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4" onClick={(e) => e.stopPropagation()}><MoreVertical /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/exercicios-pt/detalhes/${exercicio.id}`, { state: { fromTab: 'personalizados' } }); }}>
                                  <Eye className="mr-2 h-4 w-4" /><span>Ver Detalhes</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/exercicios-pt/editar/${exercicio.id}`); }}>
                                  <Edit className="mr-2 h-4 w-4" /><span>Editar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleExcluirExercicio(exercicio.id); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /><span>Excluir</span></DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de Informação sobre Limite - React Modal */}
      <Modal
        isOpen={isLimitInfoOpen}
        onRequestClose={() => setIsLimitInfoOpen(false)}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Limite de Exercícios Atingido</h2>
        </div>
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Você alcançou o limite de <strong>{LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados</strong>.
            <br /><br />
            Para criar novos exercícios, você pode revisar e excluir exercícios antigos que não estão mais em uso.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setIsLimitInfoOpen(false)}>
            Entendi
          </Button>
        </div>
      </Modal>

      {/* Modal de Confirmação de Exclusão - React Modal BLOQUEADA */}
      <Modal
        isOpen={showDeleteDialog}
        onRequestClose={() => {}} // Não permite fechar
        shouldCloseOnOverlayClick={false}
        shouldCloseOnEsc={false}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Excluir Exercício</h2>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 leading-relaxed">
            Tem certeza que deseja excluir o exercício personalizado{" "}
            <span className="font-semibold text-gray-900">
              "{exercicioParaExcluir?.nome}"
            </span>?
          </p>
          <p className="text-sm text-gray-600 mt-2">
            Esta ação não pode ser desfeita.
          </p>
        </div>
        
        <div className="flex gap-3 justify-end">
          <Button 
            variant="outline" 
            onClick={handleCancelarExclusao}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmarExclusao} 
            disabled={isDeleting}
            className="flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Excluir
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* Botão Flutuante para Novo Exercício Padrão (Admin) */}
      {isAdmin && activeTab === "padrao" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onClick={handleNovoExercicioPadrao}
            className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
            variant="secondary"
            aria-label="Novo Exercício Padrão"
          >
            <Plus />
          </Button>

          <Button
            onClick={handleNovoExercicioPadrao}
            className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
            size="lg"
            variant="secondary"
          >
            <Plus />
            Novo Exercício Padrão
          </Button>
        </div>
      )}

      {/* Botão Flutuante para Novo Exercício */}
      {activeTab === "personalizados" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onClick={canAddMore ? handleNovoExercicio : () => setIsLimitInfoOpen(true)}
            className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
            aria-label={canAddMore ? "Novo Exercício" : "Limite de exercícios atingido"}
          >
            {canAddMore ? <Plus /> : <ShieldAlert />}
          </Button>

          <Button
            onClick={canAddMore ? handleNovoExercicio : () => setIsLimitInfoOpen(true)}
            className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
            size="lg"
            variant={canAddMore ? "default" : "outline"}
          >
            {canAddMore ? <Plus /> : <ShieldAlert />}
            {canAddMore ? "Novo Exercício" : "Limite Atingido"}
          </Button>
        </div>
      )}

      {/* Botão Flutuante para Voltar ao Topo */}
      {showScrollTopButton && (
        <div className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-50">
          <Button
            onClick={scrollToTop}
            className="rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center md:h-12 md:w-12 [&_svg]:size-8 md:[&_svg]:size-6"
            aria-label="Voltar ao topo"
            variant="secondary"
          >
            <ArrowUp />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExerciciosPT;