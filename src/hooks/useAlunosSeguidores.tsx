import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

// Define um tipo mais simples para o aluno na lista, contendo apenas o necessário.
type AlunoRow = Database['public']['Tables']['alunos']['Row'];
export type AlunoSeguidor = Pick<
  AlunoRow,
  'id' | 'nome_completo' | 'avatar_image_url' | 'avatar_type' | 'avatar_letter' | 'avatar_color'
>;

export const useAlunosSeguidores = () => {
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<AlunoSeguidor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlunosSeguidores = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // A query busca na tabela de junção 'alunos_professores'
        // e, para cada entrada, pega os dados da tabela 'alunos' relacionada.
        const { data, error } = await supabase
          .from('alunos_professores')
          .select(`
            alunos (
              id,
              nome_completo,
              avatar_image_url,
              avatar_type,
              avatar_letter,
              avatar_color
            )
          `)
          .eq('professor_id', user.id);

        if (error) throw error;

        // O resultado vem como [{ alunos: { ... } }, ...], então precisamos extrair o perfil do aluno.
        const seguidores = data.map(item => item.alunos).filter(Boolean) as AlunoSeguidor[];
        setAlunos(seguidores);
      } catch (error) {
        console.error("Erro ao buscar alunos seguidores:", error);
        setAlunos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlunosSeguidores();
  }, [user]);

  return { alunos, loading };
};