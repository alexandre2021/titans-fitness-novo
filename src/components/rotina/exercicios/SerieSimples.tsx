// src/components/rotina/exercicios/SerieSimples.tsx

import React from 'react';
import { Trash2, Clock, Flame, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRotinaExerciciosContext } from '@/context/useRotinaExerciciosContext';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';
import { ExercicioRotinaLocal, SerieConfig } from '@/types/rotina.types';

interface SerieSimplesProps {
  serie: SerieConfig;
  exercicio: ExercicioRotinaLocal;
  treinoId: string;
  isUltimaSerie: boolean;
  isUltimoExercicio: boolean;
  onRemoverSerie?: () => void;
}

export const SerieSimples: React.FC<SerieSimplesProps> = ({
  serie,
  exercicio,
  treinoId,
  isUltimaSerie,
  isUltimoExercicio,
  onRemoverSerie
}) => {
  const {
    atualizarSerie,
    toggleDropSet,
    atualizarDropSet
  } = useRotinaExerciciosContext();

  // Lookup de equipamento para detectar peso corporal
  const { getExercicioInfo } = useExercicioLookup();
  const exercicioInfo = getExercicioInfo(exercicio.exercicio_1_id);
  const isPesoCorporal = exercicioInfo.equipamento === 'Peso Corporal';

  // Handlers
  const handleAtualizarRepeticoes = (valor: string) => {
    const repeticoes = valor === '' ? 12 : (parseInt(valor) || 12);
    atualizarSerie(treinoId, exercicio.id, serie.id, 'repeticoes', repeticoes);
  };

  const handleAtualizarCarga = (valor: string) => {
    if (isPesoCorporal) return;
    const carga = parseFloat(valor) || 0;
    atualizarSerie(treinoId, exercicio.id, serie.id, 'carga', carga);
  };

  const handleToggleDropSet = () => {
    toggleDropSet(treinoId, exercicio.id, serie.id);
  };

  const handleAtualizarDropSetCarga = (valor: string) => {
    const carga = parseFloat(valor) || 0;
    atualizarDropSet(treinoId, exercicio.id, serie.id, 'carga_reduzida', carga);
  };

  const handleAtualizarIntervalo = (valor: string) => {
    const intervalo = valor === '' ? 0 : parseInt(valor) || 0;
    atualizarSerie(treinoId, exercicio.id, serie.id, 'intervalo_apos_serie', intervalo);
  };

  // Valores seguros para inputs
  const getValorSeguro = (valor: number | undefined, padrao: number): string => {
    return (valor !== undefined ? valor : padrao).toString();
  };

  const getValorCarga = (): string => {
    if (isPesoCorporal) return 'Peso Corporal';
    return serie.carga && serie.carga > 0 ? serie.carga.toString() : '';
  };

  return (
    <div className="mb-3">
      {/* Linha principal da série */}
      <div className="flex items-center gap-3">
        <div className="w-6 text-sm font-medium text-gray-600">
          {serie.numero_serie}
        </div>
        
        <div className="flex-1 grid grid-cols-3 gap-3">
          {/* Repetições */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Rep</Label>
            <Input
              type="number"
              value={getValorSeguro(serie.repeticoes, 12)}
              onChange={(e) => handleAtualizarRepeticoes(e.target.value)}
              min="1"
              max="100"
              className="text-center h-9"
              placeholder="12"
            />
          </div>

          {/* Carga */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Carga (kg)</Label>
            <Input
              type={isPesoCorporal ? "text" : "number"}
              value={getValorCarga()}
              onChange={(e) => handleAtualizarCarga(e.target.value)}
              disabled={isPesoCorporal}
              min="0"
              step="0.5"
              className={`text-center h-9 ${isPesoCorporal ? 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium' : ''}`}
              placeholder={isPesoCorporal ? '' : '0'}
            />
          </div>

          {/* ✨ BOTÃO DROPSET MELHORADO - Design elegante com gradiente */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Drop</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleDropSet}
              className={`
                h-9 w-full transition-all duration-300 border-2
                ${serie.tem_dropset
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-orange-400 shadow-lg transform scale-105'
                  : 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-700 border-amber-200 hover:border-amber-300 hover:shadow-md hover:scale-105'
                }
              `}
            >
              {serie.tem_dropset ? (
                <Flame className="h-4 w-4 drop-shadow-sm" />
              ) : (
                <div className="flex items-center justify-center">
                  <Flame className="h-3.5 w-3.5 text-amber-600" />
                  <Plus className="h-2.5 w-2.5 -ml-1 text-amber-700" />
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Botão remover série */}
        {onRemoverSerie && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemoverSerie}
            className="h-9 w-9 p-0 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* ✨ DROP SET MELHORADO - Gradiente consistente */}
      {serie.tem_dropset && (
        <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 rounded-r-md shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-medium">
              <Flame className="h-3 w-3" />
              Drop Set
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-orange-700">Rep</Label>
              <div className="h-9 px-3 py-2 bg-orange-100 border border-orange-200 rounded-md text-sm text-orange-800 italic flex items-center">
                Até a falha
              </div>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs text-orange-700">Carga (kg)</Label>
              {isPesoCorporal ? (
                <div className="h-9 px-3 py-2 bg-orange-100 border border-orange-200 rounded-md text-sm text-orange-800 italic flex items-center">
                  Peso Corporal
                </div>
              ) : (
                <Input
                  type="number"
                  value={serie.carga_dropset && serie.carga_dropset > 0 ? serie.carga_dropset.toString() : ''}
                  onChange={(e) => handleAtualizarDropSetCarga(e.target.value)}
                  min="0"
                  step="0.5"
                  className="h-9 text-center bg-white border-orange-200 focus:border-orange-400"
                  placeholder="0"
                />
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Intervalo entre séries */}
      {!isUltimaSerie && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 rounded-md">
          <Clock className="h-4 w-4 text-blue-600" />
          <Label className="text-xs text-blue-700 flex-1 font-medium">
            Intervalo entre séries:
          </Label>
          <Input
            type="number"
            value={getValorSeguro(serie.intervalo_apos_serie, 90)}
            onChange={(e) => handleAtualizarIntervalo(e.target.value)}
            min="0"
            max="600"
            className="w-16 h-8 text-center text-xs bg-white border-blue-200"
            placeholder="90"
          />
          <span className="text-xs text-blue-700">s</span>
        </div>
      )}
    </div>
  );
};

export default SerieSimples;