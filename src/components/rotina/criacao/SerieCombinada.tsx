import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Clock, Link } from "lucide-react";
import { ExercicioModelo, SerieModelo } from "@/pages/NovoModelo";
import { useExercicioLookup } from "@/hooks/useExercicioLookup";

interface Props {
  exercicio: ExercicioModelo;
  treinoId: string;
  isUltimoExercicio: boolean;
  onUpdate: (dados: Partial<ExercicioModelo>) => void;
}

export const SerieCombinada = ({ exercicio, treinoId, isUltimoExercicio, onUpdate }: Props) => {
  const { getExercicioInfo } = useExercicioLookup();
  
  // Lookup de nome e equipamento dos exercícios
  const exercicio1Info = getExercicioInfo(exercicio.exercicio_1_id);
  const exercicio2Info = getExercicioInfo(exercicio.exercicio_2_id || '');
  
  const isPesoCorporal1 = exercicio1Info.equipamento === 'Peso Corporal';
  const isPesoCorporal2 = exercicio2Info.equipamento === 'Peso Corporal';

  const handleUpdateSerie = (serieId: string, campo: keyof SerieModelo, valor: string | number | boolean | undefined) => {
    const novasSeries = exercicio.series.map(s =>
      s.id === serieId ? { ...s, [campo]: valor } : s
    );
    onUpdate({ series: novasSeries });
  };

  const handleAddSerie = () => {
    const novaSerie: SerieModelo = {
      id: `serie_comb_${Date.now()}`,
      numero_serie: exercicio.series.length + 1,
      repeticoes_1: undefined,
      carga_1: undefined,
      repeticoes_2: undefined,
      carga_2: undefined,
      intervalo_apos_serie: 90,
    };
    onUpdate({ series: [...exercicio.series, novaSerie] });
  };

  const handleRemoveSerie = (serieId: string) => {
    if (exercicio.series.length <= 1) return;
    const novasSeries = exercicio.series.filter(s => s.id !== serieId).map((s, i) => ({ ...s, numero_serie: i + 1 }));
    onUpdate({ series: novasSeries });
  };

  const handleIntervaloExercicio = (valor: number) => {
    onUpdate({ intervalo_apos_exercicio: valor });
  };

  // Retorna valor do input: vazio se não definido/0, ou o valor real
  const getValorRepeticoes1 = (serie: SerieModelo): string => {
    if (serie.repeticoes_1 === undefined || serie.repeticoes_1 === 0) return '';
    return serie.repeticoes_1.toString();
  };

  const getValorRepeticoes2 = (serie: SerieModelo): string => {
    if (serie.repeticoes_2 === undefined || serie.repeticoes_2 === 0) return '';
    return serie.repeticoes_2.toString();
  };

  const getValorCarga1 = (serie: SerieModelo): string => {
    if (isPesoCorporal1) return 'Peso Corporal';
    if (serie.carga_1 === undefined || serie.carga_1 === 0) return '';
    return serie.carga_1.toString();
  };

  const getValorCarga2 = (serie: SerieModelo): string => {
    if (isPesoCorporal2) return 'Peso Corporal';
    if (serie.carga_2 === undefined || serie.carga_2 === 0) return '';
    return serie.carga_2.toString();
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-gray-700">Séries:</Label>
      
      {exercicio.series.map((serie, index) => {
        const isUltimaSerie = index === exercicio.series.length - 1;
        
        return (
          <div key={serie.id} className="mb-4">
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
                        value={getValorRepeticoes1(serie)}
                        onChange={(e) => {
                          const valor = e.target.value === '' ? 0 : Number(e.target.value);
                          handleUpdateSerie(serie.id, 'repeticoes_1', valor);
                        }}
                        min="0"
                        max="100"
                        className="text-center h-9"
                        placeholder="0"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-600">Carga (kg)</Label>
                      <Input
                        type={isPesoCorporal1 ? "text" : "number"}
                        value={getValorCarga1(serie)}
                        onChange={(e) => {
                          const valor = e.target.value === '' ? 0 : Number(e.target.value);
                          handleUpdateSerie(serie.id, 'carga_1', valor);
                        }}
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
                          value={getValorRepeticoes2(serie)}
                          onChange={(e) => {
                            const valor = e.target.value === '' ? 0 : Number(e.target.value);
                            handleUpdateSerie(serie.id, 'repeticoes_2', valor);
                          }}
                          min="0"
                          max="100"
                          className="text-center h-9"
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-600">Carga (kg)</Label>
                        <Input
                          type={isPesoCorporal2 ? "text" : "number"}
                          value={getValorCarga2(serie)}
                          onChange={(e) => {
                            const valor = e.target.value === '' ? 0 : Number(e.target.value);
                            handleUpdateSerie(serie.id, 'carga_2', valor);
                          }}
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
              {exercicio.series.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveSerie(serie.id)}
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
                  value={serie.intervalo_apos_serie !== undefined ? serie.intervalo_apos_serie : 90}
                  onChange={(e) => handleUpdateSerie(serie.id, 'intervalo_apos_serie', parseInt(e.target.value) || 0)}
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
      })}

      {/* Botão adicionar série */}
      <Button 
        type="button" 
        variant="outline" 
        size="sm" 
        onClick={handleAddSerie} 
        className="w-full border-dashed"
      >
        <Plus className="h-4 w-4 mr-2" /> 
        Adicionar Série Combinada
      </Button>

      {/* Intervalo entre exercícios */}
      {!isUltimoExercicio && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-md border border-purple-200">
          <Clock className="h-4 w-4 text-purple-600" />
          <Label className="text-xs text-purple-700 flex-1 font-medium">
            Intervalo entre exercícios:
          </Label>
          <Input
            type="number"
            value={exercicio.intervalo_apos_exercicio !== undefined ? exercicio.intervalo_apos_exercicio.toString() : '120'}
            onChange={(e) => handleIntervaloExercicio(parseInt(e.target.value) || 0)}
            min="0"
            max="600"
            className="w-16 h-8 text-center text-xs bg-white border-purple-200"
            placeholder="120"
          />
          <span className="text-xs text-purple-700">s</span>
        </div>
      )}
    </div>
  );
};