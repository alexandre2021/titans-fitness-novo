import { useState, useEffect } from 'react';
import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface AlunoProfile {
  id: string;
  nome_completo: string;
  email: string;
  telefone?: string;
  genero?: string;
  data_nascimento?: string;
  peso?: number;
  altura?: number;
  descricao_pessoal?: string;
  par_q_respostas?: Json;
  onboarding_completo: boolean;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
  codigo_vinculo: string;
}

export const useAlunoProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AlunoProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('alunos')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching aluno profile:', error);
        } else {
          // Adiciona a lógica para construir a URL pública do avatar
          if (data && data.avatar_image_url && !data.avatar_image_url.startsWith('http')) {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_image_url);
            data.avatar_image_url = urlData.publicUrl;
          }
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching aluno profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<AlunoProfile>) => {
    if (!user || !profile) return false;

    try {
      const { error } = await supabase
        .from('alunos')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating aluno profile:', error);
        return false;
      }

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (error) {
      console.error('Error updating aluno profile:', error);
      return false;
    }
  };

  return { profile, loading, updateProfile };
};