/**
 * @file AlunosPT.tsx
 * @description Página principal para o Professor gerenciar e adicionar seus alunos.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  Users,
  Search,
  Filter,
  X,
  Info,
  Loader2,
} from "lucide-react";
import { useAlunos } from "@/hooks/useAlunos";
import { useAuth } from "@/hooks/useAuth";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AlunoCard } from "@/components/alunos/AlunoCard";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CustomSelect from "@/components/ui/CustomSelect";
import { AlunoCardBusca } from "@/components/alunos/AlunoCardBusca";

interface AlunoEncontrado {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: 'letter' | 'image';
  avatar_image_url?: string | null;
  avatar_letter?: string | null;
  avatar_color?: string | null;
  codigo_vinculo: string;
}

const codigoSchema = z.object({
  codigo: z.string().min(6, "Código deve ter 6 caracteres").max(6, "Código deve ter 6 caracteres"),
});

const SITUACAO_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'pendente', label: 'Pendente' },
];

const GENERO_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
  { value: 'nao_informar', label: 'Prefiro não informar' },
];

type CodigoFormData = z.infer<typeof codigoSchema>;

const AlunosPT = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const { alunos, loading, filtros, setFiltros, desvincularAluno, totalAlunos } = useAlunos(fetchTrigger);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [showFilters, setShowFilters] = useState(false);

  // Estados para o modal de adicionar aluno
  const [isSearching, setIsSearching] = useState(false);
  const [alunoEncontrado, setAlunoEncontrado] = useState<AlunoEncontrado | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showStatusInfoDialog, setShowStatusInfoDialog] = useState(false);

  const refetchAlunos = () => {
    setFetchTrigger(prev => prev + 1);
  };

  // Adicionado para depuração
  useEffect(() => {
    console.log('👨‍🏫 [AlunosPT.tsx] Lista de alunos carregada:', alunos);
  }, [alunos]);

  const codigoForm = useForm<CodigoFormData>({
    resolver: zodResolver(codigoSchema),
    defaultValues: {
      codigo: "",
    },
  });

  const handleBuscarPorCodigo = async (data: CodigoFormData) => {
    setIsSearching(true);
    setAlunoEncontrado(null);
    setSearchError(null);

    try {
      const { data: aluno, error } = await supabase.functions.invoke<AlunoEncontrado>('buscar-aluno-por-codigo', {
        body: { codigo_busca: data.codigo.toUpperCase() },
      });

      if (error || !aluno) {
        const { data: professor } = await supabase
          .from('professores')
          .select('id')
          .eq('codigo_vinculo', data.codigo.toUpperCase())
          .single();

        if (professor) {
          setSearchError("Este código pertence a um professor. Insira o código de um aluno.");
        } else {
          setSearchError("Nenhum aluno encontrado com este código. Verifique e tente novamente.");
        }
        return;
      }

      // Verificar se o professor já tem vínculo com este aluno
      const { data: vinculoExistente, error: vinculoError } = await supabase
        .from('alunos_professores')
        .select('aluno_id')
        .eq('aluno_id', aluno.id)
        .eq('professor_id', user?.id)
        .single();

      if (vinculoError && vinculoError.code !== 'PGRST116') throw vinculoError;

      if (vinculoExistente) {
        setSearchError("Este aluno já está na sua lista.");
        return;
      }

      setAlunoEncontrado(aluno);

    } catch (e) {
      const error = e as Error;
      setSearchError(error.message || "Ocorreu um erro ao buscar o aluno.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdicionarAluno = async (alunoId: string) => {
    if (!user) return;
    console.log(`[handleAdicionarAluno] 1. Iniciando adição para alunoId: ${alunoId}`);

    const { error } = await supabase.from('alunos_professores').insert({
      aluno_id: alunoId,
      professor_id: user.id,
    });

    if (error) {
      console.error(`[handleAdicionarAluno] 2. Erro ao inserir na tabela 'alunos_professores':`, error);
      if (error.code === '23505') { // Chave duplicada
        toast.info("Este aluno já está na sua rede.");
      } else {
        toast.error("Erro ao adicionar aluno", { description: error.message });
      }
    } else {
      console.log("[handleAdicionarAluno] 2. Vínculo criado com sucesso no banco de dados.");
      
      console.log("[handleAdicionarAluno] 3. Chamando refetchAlunos() para atualizar a lista...");
      refetchAlunos(); // Atualiza a lista de alunos
      
      console.log("[handleAdicionarAluno] 4. Chamando resetAddModal() para fechar o modal.");
      resetAddModal();
    }
  };

  const resetAddModal = () => {
    setIsAddModalOpen(false);
    setAlunoEncontrado(null);
    setSearchError(null);
    codigoForm.reset();
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsAddModalOpen(open);
    if (!open) {
      resetAddModal();
    }
  };

  const limparFiltros = () => {
    setFiltros({ busca: '', situacao: 'todos', genero: 'todos' });
  };

  const temFiltrosAtivos = filtros.situacao !== 'todos' || filtros.genero !== 'todos' || filtros.busca !== '';

  const temFiltrosAvancadosAtivos = filtros.situacao !== 'todos' || filtros.genero !== 'todos';

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando alunos...</p>
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
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Alunos</h1>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowStatusInfoDialog(true)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              title="Informações sobre status dos alunos"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {(alunos.length === 0 && filtros.busca === '' && filtros.situacao === 'todos' && filtros.genero === 'todos') ? (
        // Estado vazio - nenhum aluno cadastrado e nenhum convite pendente
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-center">
              Convide seu primeiro aluno para:
            </h3>
            <p className="text-green-600 text-lg text-center mb-1">
              ✓ Fazer avaliações;
            </p>
            <p className="text-green-600 text-lg text-center mb-1">
              ✓ Criar rotinas de treino;
            </p>
            <p className="text-green-600 text-lg text-center mb-1">
              ✓ Trocar mensagens;
            </p>
            <p className="text-green-600 text-lg text-center mb-6">
              ✓ Agendar sessões.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros e busca */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={filtros.busca}
                  onChange={e => setFiltros({ ...filtros, busca: e.target.value })}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filtro-situacao">Situação</Label>
                    <CustomSelect
                      inputId="filtro-situacao"
                      value={SITUACAO_OPTIONS.find(opt => opt.value === filtros.situacao)}
                      onChange={(option) => setFiltros(prev => ({ ...prev, situacao: option ? String(option.value) : 'todos' }))}
                      options={SITUACAO_OPTIONS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filtro-genero">Gênero</Label>
                    <CustomSelect
                      inputId="filtro-genero"
                      value={GENERO_OPTIONS.find(opt => opt.value === filtros.genero)}
                      onChange={(option) => setFiltros(prev => ({ ...prev, genero: option ? String(option.value) : 'todos' }))}
                      options={GENERO_OPTIONS}
                    />
                  </div>
                  {temFiltrosAtivos && (
                    <div className="flex items-end">
                      <Button variant="outline" size="sm" onClick={limparFiltros} className="flex items-center gap-2 w-full sm:w-auto">
                        <X className="h-4 w-4" />
                        Limpar
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {temFiltrosAtivos ? (
              <span>
                {alunos.length} de {totalAlunos} aluno(s) encontrado(s)
              </span>
            ) : (
              <span>{totalAlunos} aluno(s) no total</span>
            )}
          </div>

          {/* Lista de alunos */}
          {alunos.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum aluno encontrado</h3>
                <p className="text-muted-foreground text-center">
                  Tente ajustar os filtros ou termos de busca
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-20 md:pb-0">
              {alunos.map((aluno) => (
                <AlunoCard 
                  key={aluno.id} 
                  aluno={aluno} 
                  onDesvincular={desvincularAluno}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Botão Flutuante para Convidar Aluno */}
      <Dialog open={isAddModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogTrigger asChild>
          <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
            <Button
              className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
              aria-label="Novo Aluno"
            >
              <Plus />
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px] rounded-md">
          <DialogHeader>
            <DialogTitle>Novo Aluno</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Form {...codigoForm}>
              <form onSubmit={codigoForm.handleSubmit(handleBuscarPorCodigo)} className="space-y-4">
                <FormField
                  control={codigoForm.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Identificação do Aluno</FormLabel>
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start gap-3 sm:gap-2">
                        <div className="flex-grow space-y-2">
                          <FormControl>
                            <Input
                              placeholder="Ex: ABC123"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              className="font-mono tracking-widest"
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                        <Button type="submit" disabled={isSearching} className="w-full sm:w-auto mt-auto">
                          {isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                          Buscar
                        </Button>
                      </div>
                    </FormItem>
                  )}
                />
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>O aluno encontra essa informação no menu do seu avatar.</p>
                </div>
              </form>
            </Form>

            {searchError && <p className="text-sm text-destructive mt-4">{searchError}</p>}

            {alunoEncontrado && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Aluno encontrado:</h4>
                <AlunoCardBusca aluno={alunoEncontrado} onAdd={handleAdicionarAluno} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Informações sobre Status */}
      <AlertDialog open={showStatusInfoDialog} onOpenChange={setShowStatusInfoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Situação dos Alunos</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-green-800 mb-1">Ativo</p>
                <p className="text-sm text-muted-foreground">
                  O aluno completou o cadastro inicial (onboarding) e está pronto para receber rotinas e avaliações.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-yellow-800 mb-1">Pendente</p>
                <p className="text-sm text-muted-foreground">
                  O aluno se cadastrou na plataforma, mas ainda não finalizou a configuração inicial do seu perfil.
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter><AlertDialogCancel>Fechar</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AlunosPT;