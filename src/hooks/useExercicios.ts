// hooks/useExercicios.ts
import { useState, useEffect } from "react";
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
  const fetchExerciciosPadrao = async () => {
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
  };

  // Buscar exercícios personalizados do PT
  const fetchExerciciosPersonalizados = async () => {
    if (!user) {
      console.log('⚠️ Usuário não encontrado, pulando busca de exercícios personalizados');
      return;
    }

    try {
      console.log('🔍 Iniciando busca de exercícios personalizados para o PT:', user.id);
      
      const { data, error } = await supabase
        .from('exercicios')
        .select('*')
        .eq('is_ativo', true)
        .eq('tipo', 'personalizado')
        .eq('pt_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro na query de exercícios personalizados:', error);
        throw error;
      }
      
      console.log('📊 Exercícios personalizados encontrados:', data);
      console.log(`✅ ${data?.length || 0} exercícios personalizados carregados`);
      
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
  };

  // Buscar todos os exercícios (para debug)
  const debugAllExercicios = async () => {
    try {
      const { data, error } = await supabase
        .from('exercicios')
        .select('*');

      if (error) throw error;
      
      console.log('🔬 DEBUG - Todos os exercícios no banco:', data);
      console.log('🔬 DEBUG - Total de registros:', data?.length);
      
      if (data && data.length > 0) {
        const padrao = data.filter(ex => ex.tipo === 'padrao');
        const personalizado = data.filter(ex => ex.tipo === 'personalizado');
        const ativos = data.filter(ex => ex.is_ativo === true);
        
        console.log('🔬 DEBUG - Exercícios padrão:', padrao.length);
        console.log('🔬 DEBUG - Exercícios personalizados:', personalizado.length);
        console.log('🔬 DEBUG - Exercícios ativos:', ativos.length);
        console.log('🔬 DEBUG - Primeiro exercício:', data[0]);
      }
      
    } catch (error) {
      console.error('❌ Erro no debug:', error);
    }
  };

  // Excluir exercício personalizado
  const excluirExercicio = async (exercicioId: string) => {
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
  };

  // Função auxiliar para deletar mídia do Cloudflare
  const deleteMediaFromCloudflare = async (fileUrl: string) => {
    try {
      // Extrair nome do arquivo da URL
      const filename = fileUrl.split('?')[0].split('/').pop();
      if (!filename) return;

      console.log('☁️ Deletando arquivo do Cloudflare:', filename);

      // Buscar token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Chamar edge function de deleção
      const { data, error } = await supabase.functions.invoke('delete-image', {
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
  };

  // Recarregar dados
  const refetch = async () => {
    console.log('🔄 Recarregando dados...');
    setLoading(true);
    await Promise.all([
      fetchExerciciosPadrao(),
      fetchExerciciosPersonalizados()
    ]);
    setLoading(false);
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      console.log('🚀 Iniciando carregamento de dados do useExercicios');
      console.log('👤 Usuário atual:', user?.id);
      
      setLoading(true);
      
      // Executar debug primeiro
      await debugAllExercicios();
      
      // Carregar dados
      await Promise.all([
        fetchExerciciosPadrao(),
        fetchExerciciosPersonalizados()
      ]);
      
      setLoading(false);
      console.log('✅ Carregamento concluído');
    };

    loadData();
  }, [user]);

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