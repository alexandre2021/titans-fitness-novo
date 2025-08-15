// src/components/rotina/exercicios/SerieCombinada.tsx

import React from 'react';
import { Trash2, Clock, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useRotinaExerciciosContext } from '@/context/useRotinaExerciciosContext';
import { useExercicioLookup } from '@/hooks/useExercicioLookup';
import { ExercicioRotinaLocal, SerieConfig } from '@/types/rotina.types';

interface SerieCombinadaProps {
  serie: SerieConfig;
  exercicio: ExercicioRotinaLocal;
  treinoId: string;
  isUltimaSerie: boolean;
  isUltimoExercicio: boolean;
  onRemoverSerie?: () => void;
}

export const SerieCombinada: React.FC<SerieCombinadaProps> = ({
  serie,
  exercicio,
  treinoId,
  isUltimaSerie,
  isUltimoExercicio,
  onRemoverSerie
}) => {
  const {
    atualizarSerieCombinada,
    atualizarSerie
  } = useRotinaExerciciosContext();

  // Lookup de nome e equipamento dos exercícios
  const { getExercicioInfo } = useExercicioLookup();
  const exercicio1Info = getExercicioInfo(exercicio.exercicio_1_id);
  const exercicio2Info = getExercicioInfo(exercicio.exercicio_2_id || '');
  
  const isPesoCorporal1 = exercicio1Info.equipamento === 'Peso Corporal';
  const isPesoCorporal2 = exercicio2Info.equipamento === 'Peso Corporal';

  // Handlers para exercício 1
  const handleAtualizarExercicio1 = (campo: 'repeticoes' | 'carga', valor: string) => {
    if (isPesoCorporal1 && campo === 'carga') return;
    
    const valorNumerico = campo === 'repeticoes' 
      ? (valor === '' ? 12 : parseInt(valor) || 12)
      : (valor === '' ? 0 : parseFloat(valor) || 0);

    atualizarSerieCombinada(treinoId, exercicio.id, serie.id, 0, campo, valorNumerico);
  };

  // Handlers para exercício 2
  const handleAtualizarExercicio2 = (campo: 'repeticoes' | 'carga', valor: string) => {
    if (isPesoCorporal2 && campo === 'carga') return;
    
    const valorNumerico = campo === 'repeticoes' 
      ? (valor === '' ? 12 : parseInt(valor) || 12)
      : (valor === '' ? 0 : parseFloat(valor) || 0);

    atualizarSerieCombinada(treinoId, exercicio.id, serie.id, 1, campo, valorNumerico);
  };

  // Handler para intervalo
  const handleAtualizarIntervalo = (valor: string) => {
    const intervalo = valor === '' ? 0 : parseInt(valor) || 0;
    atualizarSerie(treinoId, exercicio.id, serie.id, 'intervalo_apos_serie', intervalo);
  };

  // Valores seguros para inputs
  const getValorSeguro = (valor: number | undefined, padrao: number): string => {
    return (valor !== undefined ? valor : padrao).toString();
  };

  const getValorCarga1 = (): string => {
    if (isPesoCorporal1) return 'Peso Corporal';
    return serie.carga_1 && serie.carga_1 > 0 ? serie.carga_1.toString() : '';
  };

  const getValorCarga2 = (): string => {
    if (isPesoCorporal2) return 'Peso Corporal';
    return serie.carga_2 && serie.carga_2 > 0 ? serie.carga_2.toString() : '';
  };

  return (
    <div className="mb-4">
      <div className="flex items-start gap-3">
        <div className="w-6 text-sm font-medium text-gray-600 mt-2">
          {serie.numero_serie}
        </div>
        
        <div className="flex-1 space-y-3">
          {/* Badge de série combinada */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-purple-100 text-purple-800">
              <Link className="h-3 w-3 mr-1" />
              Série Combinada
            </Badge>
          </div>

          {/* Primeiro exercício */}
          <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-purple-400">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">1.</span>
              <span className="text-sm font-medium text-gray-900">
                {exercicio1Info.nome || 'Carregando...'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Rep</Label>
                <Input
                  type="number"
                  value={getValorSeguro(serie.repeticoes_1, 12)}
                  onChange={(e) => handleAtualizarExercicio1('repeticoes', e.target.value)}
                  min="1"
                  max="100"
                  className="text-center h-9"
                  placeholder="12"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Carga (kg)</Label>
                <Input
                  type={isPesoCorporal1 ? "text" : "number"}
                  value={getValorCarga1()}
                  onChange={(e) => handleAtualizarExercicio1('carga', e.target.value)}
                  disabled={isPesoCorporal1}
                  min="0"
                  step="0.5"
                  className={`text-center h-9 ${isPesoCorporal1 ? 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium' : ''}`}
                  placeholder={isPesoCorporal1 ? '' : '0'}
                />
              </div>
            </div>
          </div>

          {/* Segundo exercício */}
          {exercicio.exercicio_2_id && (
            <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-purple-400">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">2.</span>
                <span className="text-sm font-medium text-gray-900">
                  {exercicio2Info.nome || 'Carregando...'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Rep</Label>
                  <Input
                    type="number"
                    value={getValorSeguro(serie.repeticoes_2, 12)}
                    onChange={(e) => handleAtualizarExercicio2('repeticoes', e.target.value)}
                    min="1"
                    max="100"
                    className="text-center h-9"
                    placeholder="12"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Carga (kg)</Label>
                  <Input
                    type={isPesoCorporal2 ? "text" : "number"}
                    value={getValorCarga2()}
                    onChange={(e) => handleAtualizarExercicio2('carga', e.target.value)}
                    disabled={isPesoCorporal2}
                    min="0"
                    step="0.5"
                    className={`text-center h-9 ${isPesoCorporal2 ? 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium' : ''}`}
                    placeholder={isPesoCorporal2 ? '' : '0'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botão remover série */}
        {onRemoverSerie && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemoverSerie}
            className="h-9 w-9 p-0 text-gray-400 hover:text-red-500 mt-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

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

export default SerieCombinada;