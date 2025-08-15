import { useContext } from 'react';
import { RotinaExerciciosContext } from './RotinaExerciciosContext';
import type { RotinaExerciciosContextValue } from './RotinaExerciciosContext';

export function useRotinaExerciciosContext(): RotinaExerciciosContextValue {
  const context = useContext(RotinaExerciciosContext);
  if (!context) {
    throw new Error('useRotinaExerciciosContext deve ser usado dentro de RotinaExerciciosProvider');
  }
  return context;
}
