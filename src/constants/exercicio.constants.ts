// src/constants/exercicio.constants.ts
export const SESSAO_STATUS = {
  NAO_INICIADA: 'em_aberto',     // ← CORRIGIDO para bater com o banco
  EM_ANDAMENTO: 'em_andamento',
  PAUSADA: 'pausada',
  CONCLUIDA: 'concluida',
  CANCELADA: 'cancelada'
} as const;

export const EXERCICIO_CONSTANTS = {
  INTERVALO_PADRAO_SERIE: 60, // segundos
  INTERVALO_PADRAO_EXERCICIO: 120, // segundos
  TEMPO_MAXIMO_SESSAO: 10800, // 3 horas em segundos
} as const;

export const MENSAGENS = {
  CARREGANDO: 'Carregando dados da sessão...',
  ERRO_CARREGAR_DADOS: 'Erro ao carregar dados da sessão',
  ERRO_PAUSAR_SESSAO: 'Erro ao pausar sessão',
  ERRO_FINALIZAR_SESSAO: 'Erro ao finalizar sessão',
  CONTINUAR_OU_NOVA: 'Você tem uma sessão em andamento. Deseja continuar de onde parou ou iniciar uma nova sessão?',
  SESSAO_FINALIZADA: 'Sessão finalizada com sucesso!',
  SESSAO_PAUSADA: 'Sessão pausada com sucesso!',
  PROGRESSO_SALVO: 'Progresso salvo automaticamente',
} as const;

export const CORES_STATUS_SESSAO = {
  [SESSAO_STATUS.NAO_INICIADA]: 'bg-blue-100 text-blue-800',
  [SESSAO_STATUS.EM_ANDAMENTO]: 'bg-green-100 text-green-800',
  [SESSAO_STATUS.PAUSADA]: 'bg-yellow-100 text-yellow-800',
  [SESSAO_STATUS.CONCLUIDA]: 'bg-gray-100 text-gray-800',
  [SESSAO_STATUS.CANCELADA]: 'bg-red-100 text-red-800',
} as const;