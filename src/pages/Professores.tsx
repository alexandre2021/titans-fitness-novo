import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useProfessores } from '@/hooks/useProfessores';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Users, Search, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ProfessorCard } from '@/components/professores/ProfessorCard';
import { ProfessorCardBusca } from '@/components/professores/ProfessorCardBusca'; // This was already here

interface ProfessorEncontrado {
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

type CodigoFormData = z.infer<typeof codigoSchema>;

const Professores = () => {
  const { user } = useAuth();
  const [fetchTrigger, setFetchTrigger] = useState(0);
  const {
    professores,
    loading,
    filtroBusca,
    setFiltroBusca,
    totalProfessores,
    desvincularProfessor,
  } = useProfessores(fetchTrigger);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [professorEncontrado, setProfessorEncontrado] = useState<ProfessorEncontrado | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Estados para o modal de exclusão
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [professorParaExcluir, setProfessorParaExcluir] = useState<ProfessorEncontrado | null>(null);

  const refetchProfessores = () => {
    setFetchTrigger(prev => prev + 1);
  };

  const codigoForm = useForm<CodigoFormData>({
    resolver: zodResolver(codigoSchema),
    defaultValues: { codigo: "" },
  });

  const resetAddModal = () => {
    setIsAddModalOpen(false);
    setProfessorEncontrado(null);
    setSearchError(null);
    codigoForm.reset();
  };

  const handleModalOpenChange = (open: boolean) => {
    setIsAddModalOpen(open);
    if (!open) {
      resetAddModal();
    }
  };

  const handleBuscarPorCodigo = async (data: CodigoFormData) => {
    setIsSearching(true);
    setProfessorEncontrado(null);
    setSearchError(null);

    try {
      const { data: professor, error } = await supabase.functions.invoke<ProfessorEncontrado>('buscar-professor-por-codigo', {
        body: {
          codigo_busca: data.codigo.toUpperCase(),
          aluno_id: user?.id, // Adiciona o ID do aluno na chamada
        },
      });

      // A Edge Function agora retorna um erro específico se o vínculo já existe
      if (error?.message === 'ALREADY_FOLLOWS') {
        setSearchError("Você já segue este professor.");
        return;
      }

      if (error || !professor) {
        const { data: aluno } = await supabase
          .from('alunos')
          .select('id')
          .eq('codigo_vinculo', data.codigo.toUpperCase())
          .single();

        if (aluno) {
          setSearchError("Este código pertence a um aluno. Insira o código de um professor.");
        } else {
          setSearchError("Nenhum professor encontrado com este código. Verifique e tente novamente.");
        }
        return;
      }

      setProfessorEncontrado(professor);

    } catch (e) {
      const error = e as Error;
      setSearchError(error.message || "Ocorreu um erro ao buscar o professor.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSeguirProfessor = async (professorId: string) => {
    if (!user) return;

    const { error } = await supabase.from('alunos_professores').insert({
      aluno_id: user.id,
      professor_id: professorId,
    });

    if (error) {
      if (error.code === '23505') { // Chave duplicada
        toast.info("Você já segue este professor.");
      } else {
        toast.error("Erro ao seguir professor", { description: error.message });
      }
    } else {
      toast.success("Agora você está seguindo um novo professor!");
      refetchProfessores();
      resetAddModal();
    }
  };

  const handleDesvincularClick = useCallback((professorId: string) => {
    const professor = professores.find(p => p.id === professorId);
    if (professor) {
      setProfessorParaExcluir(professor as ProfessorEncontrado);
      setShowDeleteDialog(true);
    }
  }, [professores]);

  const handleConfirmarDesvinculo = async () => {
    if (professorParaExcluir) {
      await desvincularProfessor(professorParaExcluir.id);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">
              Carregando professores...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isDesktop && (
        <div>
          <h1 className="text-3xl font-bold">Professores</h1>
          <p className="text-muted-foreground">Veja os profissionais que você segue</p>
        </div>
      )}

      {totalProfessores === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum professor</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Você ainda não está seguindo nenhum professor. Para começar, peça o código de identificação do seu personal trainer.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={filtroBusca}
              onChange={(e) => setFiltroBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{professores.length} de {totalProfessores} professor(es) encontrado(s)</span>
          </div>

          {professores.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum professor encontrado</h3>
                <p className="text-muted-foreground text-center">
                  Tente ajustar o termo de busca.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 pb-20 md:pb-0">
              {professores.map((professor) => (
                <ProfessorCard 
                  key={professor.id} 
                  professor={professor} 
                  onDesvincular={() => handleDesvincularClick(professor.id)} />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog open={isAddModalOpen} onOpenChange={handleModalOpenChange}>
        <DialogTrigger asChild>
          <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
            <Button
              className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
              aria-label="Novo Professor"
            >
              <Plus />
            </Button>
            <Button
              className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
              size="lg"
            >
              <Plus />
              Novo Professor
            </Button>
          </div>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px] rounded-md">
          <DialogHeader>
            <DialogTitle>Novo Professor</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Form {...codigoForm}>
              <form onSubmit={codigoForm.handleSubmit(handleBuscarPorCodigo)} className="space-y-4">
                <FormField
                  control={codigoForm.control}
                  name="codigo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Identificação do Professor</FormLabel>
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
                  <p>O professor encontra essa informação no menu do seu avatar.</p>
                </div>
              </form>
            </Form>

            {searchError && <p className="text-sm text-destructive mt-4">{searchError}</p>}

            {professorEncontrado && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Professor encontrado:</h4>
                <ProfessorCardBusca professor={professorEncontrado} onAdd={handleSeguirProfessor} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Deixar de seguir?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deixar de seguir <strong>{professorParaExcluir?.nome_completo}</strong>?
              Você não terá novas rotinas de treino criadas por ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarDesvinculo} className={buttonVariants({ variant: "destructive" })}>
              Deixar de seguir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Professores;