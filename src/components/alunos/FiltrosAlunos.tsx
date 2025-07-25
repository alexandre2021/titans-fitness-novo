import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface FiltrosAlunosProps {
  filtros: {
    busca: string;
    situacao: string;
    genero: string;
  };
  onFiltrosChange: (filtros: any) => void;
}

export const FiltrosAlunos = ({ filtros, onFiltrosChange }: FiltrosAlunosProps) => {
  const handleBuscaChange = (value: string) => {
    onFiltrosChange({ ...filtros, busca: value });
  };

  const handleSituacaoChange = (value: string) => {
    onFiltrosChange({ ...filtros, situacao: value });
  };

  const handleGeneroChange = (value: string) => {
    onFiltrosChange({ ...filtros, genero: value });
  };

  const limparFiltros = () => {
    onFiltrosChange({
      busca: '',
      situacao: 'todos',
      genero: 'todos'
    });
  };

  const temFiltrosAtivos = filtros.situacao !== 'todos' || filtros.genero !== 'todos';

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      {/* Campo de busca */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={filtros.busca}
          onChange={(e) => handleBuscaChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {temFiltrosAtivos && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full w-2 h-2"></span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Situação</label>
                <Select value={filtros.situacao} onValueChange={handleSituacaoChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Gênero</label>
                <Select value={filtros.genero} onValueChange={handleGeneroChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                    <SelectItem value="nao_informar">Prefiro não informar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {temFiltrosAtivos && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={limparFiltros}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};