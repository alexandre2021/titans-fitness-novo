import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Bug, Lightbulb, Star, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FeedbackTipo = 'erro' | 'melhoria' | 'elogio';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tipoConfig = {
  erro: {
    icon: Bug,
    label: "Reportar erro",
    description: "Algo não funcionou como esperado",
    color: "text-red-600",
    bgColor: "bg-red-50 border-red-200 hover:bg-red-100",
    bgColorSelected: "bg-red-100 border-red-400 ring-2 ring-red-400",
  },
  melhoria: {
    icon: Lightbulb,
    label: "Sugerir melhoria",
    description: "Tenho uma ideia para o app",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    bgColorSelected: "bg-amber-100 border-amber-400 ring-2 ring-amber-400",
  },
  elogio: {
    icon: Star,
    label: "Fazer elogio",
    description: "Quero elogiar algo que gostei",
    color: "text-green-600",
    bgColor: "bg-green-50 border-green-200 hover:bg-green-100",
    bgColorSelected: "bg-green-100 border-green-400 ring-2 ring-green-400",
  },
};

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const { user } = useAuth();
  const location = useLocation();
  const [tipo, setTipo] = useState<FeedbackTipo | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!tipo || !mensagem.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedbacks').insert({
        user_id: user.id,
        tipo,
        mensagem: mensagem.trim(),
        pagina_origem: location.pathname,
      });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      toast.error("Erro ao enviar feedback. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTipo(null);
    setMensagem("");
    setIsSuccess(false);
    onClose();
  };

  const transformClasses = isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none';

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-lg shadow-2xl z-[101] transition-all duration-300",
          transformClasses
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Enviar Feedback</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Obrigado pelo feedback!</h3>
              <p className="text-muted-foreground">
                Sua mensagem foi enviada com sucesso.
              </p>
            </div>
          ) : (
            <>
              {/* Tipo de feedback */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de feedback</label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(tipoConfig) as FeedbackTipo[]).map((key) => {
                    const config = tipoConfig[key];
                    const Icon = config.icon;
                    const isSelected = tipo === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTipo(key)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                          isSelected ? config.bgColorSelected : config.bgColor
                        )}
                      >
                        <Icon className={cn("h-5 w-5", config.color)} />
                        <div>
                          <p className="font-medium">{config.label}</p>
                          <p className="text-xs text-muted-foreground">{config.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Mensagem */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sua mensagem</label>
                <Textarea
                  placeholder="Descreva seu feedback aqui..."
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Botão de enviar */}
              <Button
                onClick={handleSubmit}
                disabled={!tipo || !mensagem.trim() || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Feedback"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default FeedbackModal;
