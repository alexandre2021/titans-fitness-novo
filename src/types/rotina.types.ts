// Filtros para busca de exercícios
export interface FiltrosExercicio {
  busca: string;
  tipo: string;
  equipamento: string;
  grupo_muscular?: string;
  dificuldade?: string;
}
// Tipos auxiliares globais para contexto/modal
export type ExerciciosPorTreino = {
  [treinoId: string]: ExercicioRotinaLocal[];
};
// src/types/rotina.types.ts

import { Tables } from '@/integrations/supabase/types';

// Tipos base do Supabase
export type Rotina = Tables<'rotinas'>;
export type Treino = Tables<'treinos'>;
export type ExercicioRotina = Tables<'exercicios_rotina'>;
export type Serie = Tables<'series'>;
export type Aluno = Tables<'alunos'>;
export type professor = Tables<'professores'>;
import {
  OBJETIVOS,
  DIFICULDADES,
  STATUS_ROTINA,
  FORMAS_PAGAMENTO,
  LIMITES
} from '@/constants/rotinas';

// Tipos derivados
export type Objetivo = typeof OBJETIVOS[number];
export type Dificuldade = typeof DIFICULDADES[number];
export type StatusRotina = typeof STATUS_ROTINA[number];
export type FormaPagamento = typeof FORMAS_PAGAMENTO[number];

// Interfaces para criação de rotina
export interface ConfiguracaoRotina {
  nome: string;
  objetivo: Objetivo;
  dificuldade: Dificuldade;
  duracao_semanas: number;
  treinos_por_semana: number;
  valor_total: number;
  forma_pagamento: FormaPagamento;
  data_inicio: string;
  observacoes_pagamento?: string;
  permite_execucao_aluno?: boolean;
  descricao?: string;
}

export interface TreinoTemp {
  id?: string;
  nome: string;
  grupos_musculares: string[];
  observacoes?: string;
  ordem: number;
  tempo_estimado_minutos?: number;
  exercicios?: ExercicioRotinaLocal[];
}

// Tipos movidos de useExerciciosStorage
export interface ExercicioRotinaLocal {
  id: string;
  exercicio_1_id: string;
  exercicio_2_id?: string;
  tipo: 'simples' | 'combinada';
  ordem: number;
  observacoes?: string;
  intervalo_apos_exercicio?: number;
  series: SerieConfig[];
}

export interface SerieConfig {
  id: string;
  numero_serie: number;
  repeticoes?: number;
  carga?: number;
  tem_dropset?: boolean;
  carga_dropset?: number;
  intervalo_apos_serie?: number;
  observacoes?: string;
  repeticoes_1?: number;
  carga_1?: number;
  repeticoes_2?: number;
  carga_2?: number;
}

export interface TreinoComExercicios extends TreinoTemp {
  exercicios: ExercicioRotinaLocal[];
}

export interface ExercicioTemp {
  id?: string;
  exercicio_1_id: string;
  exercicio_2_id?: string;
  ordem: number;
  observacoes?: string;
  intervalo_apos_exercicio?: number;
  series: SerieTemp[];
  tipo?: 'simples' | 'combinada';
}

export interface SerieTemp {
  numero_serie: number;
  repeticoes?: number;
  carga?: number;
  tem_dropset?: boolean;
  carga_dropset?: number;
  intervalo_apos_serie?: number;
  observacoes?: string;
  // Para séries combinadas
  repeticoes_1?: number;
  carga_1?: number;
  repeticoes_2?: number;
  carga_2?: number;
}

// Interface para dados temporários no storage
export interface RotinaStorage {
  alunoId: string;
  configuracao?: ConfiguracaoRotina;
  treinos?: TreinoTemp[];
  exercicios?: { [treinoId: string]: ExercicioTemp[] };
  etapaAtual: 'configuracao' | 'treinos' | 'exercicios' | 'revisao';
}

// Interface para validação
export interface ValidacaoEtapa {
  valida: boolean;
  erros: string[];
}

// Interface para revisão final
export interface RotinaCompleta {
  configuracao: ConfiguracaoRotina;
  treinos: TreinoTemp[];
  exerciciosPorTreino: { [treinoId: string]: ExercicioTemp[] };
  totalExercicios: number;
  totalSeries: number;
}

// Interface para contexto de exercícios (reutilizar do sistema existente)
export interface ExercicioInfo {
  id: string;
  nome: string;
  equipamento: string;
  grupo_muscular: string;
  dificuldade: string;
  descricao?: string;
  tipo?: string;
}

// Tipos para dropdown/seleção
export interface OptionType {
  value: string;
  label: string;
}

export default {};