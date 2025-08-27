// c:\Users\alexa\titans-fitness-novo\src\hooks\usePTProfile.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';

/**
 * Adiciona um parâmetro de busca à URL para invalidar o cache do navegador.
 * Isso força o recarregamento de recursos como imagens de avatar.
 * @param urlString A URL original.
 * @returns A nova URL com o parâmetro de timestamp, ou null se a entrada for nula.
 */
const addCacheBuster = (urlString: string | null | undefined): string | null => {
  if (!urlString) return null;
  try {
    const url = new URL(urlString);
    url.searchParams.set('t', new Date().getTime().toString());
    return url.href;
  } catch (error) {
    // Retorna a URL original se for inválida para não quebrar a aplicação.
    console.error("URL inválida para cache busting:", urlString);
    return urlString;
  }
};

export type PTProfile = Tables<'personal_trainers'>;

export function usePTProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PTProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('personal_trainers')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        // Adiciona o cache buster na URL do avatar
        data.avatar_image_url = addCacheBuster(data.avatar_image_url);
      }
      setProfile(data);
    } catch (error) {
      console.error('Erro ao buscar perfil do PT:', error);
      toast({
        title: 'Erro ao carregar perfil',
        description: 'Não foi possível buscar seus dados. Tente recarregar a página.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async (updates: TablesUpdate<'personal_trainers'>) => {
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await supabase.from('personal_trainers').update(updates).eq('id', user.id).select().single();
    if (error) throw error;

    if (data) {
      // Adiciona o cache buster na atualização para forçar a re-renderização da imagem
      data.avatar_image_url = addCacheBuster(data.avatar_image_url);
    }
    setProfile(data); // Atualiza o estado local com os novos dados
    return data;
  };

  return { profile, loading, fetchProfile, updateProfile };
}
