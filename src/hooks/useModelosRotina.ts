import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type ModeloRotina = Tables<'modelos_rotina'>;

export const useModelosRotina = () => {
  const { user } = useAuth();
  const [modelosPadrao, setModelosPadrao] = useState<ModeloRotina[]>([]);
  const [modelosPersonalizados, setModelosPersonalizados] = useState<ModeloRotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchModelos = async () => {
      setLoading(true);
      setError(null);

      try {
        // Buscar modelos padrão
        const { data: padrao, error: erroPadrao } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('tipo', 'padrao')
          .order('created_at', { ascending: false });

        if (erroPadrao) throw erroPadrao;

        // Buscar modelos personalizados do professor
        const { data: personalizados, error: erroPersonalizados } = await supabase
          .from('modelos_rotina')
          .select('*')
          .eq('tipo', 'personalizado')
          .eq('professor_id', user.id)
          .order('created_at', { ascending: false });

        if (erroPersonalizados) throw erroPersonalizados;

        setModelosPadrao(padrao || []);
        setModelosPersonalizados(personalizados || []);
      } catch (err) {
        console.error('Erro ao buscar modelos de rotina:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchModelos();
  }, [user]);

  const refetch = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data: padrao, error: erroPadrao } = await supabase
        .from('modelos_rotina')
        .select('*')
        .eq('tipo', 'padrao')
        .order('created_at', { ascending: false });

      if (erroPadrao) throw erroPadrao;

      const { data: personalizados, error: erroPersonalizados } = await supabase
        .from('modelos_rotina')
        .select('*')
        .eq('tipo', 'personalizado')
        .eq('professor_id', user.id)
        .order('created_at', { ascending: false });

      if (erroPersonalizados) throw erroPersonalizados;

      setModelosPadrao(padrao || []);
      setModelosPersonalizados(personalizados || []);
    } catch (err) {
      console.error('Erro ao buscar modelos de rotina:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return {
    modelosPadrao,
    modelosPersonalizados,
    todosModelos: [...modelosPadrao, ...modelosPersonalizados],
    loading,
    error,
    refetch,
  };
};
