// src/constants/rotinas.ts

export const STATUS_ROTINA = ['Ativa', 'Rascunho', 'Bloqueada', 'Concluída', 'Cancelada'] as const;
export const OBJETIVOS = ['Hipertrofia', 'Emagrecimento', 'Definição muscular', 'Condicionamento físico', 'Reabilitação', 'Performance esportiva'] as const;
export const DIFICULDADES = ['Baixa', 'Média', 'Alta'] as const;
export const FREQUENCIAS = [1, 2, 3, 4, 5, 6, 7] as const;
export const GENEROS = ['Feminino', 'Masculino', 'Ambos'] as const;
export const GRUPOS_MUSCULARES = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'] as const;

export const CORES_GRUPOS_MUSCULARES: { [key: string]: string } = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800',
  'Pernas': 'bg-green-100 text-green-800',
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-violet-100 text-violet-800',
  'Panturrilha': 'bg-indigo-100 text-indigo-800'
};

export const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'PIX',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Transferência Bancária'
] as const;

// --- Opções para Componentes de Select ---

export const OBJETIVOS_OPTIONS = OBJETIVOS.map(o => ({ value: o, label: o }));

export const DIFICULDADES_OPTIONS = DIFICULDADES.map(d => ({ value: d, label: d }));

export const GENEROS_OPTIONS = GENEROS.map(g => ({ value: g, label: g }));

export const FREQUENCIAS_OPTIONS = FREQUENCIAS.map(f => ({ value: String(f), label: `${f}x / semana` }));

export const DURACAO_OPTIONS = Array.from({ length: 52 }, (_, i) => i + 1).map(semana => ({ value: String(semana), label: `${semana} semana${semana > 1 ? 's' : ''}` }));

// --- Opções para Filtros (com a opção "Todos") ---

export const FILTRO_OBJETIVOS_OPTIONS = [{ value: 'todos', label: 'Todos' }, ...OBJETIVOS_OPTIONS];

export const FILTRO_DIFICULDADES_OPTIONS = [{ value: 'todos', label: 'Todas' }, ...DIFICULDADES_OPTIONS];

export const FILTRO_FREQUENCIAS_OPTIONS = [{ value: 'todos', label: 'Todas' }, ...FREQUENCIAS_OPTIONS];

export const STORAGE_KEY_NOVO_MODELO = 'modelo_em_criacao';
export const STORAGE_KEY_ROTINA_CRIACAO = 'rotina_em_criacao';

// --- Constantes para validação ---

export const LIMITES = {
  NOME_MIN: 3,
  NOME_MAX: 100,
  DURACAO_MIN: 1,
  DURACAO_MAX: 52,
  TREINOS_MIN: 1,
  TREINOS_MAX: 7,
  VALOR_MIN: 0,
  EXERCICIOS_MIN_POR_TREINO: 1,
  SERIES_MIN_POR_EXERCICIO: 1,
  SERIES_MAX_POR_EXERCICIO: 10,
  REPETICOES_MIN: 1,
  REPETICOES_MAX: 100,
  CARGA_MIN: 0,
  CARGA_MAX: 999,
  INTERVALO_MIN: 0,
  INTERVALO_MAX: 600
} as const;