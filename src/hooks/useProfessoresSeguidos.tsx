import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type ProfessorRow = Database['public']['Tables']['professores']['Row'];
export type ProfessorSeguido = Pick<
  ProfessorRow,
  'id' | 'nome_completo' | 'email' | 'avatar_image_url' | 'avatar_type' | 'avatar_letter' | 'avatar_color'
>;

export const useProfessoresSeguidos = () => {
  const { user } = useAuth();
  const [professores, setProfessores] = useState<ProfessorSeguido[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfessoresSeguidos = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alunos_professores')
        .select('professores (id, nome_completo, email, avatar_image_url, avatar_type, avatar_letter, avatar_color)')
        .eq('aluno_id', user.id);

      if (error) throw error;

      const professoresSeguidos = data.map(item => item.professores).filter(Boolean) as ProfessorSeguido[];
      setProfessores(professoresSeguidos);
    } catch (error) {
      console.error("Erro ao buscar professores seguidos:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfessoresSeguidos();
  }, [fetchProfessoresSeguidos]);

  return { professores, loading };
};