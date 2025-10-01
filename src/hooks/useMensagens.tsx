// src/hooks/useMensagens.tsx
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

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

type PerfilRemetente = Mensagem['remetente'];

// Cache para perfis de remetentes para evitar buscas repetidas
const remetentesCache = new Map<string, PerfilRemetente>();

// Tipo para o payload da mensagem recebida via Realtime
type MensagemPayload = Database['public']['Tables']['mensagens']['Row'];

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

  const getPerfilRemetente = useCallback(async (remetenteId: string): Promise<PerfilRemetente> => {
    if (remetentesCache.has(remetenteId)) {
      return remetentesCache.get(remetenteId);
    }

    // Tenta buscar em 'alunos' primeiro
    let { data: perfilData, error: perfilError } = await supabase
      .from('alunos')
      .select('id, nome_completo, avatar_image_url, avatar_type, avatar_letter, avatar_color')
      .eq('id', remetenteId)
      .single();

    if (perfilError && !perfilData) {
      // Se não encontrou em 'alunos', tenta em 'professores'
      ({ data: perfilData, error: perfilError } = await supabase
        .from('professores')
        .select('id, nome_completo, avatar_image_url, avatar_type, avatar_letter, avatar_color')
        .eq('id', remetenteId)
        .single());
    }

    if (perfilError || !perfilData) {
      console.error(`Erro ao buscar perfil do remetente ${remetenteId}:`, perfilError);
      return {
        nome: 'Usuário desconhecido',
        avatar_url: null,
        avatar_type: 'letter',
        avatar_letter: '?',
        avatar_color: '#ccc',
      };
    }

    const perfil: PerfilRemetente = {
      nome: perfilData.nome_completo,
      avatar_url: perfilData.avatar_image_url,
      avatar_type: perfilData.avatar_type as 'image' | 'letter' | null,
      avatar_letter: perfilData.avatar_letter,
      avatar_color: perfilData.avatar_color,
    };

    remetentesCache.set(remetenteId, perfil);
    return perfil;

  }, []);

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
        async (payload) => {
          const novaMensagemPayload = payload.new as MensagemPayload;
          const isMine = novaMensagemPayload.remetente_id === user.id;

          const novaMensagem: Mensagem = {
            ...novaMensagemPayload,
            isMine,
            remetente: isMine ? undefined : await getPerfilRemetente(novaMensagemPayload.remetente_id),
          };

          setMensagens(prev => [...prev, novaMensagem]);

          // Se a mensagem não é minha e a janela está visível, marca como lida
          if (!isMine && document.visibilityState === 'visible') {
            await marcarComoLidas();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, user, fetchMensagens, marcarComoLidas, getPerfilRemetente]);

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