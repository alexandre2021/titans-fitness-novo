import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, Plus, Search, Filter, Dumbbell, ShieldAlert, Info, AlertTriangle, X } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useExercicios } from "@/hooks/useExercicios";
import CustomSelect from "@/components/ui/CustomSelect";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExercicioCard } from "@/components/exercicios/ExercicioCard";

const GRUPOS_MUSCULARES = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'];
const EQUIPAMENTOS = ['Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo', 'Kettlebell', 'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais', 'Landmine', 'Bola Bosu'];
const DIFICULDADES = ['Baixa', 'Média', 'Alta'];

const GRUPOS_MUSCULARES_OPTIONS = [{ value: 'todos', label: 'Todos' }, ...GRUPOS_MUSCULARES.map(o => ({ value: o, label: o }))];
const EQUIPAMENTOS_OPTIONS = [{ value: 'todos', label: 'Todos' }, ...EQUIPAMENTOS.map(d => ({ value: d, label: d }))];
const DIFICULDADES_OPTIONS = [{ value: 'todos', label: 'Todas' }, ...DIFICULDADES.map(f => ({ value: f, label: f }))];

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

  const [activeTab, setActiveTab] = useState<"padrao" | "personalizados">("padrao");
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState({
    grupoMuscular: 'todos',
    equipamento: 'todos',
    dificuldade: 'todos'
  });

  const isFirstRender = useRef(true);
  const isUpdatingFromUrl = useRef(false);

  const [showFilters, setShowFilters] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exercicioParaExcluir, setExercicioParaExcluir] = useState<Tables<'exercicios'> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const deletingRef = useRef(false);

  // Efeito de LEITURA: Sincroniza o estado interno com os parâmetros da URL
  useEffect(() => {
    isUpdatingFromUrl.current = true; // Sinaliza que a atualização vem da URL/state
    let tabToSet: "padrao" | "personalizados" = "padrao";

    // 1. Prioriza o activeTab do location.state
    if (location.state && location.state.activeTab) {
      tabToSet = location.state.activeTab;
      // Adiciona o tab na URL e limpa o state
      const newSearchParams = new URLSearchParams(location.search);
      if (tabToSet !== "padrao") {
        newSearchParams.set('tab', tabToSet);
      } else {
        newSearchParams.delete('tab');
      }
      navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true, state: {} });
    } else {
      // 2. Fallback para o parâmetro 'tab' da URL
      const currentSearchParams = new URLSearchParams(location.search);
      tabToSet = (currentSearchParams.get('tab') as "padrao" | "personalizados") || "padrao";
    }

    const currentSearchParams = new URLSearchParams(location.search); // Lê outros filtros da URL
    setBusca(currentSearchParams.get('busca') || "");
    setFiltros({ grupoMuscular: currentSearchParams.get('grupo') || 'todos', equipamento: currentSearchParams.get('equipamento') || 'todos', dificuldade: currentSearchParams.get('dificuldade') || 'todos' });
    setActiveTab(tabToSet);

    if (isFirstRender.current) {
        isFirstRender.current = false;
    }
  }, [location.search, location.pathname, location.state, navigate]);

  // Efeito de ESCRITA: Sincroniza a URL com as mudanças no estado interno
  useEffect(() => {
    if (isUpdatingFromUrl.current) {
        isUpdatingFromUrl.current = false;
        return;
    }
    const currentSearchParams = new URLSearchParams();
    if (activeTab && activeTab !== "padrao") currentSearchParams.set('tab', activeTab);
    if (busca) currentSearchParams.set('busca', busca);
    if (filtros.grupoMuscular && filtros.grupoMuscular !== 'todos') currentSearchParams.set('grupo', filtros.grupoMuscular);
    if (filtros.equipamento && filtros.equipamento !== 'todos') currentSearchParams.set('equipamento', filtros.equipamento);
    if (filtros.dificuldade && filtros.dificuldade !== 'todos') currentSearchParams.set('dificuldade', filtros.dificuldade);

    const newSearch = currentSearchParams.toString();
    const currentUrlSearch = location.search.startsWith('?') ? location.search.substring(1) : location.search;

    if (isFirstRender.current) {
        isFirstRender.current = false;
        return; 
    }

    if (newSearch !== currentUrlSearch) {
        navigate({ search: newSearch }, { replace: true });
    }
  }, [activeTab, busca, filtros.grupoMuscular, filtros.equipamento, filtros.dificuldade, navigate, location.search]);

  // Restaura posição do scroll quando volta da edição
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('exercicios-scroll-position');
    if (savedScrollPosition && initialLoadComplete) {
      // Usa requestAnimationFrame para garantir que o DOM foi atualizado
      requestAnimationFrame(() => {
        // Usa setTimeout para dar tempo dos exercícios filtrados renderizarem
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPosition));
          sessionStorage.removeItem('exercicios-scroll-position');
        }, 100);
      });
    }
  }, [initialLoadComplete]);

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
    // Adicionando console.log para depuração
    console.log('Botão "Novo Exercício Personalizado" clicado. Verificando limite de exercícios...');
    if (totalPersonalizados >= LIMITE_EXERCICIOS_PERSONALIZADOS) {
      console.log(`Limite de ${LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios atingido. Exibindo toast de erro.`);
      toast.error("Limite atingido", {
        description: `Você atingiu o limite de ${LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados. Para criar novos, remova algum exercício antigo.`,
      })
      return;
    }
    console.log('Limite OK. Navegando para /exercicios/novo...');
    navigate("/exercicios/novo");
  };

  const handleNovoExercicioPadrao = () => {
    navigate("/exercicios/novo-padrao");
  };

  const handleCriarCopia = (exercicioId: string) => {
    if (totalPersonalizados >= LIMITE_EXERCICIOS_PERSONALIZADOS) {
      toast.error("Limite atingido", {
        description: `Você atingiu o limite de ${LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados. Para criar novos, remova algum exercício antigo.`,
      })
      return;
    }
    navigate(`/exercicios/copia/${exercicioId}`);
  };

  const handleConfirmarExclusao = useCallback(async () => {
    if (!exercicioParaExcluir || isDeleting || deletingRef.current) return;

    setIsDeleting(true);
    deletingRef.current = true;

    try {
      await excluirExercicio(exercicioParaExcluir.id);

      setExercicioParaExcluir(null);
      setIsDeleting(false);
      deletingRef.current = false;
      setShowDeleteDialog(false);

    } catch (error) {
      console.error("Erro ao excluir exercício:", error);
      setIsDeleting(false);
      deletingRef.current = false;
    }
  }, [exercicioParaExcluir, isDeleting, excluirExercicio]);

  const handleExcluirExercicio = async (exercicioId: string) => {
    // Buscar em personalizados primeiro
    let exercicio = exerciciosPersonalizados.find(e => e.id === exercicioId);

    // Se não encontrou e é admin, buscar em padrão
    if (!exercicio && isAdmin) {
      exercicio = exerciciosPadrao.find(e => e.id === exercicioId);
    }

    if (exercicio) {
      setExercicioParaExcluir(exercicio);
      setShowDeleteDialog(true);
    }
  };

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

      {/* Busca e Filtros */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar exercícios..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative flex-shrink-0 z-30">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden h-10 w-10 p-0"
              aria-label="Mostrar filtros"
            >
              <Filter className="h-6 w-6" />
            </Button>
            {temFiltrosAvancadosAtivos && (
              <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-secondary ring-2 ring-background pointer-events-none md:hidden" />
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="hidden md:flex items-center gap-2 relative"
          >
            <Filter className="h-4 w-4" />
            Filtros
            {temFiltrosAvancadosAtivos && (
              <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-secondary ring-1 ring-background" />
            )}
          </Button>
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
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "padrao" | "personalizados")}>
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto md:mx-0">
          <TabsTrigger value="padrao">
            Aplicativo ({exerciciosPadrao.length})
          </TabsTrigger>
          <TabsTrigger value="personalizados">
            Meus Exercícios ({exerciciosPersonalizados.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="padrao" className="space-y-4 mt-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{exerciciosFiltrados.length} exercício(s) encontrado(s)</span>
          </div>

          {exerciciosFiltrados.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  Nenhum exercício encontrado
                </h3>
                {exerciciosPadrao.length === 0 && !initialLoadComplete && (
                  <Button onClick={refetch} variant="outline" className="mt-4">
                    Tentar Novamente
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-32 md:pb-16">
              {exerciciosFiltrados.map((exercicio) => (
                <ExercicioCard
                  key={exercicio.id}
                  exercicio={exercicio}
                  onCriarCopia={handleCriarCopia}
                  onExcluir={handleExcluirExercicio}
                  isAdmin={isAdmin}
                  location={location}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personalizados" className="space-y-4 mt-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{exerciciosFiltrados.length} exercício(s) encontrado(s)</span>
          </div>

          {exerciciosPersonalizados.length === 0 && busca === '' && filtros.grupoMuscular === 'todos' ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum exercício encontrado</h3>
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
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhum exercício encontrado</h3>
                  </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pb-32 md:pb-16">
                  {exerciciosFiltrados.map((exercicio) => (
                    <ExercicioCard
                      key={exercicio.id}
                      exercicio={exercicio}
                      onCriarCopia={handleCriarCopia}
                      onExcluir={handleExcluirExercicio}
                      isAdmin={isAdmin}
                      location={location}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Exercício
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o exercício {exercicioParaExcluir?.tipo === 'padrao' ? 'padrão' : 'personalizado'}{" "}
              <span className="font-semibold text-foreground">"{exercicioParaExcluir?.nome}"</span>?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelarExclusao} disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAdmin && activeTab === "padrao" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onClick={handleNovoExercicioPadrao}
            className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
            variant="secondary"
            aria-label="Novo Exercício Padrão"
          >
            <Plus />
          </Button>
        </div>
      )}

      {activeTab === "personalizados" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onClick={canAddMore ? handleNovoExercicio : () => toast.error("Limite atingido", { description: `Você atingiu o limite de ${LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados.` })}
            className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
            variant={canAddMore ? "default" : "outline"}
            aria-label={canAddMore ? "Novo Exercício" : "Limite de exercícios atingido"}
          >
            {canAddMore ? <Plus /> : <ShieldAlert />}
          </Button>
        </div>
      )}

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