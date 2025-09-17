import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Modal from 'react-modal';
import { ArrowLeft, Plus, MoreVertical, BookCopy, Trash2, Edit, FilePlus, AlertTriangle, Repeat, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FiltrosRotinaModelo } from "@/components/rotinasModelo/FiltrosRotinaModelo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";

type ModeloRotina = Tables<'modelos_rotina'>;

const OBJETIVOS = ['Ganho de massa', 'Emagrecimento', 'Definição muscular', 'Condicionamento físico', 'Reabilitação', 'Performance esportiva'];
const DIFICULDADES = ['Baixa', 'Média', 'Alta'];
const FREQUENCIAS = [1, 2, 3, 4, 5, 6, 7];

// Main component
const MeusModelos = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [modelos, setModelos] = useState<ModeloRotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });

  const [modeloParaExcluir, setModeloParaExcluir] = useState<ModeloRotina | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchModelos = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('personal_trainer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }
        setModelos(data || []);
      } catch (error) {
        toast({
          title: "Erro ao buscar modelos",
          description: "Não foi possível carregar seus modelos de rotina. Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchModelos();
  }, [user, toast]);

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
      toast({ title: "Modelo excluído", description: `O modelo "${modeloParaExcluir.nome}" foi removido.` });
    } catch (error) {
      toast({ title: "Erro ao excluir", description: "Não foi possível remover o modelo. Tente novamente.", variant: "destructive" });
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="h-10 w-10 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Meus Modelos</h1>
            <p className="text-muted-foreground">Gerencie seus modelos de rotina para agilizar seu trabalho</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <FiltrosRotinaModelo
        filtros={filtros}
        onFiltrosChange={setFiltros}
        objetivos={OBJETIVOS}
        dificuldades={DIFICULDADES}
        frequencias={FREQUENCIAS}
      />

      {/* Lista de Modelos */}
      {modelosFiltrados.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookCopy className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum modelo encontrado</h3>
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
                      <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditarModelo(modelo.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar Modelo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExcluirModelo(modelo)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
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
        <Button onClick={handleNovoModelo} className="rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center md:h-auto md:w-auto md:rounded-md md:px-4 md:py-2 md:gap-2" aria-label="Novo Modelo">
          <Plus className="h-6 w-6 md:h-5 md:w-5" />
          <span className="hidden md:inline">Novo Modelo</span>
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