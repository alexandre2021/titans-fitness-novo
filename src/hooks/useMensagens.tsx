// src/hooks/useMensagens.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Mensagem {
  id: string;
  conteudo: string;
  remetente_id: string;
  created_at: string;
  lida_em: string | null;
  isMine: boolean;
}

export const useMensagens = (conversaId: string | null) => {
  const { user } = useAuth();
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchMensagens = useCallback(async () => {
    if (!conversaId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mensagensFormatadas = (data || []).map(msg => ({
        ...msg,
        isMine: msg.remetente_id === user?.id,
      }));

      setMensagens(mensagensFormatadas);
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
    } finally {
      setLoading(false);
    }
  }, [conversaId, user?.id]);

  const marcarComoLidas = useCallback(async () => {
    if (!conversaId || !user) return;

    try {
      const { error } = await supabase
        .from('mensagens')
        .update({ lida_em: new Date().toISOString() })
        .eq('conversa_id', conversaId)
        .neq('remetente_id', user.id)
        .is('lida_em', null);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  }, [conversaId, user]);

  useEffect(() => {
    if (!conversaId || !user) return;

    fetchMensagens();
    marcarComoLidas();

    const channel: RealtimeChannel = supabase
      .channel(`conversa:${conversaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `conversa_id=eq.${conversaId}`,
        },
        (payload) => {
          const novaMensagem = {
            ...payload.new,
            isMine: payload.new.remetente_id === user.id,
          } as Mensagem;
          
          setMensagens(prev => [...prev, novaMensagem]);
          
          // Se a mensagem não é minha, marca como lida automaticamente
          if (novaMensagem.remetente_id !== user.id) {
            marcarComoLidas();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, user, fetchMensagens, marcarComoLidas]);

  const enviarMensagem = async (conteudo: string): Promise<boolean> => {
    if (!conversaId || !user || !conteudo.trim()) return false;

    setSending(true);
    try {
      const { data: novaMensagem, error: msgError } = await supabase
        .from('mensagens')
        .insert({
          conversa_id: conversaId,
          remetente_id: user.id,
          conteudo: conteudo.trim(),
        })
        .select()
        .single();

      if (msgError) throw msgError;

      const { error: updateError } = await supabase
        .from('conversas')
        .update({
          last_message_id: novaMensagem.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversaId);

      if (updateError) throw updateError;

      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    } finally {
      setSending(false);
    }
  };

  return {
    mensagens,
    loading,
    sending,
    enviarMensagem,
    refetch: fetchMensagens,
  };
};