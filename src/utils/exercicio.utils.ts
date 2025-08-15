// src/utils/exercicio.utils.ts
import { ExecucaoSerieInsert, ExercicioData, SerieData, SessaoData } from '@/types/exercicio.types';

export const exercicioUtils = {
  /**
   * Limpa caracteres especiais de IDs
   */
  limparId: (id: string): string => {
    return id.replace(/[^a-zA-Z0-9-]/g, '');
  },

  /**
   * Formata tempo em segundos para MM:SS
   */
  formatarTempo: (segundos: number): string => {
    const mins = Math.floor(segundos / 60);
    const secs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  /**
   * Verifica se uma série é combinada
   */
  ehSerieCombinada: (serie: SerieData): boolean => {
    return serie.repeticoes_2 !== null && serie.repeticoes_2 !== undefined;
  },

  /**
   * Verifica se é a última série do exercício
   */
  ehUltimaSerie: (serie: SerieData, todasSeries: SerieData[]): boolean => {
    const numerosSeries = todasSeries.map(s => s.numero_serie).sort((a, b) => a - b);
    const maiorNumeroSerie = Math.max(...numerosSeries);
    return serie.numero_serie === maiorNumeroSerie;
  },

  /**
   * Verifica se é o último exercício
   */
  ehUltimoExercicio: (exercicioIndex: number, totalExercicios: number): boolean => {
    return exercicioIndex === totalExercicios - 1;
  },

  /**
   * Conta total de séries executadas
   */
  contarSeriesExecutadas: (exercicios: ExercicioData[]): number => {
    return exercicios.reduce((total, exercicio) => {
      return total + exercicio.series.filter(serie => serie.executada).length;
    }, 0);
  },

  /**
   * Prepara dados para inserção na tabela execucoes_series
   */
  prepararDadosExecucaoSeries: (
    exercicios: ExercicioData[],
    sessaoExecucaoId: string
  ): ExecucaoSerieInsert[] => {
    const execucoesSeries: ExecucaoSerieInsert[] = [];

    exercicios.forEach((exercicio) => {
      exercicio.series.forEach((serie) => {
        if (serie.executada) {
          const dadosSerie: ExecucaoSerieInsert = {
            execucao_sessao_id: sessaoExecucaoId,
            exercicio_rotina_id: exercicio.id,
            serie_numero: serie.numero_serie,
            repeticoes_executadas_1: serie.repeticoes_executadas || null,
            carga_executada_1: serie.carga_executada || null,
            repeticoes_executadas_2: exercicioUtils.ehSerieCombinada(serie) ? (serie.repeticoes_executadas_2 || null) : null,
            carga_executada_2: exercicioUtils.ehSerieCombinada(serie) ? (serie.carga_executada_2 || null) : null,
            carga_dropset: serie.carga_dropset_executada || null,
            observacoes: serie.observacoes || null
          };

          execucoesSeries.push(dadosSerie);
        }
      });
    });

    return execucoesSeries;
  },

  /**
   * Gera dados para inserção na tabela execucoes_sessao
   */
  prepararDadosSessao: (
    sessaoData: SessaoData,
    tempoSessao: number
  ) => ({
    rotina_id: sessaoData.rotina_id,
    treino_id: sessaoData.treino_id,
    aluno_id: sessaoData.aluno_id,
    sessao_numero: 1,
    data_execucao: new Date().toISOString().split('T')[0],
    status: 'concluida',
    tempo_total_minutos: Math.floor(tempoSessao / 60),
    observacoes: null
  })
};

export default exercicioUtils;