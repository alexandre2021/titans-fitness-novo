import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Modal from 'react-modal';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUp, Plus, Search, Filter, Dumbbell, ShieldAlert, Info, AlertTriangle, Trash2, X } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useExercicios } from "@/hooks/useExercicios";
import { ExercicioCard } from "@/components/exercicios/ExercicioCard";
import { FiltrosExercicios } from "@/components/exercicios/FiltrosExercicios";
import { useMediaQuery } from "@/hooks/use-media-query";

// Configurar o react-modal para acessibilidade
if (typeof window !== 'undefined') {
  Modal.setAppElement('#root'); // ou o ID do seu elemento raiz
}

const ExerciciosPT = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const LIMITE_EXERCICIOS_PERSONALIZADOS = 100;
  
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
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isLimitInfoOpen, setIsLimitInfoOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [exercicioParaExcluir, setExercicioParaExcluir] = useState<Tables<'exercicios'> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busca, setBusca] = useState("");
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);
  const deletingRef = useRef(false);

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

  const canAddMore = totalPersonalizados < LIMITE_EXERCICIOS_PERSONALIZADOS;

  if (loading) {
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
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 flex-shrink-0"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden xs:inline">Filtros</span>
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
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 border rounded-lg bg-background">
              <FiltrosExercicios 
                filtros={filtros}
                onFiltrosChange={setFiltros}
              />
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
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 px-3 flex-shrink-0"
              >
                <Filter className="h-4 w-4" />
                <span className="hidden xs:inline">Filtros</span>
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
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <FiltrosExercicios 
                filtros={filtros}
                onFiltrosChange={setFiltros}
              />
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
            className="rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center md:h-12 md:w-12"
            aria-label="Voltar ao topo"
            variant="secondary"
          >
            <ArrowUp className="h-9 w-9 md:h-6 md:w-6" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExerciciosPT;