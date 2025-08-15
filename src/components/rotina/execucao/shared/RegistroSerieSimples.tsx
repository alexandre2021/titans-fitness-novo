// src/components/rotina/execucao/shared/RegistroSerieSimples.tsx
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface Props {
  numero: number;
  repeticoes?: number;
  carga?: number;
  temDropset?: boolean;
  cargaDropset?: number;
  initialReps?: number;
  initialCarga?: number;
  initialDropsetReps?: number;
  initialDropsetCarga?: number;
  initialObs?: string;
  executada?: boolean;
  isPesoCorporal?: boolean;
  onSave: (reps: number, carga: number, dropsetReps?: number, dropsetCarga?: number, obs?: string) => void;
}

export const RegistroSerieSimples = ({ 
  numero, 
  repeticoes = 0, 
  carga = 0,
  temDropset = false,
  cargaDropset = 0,
  initialReps = 0, 
  initialCarga = 0,
  initialDropsetReps = 0,
  initialDropsetCarga = 0,
  initialObs = '',
  executada = false,
  isPesoCorporal = false,
  onSave 
}: Props) => {
  const [inputReps, setInputReps] = useState(initialReps > 0 ? initialReps.toString() : '');
  const [inputCarga, setInputCarga] = useState(initialCarga > 0 ? initialCarga.toString() : '');
  const [inputDropsetCarga, setInputDropsetCarga] = useState(initialDropsetCarga > 0 ? initialDropsetCarga.toString() : '');
  const [obs, setObs] = useState(initialObs);

  const handleFinalizarSerie = () => {
    const reps = parseInt(inputReps) || 0;
    const peso = isPesoCorporal ? 0 : (parseInt(inputCarga) || 0);
    const dropsetReps = temDropset ? 0 : undefined; // Sempre 0 para dropset
    const dropsetPeso = temDropset ? (parseInt(inputDropsetCarga) || 0) : undefined;
    
    onSave(reps, peso, dropsetReps, dropsetPeso, obs);
  };

  return (
    <Card className={`transition-all duration-200 ${
      executada 
        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' 
        : 'border-border hover:border-primary/50'
    }`}>
      <CardContent className="p-4">
        {/* Header da Série */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h4 className="font-semibold text-foreground">Série {numero}</h4>
            {executada && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                <CheckCircle className="h-3 w-3 mr-1" />
                Finalizada
              </Badge>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-primary">
              Meta: {repeticoes}{isPesoCorporal ? 'x PC' : ` x ${carga}kg`}
            </p>
            {temDropset && (
              <p className="text-xs text-primary font-medium">• DROPSET</p>
            )}
          </div>
        </div>

        {/* Inputs principais */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Repetições executadas
            </label>
            <Input
              type="number"
              value={inputReps}
              onChange={(e) => setInputReps(e.target.value)}
              placeholder="0"
              disabled={executada}
              className="text-center"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              Carga executada (kg)
            </label>
            <Input
              type={isPesoCorporal ? 'text' : 'number'}
              value={isPesoCorporal ? 'Peso Corporal' : inputCarga}
              onChange={isPesoCorporal ? undefined : (e) => setInputCarga(e.target.value)}
              placeholder={isPesoCorporal ? '' : '0'}
              disabled={executada || isPesoCorporal}
              className={`text-center ${
                isPesoCorporal 
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200' 
                  : ''
              }`}
            />
          </div>
        </div>

        {/* Seção Dropset */}
        {temDropset && (
          <div className="border-t pt-4 mb-4">
            <div className="mb-3">
              <h5 className="font-medium text-foreground text-sm">Dropset</h5>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Repetições
                </label>
                <Input
                  type="text"
                  value="até a falha"
                  disabled
                  className={`text-center font-medium italic ${
                    isPesoCorporal 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200'
                      : 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200'
                  }`}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  {isPesoCorporal ? 'Carga (kg)' : 'Carga dropset (kg)'}
                </label>
                <Input
                  type={isPesoCorporal ? 'text' : 'number'}
                  value={isPesoCorporal ? 'Peso Corporal' : inputDropsetCarga}
                  onChange={isPesoCorporal ? undefined : (e) => setInputDropsetCarga(e.target.value)}
                  placeholder={isPesoCorporal ? '' : '0'}
                  disabled={executada || isPesoCorporal}
                  className={`text-center ${
                    isPesoCorporal 
                      ? 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200'
                      : 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800'
                  }`}
                />
              </div>
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Observações
          </label>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observações sobre a série..."
            disabled={executada}
            className="min-h-[60px] resize-none"
          />
        </div>

        {/* Botão Finalizar */}
        {!executada ? (
          <Button 
            onClick={handleFinalizarSerie}
            className="w-full"
            size="lg"
          >
            Finalizar Série
          </Button>
        ) : (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-center py-3 rounded-lg font-medium">
            Série Finalizada
          </div>
        )}
      </CardContent>
    </Card>
  );
};