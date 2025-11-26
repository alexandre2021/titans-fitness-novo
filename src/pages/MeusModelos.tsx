import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import Modal from 'react-modal';
import { Plus, MoreVertical, BookCopy, Trash2, Edit, AlertTriangle, Repeat, Search, Filter, X, Copy, Eye, Target, BicepsFlexed, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useModelosRotina } from "@/hooks/useModelosRotina";
import { Tables } from "@/integrations/supabase/types";
import CustomSelect from "@/components/ui/CustomSelect";
import { FILTRO_DIFICULDADES_OPTIONS, FILTRO_FREQUENCIAS_OPTIONS, FILTRO_OBJETIVOS_OPTIONS } from "@/constants/rotinas";

type ModeloRotina = Tables<'modelos_rotina'>;

// Main component
const MeusModelos = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const ADMIN_EMAIL = 'contato@titans.fitness';
  const isAdmin = user?.email === ADMIN_EMAIL;
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { modelosPadrao, modelosPersonalizados, loading, refetch } = useModelosRotina();

  const [filtros, setFiltros] = useState({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  const [showFilters, setShowFilters] = useState(false);

  // Ler aba ativa da URL ou usar 'padrao' como padrão
  const tabFromUrl = searchParams.get('tab') as 'padrao' | 'personalizado' | null;
  const [activeTab, setActiveTab] = useState<'padrao' | 'personalizado'>(tabFromUrl || 'padrao');

  const [modeloParaExcluir, setModeloParaExcluir] = useState<ModeloRotina | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dropdownAberto, setDropdownAberto] = useState<string | null>(null);

  const temFiltrosAvancadosAtivos = filtros.objetivo !== 'todos' || filtros.dificuldade !== 'todos' || filtros.frequencia !== 'todos';

  const temFiltrosAtivos = temFiltrosAvancadosAtivos || filtros.busca !== '';

  // Recarregar dados quando a página recebe foco (ex: ao voltar da edição)
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez na montagem

  const limparFiltros = () => {
    setFiltros({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  };

  const handleExcluirModelo = (modelo: ModeloRotina) => {
    setModeloParaExcluir(modelo);
  };

  const handleConfirmarExclusao = async () => {
    if (!modeloParaExcluir) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('modelos_rotina').delete().eq('id', modeloParaExcluir.id);
      if (error) throw error;
      await refetch();
      toast.success("Modelo excluído com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir", {
        description: "Não foi possível remover o modelo. Tente novamente."
      })
    } finally {
      setIsDeleting(false);
      setModeloParaExcluir(null);
    }
  };

  const handleCopiarModelo = (modeloId: string) => {
    navigate(`/modelos/copia/${modeloId}?returnTab=${activeTab}`);
  };

  const handleEditarModelo = (modeloId: string) => {
    navigate(`/modelos/editar/${modeloId}?returnTab=${activeTab}`);
  };

  const handleNovoModelo = () => {
    navigate('/modelos/novo');
  };

  const handleNovoModeloPadrao = () => {
    navigate('/modelos/novo-padrao');
  };

  // Filtragem para modelos personalizados
  const modelosPersonalizadosFiltrados = modelosPersonalizados.filter(modelo => {
    const buscaMatch = filtros.busca === '' || modelo.nome.toLowerCase().includes(filtros.busca.toLowerCase());
    const objetivoMatch = filtros.objetivo === 'todos' || modelo.objetivo === filtros.objetivo;
    const dificuldadeMatch = filtros.dificuldade === 'todos' || modelo.dificuldade === filtros.dificuldade;
    const frequenciaMatch = filtros.frequencia === 'todos' || String(modelo.treinos_por_semana) === filtros.frequencia;
    return buscaMatch && objetivoMatch && dificuldadeMatch && frequenciaMatch;
  });

  // Filtragem para modelos padrão
  const modelosPadraoFiltrados = modelosPadrao.filter(modelo => {
    const buscaMatch = filtros.busca === '' || modelo.nome.toLowerCase().includes(filtros.busca.toLowerCase());
    const objetivoMatch = filtros.objetivo === 'todos' || modelo.objetivo === filtros.objetivo;
    const dificuldadeMatch = filtros.dificuldade === 'todos' || modelo.dificuldade === filtros.dificuldade;
    const frequenciaMatch = filtros.frequencia === 'todos' || String(modelo.treinos_por_semana) === filtros.frequencia;
    return buscaMatch && objetivoMatch && dificuldadeMatch && frequenciaMatch;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando modelos...</p>
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
            <h1 className="text-3xl font-bold">Modelos</h1>
            <p className="text-muted-foreground">
              Gerencie seus modelos de rotina para agilizar seu trabalho
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
              placeholder="Buscar modelos..."
              value={filtros.busca}
              onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-shrink-0 md:hidden relative h-10 w-10 p-0 [&_svg]:size-6"
            aria-label="Mostrar filtros"
          >
            <Filter />
            {temFiltrosAvancadosAtivos && (
              <span className="absolute top-[-2px] left-[-2px] block h-3 w-3 rounded-full bg-secondary ring-2 ring-white" />
            )}
          </Button>
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
                <Label htmlFor="filtro-objetivo">Objetivo</Label>
                <CustomSelect
                  inputId="filtro-objetivo"
                  value={FILTRO_OBJETIVOS_OPTIONS.find(opt => opt.value === filtros.objetivo)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, objetivo: option ? String(option.value) : 'todos' }))}
                  options={FILTRO_OBJETIVOS_OPTIONS}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="filtro-dificuldade">Dificuldade</Label>
                <CustomSelect
                  inputId="filtro-dificuldade"
                  value={FILTRO_DIFICULDADES_OPTIONS.find(opt => opt.value === filtros.dificuldade)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, dificuldade: option ? String(option.value) : 'todos' }))}
                  options={FILTRO_DIFICULDADES_OPTIONS}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="filtro-frequencia">Frequência</Label>
                <CustomSelect
                  inputId="filtro-frequencia"
                  value={FILTRO_FREQUENCIAS_OPTIONS.find(opt => opt.value === filtros.frequencia)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, frequencia: option ? String(option.value) : 'todos' }))}
                  options={FILTRO_FREQUENCIAS_OPTIONS}
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

      {/* Tabs: Aplicativo / Meus Modelos */}
      <Tabs value={activeTab} onValueChange={(value) => {
        const newTab = value as 'padrao' | 'personalizado';
        setActiveTab(newTab);
        setSearchParams({ tab: newTab });
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto md:mx-0">
          <TabsTrigger value="padrao">
            Aplicativo ({modelosPadrao.length})
          </TabsTrigger>
          <TabsTrigger value="personalizado">
            Meus Modelos ({modelosPersonalizados.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: Modelos Padrão */}
        <TabsContent value="padrao" className="mt-6">
          {modelosPadraoFiltrados.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Nenhum modelo padrão encontrado</h3>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 pb-20 md:pb-0 max-w-5xl mx-auto">
              {modelosPadraoFiltrados.map((modelo) => (
                <div key={modelo.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold">{modelo.nome}</h4>
                      <div className="flex items-center gap-2 mb-2 mt-2">
                        <Badge className="bg-blue-100 text-blue-800">Padrão</Badge>
                      </div>
                    </div>
                    <DropdownMenu
                      open={dropdownAberto === modelo.id}
                      onOpenChange={(open) => setDropdownAberto(open ? modelo.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/modelos/detalhes/${modelo.id}?returnTab=${activeTab}`)}>
                          <Eye className="mr-2 h-5 w-5" />
                          <span className="text-base">Ver detalhes</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopiarModelo(modelo.id)}>
                          <Copy className="mr-2 h-5 w-5" />
                          <span className="text-base">Criar Cópia</span>
                        </DropdownMenuItem>
                        {isAdmin && (
                          <>
                            <DropdownMenuItem onClick={() => navigate(`/modelos/editar-padrao/${modelo.id}?returnTab=${activeTab}`)}>
                              <Edit className="mr-2 h-5 w-5" />
                              <span className="text-base">Editar Padrão</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExcluirModelo(modelo)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-5 w-5" />
                              <span className="text-base">Excluir</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Objetivo</p>
                        <p className="font-medium capitalize">{modelo.objetivo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BicepsFlexed className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Dificuldade</p>
                        <p className="font-medium capitalize">{modelo.dificuldade}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Frequência</p>
                        <p className="font-medium">{modelo.treinos_por_semana}x por semana</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duração</p>
                        <p className="font-medium">{modelo.duracao_semanas} semanas</p>
                      </div>
                    </div>
                  </div>
                  {modelo.observacoes_rotina && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                      <p className="text-sm">{modelo.observacoes_rotina}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Modelos Personalizados */}
        <TabsContent value="personalizado" className="mt-6">
          {modelosPersonalizadosFiltrados.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold">Nenhum modelo personalizado encontrado</h3>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 pb-20 md:pb-0 max-w-5xl mx-auto">
              {modelosPersonalizadosFiltrados.map((modelo) => (
                <div key={modelo.id} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold">{modelo.nome}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criado em: {modelo.created_at ? new Date(modelo.created_at).toLocaleDateString('pt-BR') : 'Data indisponível'}
                      </p>
                      <div className="flex items-center gap-2 mb-2 mt-2">
                        <Badge className="bg-purple-100 text-purple-800">Personalizado</Badge>
                        {modelo.modelo_padrao_id && (
                          <Badge className="bg-amber-100 text-amber-800">
                            Baseado em padrão
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu
                      open={dropdownAberto === modelo.id}
                      onOpenChange={(open) => setDropdownAberto(open ? modelo.id : null)}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/modelos/detalhes/${modelo.id}?returnTab=${activeTab}`)}>
                          <Eye className="mr-2 h-5 w-5" />
                          <span className="text-base">Ver detalhes</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleCopiarModelo(modelo.id)}>
                          <Copy className="mr-2 h-5 w-5" />
                          <span className="text-base">Criar Cópia</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditarModelo(modelo.id)}>
                          <Edit className="mr-2 h-5 w-5" />
                          <span className="text-base">Editar Modelo</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExcluirModelo(modelo)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-5 w-5" />
                          <span className="text-base">Excluir</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Objetivo</p>
                        <p className="font-medium capitalize">{modelo.objetivo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BicepsFlexed className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Dificuldade</p>
                        <p className="font-medium capitalize">{modelo.dificuldade}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Frequência</p>
                        <p className="font-medium">{modelo.treinos_por_semana}x por semana</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duração</p>
                        <p className="font-medium">{modelo.duracao_semanas} semanas</p>
                      </div>
                    </div>
                  </div>
                  {modelo.observacoes_rotina && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                      <p className="text-sm">{modelo.observacoes_rotina}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Botão Flutuante para Modelo Padrão (Admin) */}
      {isAdmin && activeTab === "padrao" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onClick={handleNovoModeloPadrao}
            className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
            variant="secondary"
            aria-label="Novo Modelo Padrão"
          >
            <Plus />
          </Button>
        </div>
      )}

      {/* Botão Flutuante para Modelo Personalizado */}
      {activeTab === "personalizado" && (
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          <Button
            onClick={handleNovoModelo}
            className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
            aria-label="Novo Modelo"
          >
            <Plus />
          </Button>
        </div>
      )}

      {/* Modal de Exclusão */}
      <Modal
        isOpen={!!modeloParaExcluir}
        onRequestClose={() => setModeloParaExcluir(null)}
        shouldCloseOnOverlayClick={!isDeleting}
        shouldCloseOnEsc={!isDeleting}
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold">Excluir Modelo</h2>
        </div>
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Tem certeza que deseja excluir o modelo <span className="font-bold">"{modeloParaExcluir?.nome}"</span>?
          </p>
          <p className="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModeloParaExcluir(null)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirmarExclusao} disabled={isDeleting}>
            {isDeleting ? 'Excluindo...' : 'Excluir'}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default MeusModelos;