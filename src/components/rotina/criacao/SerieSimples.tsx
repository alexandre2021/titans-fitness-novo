import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Clock, Flame } from "lucide-react";
import { ExercicioModelo, SerieModelo } from "@/pages/NovoModelo";
import { useExercicioLookup } from "@/hooks/useExercicioLookup";

interface Props {
  exercicio: ExercicioModelo;
  treinoId: string;
  isUltimoExercicio: boolean;
  onUpdate: (dados: Partial<ExercicioModelo>) => void;
}

export const SerieSimples = ({ exercicio, treinoId, isUltimoExercicio, onUpdate }: Props) => {
  const { getExercicioInfo } = useExercicioLookup();
  
  const exercicioInfo = getExercicioInfo(exercicio.exercicio_1_id);
  const isPesoCorporal = exercicioInfo.equipamento === 'Peso Corporal';

  const handleUpdateSerie = (serieId: string, campo: keyof SerieModelo, valor: string | number | boolean | undefined) => {
    const novasSeries = exercicio.series.map(s =>
      s.id === serieId ? { ...s, [campo]: valor } : s
    );
    onUpdate({ series: novasSeries });
  };

  const handleAddSerie = () => {
    const novaSerie: SerieModelo = {
      id: `serie_simples_${Date.now()}`,
      numero_serie: exercicio.series.length + 1,
      repeticoes: undefined,
      carga: undefined,
      intervalo_apos_serie: 60,
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
  const getValorRepeticoes = (serie: SerieModelo): string => {
    if (serie.repeticoes === undefined || serie.repeticoes === 0) return '';
    return serie.repeticoes.toString();
  };

  const getValorCarga = (serie: SerieModelo): string => {
    if (isPesoCorporal) return 'Peso Corporal';
    if (serie.carga === undefined || serie.carga === 0) return '';
    return serie.carga.toString();
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
              
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Rep</Label>
                  <Input
                    type="number"
                    value={getValorRepeticoes(serie)}
                    onChange={(e) => {
                      const valor = e.target.value === '' ? 0 : Number(e.target.value);
                      handleUpdateSerie(serie.id, 'repeticoes', valor);
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
                    type={isPesoCorporal ? "text" : "number"}
                    value={getValorCarga(serie)}
                    onChange={(e) => {
                      const valor = e.target.value === '' ? 0 : Number(e.target.value);
                      handleUpdateSerie(serie.id, 'carga', valor);
                    }}
                    disabled={isPesoCorporal}
                    min="0"
                    step="0.5"
                    className={`text-center h-9 ${isPesoCorporal ? 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium' : ''}`}
                    placeholder={isPesoCorporal ? '' : '0'}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Drop-set</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateSerie(serie.id, 'tem_dropset', !serie.tem_dropset)}
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
                      <div className="flex items-center justify-center"><Flame className="h-3.5 w-3.5 text-amber-600" /><Plus className="h-2.5 w-2.5 -ml-1 text-amber-700" /></div>
                    )}
                  </Button>
                </div>
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

            {/* Seção Drop Set */}
            {serie.tem_dropset && (
              <div className="mt-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 rounded-r-md shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full text-xs font-medium">
                    <Flame className="h-3 w-3" />
                    Drop-set
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
                        onChange={(e) => handleUpdateSerie(serie.id, 'carga_dropset', Number(e.target.value))}
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
                  value={serie.intervalo_apos_serie !== undefined ? serie.intervalo_apos_serie : 60}
                  onChange={(e) => handleUpdateSerie(serie.id, 'intervalo_apos_serie', parseInt(e.target.value) || 0)}
                  min="0"
                  max="600"
                  className="w-16 h-8 text-center text-xs bg-white border-blue-200"
                  placeholder="60"
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
        Adicionar Série
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
            value={exercicio.intervalo_apos_exercicio !== undefined ? exercicio.intervalo_apos_exercicio.toString() : '90'}
            onChange={(e) => handleIntervaloExercicio(parseInt(e.target.value) || 0)}
            min="0"
            max="600"
            className="w-16 h-8 text-center text-xs bg-white border-purple-200"
            placeholder="90"
          />
          <span className="text-xs text-purple-700">s</span>
        </div>
      )}
    </div>
  );
};