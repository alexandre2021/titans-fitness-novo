import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export type AlunoComStatus = Tables<'alunos'>;

export const useAlunos = () => {
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
      // MUDANÇA: A busca agora funciona diretamente graças à política de RLS correta.
      // Buscamos os alunos através da tabela de relacionamento 'alunos_professores'.
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

      // Os dados vêm aninhados, então precisamos extrair os perfis dos alunos
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
  }, [fetchAlunos]);

  const desvincularAluno = async (alunoId: string) => {
    if (!user?.id) return false;

    try {
      // MUDANÇA: Deleta o relacionamento da tabela 'alunos_professores'
      const { error } = await supabase
        .from('alunos_professores')
        .delete()
        .eq('aluno_id', alunoId)
        .eq('professor_id', user.id);

      if (error) throw error;

      setAlunos(prev => prev.filter(a => a.id !== alunoId));
      return true;
    } catch (error) {
      console.error('Erro ao desvincular aluno:', error);
      toast.error('Erro ao desvincular', {
        description: 'Não foi possível remover o aluno da sua lista.',
      });
      return false;
    }
  };

  // A lógica de filtro permanece a mesma, apenas opera sobre os dados corretos
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