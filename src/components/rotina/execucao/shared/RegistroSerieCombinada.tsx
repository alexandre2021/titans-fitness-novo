// src/components/rotina/execucao/shared/RegistroSerieCombinada.tsx
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, BarChart3, Info } from 'lucide-react';

interface Props {
  numero: number;
  exercicio1Nome: string;
  exercicio2Nome: string;
  repeticoes1?: number;
  carga1?: number;
  repeticoes2?: number;
  carga2?: number;
  initialReps1?: number;
  initialCarga1?: number;
  initialReps2?: number;
  initialCarga2?: number;
  initialObs?: string;
  executada?: boolean;
  isPesoCorporal1?: boolean;
  isPesoCorporal2?: boolean;
  onSave: (reps1: number, carga1: number, reps2: number, carga2: number, obs: string) => void;
  onShowHistorico1?: () => void;
  onShowDetalhes1?: () => void;
  onShowHistorico2?: () => void;
  onShowDetalhes2?: () => void;
}

export const RegistroSerieCombinada = ({ 
  numero, 
  exercicio1Nome, 
  exercicio2Nome,
  repeticoes1 = 0, 
  carga1 = 0,
  repeticoes2 = 0,
  carga2 = 0,
  initialReps1 = 0, 
  initialCarga1 = 0,
  initialReps2 = 0,
  initialCarga2 = 0,
  initialObs = '',
  executada = false,
  isPesoCorporal1 = false,
  isPesoCorporal2 = false,
  onSave,
  onShowHistorico1,
  onShowDetalhes1,
  onShowHistorico2,
  onShowDetalhes2,
}: Props) => {
  const [inputReps1, setInputReps1] = useState('');
  const [inputPeso1, setInputPeso1] = useState('');
  const [inputReps2, setInputReps2] = useState('');
  const [inputPeso2, setInputPeso2] = useState('');
  const [obs, setObs] = useState(initialObs);

  const handleFinalizarSerie = () => {
    const reps1 = parseInt(inputReps1) || 0;
    const peso1 = isPesoCorporal1 ? 0 : (parseInt(inputPeso1) || 0);
    const reps2 = parseInt(inputReps2) || 0;
    const peso2 = isPesoCorporal2 ? 0 : (parseInt(inputPeso2) || 0);
    
    onSave(reps1, peso1, reps2, peso2, obs);
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
            <Badge variant="outline" className="text-xs">
              COMBINADA
            </Badge>
            {executada && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                <CheckCircle className="h-3 w-3 mr-1" />
                Finalizada
              </Badge>
            )}
          </div>
        </div>

        {/* Exercício 1 */}
        <div className="mb-6 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-secondary">{exercicio1Nome}</h5>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={onShowHistorico1}
                className="h-8 w-8 p-0"
              >
                <BarChart3 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onShowDetalhes1}
                className="h-8 w-8 p-0"
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-primary font-medium mb-3">
            Meta: {repeticoes1}{isPesoCorporal1 ? 'x PC' : ` x ${carga1}kg`}
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Repetições
              </label>
              <Input
                type="number"
                value={inputReps1}
                onChange={(e) => setInputReps1(e.target.value)}
                placeholder="0"
                disabled={executada}
                className="text-center h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Carga (kg)
              </label>
              <Input
                type={isPesoCorporal1 ? 'text' : 'number'}
                value={isPesoCorporal1 ? 'Peso Corporal' : inputPeso1}
                onChange={isPesoCorporal1 ? undefined : (e) => setInputPeso1(e.target.value)}
                placeholder={isPesoCorporal1 ? '' : '0'}
                disabled={executada || isPesoCorporal1}
                className={`text-center h-9 ${
                  isPesoCorporal1 
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200' 
                    : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex-1 border-t border-border"></div>
          <span className="px-3 text-xs text-muted-foreground font-medium">+</span>
          <div className="flex-1 border-t border-border"></div>
        </div>

        {/* Exercício 2 */}
        <div className="mb-6 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-secondary">{exercicio2Nome}</h5>
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={onShowHistorico2}
                className="h-8 w-8 p-0"
              >
                <BarChart3 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onShowDetalhes2}
                className="h-8 w-8 p-0"
              >
                <Info className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <p className="text-sm text-primary font-medium mb-3">
            Meta: {repeticoes2}{isPesoCorporal2 ? 'x PC' : ` x ${carga2}kg`}
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Repetições
              </label>
              <Input
                type="number"
                value={inputReps2}
                onChange={(e) => setInputReps2(e.target.value)}
                placeholder="0"
                disabled={executada}
                className="text-center h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Carga (kg)
              </label>
              <Input
                type={isPesoCorporal2 ? 'text' : 'number'}
                value={isPesoCorporal2 ? 'Peso Corporal' : inputPeso2}
                onChange={isPesoCorporal2 ? undefined : (e) => setInputPeso2(e.target.value)}
                placeholder={isPesoCorporal2 ? '' : '0'}
                disabled={executada || isPesoCorporal2}
                className={`text-center h-9 ${
                  isPesoCorporal2 
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-800 font-medium dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200' 
                    : ''
                }`}
              />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="mb-4">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            Observações
          </label>
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observações sobre a série combinada..."
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
            Finalizar Série Combinada
          </Button>
        ) : (
          <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-center py-3 rounded-lg font-medium">
            Série Combinada Finalizada
          </div>
        )}
      </CardContent>
    </Card>
  );
};