// src/components/rotina/exercicios/RequisitoCard.tsx

import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useRotinaExerciciosContext } from '@/context/useRotinaExerciciosContext';

export const RequisitoCard: React.FC = () => {
  const {
    treinos,
    treinosComExercicios,
    treinosSemExercicios,
    totalExercicios,
    isFormValido
  } = useRotinaExerciciosContext();

  const totalTreinos = treinos.length;
  const progresso = totalTreinos > 0 ? (treinosComExercicios.length / totalTreinos) * 100 : 0;

  return (
    <Card className={`border-2 ${isFormValido ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isFormValido ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Info className="h-5 w-5 text-blue-600" />
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h3 className={`font-medium ${isFormValido ? 'text-green-900' : 'text-blue-900'}`}>
                {isFormValido ? 'Requisitos atendidos!' : 'Requisitos para avançar'}
              </h3>
              <p className={`text-sm ${isFormValido ? 'text-green-700' : 'text-blue-700'}`}>
                {isFormValido 
                  ? 'Todos os treinos possuem pelo menos 1 exercício. Você pode prosseguir para a revisão.'
                  : 'Adicione pelo menos 1 exercício em cada treino para continuar.'
                }
              </p>
            </div>

            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className={isFormValido ? 'text-green-700' : 'text-blue-700'}>
                  Progresso dos treinos
                </span>
                <span className={`font-medium ${isFormValido ? 'text-green-800' : 'text-blue-800'}`}>
                  {treinosComExercicios.length}/{totalTreinos}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    isFormValido ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className={`text-xs ${isFormValido ? 'text-green-600' : 'text-blue-600'}`}>
                  Total de exercícios:
                </span>
                <p className={`font-medium ${isFormValido ? 'text-green-900' : 'text-blue-900'}`}>
                  {totalExercicios}
                </p>
              </div>
              
              <div>
                <span className={`text-xs ${isFormValido ? 'text-green-600' : 'text-blue-600'}`}>
                  Treinos configurados:
                </span>
                <p className={`font-medium ${isFormValido ? 'text-green-900' : 'text-blue-900'}`}>
                  {treinosComExercicios.length}
                </p>
              </div>
            </div>

            {/* Lista de treinos pendentes */}
            {treinosSemExercicios.length > 0 && (
              <div className="pt-2 border-t border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700">
                    Treinos pendentes:
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {treinosSemExercicios.map((treino, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded text-xs bg-amber-100 text-amber-800 border border-amber-200"
                    >
                      {treino.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RequisitoCard;