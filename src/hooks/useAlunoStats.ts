import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Configuração de pontos
const PONTOS_CONFIG = {
  TREINO_COMPLETO: 50,
  BONUS_STREAK: {
    3: 10,   // 3 dias seguidos
    7: 20,   // 7 dias seguidos
    14: 40,  // 14 dias seguidos
    30: 100, // 30 dias seguidos
  },
  NOVO_RECORDE: 30,
  TREINO_ACIMA_MEDIA: 15,
};

// Níveis e seus thresholds
const NIVEIS = {
  bronze: { min: 0, max: 499 },
  prata: { min: 500, max: 1499 },
  ouro: { min: 1500, max: Infinity },
};

export interface AlunoStats {
  id: string;
  aluno_id: string;
  current_streak: number;
  longest_streak: number;
  last_workout_date: string | null;
  best_month_workouts: number;
  best_month_date: string | null;
  longest_workout_minutes: number;
  total_workouts: number;
  total_minutes: number;
  total_points: number;
  current_level: "bronze" | "prata" | "ouro";
}

export interface TreinoConcluidoResult {
  pontosGanhos: number;
  bonusStreak: number;
  novoRecorde: "streak" | "duracao" | null;
  stats: AlunoStats;
}

const calcularNivel = (pontos: number): "bronze" | "prata" | "ouro" => {
  if (pontos >= NIVEIS.ouro.min) return "ouro";
  if (pontos >= NIVEIS.prata.min) return "prata";
  return "bronze";
};

const calcularBonusStreak = (streak: number): number => {
  // Retorna o maior bônus aplicável
  const thresholds = Object.keys(PONTOS_CONFIG.BONUS_STREAK)
    .map(Number)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    if (streak >= threshold) {
      return PONTOS_CONFIG.BONUS_STREAK[threshold as keyof typeof PONTOS_CONFIG.BONUS_STREAK];
    }
  }
  return 0;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isYesterday = (date1: Date, today: Date): boolean => {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date1, yesterday);
};

export const useAlunoStats = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca ou cria stats do aluno
  const getOrCreateStats = useCallback(async (alunoId: string): Promise<AlunoStats | null> => {
    try {
      // Tenta buscar stats existentes
      const { data: existingStats, error: fetchError } = await supabase
        .from("aluno_stats")
        .select("*")
        .eq("aluno_id", alunoId)
        .single();

      if (existingStats) {
        return existingStats as AlunoStats;
      }

      // Se não existe, cria um novo registro
      if (fetchError?.code === "PGRST116") {
        const { data: newStats, error: insertError } = await supabase
          .from("aluno_stats")
          .insert({ aluno_id: alunoId })
          .select()
          .single();

        if (insertError) {
          console.error("Erro ao criar stats:", insertError);
          return null;
        }

        return newStats as AlunoStats;
      }

      console.error("Erro ao buscar stats:", fetchError);
      return null;
    } catch (err) {
      console.error("Erro inesperado:", err);
      return null;
    }
  }, []);

  // Processa conclusão de treino e atualiza stats
  const processarTreinoConcluido = useCallback(
    async (alunoId: string, duracaoMinutos: number): Promise<TreinoConcluidoResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const stats = await getOrCreateStats(alunoId);
        if (!stats) {
          setError("Não foi possível carregar estatísticas");
          return null;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let novoStreak = stats.current_streak;
        let novoLongestStreak = stats.longest_streak;
        let novoRecorde: "streak" | "duracao" | null = null;

        // Calcula streak
        if (stats.last_workout_date) {
          const lastWorkout = new Date(stats.last_workout_date);
          lastWorkout.setHours(0, 0, 0, 0);

          if (isSameDay(lastWorkout, hoje)) {
            // Já treinou hoje, mantém streak
          } else if (isYesterday(lastWorkout, hoje)) {
            // Treinou ontem, incrementa streak
            novoStreak = stats.current_streak + 1;
          } else {
            // Mais de um dia sem treinar, reseta streak
            novoStreak = 1;
          }
        } else {
          // Primeiro treino
          novoStreak = 1;
        }

        // Verifica se bateu recorde de streak
        if (novoStreak > novoLongestStreak) {
          novoLongestStreak = novoStreak;
          novoRecorde = "streak";
        }

        // Verifica se bateu recorde de duração
        let novoLongestMinutes = stats.longest_workout_minutes;
        if (duracaoMinutos > stats.longest_workout_minutes) {
          novoLongestMinutes = duracaoMinutos;
          if (!novoRecorde) {
            novoRecorde = "duracao";
          }
        }

        // Calcula pontos
        let pontosGanhos = PONTOS_CONFIG.TREINO_COMPLETO;
        const bonusStreak = calcularBonusStreak(novoStreak);

        // Bônus por novo recorde
        if (novoRecorde) {
          pontosGanhos += PONTOS_CONFIG.NOVO_RECORDE;
        }

        const totalPontosGanhos = pontosGanhos + bonusStreak;
        const novoTotalPontos = stats.total_points + totalPontosGanhos;
        const novoNivel = calcularNivel(novoTotalPontos);

        // Atualiza contagem mensal
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
        let novoTreinosMes = 1;
        let novoBestMonth = stats.best_month_workouts;
        let novoBestMonthDate = stats.best_month_date;

        // Verifica se é o mesmo mês
        if (stats.best_month_date && stats.best_month_date.startsWith(mesAtual.substring(0, 7))) {
          // TODO: Implementar contagem mensal corretamente com query separada
        }

        // Atualiza no banco
        const { data: updatedStats, error: updateError } = await supabase
          .from("aluno_stats")
          .update({
            current_streak: novoStreak,
            longest_streak: novoLongestStreak,
            last_workout_date: hoje.toISOString().split("T")[0],
            longest_workout_minutes: novoLongestMinutes,
            total_workouts: stats.total_workouts + 1,
            total_minutes: stats.total_minutes + duracaoMinutos,
            total_points: novoTotalPontos,
            current_level: novoNivel,
          })
          .eq("aluno_id", alunoId)
          .select()
          .single();

        if (updateError) {
          console.error("Erro ao atualizar stats:", updateError);
          setError("Erro ao salvar estatísticas");
          return null;
        }

        return {
          pontosGanhos,
          bonusStreak,
          novoRecorde,
          stats: updatedStats as AlunoStats,
        };
      } catch (err) {
        console.error("Erro ao processar treino:", err);
        setError("Erro ao processar conclusão do treino");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [getOrCreateStats]
  );

  return {
    loading,
    error,
    getOrCreateStats,
    processarTreinoConcluido,
    PONTOS_CONFIG,
  };
};

export default useAlunoStats;
