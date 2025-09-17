// components/exercicios/FiltrosExercicios.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@/components/ui/select";
import { X, ChevronUp, ChevronDown } from "lucide-react";

interface FiltrosExerciciosState {
  grupoMuscular: string;
  equipamento: string;
  dificuldade: string;
}

interface FiltrosExerciciosProps {
  filtros: FiltrosExerciciosState;
  onFiltrosChange: (filtros: FiltrosExerciciosState) => void;
}

export const FiltrosExercicios: React.FC<FiltrosExerciciosProps> = ({ 
  filtros, 
  onFiltrosChange
}) => {
  console.log('🎛️ FiltrosExercicios renderizado com:', filtros);

  // Grupos musculares reais da tabela
  const gruposMusculares = [
  { value: 'todos', label: 'Todos os grupos' },
  { value: 'Peito', label: 'Peito' },
  { value: 'Costas', label: 'Costas' },
  { value: 'Ombros', label: 'Ombros' },
  { value: 'Bíceps', label: 'Bíceps' },
  { value: 'Tríceps', label: 'Tríceps' },
  { value: 'Abdômen', label: 'Abdômen' },
  { value: 'Pernas', label: 'Pernas' },
  { value: 'Glúteos', label: 'Glúteos' },
  { value: 'Panturrilha', label: 'Panturrilha' }
  ];

  // Equipamentos reais da tabela
  const equipamentos = [
    { value: 'todos', label: 'Todos os equipamentos' },
    { value: 'Barra', label: 'Barra' },
    { value: 'Halteres', label: 'Halteres' },
    { value: 'Máquina', label: 'Máquina' },
    { value: 'Peso Corporal', label: 'Peso Corporal' },
    { value: 'Cabo', label: 'Cabo' },
    { value: 'Kettlebell', label: 'Kettlebell' },
    { value: 'Fitas de Suspensão', label: 'Fitas de Suspensão' },
    { value: 'Elásticos', label: 'Elásticos' },
    { value: 'Bola Suíça', label: 'Bola Suíça' },
    { value: 'Bolas Medicinais', label: 'Bolas Medicinais' },
    { value: 'Landmine', label: 'Landmine' },
    { value: 'Bola Bosu', label: 'Bola Bosu' }
  ];

  // Dificuldades reais da tabela
  const dificuldades = [
    { value: 'todos', label: 'Todas as dificuldades' },
    { value: 'Baixa', label: 'Baixa' },
    { value: 'Média', label: 'Média' },
    { value: 'Alta', label: 'Alta' }
  ];

  const clearFilters = () => {
    onFiltrosChange({
      grupoMuscular: 'todos',
      equipamento: 'todos',
      dificuldade: 'todos'
    });
  };

  const hasActiveFilters = filtros.grupoMuscular !== 'todos' || 
                          filtros.equipamento !== 'todos' || 
                          filtros.dificuldade !== 'todos';

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Grupo Muscular</label>
            <Select
              value={filtros.grupoMuscular}
              onValueChange={(value) => {
                console.log('🔄 Mudando grupo muscular de', filtros.grupoMuscular, 'para', value);
                onFiltrosChange({ ...filtros, grupoMuscular: value });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[70] max-h-[200px]" position="popper" sideOffset={4}>
                <SelectScrollUpButton className="flex items-center justify-center h-6 bg-white border-b">
                  <ChevronUp className="h-4 w-4" />
                </SelectScrollUpButton>
                {gruposMusculares.map((grupo) => (
                  <SelectItem key={grupo.value} value={grupo.value}>
                    {grupo.label}
                  </SelectItem>
                ))}
                <SelectScrollDownButton className="flex items-center justify-center h-6 bg-white border-t">
                  <ChevronDown className="h-4 w-4" />
                </SelectScrollDownButton>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Equipamento</label>
            <Select
              value={filtros.equipamento}
              onValueChange={(value) => onFiltrosChange({ ...filtros, equipamento: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[70] max-h-[200px]" position="popper" sideOffset={4}>
                <SelectScrollUpButton className="flex items-center justify-center h-6 bg-white border-b">
                  <ChevronUp className="h-4 w-4" />
                </SelectScrollUpButton>
                {equipamentos.map((equipamento) => (
                  <SelectItem key={equipamento.value} value={equipamento.value}>
                    {equipamento.label}
                  </SelectItem>
                ))}
                <SelectScrollDownButton className="flex items-center justify-center h-6 bg-white border-t">
                  <ChevronDown className="h-4 w-4" />
                </SelectScrollDownButton>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Dificuldade</label>
            <Select
              value={filtros.dificuldade}
              onValueChange={(value) => onFiltrosChange({ ...filtros, dificuldade: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[70] max-h-[200px]" position="popper" sideOffset={4}>
                <SelectScrollUpButton className="flex items-center justify-center h-6 bg-white border-b">
                  <ChevronUp className="h-4 w-4" />
                </SelectScrollUpButton>
                {dificuldades.map((dificuldade) => (
                  <SelectItem key={dificuldade.value} value={dificuldade.value}>
                    {dificuldade.label}
                  </SelectItem>
                ))}
                <SelectScrollDownButton className="flex items-center justify-center h-6 bg-white border-t">
                  <ChevronDown className="h-4 w-4" />
                </SelectScrollDownButton>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Limpar
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};