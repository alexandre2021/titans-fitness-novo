// hooks/useExercicios.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Exercicio = Tables<"exercicios">;

export const useExercicios = () => {
  const { user } = useAuth();
  
  const [exerciciosPadrao, setExerciciosPadrao] = useState<Exercicio[]>([]);
  const [exerciciosPersonalizados, setExerciciosPersonalizados] = useState<Exercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [totalPersonalizados, setTotalPersonalizados] = useState(0);

  const fetchExercicios = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Padrão
      const { data: padrao, error: padraoError } = await supabase
        .from('exercicios')
        .select('*')
        .eq('is_ativo', true)
        .eq('tipo', 'padrao')
        .order('nome', { ascending: true });

      if (padraoError) throw padraoError;
      setExerciciosPadrao(padrao || []);

      // Fetch Personalizados
      if (user) {
        const { data: personalizados, error: personalizadosError } = await supabase
          .from('exercicios')
          .select('*')
          .eq('is_ativo', true)
          .eq('tipo', 'personalizado')
          .eq('professor_id', user.id) // CORREÇÃO: Usando professor_id
          .order('created_at', { ascending: false });

        if (personalizadosError) throw personalizadosError;
        setExerciciosPersonalizados(personalizados || []);
        setTotalPersonalizados(personalizados?.length || 0);
      }
    } catch (error) {
      console.error("Erro ao buscar exercícios:", error);
      toast.error("Erro ao buscar exercício", {
        description: "Não foi possível carregar os exercícios personalizados."
      });
    } finally {
      setLoading(false);
      setInitialLoadComplete(true);
    }
  }, [user]);

  // Função auxiliar para deletar mídia do Cloudflare
  const deleteMediaFromCloudflare = useCallback(async (fileUrl: string) => {
    try {
      console.log('☁️ URL original da mídia para deleção:', fileUrl);
      const filename = fileUrl.split('?')[0].split('/').pop();
      if (!filename) {
        console.warn('⚠️ Não foi possível extrair o nome do arquivo da URL:', fileUrl);
        return;
      }

      console.log('☁️ Nome do arquivo extraído para deleção:', filename);

      // Buscar token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('⚠️ Sessão não encontrada, não é possível deletar mídia do Cloudflare.');
        return;
      }

      // Chamar edge function de deleção
      const { data, error } = await supabase.functions.invoke('delete-media', {
        body: {
          filename,
          bucket_type: 'exercicios'
        }
      });

      if (error) throw error;
      
      console.log(`✅ Mídia ${filename} deletada do Cloudflare`);
      
    } catch (error) {
      console.warn('⚠️ Erro ao deletar mídia do Cloudflare:', error);
      // Não falha o processo principal se a mídia não for deletada
    }
  }, []);

  // Excluir exercício personalizado
  const excluirExercicio = useCallback(async (exercicioId: string) => {
    if (!user) return;

    try {
      console.log('🗑️ Iniciando exclusão do exercício:', exercicioId);
      
      // Buscar o exercício para pegar as URLs das mídias
      const { data: exercicio, error: fetchError } = await supabase
        .from('exercicios')
        .select('*')
        .eq('id', exercicioId)
        .eq('professor_id', user.id)
        .single();

      if (fetchError) throw fetchError;
      if (!exercicio) throw new Error('Exercício não encontrado');

      console.log('🔍 Exercício encontrado para exclusão:', exercicio);

      // Deletar mídias do Cloudflare se existirem
      const deletePromises = [];
      
      if (exercicio.imagem_1_url) {
        console.log('🖼️ Deletando imagem 1:', exercicio.imagem_1_url);
        deletePromises.push(deleteMediaFromCloudflare(exercicio.imagem_1_url));
      }
      
      if (exercicio.imagem_2_url) {
        console.log('🖼️ Deletando imagem 2:', exercicio.imagem_2_url);
        deletePromises.push(deleteMediaFromCloudflare(exercicio.imagem_2_url));
      }
      
      if (exercicio.video_url) {
        console.log('🎥 Deletando vídeo:', exercicio.video_url);
        deletePromises.push(deleteMediaFromCloudflare(exercicio.video_url));
      }

      // Executar deleções de mídia em paralelo
      await Promise.all(deletePromises);

      // Deletar exercício do banco
      const { error: deleteError } = await supabase
        .from('exercicios')
        .delete()
        .eq('id', exercicioId)
        .eq('professor_id', user.id);

      if (deleteError) throw deleteError;

      // Atualizar estado local
      setExerciciosPersonalizados(prev => prev.filter(ex => ex.id !== exercicioId));
      setTotalPersonalizados(prev => prev - 1);

      console.log(`✅ Exercício ${exercicioId} excluído com sucesso`);
      
    } catch (error) {
      console.error('❌ Erro ao excluir exercício:', error);
      toast.error("Erro ao excluir", {
        description: "Não foi possível excluir o exercício. Tente novamente.",
      })
    }
  }, [user, deleteMediaFromCloudflare]);

  // Recarregar dados
  const refetch = useCallback(async () => {
    fetchExercicios();
  }, [fetchExercicios]);

  // Carregar dados iniciais
  useEffect(() => {
    fetchExercicios();
  }, [user, fetchExercicios]);

  return {
    exerciciosPadrao,
    exerciciosPersonalizados,
    loading,
    initialLoadComplete,
    excluirExercicio,
    totalPersonalizados,
    refetch
  };
};