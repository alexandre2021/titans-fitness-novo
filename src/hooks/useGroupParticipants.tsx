import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ParticipantRPC = Database['public']['Functions']['get_conversa_participantes']['Returns'][number];

export type Participant = ParticipantRPC;

export const useGroupParticipants = (conversaId: string | null) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = useCallback(async () => {
    if (!conversaId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_conversa_participantes', {
        p_conversa_id: conversaId,
      });

      console.log('RPC Response - data:', data);
      console.log('RPC Response - error:', error);

      if (error) {
        console.error('Erro ao buscar participantes do grupo:', error);
        setParticipants([]);
      } else {
        setParticipants(data || []);
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  }, [conversaId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    loading,
    refetch: fetchParticipants,
  };
};