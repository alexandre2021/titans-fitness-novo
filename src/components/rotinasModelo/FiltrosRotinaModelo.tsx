import { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FiltrosState {
  busca: string;
  objetivo: string;
  dificuldade: string;
  frequencia: string;
}

interface FiltrosProps {
  filtros: FiltrosState;
  onFiltrosChange: (filtros: FiltrosState) => void;
  objetivos: string[];
  dificuldades: string[];
  frequencias: number[];
}

export const FiltrosRotinaModelo: React.FC<FiltrosProps> = ({ filtros, onFiltrosChange, objetivos, dificuldades, frequencias }) => {
  const [showFiltros, setShowFiltros] = useState(false);

  const limparFiltros = () => {
    onFiltrosChange({ busca: '', objetivo: 'todos', dificuldade: 'todos', frequencia: 'todos' });
  };

  const temFiltrosAtivos = filtros.objetivo !== 'todos' || filtros.dificuldade !== 'todos' || filtros.frequencia !== 'todos' || filtros.busca !== '';

  return (
    <div className="w-full space-y-4">
      {/* Mobile */}
      <div className="flex gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome..."
            value={filtros.busca}
            onChange={e => onFiltrosChange({ ...filtros, busca: e.target.value })}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFiltros(v => !v)}
          className="flex items-center gap-1 px-3 flex-shrink-0"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden xs:inline">Filtros</span>
        </Button>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome..."
            value={filtros.busca}
            onChange={e => onFiltrosChange({ ...filtros, busca: e.target.value })}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFiltros(v => !v)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      {/* Filtros avançados */}
      {showFiltros && (
        <div className="p-4 border rounded-lg bg-background">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Objetivo</label>
              <Select value={filtros.objetivo} onValueChange={value => onFiltrosChange({ ...filtros, objetivo: value })}>
                <SelectTrigger><SelectValue placeholder="Filtrar por objetivo..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Objetivos</SelectItem>
                  {objetivos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Frequência</label>
              <Select value={filtros.frequencia} onValueChange={value => onFiltrosChange({ ...filtros, frequencia: value })}>
                <SelectTrigger><SelectValue placeholder="Treinos por semana..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Qualquer Frequência</SelectItem>
                  {frequencias.map(f => <SelectItem key={f} value={String(f)}>{f}x / semana</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Dificuldade</label>
              <Select value={filtros.dificuldade} onValueChange={value => onFiltrosChange({ ...filtros, dificuldade: value })}>
                <SelectTrigger><SelectValue placeholder="Filtrar por dificuldade..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Dificuldades</SelectItem>
                  {dificuldades.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {temFiltrosAtivos && (
              <div className="flex-shrink-0">
                <Button variant="outline" size="sm" onClick={limparFiltros} className="flex items-center gap-2">
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