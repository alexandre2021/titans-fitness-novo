import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import Modal from 'react-modal';
import { ArrowLeft, Plus, MoreVertical, BookCopy, Trash2, Edit, AlertTriangle, Repeat, Search, Filter, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import CustomSelect from "@/components/ui/CustomSelect";

type ModeloRotina = Tables<'modelos_rotina'>;

const OBJETIVOS = ['Ganho de massa', 'Emagrecimento', 'Definição muscular', 'Condicionamento físico', 'Reabilitação', 'Performance esportiva'];
const DIFICULDADES = ['Baixa', 'Média', 'Alta'];
const FREQUENCIAS = [1, 2, 3, 4, 5, 6, 7];

const OBJETIVOS_OPTIONS = [{ value: 'todos', label: 'Todos' }, ...OBJETIVOS.map(o => ({ value: o, label: o }))];
const DIFICULDADES_OPTIONS = [{ value: 'todos', label: 'Todas' }, ...DIFICULDADES.map(d => ({ value: d, label: d }))];
const FREQUENCIAS_OPTIONS = [{ value: 'todos', label: 'Todas' }, ...FREQUENCIAS.map(f => ({ value: String(f), label: `${f}x / semana` }))];

// Main component
const MeusModelos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [modelos, setModelos] = useState<ModeloRotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  const [showFilters, setShowFilters] = useState(false);

  const [modeloParaExcluir, setModeloParaExcluir] = useState<ModeloRotina | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const temFiltrosAvancadosAtivos = filtros.objetivo !== 'todos' || filtros.dificuldade !== 'todos' || filtros.frequencia !== 'todos';

  const temFiltrosAtivos = temFiltrosAvancadosAtivos || filtros.busca !== '';

  const limparFiltros = () => {
    setFiltros({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  };

  useEffect(() => {
    const fetchModelos = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('professor_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }
        setModelos(data || []);
      } catch (error) {
        toast.error("Erro ao buscar modelos", {
          description: "Não foi possível carregar seus modelos de rotina. Tente novamente."
        })
      } finally {
        setLoading(false);
      }
    };

    fetchModelos();
  }, [user]);

  const handleExcluirModelo = (modelo: ModeloRotina) => {
    setModeloParaExcluir(modelo);
  };

  const handleConfirmarExclusao = async () => {
    if (!modeloParaExcluir) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('modelos_rotina').delete().eq('id', modeloParaExcluir.id);
      if (error) throw error;
      setModelos(prev => prev.filter(m => m.id !== modeloParaExcluir.id));
      toast.success("Modelo excluído", { description: `O modelo "${modeloParaExcluir.nome}" foi removido.` });
    } catch (error) {
      toast.error("Erro ao excluir", {
        description: "Não foi possível remover o modelo. Tente novamente."
      })
    } finally {
      setIsDeleting(false);
      setModeloParaExcluir(null);
    }
  };

  const handleEditarModelo = (modeloId: string) => {
    navigate(`/modelos/editar/${modeloId}`);
  };

  const handleNovoModelo = () => {
    navigate('/modelos/novo');
  };

  const modelosFiltrados = modelos.filter(modelo => {
    const buscaMatch = filtros.busca === '' || modelo.nome.toLowerCase().includes(filtros.busca.toLowerCase());
    const objetivoMatch = filtros.objetivo === 'todos' || modelo.objetivo === filtros.objetivo;
    const dificuldadeMatch = filtros.dificuldade === 'todos' || modelo.dificuldade === filtros.dificuldade;
    const frequenciaMatch = filtros.frequencia === 'todos' || String(modelo.treinos_por_semana) === filtros.frequencia;
    return buscaMatch && objetivoMatch && dificuldadeMatch && frequenciaMatch;
  });

  const getBadgeColor = (type: 'objetivo' | 'dificuldade', value: string) => {
    if (type === 'dificuldade') {
      if (value === 'Baixa') return 'bg-green-100 text-green-800 ';
      if (value === 'Média') return 'bg-yellow-100 text-yellow-800';
      if (value === 'Alta') return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

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
            <h1 className="text-3xl font-bold">Meus Modelos</h1>
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
            variant="default"
            onClick={() => setShowFilters(!showFilters)}
            className="flex-shrink-0 md:hidden relative h-10 w-10 rounded-full p-0 [&_svg]:size-6"
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
                  value={OBJETIVOS_OPTIONS.find(opt => opt.value === filtros.objetivo)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, objetivo: option ? String(option.value) : 'todos' }))}
                  options={OBJETIVOS_OPTIONS}
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
              <div className="space-y-2 flex-1">
                <Label htmlFor="filtro-frequencia">Frequência</Label>
                <CustomSelect
                  inputId="filtro-frequencia"
                  value={FREQUENCIAS_OPTIONS.find(opt => opt.value === filtros.frequencia)}
                  onChange={(option) => setFiltros(prev => ({ ...prev, frequencia: option ? String(option.value) : 'todos' }))}
                  options={FREQUENCIAS_OPTIONS}
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

      {/* Lista de Modelos */}
      {modelosFiltrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum modelo de rotina</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {modelos.length === 0 ? 'Crie seu primeiro modelo de rotina para reutilizá-lo com seus alunos.' : 'Tente ajustar os filtros ou o termo de busca.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modelosFiltrados.map((modelo) => (
            <Card key={modelo.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex justify-between items-start text-lg">
                  <span className="flex-1 mr-2">{modelo.nome}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      {isDesktop ? (
                        <Button variant="outline" size="sm" className="ml-auto flex-shrink-0">
                          Ações <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="default" className="h-10 w-10 rounded-full p-0 flex-shrink-0 [&_svg]:size-6">
                          <MoreVertical />
                        </Button>
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-between">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Criado em: {modelo.created_at ? new Date(modelo.created_at).toLocaleDateString('pt-BR') : 'Data indisponível'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{modelo.treinos_por_semana} treinos/semana</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {modelo.objetivo && <Badge variant="outline" className={getBadgeColor('objetivo', modelo.objetivo)}>{modelo.objetivo}</Badge>}
                  {modelo.dificuldade && <Badge variant="outline" className={getBadgeColor('dificuldade', modelo.dificuldade)}>{modelo.dificuldade}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Botão Flutuante */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        {/* Mobile: Round floating button */}
        <Button
          onClick={handleNovoModelo}
          className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
          aria-label="Novo Modelo"
        >
          <Plus />
        </Button>
        {/* Desktop: Standard floating button */}
        <Button
          onClick={handleNovoModelo}
          className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
          size="lg"
        >
          <Plus />
          Novo Modelo
        </Button>
      </div>

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