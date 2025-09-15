import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Aluno {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  genero?: string;
  onboarding_completo: boolean;
  status: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
  created_at: string;
}

export const useAlunos = () => {
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    busca: '',
    situacao: 'todos',
    genero: 'todos'
  });

  useEffect(() => {
    const fetchAlunos = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('alunos')
          .select(`
            id, nome_completo, email, telefone, genero, onboarding_completo,
            status, avatar_type, avatar_image_url, avatar_letter, avatar_color, created_at
          `)
          .eq('personal_trainer_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching alunos:', error);
        } else {
          setAlunos(data || []);
        }
      } catch (error) {
        console.error('Error fetching alunos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlunos();
  }, [user]);

  const alunosFiltrados = alunos.filter(aluno => {
    const matchBusca = aluno.nome_completo.toLowerCase().includes(filtros.busca.toLowerCase()) ||
                      aluno.email.toLowerCase().includes(filtros.busca.toLowerCase());
    
    const matchSituacao = filtros.situacao === 'todos' || 
                         (filtros.situacao === 'ativo' && aluno.onboarding_completo) ||
                         (filtros.situacao === 'pendente' && !aluno.onboarding_completo);
    
    const matchGenero = filtros.genero === 'todos' || aluno.genero === filtros.genero;

    return matchBusca && matchSituacao && matchGenero;
  });

  const desvincularAluno = async (alunoId: string) => {
    try {
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .rpc('desvincular_aluno' as any, { 
          aluno_id: alunoId 
        });

      if (error) {
        console.error('Erro na função:', error);
        return false;
      }

      // Type assertion para a resposta JSON da função
      const resultado = data as { success: boolean; message?: string; error?: string };

      if (resultado.success) {
        console.log('Sucesso:', resultado.message);
        setAlunos(alunos.filter(aluno => aluno.id !== alunoId));
        return true;
      } else {
        console.error('Erro retornado:', resultado.error);
        return false;
      }
    } catch (error) {
      console.error('Error unlinking aluno:', error);
      return false;
    }
  };

  return { 
    alunos: alunosFiltrados, 
    loading, 
    filtros, 
    setFiltros, 
    desvincularAluno,
    totalAlunos: alunos.length
  };
};