import { useProfessores } from '@/hooks/useProfessores';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Users, Search } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { ProfessorCard } from '@/components/professores/ProfessorCard';

const Professores = () => {
  const {
    professores,
    loading,
    filtroBusca,
    setFiltroBusca,
    totalProfessores,
  } = useProfessores();
  const isDesktop = useMediaQuery("(min-width: 768px)");

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
              Você ainda não está seguindo nenhum professor. Para começar, peça o código de convite do seu personal trainer.
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
                <ProfessorCard key={professor.id} professor={professor} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Professores;