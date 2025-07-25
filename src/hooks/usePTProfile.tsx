import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PTProfile {
  id: string;
  nome_completo: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  cref?: string;
  anos_experiencia?: string;
  especializacoes?: string[];
  bio?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  website?: string;
  avatar_type: string;
  avatar_image_url?: string;
  avatar_letter?: string;
  avatar_color: string;
  codigo_pt?: string;
  limite_alunos: number;
}

export const usePTProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PTProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('personal_trainers')
          .select(`
            id, nome_completo, telefone, data_nascimento, genero,
            cref, anos_experiencia, especializacoes, bio,
            instagram, facebook, linkedin, website,
            avatar_type, avatar_image_url, avatar_letter, avatar_color, codigo_pt, limite_alunos
          `)
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching PT profile:', error);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error fetching PT profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return { profile, loading };
};