import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import NovoModelo from "./NovoModelo";

const CopiaModelo = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTab = searchParams.get('returnTab') || 'personalizado';
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [modeloOriginal, setModeloOriginal] = useState<any>(null);

  useEffect(() => {
    const fetchSeriesDoExercicio = async (exercicioId: string): Promise<any[]> => {
      const { data: series, error } = await supabase
        .from('modelos_serie')
        .select('*')
        .eq('modelo_exercicio_id', exercicioId)
        .order('numero_serie');

      if (error) throw error;
      return (series as any[]) || [];
    };

    const fetchExerciciosDoTreino = async (treinoId: string): Promise<any[]> => {
      const { data: exercicios, error } = await supabase
        .from('modelos_exercicio')
        .select('*')
        .eq('modelo_treino_id', treinoId)
        .order('ordem');

      if (error) throw error;

      const exerciciosComSeries: any[] = [];
      for (const exercicio of (exercicios as any[]) || []) {
        const series = await fetchSeriesDoExercicio(exercicio.id);
        exerciciosComSeries.push({
          ...exercicio,
          series
        });
      }

      return exerciciosComSeries;
    };

    const fetchModelo = async () => {
      if (!id || !user) {
        navigate(`/meus-modelos?tab=${returnTab}`);
        return;
      }

      try {
        // Buscar modelo original
        const { data: modelo, error: modeloError } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('id', id)
          .single();

        if (modeloError || !modelo) {
          throw new Error('Modelo não encontrado.');
        }

        // Buscar treinos do modelo
        const { data: treinos, error: treinosError } = await supabase
          .from('modelos_treino')
          .select('*')
          .eq('modelo_rotina_id', id)
          .order('ordem');

        if (treinosError) throw treinosError;

        // Buscar exercícios e séries de cada treino
        const treinosComExercicios: any[] = [];
        for (const treino of (treinos as any[]) || []) {
          const exercicios = await fetchExerciciosDoTreino(treino.id);
          treinosComExercicios.push({
            id: treino.id,
            nome: treino.nome,
            grupos_musculares: treino.grupos_musculares || [],
            observacoes: treino.observacoes,
            ordem: treino.ordem,
            exercicios
          });
        }

        setModeloOriginal({
          ...modelo,
          treinos: treinosComExercicios
        });

      } catch (error) {
        console.error('Erro ao carregar modelo:', error);
        toast.error("Erro ao carregar modelo", {
          description: "Não foi possível carregar o modelo para cópia."
        });
        navigate(`/meus-modelos?tab=${returnTab}`);
      } finally {
        setLoading(false);
      }
    };

    fetchModelo();
  }, [id, user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Carregando modelo...</p>
        </div>
      </div>
    );
  }

  if (!modeloOriginal) {
    return null;
  }

  // Passar dados do modelo original como initialData para NovoModelo
  return (
    <NovoModelo
      isCopia={true}
      modeloOriginal={modeloOriginal}
      returnTab={returnTab}
    />
  );
};

export default CopiaModelo;
