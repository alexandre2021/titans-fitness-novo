import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AlunoSeguidor = {
  id: string;
  nome_completo: string;
  avatar_image_url: string | null;
  avatar_type: 'image' | 'letter' | null;
  avatar_letter: string | null;
  avatar_color: string | null;
};

export const useAlunosSeguidores = () => {
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<AlunoSeguidor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlunosSeguidores = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('alunos_professores')
        .select('alunos!inner(id, nome_completo, avatar_image_url, avatar_type, avatar_letter, avatar_color)')
        .eq('professor_id', user.id);
      
      if (error) throw error;

      const seguidores = data?.map(item => item.alunos as AlunoSeguidor).filter(Boolean) || [];
      setAlunos(seguidores);
    } catch (error) {
      console.error("Erro ao buscar alunos seguidores:", error);
      setAlunos([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlunosSeguidores();
  }, [fetchAlunosSeguidores]);

  return { alunos, loading, refetch: fetchAlunosSeguidores };
};