import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Dumbbell, ShieldAlert, Info, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { useExercicios } from "@/hooks/useExercicios";
import { ExercicioCard } from "@/components/exercicios/ExercicioCard";
import { FiltrosExercicios } from "@/components/exercicios/FiltrosExercicios";
import { useIsMobile } from "@/hooks/use-mobile";

const ExerciciosPT = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const LIMITE_EXERCICIOS_PERSONALIZADOS = 100;
  
  // Usar o hook personalizado
  const {
    exerciciosPadrao,
    exerciciosPersonalizados,
    loading,
    filtros,
    setFiltros,
    excluirExercicio,
    totalPersonalizados,
    refetch
  } = useExercicios();

  const [activeTab, setActiveTab] = useState<"padrao" | "personalizados">("padrao");
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();
  const [isLimitInfoOpen, setIsLimitInfoOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const handleNovoExercicio = () => {
    if (totalPersonalizados >= LIMITE_EXERCICIOS_PERSONALIZADOS) {
      toast({
        title: "Limite atingido",
        description: `Você atingiu o limite de ${LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados. Para criar novos, remova algum exercício antigo.`,
        variant: "destructive",
      });
      return;
    }

    navigate("/exercicios-pt/novo");
  };

  const handleCriarCopia = (exercicioId: string) => {
    if (totalPersonalizados >= LIMITE_EXERCICIOS_PERSONALIZADOS) {
      toast({
        title: "Limite atingido",
        description: `Você atingiu o limite de ${LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados. Para criar novos, remova algum exercício antigo.`,
        variant: "destructive",
      });
      return;
    }

    navigate(`/exercicios-pt/copia/${exercicioId}`);
  };

  const handleExcluirExercicio = async (exercicioId: string) => {
    await excluirExercicio(exercicioId);
  };

  // Filtrar exercícios com base na busca e filtros
  const exerciciosAtivos = activeTab === "padrao" ? exerciciosPadrao : exerciciosPersonalizados;
  
  const exerciciosFiltrados = exerciciosAtivos.filter((exercicio) => {
    // Debug: log para ver os valores sendo comparados
    console.log('🔍 Filtrando exercício:', {
      nome: exercicio.nome,
      grupo_db: exercicio.grupo_muscular,
      equipamento_db: exercicio.equipamento,
      dificuldade_db: exercicio.dificuldade,
      filtros_aplicados: filtros
    });

    // Filtro de busca
    const matchesBusca = !busca || 
      exercicio.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      exercicio.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      exercicio.grupo_muscular?.toLowerCase().includes(busca.toLowerCase());
    
    // Filtros de categoria
    const matchesFiltros = 
      (filtros.grupoMuscular === 'todos' || exercicio.grupo_muscular === filtros.grupoMuscular) &&
      (filtros.equipamento === 'todos' || exercicio.equipamento === filtros.equipamento) &&
      (filtros.dificuldade === 'todos' || exercicio.dificuldade === filtros.dificuldade);

    const resultado = matchesBusca && matchesFiltros;
    
    // Debug: log do resultado
    if (!resultado) {
      console.log('❌ Exercício filtrado:', exercicio.nome, {
        busca: matchesBusca,
        filtros: matchesFiltros,
        grupo_match: filtros.grupoMuscular === 'todos' || exercicio.grupo_muscular === filtros.grupoMuscular,
        equipamento_match: filtros.equipamento === 'todos' || exercicio.equipamento === filtros.equipamento,
        dificuldade_match: filtros.dificuldade === 'todos' || exercicio.dificuldade === filtros.dificuldade
      });
    }

    return resultado;
  });

  console.log('📊 Resultado filtros:', {
    total_exercicios: exerciciosAtivos.length,
    exercicios_filtrados: exerciciosFiltrados.length,
    filtros_ativos: filtros
  });

  const canAddMore = totalPersonalizados < LIMITE_EXERCICIOS_PERSONALIZADOS;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Exercícios</h1>
          <p className="text-muted-foreground">
            Gerencie seus exercícios padrão e personalizados
          </p>
        </div>
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
      <div className="space-y-4">
        {/* Mobile: Header compacto */}
        <div className="flex items-center justify-between md:hidden">
          <div>
            <h1 className="text-3xl font-bold">Exercícios</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus exercícios
            </p>
          </div>
        </div>

        {/* Desktop: Header tradicional */}
        <div className="hidden md:flex md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Exercícios</h1>
            <p className="text-muted-foreground">
              Gerencie seus exercícios padrão e personalizados
            </p>
          </div>
        </div>
      </div>

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
          {/* Busca e Filtros - Mobile optimized */}
          <div className="space-y-4">
            {/* Mobile: Busca + Filtros na mesma linha */}
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
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 flex-shrink-0"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden xs:inline">Filtros</span>
              </Button>
            </div>

            {/* Desktop: Layout tradicional */}
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
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <FiltrosExercicios 
                filtros={filtros}
                onFiltrosChange={setFiltros}
              />
            </div>
          )}
          {/* Estatísticas */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{exerciciosFiltrados.length} exercício(s) encontrado(s)</span>
          </div>

          {/* Lista de exercícios padrão */}
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
                  <Button 
                    onClick={refetch} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Tentar Novamente
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {exerciciosFiltrados.map((exercicio) => (
                <ExercicioCard
                  key={exercicio.id}
                  exercicio={exercicio}
                  onCriarCopia={handleCriarCopia}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personalizados" className="space-y-4 mt-4">
          {/* Busca e Filtros - Mobile optimized */}
          <div className="space-y-4">
            {/* Mobile: Busca + Filtros na mesma linha */}
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
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 flex-shrink-0"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden xs:inline">Filtros</span>
              </Button>
            </div>

            {/* Desktop: Layout tradicional */}
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
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <FiltrosExercicios 
                filtros={filtros}
                onFiltrosChange={setFiltros}
              />
            </div>
          )}
          {exerciciosPersonalizados.length === 0 && busca === '' && filtros.grupoMuscular === 'todos' ? (
            // Estado vazio - nenhum exercício personalizado
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
              {/* Estatísticas */}
              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                <span>{exerciciosFiltrados.length} exercício(s) encontrado(s)</span>
                <span>•</span>
                <span>{totalPersonalizados} de {LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados</span>
              </div>

              <div className="flex md:hidden items-center justify-between text-sm text-muted-foreground">
                <span>{exerciciosFiltrados.length} encontrado(s)</span>
                <span>{totalPersonalizados}/{LIMITE_EXERCICIOS_PERSONALIZADOS} personalizados</span>
              </div>

              {/* Lista de exercícios personalizados */}
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
                  {exerciciosFiltrados.map((exercicio) => (
                    <ExercicioCard
                      key={exercicio.id}
                      exercicio={exercicio}
                      onExcluir={handleExcluirExercicio}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {isMobile ? (
        <Drawer open={isLimitInfoOpen} onOpenChange={setIsLimitInfoOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="relative text-left">
              <DrawerTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Limite de Exercícios
              </DrawerTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsLimitInfoOpen(false)}
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Fechar</span>
              </Button>
            </DrawerHeader>
            <div className="p-4 text-sm text-muted-foreground overflow-y-auto">
              Você alcançou o limite de <strong>{LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados</strong>.
              <br /><br />
              Para criar novos, você pode revisar e excluir exercícios antigos que não estão mais em uso.
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isLimitInfoOpen} onOpenChange={setIsLimitInfoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Limite de Exercícios Atingido
              </DialogTitle>
              <DialogDescription className="pt-4">
                Você alcançou o limite de <strong>{LIMITE_EXERCICIOS_PERSONALIZADOS} exercícios personalizados</strong>.
                <br /><br />
                Para criar novos exercícios, você pode revisar e excluir exercícios antigos que não estão mais em uso.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {/* Botão Flutuante para Novo Exercício */}
      {activeTab === "personalizados" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          {/* Mobile: Round floating button */}
          <Button
            onClick={canAddMore ? handleNovoExercicio : () => setIsLimitInfoOpen(true)}
            className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
            aria-label={canAddMore ? "Novo Exercício" : "Limite de exercícios atingido"}
          >
            {canAddMore ? <Plus /> : <ShieldAlert />}
          </Button>

          {/* Desktop: Standard floating button */}
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
    </div>
  );
};

export default ExerciciosPT;