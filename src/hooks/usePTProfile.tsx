import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

// Usar o tipo correto do banco de dados
type PTProfile = Tables<"personal_trainers">;

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
        console.log('🔍 Buscando perfil do PT:', user.id);
        
        const { data, error } = await supabase
          .from('personal_trainers')
          .select('*') // Selecionar todos os campos
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('❌ Erro ao buscar perfil do PT:', error);
        } else {
          console.log('✅ Perfil do PT carregado:', data);
          console.log('🏋️ Limite de exercícios:', data?.limite_exercicios);
          setProfile(data);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar perfil do PT:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return { profile, loading };
};