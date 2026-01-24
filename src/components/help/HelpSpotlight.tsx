import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface HelpSpotlightProps {
  onDismiss?: () => void;
}

const HelpSpotlight = ({ onDismiss }: HelpSpotlightProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { user } = useAuth();

  // Encontrar o botão de ajuda e pegar sua posição
  const findButtonPosition = useCallback(() => {
    const button = document.querySelector('[aria-label="Abrir Central de Ajuda"]');
    if (button) {
      const rect = button.getBoundingClientRect();
      setButtonRect(rect);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkIfSeen = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('has_seen_help_spotlight')
          .eq('id', user.id)
          .single() as { data: { has_seen_help_spotlight?: boolean } | null; error: unknown };

        if (error) {
          console.error('Erro ao verificar spotlight:', error);
          return;
        }

        if (!data?.has_seen_help_spotlight) {
          setTimeout(() => {
            findButtonPosition();
            setIsVisible(true);
          }, 600);
        }
      } catch (err) {
        console.error('Erro ao verificar spotlight:', err);
      }
    };

    checkIfSeen();
  }, [user, findButtonPosition]);

  useEffect(() => {
    if (!isVisible) return;

    const handleResize = () => findButtonPosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, findButtonPosition]);

  const handleDismiss = async () => {
    setIsVisible(false);
    onDismiss?.();

    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ has_seen_help_spotlight: true } as Record<string, unknown>)
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao salvar estado do spotlight:', error);
      }
    } catch (err) {
      console.error('Erro ao salvar estado do spotlight:', err);
    }
  };

  if (!isVisible || !buttonRect) return null;

  // Posição do tooltip e da seta baseado na posição do botão
  const tooltipStyle = isDesktop
    ? {
        top: buttonRect.bottom + 20,
        right: window.innerWidth - buttonRect.right,
      }
    : {
        bottom: window.innerHeight - buttonRect.top + 20,
        left: buttonRect.left,
      };

  // Posição da seta (ponta da seta aponta para o centro do botão)
  const arrowStyle = isDesktop
    ? {
        top: buttonRect.bottom + 4,
        left: buttonRect.left + buttonRect.width / 2 - 8,
      }
    : {
        bottom: window.innerHeight - buttonRect.top + 4,
        left: buttonRect.left + buttonRect.width / 2 - 8,
      };

  return (
    <div className="fixed inset-0 z-[200]" onClick={handleDismiss}>
      {/* Overlay escuro semi-transparente */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Seta apontando para o botão */}
      <div
        className="absolute z-[201]"
        style={arrowStyle}
      >
        {isDesktop ? (
          // Seta apontando para cima (desktop)
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white" />
        ) : (
          // Seta apontando para baixo (mobile)
          <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white" />
        )}
      </div>

      {/* Card do tooltip */}
      <div
        className="absolute z-[201]"
        style={tooltipStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`bg-white rounded-lg shadow-xl p-4 ${
            isDesktop ? "max-w-[320px]" : "max-w-[280px]"
          }`}
        >
          <div className="flex justify-between items-start gap-2 mb-2">
            <h3 className="font-semibold text-gray-900 text-sm">
              Central de Ajuda
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-2 text-gray-500 hover:text-gray-700"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-gray-600 text-sm">
            Esclareça todas suas dúvidas sobre o aplicativo aqui!
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpSpotlight;
