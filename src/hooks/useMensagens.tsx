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
  remetente?: {
    nome: string;
    avatar_url: string | null;
    avatar_type: 'image' | 'letter' | null;
    avatar_letter: string | null;
    avatar_color: string | null;
  }
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
      // 1. Busca as mensagens simples
      const { data: mensagensData, error: mensagensError } = await supabase
        .from('mensagens')
        .select('*')
        .eq('conversa_id', conversaId)
        .order('created_at', { ascending: true });

      if (mensagensError) throw mensagensError;

      // 2. Pega IDs únicos dos remetentes (exceto o usuário atual)
      const remetentesIds = [...new Set(
        (mensagensData || [])
          .map(msg => msg.remetente_id)
          .filter(id => id !== user?.id)
      )];

      // 3. Busca dados dos remetentes em alunos e professores
      const remetentesMap = new Map();

      if (remetentesIds.length > 0) {
        // Busca em alunos
        const { data: alunosData } = await supabase
          .from('alunos')
          .select('id, nome_completo, avatar_image_url, avatar_type, avatar_letter, avatar_color')
          .in('id', remetentesIds);

        alunosData?.forEach(aluno => {
          remetentesMap.set(aluno.id, {
            nome: aluno.nome_completo,
            avatar_url: aluno.avatar_image_url,
            avatar_type: aluno.avatar_type,
            avatar_letter: aluno.avatar_letter,
            avatar_color: aluno.avatar_color,
          });
        });

        // Busca em professores (para IDs que não foram encontrados em alunos)
        const idsNaoEncontrados = remetentesIds.filter(id => !remetentesMap.has(id));
        if (idsNaoEncontrados.length > 0) {
          const { data: professoresData } = await supabase
            .from('professores')
            .select('id, nome_completo, avatar_image_url, avatar_type, avatar_letter, avatar_color')
            .in('id', idsNaoEncontrados);

          professoresData?.forEach(professor => {
            remetentesMap.set(professor.id, {
              nome: professor.nome_completo,
              avatar_url: professor.avatar_image_url,
              avatar_type: professor.avatar_type,
              avatar_letter: professor.avatar_letter,
              avatar_color: professor.avatar_color,
            });
          });
        }
      }

      // 4. Formata as mensagens com dados dos remetentes
      const mensagensFormatadas = (mensagensData || []).map(msg => ({
        ...msg,
        isMine: msg.remetente_id === user?.id,
        remetente: remetentesMap.get(msg.remetente_id),
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