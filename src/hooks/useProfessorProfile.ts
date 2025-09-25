import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tables } from '@/integrations/supabase/types';

type ProfessorProfile = Tables<'professores'>;

export const useProfessorProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfessorProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('professores')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data && data.avatar_image_url && !data.avatar_image_url.startsWith('http')) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.avatar_image_url);
          data.avatar_image_url = urlData.publicUrl;
        }

        setProfile(data);
      } catch (error) {
        console.error("Erro ao buscar perfil do professor:", error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return { profile, loading };
};