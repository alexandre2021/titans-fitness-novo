import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Professor {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: 'letter' | 'image';
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color?: string;
  especializacoes?: string[];
  temRotinaAtiva?: boolean;
}

export const useProfessores = () => {
  const { user } = useAuth();
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroBusca, setFiltroBusca] = useState('');

  const carregarProfessores = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Encontrar os IDs dos professores que o aluno segue
      const { data: relacoes, error: relacaoError } = await supabase
        .from('alunos_professores')
        .select('professor_id')
        .eq('aluno_id', user.id);

      if (relacaoError) throw relacaoError;

      const professorIds = relacoes.map(r => r.professor_id);

      if (professorIds.length === 0) {
        setProfessores([]);
        return;
      }

      // 2. Buscar dados dos professores e rotinas ativas em paralelo
      const [professoresResult, rotinasResult] = await Promise.all([
        supabase
          .from('professores')
          .select('id, nome_completo, email, avatar_type, avatar_image_url, avatar_letter, avatar_color, especializacoes')
          .in('id', professorIds)
          .order('nome_completo', { ascending: true }),
        supabase.from('rotinas').select('professor_id').eq('aluno_id', user.id).eq('status', 'Ativa')
      ]);

      const { data: professoresData, error: professoresError } = professoresResult;
      const { data: rotinasAtivas, error: rotinasError } = rotinasResult;

      if (professoresError) throw professoresError;
      if (rotinasError) throw rotinasError;

      const professoresComRotinaAtiva = new Set(rotinasAtivas.map(r => r.professor_id));

      const professoresComStatus = (professoresData || []).map(p => ({
        ...p,
        temRotinaAtiva: professoresComRotinaAtiva.has(p.id)
      }));

      setProfessores((professoresComStatus as Professor[]) || []);
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      toast.error('Erro ao carregar seus professores. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    carregarProfessores();
  }, [carregarProfessores]);

  const professoresFiltrados = professores.filter(p =>
    p.nome_completo.toLowerCase().includes(filtroBusca.toLowerCase())
  );

  return {
    professores: professoresFiltrados,
    loading,
    filtroBusca,
    setFiltroBusca,
    totalProfessores: professores.length,
  };
};