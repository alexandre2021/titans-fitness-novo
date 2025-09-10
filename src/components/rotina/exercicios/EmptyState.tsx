// src/components/rotina/exercicios/EmptyState.tsx

import React from 'react';
import { Plus, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  treinoNome: string;
  onAddExercicio: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  treinoNome,
  onAddExercicio
}) => {
  return (
    <div className="text-center py-8 px-4">
      <div className="flex justify-center mb-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
          <Dumbbell className="h-8 w-8 text-gray-400" />
        </div>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Nenhum exercício adicionado
      </h3>
      
      <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
        Adicione exercícios ao <strong>{treinoNome}</strong> para que seus alunos possam executar este treino.
      </p>
      
      <Button 
        onClick={onAddExercicio}
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar
      </Button>
    </div>
  );
};

export default EmptyState;