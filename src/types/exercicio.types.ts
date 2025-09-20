// src/types/exercicio.types.ts

// ✅ INTERFACES PRINCIPAIS PARA EXECUÇÃO
export interface SessaoData {
  id: string;
  rotina_id: string;
  treino_id: string;
  aluno_id: string;
  status: string;
  data_execucao: string;
  tempo_total_minutos?: number;
  tempo_decorrido?: number | null;
  rotinas?: {
    nome: string;
    permite_execucao_aluno: boolean;
  };
  treinos?: {
    nome: string;
  };
  alunos?: {
    nome_completo: string;
  };
}

export interface UserProfile {
  user_type: 'personal_trainer' | 'aluno';
  id: string;
  nome_completo: string;
}

export interface SerieData {
  id: string;
  numero_serie: number;
  repeticoes?: number;
  carga?: number;
  repeticoes_1?: number;
  carga_1?: number;
  repeticoes_2?: number;
  carga_2?: number;
  tem_dropset?: boolean;
  carga_dropset?: number;
  intervalo_apos_serie?: number;
  // Campos de execução
  repeticoes_executadas_1?: number;
  carga_executada_1?: number;
  // Para séries combinadas (execução do segundo exercício)
  repeticoes_executadas_2?: number;
  carga_executada_2?: number;
  carga_dropset_executada?: number;
  observacoes?: string;
  executada?: boolean;
}

export interface ExercicioData {
  id: string;
  exercicio_1_id: string;
  exercicio_2_id?: string;
  ordem: number;
  intervalo_apos_exercicio?: number;
  equipamento_1?: string;
  equipamento_2?: string;
  series: SerieData[];
}

// ✅ INTERFACES PARA CRONÔMETROS
export interface CronometroSerieData {
  intervalo: number;
}

export interface CronometroExercicioData {
  intervalo: number;
  exercicioAtual: string;
  proximoExercicio: { nome1: string; nome2?: string | null };
}

// ✅ INTERFACE PARA INSERÇÃO NO SUPABASE
export interface ExecucaoSerieInsert {
  execucao_sessao_id: string;
  exercicio_rotina_id: string;
  serie_numero: number;
  repeticoes_executadas_1?: number | null;
  carga_executada_1?: number | null;
  repeticoes_executadas_2?: number | null;
  carga_executada_2?: number | null;
  carga_dropset?: number | null;
  observacoes?: string | null;
}

// ✅ TIPOS PARA SELEÇÃO DE TREINO
export interface Rotina {
  id: string;
  nome: string;
  descricao?: string;
  aluno_id: string;
  status: string;
}

export interface Treino {
  id: string;
  nome: string;
  grupos_musculares: string;
  ordem: number;
  sessoes_disponiveis: number;
  sessoes_concluidas: number;
  tem_em_andamento: boolean;
  tem_pausada?: boolean;
  sessao_em_andamento_id?: string;
}

export interface UltimaSessao {
  treino_nome: string;
  data_execucao: string;
  dias_desde_execucao: number;
  sessao_numero: number;
  status: string;
  modo_execucao?: 'pt' | 'aluno' | null;
}

export interface AlunoData {
  nome_completo: string;
  email: string;
}

export interface SessaoEmAndamento {
  id: string;
  treino_id: string;
  treino_nome: string;
  data_execucao: string;
  sessao_numero: number;
  status?: string;
}