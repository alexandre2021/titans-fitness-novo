// src/context/RotinaExerciciosContext.tsx

import React, { createContext, useContext, useMemo } from 'react';
import { useExerciciosStorage } from '@/hooks/rotina/useExerciciosStorage';
import {
  ExercicioRotinaLocal,
  SerieConfig,
  ConfiguracaoRotina,
  FiltrosExercicio,
  ExerciciosPorTreino,
  TreinoComExercicios,
  ExercicioInfo
} from '@/types/rotina.types';
import { useSeriesManager } from '@/hooks/rotina/useSeriesManager';
import { useExerciciosModal } from '@/hooks/rotina/useExerciciosModal';



interface DadosCompletos {
  nomeRotina: string;
  treinos: TreinoComExercicios[];
}

interface EstatisticasSeries {
  totalSeries: number;
  seriesComDropset: number;
  cargaMedia: number;
  tipo: 'simples' | 'combinada';
}

interface RotinaExerciciosContextValue {
  // Storage e dados
  exerciciosAdicionados: ExerciciosPorTreino;
  treinos: TreinoComExercicios[];
  config: ConfiguracaoRotina | null;
  isLoaded: boolean;
  dadosCompletos: {
    nomeRotina: string;
    treinos: (TreinoComExercicios | (Omit<TreinoComExercicios, 'ordem'> & { exercicios: ExercicioRotinaLocal[] }))[];
  };
  totalExercicios: number;
  treinosComExercicios: TreinoComExercicios[];
  treinosSemExercicios: TreinoComExercicios[];
  isFormValido: boolean;

  // Ações de exercícios
  adicionarExercicio: (treinoId: string, exercicio: ExercicioRotinaLocal) => void;
  removerExercicio: (treinoId: string, exercicioId: string) => void;
  atualizarExercicio: (treinoId: string, exercicioId: string, exercicio: ExercicioRotinaLocal) => void;
  limparExercicios: () => void;

  // Gerenciamento de séries
  adicionarSerie: (treinoId: string, exercicioId: string) => void;
  removerSerie: (treinoId: string, exercicioId: string, serieId: string) => void;
  atualizarSerie: (treinoId: string, exercicioId: string, serieId: string, campo: keyof SerieConfig, valor: number | string | boolean) => void;
  atualizarSerieCombinada: (treinoId: string, exercicioId: string, serieId: string, exercicioIndex: 0 | 1, campo: 'repeticoes' | 'carga', valor: number) => void;
  toggleDropSet: (treinoId: string, exercicioId: string, serieId: string) => void;
  atualizarDropSet: (treinoId: string, exercicioId: string, serieId: string, campo: 'repeticoes' | 'carga_reduzida', valor: number) => void;
  atualizarIntervaloExercicio: (treinoId: string, exercicioId: string, intervalo: number) => void;

  // Modal de exercícios
  isModalOpen: boolean;
  treinoSelecionado: string;
  gruposFiltro: string[];
  loading: boolean;
  exerciciosDisponiveis: ExercicioInfo[];
  exerciciosFiltrados: ExercicioInfo[];
  filtros: FiltrosExercicio;
  atualizarFiltro: (campo: keyof FiltrosExercicio, valor: string | string[] | boolean) => void;
  tipoSerie: 'simples' | 'combinada';
  setTipoSerie: (tipo: 'simples' | 'combinada') => void;
  exerciciosSelecionados: ExercicioInfo[];
  toggleExercicioSelecionado: (exercicio: ExercicioInfo) => void;
  limparSelecao: () => void;
  abrirModal: (treinoId: string, grupos: string[]) => void;
  fecharModal: () => void;
  criarExercicioSimples: (exercicio: ExercicioInfo) => ExercicioRotinaLocal;
  criarExercicioCombinado: (exercicios: ExercicioInfo[]) => ExercicioRotinaLocal;
  podeSelecionarExercicio: (exercicio: ExercicioInfo) => boolean;
  isSelecaoValida: () => boolean;

  // Helpers
  validarSerie: (serie: SerieConfig) => string[];
  obterEstatisticasSeries: (treinoId: string, exercicioId: string) => EstatisticasSeries | null;
}

// Criação do Context
const RotinaExerciciosContext = createContext<RotinaExerciciosContextValue | null>(null);

// Hook para usar o Context


