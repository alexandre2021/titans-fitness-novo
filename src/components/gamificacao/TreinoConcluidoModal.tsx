import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trophy, Flame, Star, TrendingUp, X } from "lucide-react";
import confetti from "canvas-confetti";

interface TreinoConcluidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  treinoNome: string;
  duracaoMinutos: number;
  pontosGanhos: number;
  bonusStreak: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  currentLevel: "bronze" | "prata" | "ouro";
  novoRecorde?: "streak" | "duracao" | null;
}

const nivelConfig = {
  bronze: {
    label: "Bronze",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    borderColor: "border-amber-300",
    nextLevel: "Prata",
    pointsToNext: 500,
  },
  prata: {
    label: "Prata",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    borderColor: "border-gray-300",
    nextLevel: "Ouro",
    pointsToNext: 1500,
  },
  ouro: {
    label: "Ouro",
    color: "text-yellow-500",
    bgColor: "bg-yellow-100",
    borderColor: "border-yellow-300",
    nextLevel: null,
    pointsToNext: null,
  },
};

const TreinoConcluidoModal = ({
  isOpen,
  onClose,
  treinoNome,
  duracaoMinutos,
  pontosGanhos,
  bonusStreak,
  currentStreak,
  longestStreak,
  totalPoints,
  currentLevel,
  novoRecorde,
}: TreinoConcluidoModalProps) => {
  const [showContent, setShowContent] = useState(false);
  const nivel = nivelConfig[currentLevel];
  const totalPontosGanhos = pontosGanhos + bonusStreak;

  // Calcula progresso para próximo nível
  const getProgressToNextLevel = () => {
    if (currentLevel === "ouro") return 100;
    const thresholds = { bronze: 0, prata: 500, ouro: 1500 };
    const currentThreshold = thresholds[currentLevel];
    const nextThreshold = nivel.pointsToNext || 0;
    const progress = ((totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  useEffect(() => {
    if (isOpen) {
      setShowContent(true);
      // Dispara confetes
      const duration = 2000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#ff6b35", "#f7c548", "#3b82f6"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#ff6b35", "#f7c548", "#3b82f6"],
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300",
          showContent ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-card rounded-2xl shadow-2xl z-[101] transition-all duration-500 overflow-hidden",
          showContent ? "opacity-100 scale-100" : "opacity-0 scale-90"
        )}
      >
        {/* Header com gradiente */}
        <div className="bg-gradient-to-r from-primary to-orange-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-3">
              <Trophy className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold">Treino Concluído!</h2>
            <p className="text-white/80 mt-1">{treinoNome}</p>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-5">
          {/* Resumo do treino */}
          <div className="flex justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-foreground">{duracaoMinutos}</p>
              <p className="text-xs text-muted-foreground">minutos</p>
            </div>
            <div className="w-px bg-border" />
            <div>
              <div className="flex items-center justify-center gap-1">
                <Flame className="h-5 w-5 text-orange-500" />
                <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
              </div>
              <p className="text-xs text-muted-foreground">dias seguidos</p>
            </div>
          </div>

          {/* Pontos ganhos */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">Pontos ganhos</span>
              </div>
              <span className="text-xl font-bold text-green-600">+{totalPontosGanhos}</span>
            </div>

            <div className="mt-2 space-y-1 text-sm text-green-700">
              <div className="flex justify-between">
                <span>Treino completo</span>
                <span>+{pontosGanhos}</span>
              </div>
              {bonusStreak > 0 && (
                <div className="flex justify-between">
                  <span>Bônus streak ({currentStreak} dias)</span>
                  <span>+{bonusStreak}</span>
                </div>
              )}
            </div>
          </div>

          {/* Novo recorde */}
          {novoRecorde && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <p className="font-semibold text-yellow-800">Novo Recorde!</p>
                <p className="text-sm text-yellow-700">
                  {novoRecorde === "streak"
                    ? `Maior sequência: ${longestStreak} dias!`
                    : `Treino mais longo: ${duracaoMinutos} min!`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Progresso do nível */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className={cn("flex items-center gap-1.5 font-medium", nivel.color)}>
                <div className={cn("w-3 h-3 rounded-full", nivel.bgColor, nivel.borderColor, "border")} />
                Nível {nivel.label}
              </div>
              <span className="text-muted-foreground">{totalPoints} pts</span>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-orange-500 transition-all duration-1000"
                style={{ width: `${getProgressToNextLevel()}%` }}
              />
            </div>

            {nivel.nextLevel && (
              <p className="text-xs text-muted-foreground text-center">
                Faltam {(nivel.pointsToNext || 0) - totalPoints} pts para {nivel.nextLevel}
              </p>
            )}
          </div>

          {/* Botão fechar */}
          <Button onClick={onClose} className="w-full" size="lg">
            Continuar
          </Button>
        </div>
      </div>
    </>
  );
};

export default TreinoConcluidoModal;
