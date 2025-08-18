import { Plus } from "lucide-react";

const AvaliacoesAluno = () => {
  const handleAddAvaliacao = () => {
    console.log("Adicionar nova avaliação");
  };

  return (
    <div className="space-y-6">
      {/* Mobile: Header compacto igual à página de Alunos */}
      <div className="flex items-center justify-between md:hidden">
        <div>
          <h1 className="text-2xl font-bold">Avaliações</h1>
          <p className="text-sm text-muted-foreground">
            Histórico de avaliações físicas e evolução
          </p>
        </div>
        {/* Botão só com ícone + igual ao de Alunos */}
        <button
          onClick={handleAddAvaliacao}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop: Header tradicional */}
      <div className="hidden md:flex md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Avaliações</h1>
          <p className="text-muted-foreground">
            Histórico de avaliações físicas e evolução
          </p>
        </div>
        <button
          onClick={handleAddAvaliacao}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova Avaliação
        </button>
      </div>

      {/* Conteúdo */}
      <div className="text-center py-8">
        <p className="text-muted-foreground">Funcionalidade de avaliações em desenvolvimento.</p>
      </div>
    </div>
  );
};

export default AvaliacoesAluno;