// Provider Component
interface RotinaExerciciosProviderProps {
  children: React.ReactNode;
  alunoId: string;
}

export const RotinaExerciciosProvider: React.FC<RotinaExerciciosProviderProps> = ({ 
  children, 
  alunoId 
}) => {
  // Inicializar todos os hooks
  const storageHook = useExerciciosStorage(alunoId);
  const modalHook = useExerciciosModal();
  const seriesHook = useSeriesManager({
    exerciciosAdicionados: storageHook.exerciciosAdicionados,
    setExerciciosAdicionados: storageHook.setExerciciosAdicionados
  });

  // Ação integrada para adicionar exercício e fechar modal
  const adicionarExercicioCompleto = useMemo(() =>
    (treinoId: string, exercicio: ExercicioRotinaLocal) => {
      // Ajustar ordem do exercício
      const exerciciosExistentes = storageHook.exerciciosAdicionados[treinoId] || [];
      const exercicioComOrdem = {
        ...exercicio,
        ordem: exerciciosExistentes.length + 1
      };
      
      storageHook.adicionarExercicio(treinoId, exercicioComOrdem);
      modalHook.fecharModal();
    },
    [storageHook, modalHook]
  );

  // Valor do Context (memoizado para performance)
  const contextValue: RotinaExerciciosContextValue = useMemo(() => ({
    // Storage e dados
    exerciciosAdicionados: storageHook.exerciciosAdicionados,
    treinos: storageHook.treinos as TreinoComExercicios[],
    config: storageHook.config,
    isLoaded: storageHook.isLoaded,
    dadosCompletos: storageHook.dadosCompletos,
    totalExercicios: storageHook.totalExercicios,
    treinosComExercicios: storageHook.treinosComExercicios as TreinoComExercicios[],
    treinosSemExercicios: storageHook.treinosSemExercicios as TreinoComExercicios[],
    isFormValido: storageHook.isFormValido,

    // Ações de exercícios - usando versão integrada
    adicionarExercicio: adicionarExercicioCompleto,
    removerExercicio: storageHook.removerExercicio,
    atualizarExercicio: storageHook.atualizarExercicio,
    limparExercicios: storageHook.limparExercicios,

    // Gerenciamento de séries
    adicionarSerie: seriesHook.adicionarSerie,
    removerSerie: seriesHook.removerSerie,
    atualizarSerie: seriesHook.atualizarSerie,
    atualizarSerieCombinada: seriesHook.atualizarSerieCombinada,
    toggleDropSet: seriesHook.toggleDropSet,
    atualizarDropSet: seriesHook.atualizarDropSet,
    atualizarIntervaloExercicio: seriesHook.atualizarIntervaloExercicio,

    // Modal de exercícios
    isModalOpen: modalHook.isModalOpen,
    treinoSelecionado: modalHook.treinoSelecionado,
    gruposFiltro: modalHook.gruposFiltro,
    loading: modalHook.loading,
    exerciciosDisponiveis: modalHook.exerciciosDisponiveis,
    exerciciosFiltrados: modalHook.exerciciosFiltrados,
    filtros: modalHook.filtros,
    atualizarFiltro: modalHook.atualizarFiltro,
    tipoSerie: modalHook.tipoSerie,
    setTipoSerie: modalHook.setTipoSerie,
    exerciciosSelecionados: modalHook.exerciciosSelecionados,
    toggleExercicioSelecionado: modalHook.toggleExercicioSelecionado,
    limparSelecao: modalHook.limparSelecao,
    abrirModal: modalHook.abrirModal,
    fecharModal: modalHook.fecharModal,
    criarExercicioSimples: modalHook.criarExercicioSimples,
    criarExercicioCombinado: modalHook.criarExercicioCombinado,
    podeSelecionarExercicio: modalHook.podeSelecionarExercicio,
    isSelecaoValida: modalHook.isSelecaoValida,

    // Helpers
    validarSerie: seriesHook.validarSerie,
    obterEstatisticasSeries: seriesHook.obterEstatisticasSeries
  }), [
    storageHook,
    modalHook,
    seriesHook,
    adicionarExercicioCompleto
  ]);

  return (
    <RotinaExerciciosContext.Provider value={contextValue}>
      {children}
    </RotinaExerciciosContext.Provider>
  );
};




export type { RotinaExerciciosContextValue };
export { RotinaExerciciosContext };
// exportação já feita acima, não repetir