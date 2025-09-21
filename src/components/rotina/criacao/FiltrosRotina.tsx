import { useState, useMemo } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import CustomSelect from '@/components/ui/CustomSelect';
import { Label } from '@/components/ui/label';

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

export const FiltrosRotina: React.FC<FiltrosProps> = ({ filtros, onFiltrosChange, objetivos, dificuldades, frequencias }) => {
  const [showFiltros, setShowFiltros] = useState(false);

  const objetivoOptions = useMemo(() => [
    { value: 'todos', label: 'Todos os Objetivos' },
    ...objetivos.map(o => ({ value: o, label: o }))
  ], [objetivos]);

  const frequenciaOptions = useMemo(() => [
    { value: 'todos', label: 'Qualquer Frequência' },
    ...frequencias.map(f => ({ value: String(f), label: `${f}x / semana` }))
  ], [frequencias]);

  const dificuldadeOptions = useMemo(() => [
    { value: 'todos', label: 'Todas as Dificuldades' },
    ...dificuldades.map(d => ({ value: d, label: d }))
  ], [dificuldades]);

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
              <Label className="text-sm font-medium mb-2 block">Objetivo</Label>
              <CustomSelect
                inputId="filtro-objetivo"
                value={objetivoOptions.find(opt => opt.value === filtros.objetivo)}
                onChange={(option) => onFiltrosChange({ ...filtros, objetivo: option ? String(option.value) : 'todos' })}
                options={objetivoOptions}
                placeholder="Filtrar por objetivo..."
              />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Frequência</Label>
              <CustomSelect
                inputId="filtro-frequencia"
                value={frequenciaOptions.find(opt => opt.value === filtros.frequencia)}
                onChange={(option) => onFiltrosChange({ ...filtros, frequencia: option ? String(option.value) : 'todos' })}
                options={frequenciaOptions}
                placeholder="Treinos por semana..."
              />
            </div>
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Dificuldade</Label>
              <CustomSelect
                inputId="filtro-dificuldade"
                value={dificuldadeOptions.find(opt => opt.value === filtros.dificuldade)}
                onChange={(option) => onFiltrosChange({ ...filtros, dificuldade: option ? String(option.value) : 'todos' })}
                options={dificuldadeOptions}
                placeholder="Filtrar por dificuldade..."
              />
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