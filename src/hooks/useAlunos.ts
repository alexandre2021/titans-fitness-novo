import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type AlunoComStatus = Tables<'alunos'>;

export const useAlunos = (fetchTrigger: number = 0) => {
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<AlunoComStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busca: '',
    situacao: 'todos',
    genero: 'todos',
  });

  const fetchAlunos = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('alunos_professores')
        .select(`
          alunos (
            *
          )
        `)
        .eq('professor_id', user.id);

      if (error) {
        throw error;
      }

      const alunosData = data
        .map(item => item.alunos)
        .filter((aluno): aluno is Tables<'alunos'> => aluno !== null)
        .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

      setAlunos(alunosData);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      toast.error('Erro ao buscar alunos', {
        description: 'Não foi possível carregar a lista de alunos.',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAlunos();
  }, [fetchAlunos, fetchTrigger]);

  const desvincularAluno = async (alunoId: string) => {
    if (!user?.id) return false;

    try {
      const { error: deleteError } = await supabase
        .from('alunos_professores')
        .delete()
        .eq('aluno_id', alunoId)
        .eq('professor_id', user.id);

      if (deleteError) throw deleteError;

      const { error: groupError } = await supabase.rpc('remove_aluno_from_all_groups', {
        p_professor_id: user.id,
        p_aluno_id: alunoId
      });

      if (groupError) {
        console.error('Erro ao remover aluno dos grupos:', groupError);
      }

      fetchAlunos();
      
      // Enviar notificação para o aluno
      try {
        const { data: professorProfile } = await supabase
          .from('professores')
          .select('nome_completo')
          .eq('id', user.id)
          .single();

        if (professorProfile) {
          await supabase.functions.invoke('enviar-notificacao', {
            body: {
              destinatario_id: alunoId,
              conteudo: `O professor ${professorProfile.nome_completo} removeu você da rede de contatos dele.`
            }
          });
        }
      } catch (notificationError) {
        console.warn("Falha ao enviar notificação de desvinculo:", notificationError);
      }

      toast.success('Aluno desvinculado', {
        description: 'O aluno foi removido da sua lista e de todos os grupos.',
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao desvincular aluno:', error);
      toast.error('Erro ao desvincular', {
        description: 'Não foi possível remover o aluno da sua lista.',
      });
      return false;
    }
  };

  const alunosFiltrados = alunos.filter(aluno => {
    const buscaMatch = !filtros.busca || aluno.nome_completo.toLowerCase().includes(filtros.busca.toLowerCase()) || (aluno.email && aluno.email.toLowerCase().includes(filtros.busca.toLowerCase()));
    const situacaoMatch = filtros.situacao === 'todos' || aluno.status === filtros.situacao;
    const generoMatch = filtros.genero === 'todos' || aluno.genero === filtros.genero;
    return buscaMatch && situacaoMatch && generoMatch;
  });

  return {
    alunos: alunosFiltrados,
    loading,
    filtros,
    setFiltros,
    desvincularAluno,
    totalAlunos: alunos.length,
  };
};