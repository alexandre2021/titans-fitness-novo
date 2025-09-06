// hooks/useExercicios.ts
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type Exercicio = Tables<"exercicios">;

interface FiltrosExercicios {
  grupoMuscular: string;
  equipamento: string;
  dificuldade: string;
}

export const useExercicios = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [exerciciosPadrao, setExerciciosPadrao] = useState<Exercicio[]>([]);
  const [exerciciosPersonalizados, setExerciciosPersonalizados] = useState<Exercicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPersonalizados, setTotalPersonalizados] = useState(0);
  
  const [filtros, setFiltros] = useState<FiltrosExercicios>({
    grupoMuscular: 'todos',
    equipamento: 'todos',
    dificuldade: 'todos'
  });

  // Buscar exercícios padrão
  const fetchExerciciosPadrao = useCallback(async () => {
    try {
      console.log('🔍 Iniciando busca de exercícios padrão...');
      
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .eq('is_ativo', true)
        .eq('tipo', 'padrao')
        .order('nome', { ascending: true });

      if (error) {
        console.error('❌ Erro na query de exercícios padrão:', error);
        throw error;
      }
      
      console.log('📊 Dados retornados:', data);
      console.log(`✅ ${data?.length || 0} exercícios padrão encontrados`);
      
      setExerciciosPadrao(data || []);
      
    } catch (error) {
      console.error('❌ Erro ao buscar exercícios padrão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os exercícios padrão.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Buscar exercícios personalizados do PT
  const fetchExerciciosPersonalizados = useCallback(async () => {
    if (!user) {
      console.log('⚠️ Usuário não encontrado, pulando busca de exercícios personalizados');
      return;
    }

    try {
      console.log('=== DEBUG EXERCÍCIOS PERSONALIZADOS ===');
      console.log('🔍 User ID:', user.id);
      console.log('📧 User Email:', user.email);
      
      // PRIMEIRO: Vamos buscar TODOS os exercícios personalizados (sem filtro de PT)
      const { data: todosPersonalizados, error: errorTodos } = await supabase
        .from('exercicios')
        .select('*')
        .eq('tipo', 'personalizado');

      console.log('🔬 TODOS os exercícios personalizados no banco:', todosPersonalizados);
      console.log('🔬 Total personalizados no sistema:', todosPersonalizados?.length || 0);
      
      if (todosPersonalizados && todosPersonalizados.length > 0) {
        console.log('🔬 Primeiro exercício personalizado:', todosPersonalizados[0]);
        console.log('🔬 PT IDs encontrados:', [...new Set(todosPersonalizados.map(ex => ex.pt_id))]);
      }

      // SEGUNDO: Buscar apenas os do PT atual
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .eq('is_ativo', true)
        .eq('tipo', 'personalizado')
        .eq('pt_id', user.id)
        .order('created_at', { ascending: false });

      console.log('🔍 Query executada com filtros:');
      console.log('   - is_ativo: true');
      console.log('   - tipo: personalizado');
      console.log('   - pt_id:', user.id);

      if (error) {
        console.error('❌ Erro na query de exercícios personalizados:', error);
        throw error;
      }
      
      console.log('📊 Exercícios personalizados DO PT:', data);
      console.log(`✅ ${data?.length || 0} exercícios personalizados carregados para este PT`);
      
      // TERCEIRO: Verificar se existe algum com pt_id diferente
      if (data?.length === 0 && todosPersonalizados && todosPersonalizados.length > 0) {
        console.log('⚠️ ATENÇÃO: Existem exercícios personalizados no banco, mas nenhum para este PT!');
        console.log('🔍 Verificando se algum tem pt_id similar...');
        
        todosPersonalizados.forEach((ex, index) => {
          console.log(`   ${index + 1}. ID: ${ex.id}, PT_ID: ${ex.pt_id}, Nome: ${ex.nome}, Ativo: ${ex.is_ativo}`);
        });
      }
      
      setExerciciosPersonalizados(data || []);
      setTotalPersonalizados(data?.length || 0);
      
    } catch (error) {
      console.error('❌ Erro ao buscar exercícios personalizados:', error);
      toast({
        title: "Erro", 
        description: "Não foi possível carregar os exercícios personalizados.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

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
        .eq('pt_id', user.id)
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
        .eq('pt_id', user.id);

      if (deleteError) throw deleteError;

      // Atualizar estado local
      setExerciciosPersonalizados(prev => prev.filter(ex => ex.id !== exercicioId));
      setTotalPersonalizados(prev => prev - 1);

      toast({
        title: "Sucesso",
        description: "Exercício excluído com sucesso!",
      });

      console.log(`✅ Exercício ${exercicioId} excluído com sucesso`);
      
    } catch (error) {
      console.error('❌ Erro ao excluir exercício:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o exercício. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [user, toast, deleteMediaFromCloudflare]);

  // Recarregar dados
  const refetch = useCallback(async () => {
    console.log('🔄 Recarregando dados...');
    setLoading(true);
    await Promise.all([
      fetchExerciciosPadrao(),
      fetchExerciciosPersonalizados()
    ]);
    setLoading(false);
  }, [fetchExerciciosPadrao, fetchExerciciosPersonalizados]);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      console.log('🚀 =========================');
      console.log('🚀 INICIANDO DEBUG DETALHADO');
      console.log('🚀 =========================');
      console.log('👤 User object completo:', user);
      console.log('👤 User ID:', user?.id);
      console.log('👤 User Email:', user?.email);
      
      setLoading(true);
      
      // Carregar dados
      await Promise.all([
        fetchExerciciosPadrao(),
        fetchExerciciosPersonalizados()
      ]);
      
      setLoading(false);
      console.log('✅ =========================');
      console.log('✅ DEBUG CONCLUÍDO');
      console.log('✅ =========================');
    };

    if (user) {
      loadData();
    } else {
      console.log('⚠️ Aguardando usuário ser carregado...');
    }
  }, [user, fetchExerciciosPadrao, fetchExerciciosPersonalizados]);

  return {
    exerciciosPadrao,
    exerciciosPersonalizados,
    loading,
    filtros,
    setFiltros,
    excluirExercicio,
    totalPersonalizados,
    refetch
  };
};