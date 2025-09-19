import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CustomSelect from '@/components/ui/CustomSelect';

interface FiltrosAlunosState {
  busca: string;
  situacao: string;
  genero: string;
}

interface FiltrosAlunosProps {
  filtros: FiltrosAlunosState;
  onFiltrosChange: (filtros: FiltrosAlunosState) => void;
}

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

export const FiltrosAlunos: React.FC<FiltrosAlunosProps> = ({ filtros, onFiltrosChange }) => {
  const [showFiltros, setShowFiltros] = useState(false);

  const limparFiltros = () => {
    onFiltrosChange({ busca: '', situacao: 'todos', genero: 'todos' });
  };

  const temFiltrosAtivos = filtros.situacao !== 'todos' || filtros.genero !== 'todos' || filtros.busca !== '';

  return (
    <div className="w-full">
      {/* Mobile: Busca + Filtros na mesma linha */}
      <div className="flex gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={filtros.busca}
            onChange={e => onFiltrosChange({ ...filtros, busca: e.target.value })}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFiltros((v) => !v)}
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
            placeholder="Buscar por nome ou email..."
            value={filtros.busca}
            onChange={e => onFiltrosChange({ ...filtros, busca: e.target.value })}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFiltros((v) => !v)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Filtros avançados: só aparecem se showFiltros for true */}
      {showFiltros && (
        <div className="mt-4 p-4 border rounded-lg bg-background">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Situação */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Situação</label>
              <CustomSelect
                inputId="filtro-situacao"
                value={SITUACAO_OPTIONS.find(opt => opt.value === filtros.situacao)}
                onChange={(option) => onFiltrosChange({ ...filtros, situacao: option ? String(option.value) : 'todos' })}
                options={SITUACAO_OPTIONS}
              />
            </div>

            {/* Gênero */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Gênero</label>
              <CustomSelect
                inputId="filtro-genero"
                value={GENERO_OPTIONS.find(opt => opt.value === filtros.genero)}
                onChange={(option) => onFiltrosChange({ ...filtros, genero: option ? String(option.value) : 'todos' })}
                options={GENERO_OPTIONS}
              />
            </div>

            {/* Limpar */}
            {temFiltrosAtivos && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={limparFiltros}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};