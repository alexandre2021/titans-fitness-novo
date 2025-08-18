import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Filter, Dumbbell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useExercicios } from "@/hooks/useExercicios";
import { usePTProfile } from "@/hooks/usePTProfile";
import { ExercicioCard } from "@/components/exercicios/ExercicioCard";
import { FiltrosExercicios } from "@/components/exercicios/FiltrosExercicios";

const ExerciciosPT = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
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

  // Buscar dados do perfil do PT
  const { profile } = usePTProfile();

  const [activeTab, setActiveTab] = useState<"padrao" | "personalizados">("padrao");
  const [showFilters, setShowFilters] = useState(false);
  const [busca, setBusca] = useState("");

  const handleNovoExercicio = () => {
    if (!profile) {
      toast({
        title: "Erro",
        description: "Perfil não carregado. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite do plano - usar valor padrão se não definido
    const limiteExercicios = profile.limite_exercicios || 10;
    
    if (totalPersonalizados >= limiteExercicios) {
      toast({
        title: "Limite atingido",
        description: `Você atingiu o limite de ${limiteExercicios} exercícios personalizados do seu plano atual. Faça upgrade para criar mais exercícios.`,
        variant: "destructive",
      });
      return;
    }

    navigate("/exercicios-pt/novo");
  };

  const handleCriarCopia = (exercicioId: string) => {
    if (!profile) {
      toast({
        title: "Erro",
        description: "Perfil não carregado. Tente novamente.",
        variant: "destructive",
      });
      return;
    }

    // Verificar limite do plano - usar valor padrão se não definido
    const limiteExercicios = profile.limite_exercicios || 10;
    
    if (totalPersonalizados >= limiteExercicios) {
      toast({
        title: "Limite atingido",
        description: `Você atingiu o limite de ${limiteExercicios} exercícios personalizados do seu plano atual. Faça upgrade para criar mais exercícios.`,
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

  const canAddMore = !profile || totalPersonalizados < (profile.limite_exercicios || 10);

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
          {activeTab === "personalizados" && (
            <Button 
              onClick={handleNovoExercicio}
              size="sm"
              className="flex items-center gap-1 px-3"
              disabled={!canAddMore}
            >
              {canAddMore ? (
                <>
                  <Plus className="h-4 w-4" />
                  <span className="hidden xs:inline">Novo</span>
                </>
              ) : (
                "Limite"
              )}
            </Button>
          )}
        </div>

        {/* Desktop: Header tradicional */}
        <div className="hidden md:flex md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Exercícios</h1>
            <p className="text-muted-foreground">
              Gerencie seus exercícios padrão e personalizados
            </p>
          </div>
          {activeTab === "personalizados" && (
            <Button 
              onClick={handleNovoExercicio} 
              className="flex items-center gap-2"
              disabled={!canAddMore}
            >
              {canAddMore ? (
                <>
                  <Plus className="h-4 w-4" />
                  Novo Exercício
                </>
              ) : (
                "Limite Atingido"
              )}
            </Button>
          )}
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
                {canAddMore ? (
                  <Button onClick={handleNovoExercicio} size="lg" className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Exercício personalizado
                  </Button>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Limite de exercícios atingido
                    </p>
                    <Button variant="outline" size="lg">
                      Fazer Upgrade
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Estatísticas */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{exerciciosFiltrados.length} exercício(s) encontrado(s)</span>
                {profile && (
                  <>
                    <span>•</span>
                    <span>{totalPersonalizados}/{profile.limite_exercicios || 10} exercícios do plano</span>
                  </>
                )}
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
    </div>
  );
};

export default ExerciciosPT;