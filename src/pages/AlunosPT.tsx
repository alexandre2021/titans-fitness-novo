import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Users } from "lucide-react";
import { Plus } from "lucide-react";
import { useAlunos } from "@/hooks/useAlunos";
import { usePTProfile } from "@/hooks/usePTProfile";
import { AlunoCard } from "@/components/alunos/AlunoCard";
import { FiltrosAlunos } from "@/components/alunos/FiltrosAlunos";
import { useToast } from "@/hooks/use-toast";

const AlunosPT = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = usePTProfile();
  const { alunos, loading, filtros, setFiltros, excluirAluno, totalAlunos } = useAlunos();

  const handleConvidarAluno = () => {
    if (!profile) return;

    // Verificar limite do plano
    if (totalAlunos >= profile.limite_alunos) {
      toast({
        title: "Limite atingido",
        description: `Você atingiu o limite de ${profile.limite_alunos} alunos do seu plano atual. Faça upgrade para adicionar mais alunos.`,
        variant: "destructive",
      });
      return;
    }

    navigate("/convite-aluno");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Alunos</h1>
          <p className="text-muted-foreground">
            Gerencie seus alunos e acompanhe seu progresso
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Carregando...</p>
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
            <h1 className="text-3xl font-bold">Alunos</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie seus alunos
            </p>
          </div>
          {/* Botão compacto mobile */}
          <Button 
            onClick={handleConvidarAluno} 
            size="sm"
            className="flex items-center gap-1 px-3"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Convidar</span>
          </Button>
        </div>

        {/* Desktop: Header tradicional */}
        <div className="hidden md:flex md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Alunos</h1>
            <p className="text-muted-foreground">
              Gerencie seus alunos e acompanhe seu progresso
            </p>
          </div>
          <Button onClick={handleConvidarAluno} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Convidar Aluno
          </Button>
        </div>
      </div>

      {alunos.length === 0 && filtros.busca === '' && filtros.situacao === 'todos' && filtros.genero === 'todos' ? (
        // Estado vazio - nenhum aluno cadastrado
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum aluno cadastrado</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Comece convidando seu primeiro aluno para começar a criar treinos personalizados
            </p>
            <Button onClick={handleConvidarAluno} size="lg" className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Convidar Aluno
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filtros e busca */}
          <FiltrosAlunos filtros={filtros} onFiltrosChange={setFiltros} />

          {/* Estatísticas */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{alunos.length} aluno(s) encontrado(s)</span>
            {profile && (
              <span>•</span>
            )}
            {profile && (
              <span>{totalAlunos}/{profile.limite_alunos} alunos do plano</span>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {alunos.map((aluno) => (
                <AlunoCard 
                  key={aluno.id} 
                  aluno={aluno} 
                  onExcluir={excluirAluno}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AlunosPT;