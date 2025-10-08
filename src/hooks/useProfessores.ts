import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export interface Professor {
  id: string;
  nome_completo: string;
  email: string;
  avatar_type: 'letter' | 'image' | null;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color?: string;
  especializacoes?: string[];
  temRotinaAtiva?: boolean;
}

export const useProfessores = (fetchTrigger = 0) => {
  const { user } = useAuth();
  const [professores, setProfessores] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroBusca, setFiltroBusca] = useState('');

  const fetchProfessores = useCallback(async () => {
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

      const professoresComRotinaAtiva = new Set((rotinasAtivas || []).map(r => r.professor_id));

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
    fetchProfessores();
  }, [fetchProfessores, fetchTrigger]);

  const professoresFiltrados = professores.filter(p =>
    p.nome_completo.toLowerCase().includes(filtroBusca.toLowerCase())
  );

  const desvincularProfessor = async (professorId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('alunos_professores')
      .delete()
      .match({ aluno_id: user.id, professor_id: professorId });

    if (error) {
      toast.error("Erro ao deixar de seguir", {
        description: "Não foi possível remover o vínculo. Tente novamente.",
      });
      return false;
    }

    // Enviar notificação para o professor
    try {
      const { data: alunoProfile } = await supabase
        .from('alunos')
        .select('nome_completo')
        .eq('id', user.id)
        .single();

      if (alunoProfile) {
        await supabase.functions.invoke('enviar-notificacao', {
          body: {
            destinatario_id: professorId,
            conteudo: `O aluno ${alunoProfile.nome_completo} deixou de te seguir.`
          }
        });
      }
    } catch (notificationError) {
      console.warn("Falha ao enviar notificação de desvinculo:", notificationError);
    }

    // Atualiza a lista localmente para uma resposta mais rápida da UI
    setProfessores(prev => prev.filter(p => p.id !== professorId));
    toast.success("Você deixou de seguir o professor.");
    return true;
  };

  return {
    professores: professoresFiltrados,
    loading,
    filtroBusca,
    setFiltroBusca,
    totalProfessores: professores.length,
    refetchProfessores: fetchProfessores,
    desvincularProfessor,
  };
};