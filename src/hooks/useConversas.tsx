import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAlunosSeguidores } from '@/hooks/useAlunosSeguidores';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export interface ConversaUI {
  id: string;
  nome: string;
  outroParticipanteId: string | null; // Pode ser nulo para grupos
  ultimaMsg: string;
  naoLidas: number;
  isGroup: boolean;
  updated_at: string;
  avatar: {
    type: 'image' | 'letter' | 'group' | null;
    url: string | null;
    letter: string | null;
    color: string | null;
  };
}

type ConversaRPC = Database['public']['Functions']['get_minhas_conversas']['Returns'][number];

export const useConversas = () => {
  const { user } = useAuth();
  const [conversas, setConversas] = useState<ConversaUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConversa, setLoadingConversa] = useState(false);
  const { alunos: alunosSeguidores, loading: loadingAlunos } = useAlunosSeguidores();

  const mesclarEFormatarConversas = useCallback(
    (rawConversas: ConversaRPC[]): ConversaUI[] => {
      const mapaConversas = new Map<string, ConversaUI>();

      // 1. Processa as conversas existentes
      rawConversas.forEach(conversa => {
        const idParticipante = conversa.is_grupo ? conversa.conversa_id : conversa.outro_participante_id;
        if (!idParticipante) return;

        mapaConversas.set(idParticipante, {
          id: conversa.conversa_id,
          nome: conversa.nome || 'Conversa',
          outroParticipanteId: conversa.outro_participante_id,
          avatar: {
            type: conversa.avatar_type as 'image' | 'letter' | 'group' | null,
            url: conversa.avatar,
            letter: conversa.avatar_letter,
            color: conversa.avatar_color,
          },
          ultimaMsg: conversa.ultima_mensagem_conteudo || 'Nenhuma mensagem ainda.',
          naoLidas: conversa.mensagens_nao_lidas || 0,
          isGroup: conversa.is_grupo,
          updated_at: conversa.ultima_mensagem_criada_em || new Date(0).toISOString(),
        });
      });

      // 2. Adiciona alunos seguidores que ainda não têm uma conversa
      alunosSeguidores.forEach(aluno => {
        if (!mapaConversas.has(aluno.id)) {
          mapaConversas.set(aluno.id, {
            id: '',
            nome: aluno.nome_completo,
            outroParticipanteId: aluno.id,
            avatar: {
              type: aluno.avatar_type as 'image' | 'letter' | null,
              url: aluno.avatar_image_url,
              letter: aluno.avatar_letter,
              color: aluno.avatar_color,
            },
            ultimaMsg: 'Inicie uma conversa',
            naoLidas: 0,
            isGroup: false,
            updated_at: new Date(0).toISOString(),
          });
        }
      });

      // 3. Converte o mapa para um array e ordena
      return Array.from(mapaConversas.values()).sort((a, b) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
    },
    [alunosSeguidores]
  );

  const fetchEFormatar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_minhas_conversas');

    if (error) {
      console.error("Erro ao buscar conversas:", error);
    } else if (data) {
      const conversasFormatadas = mesclarEFormatarConversas(data);
      setConversas(conversasFormatadas);
    }
    setLoading(false);
  }, [mesclarEFormatarConversas]);

  useEffect(() => {
    if (!user || loadingAlunos) {
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel | null = null;

    fetchEFormatar();

    channel = supabase
      .channel('public:mensagens')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, payload => {
        console.log('Nova mensagem recebida!', payload);
        fetchEFormatar();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'mensagens' 
      }, payload => {
        console.log('Mensagem atualizada (marcada como lida)!', payload);
        fetchEFormatar(); // Recarrega a lista para atualizar a contagem de não lidas
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'conversas' 
      }, payload => {
        console.log('Nova conversa criada!', payload);
        fetchEFormatar();
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, loadingAlunos, fetchEFormatar]);

  const iniciarConversa = async (conversaPlaceholder: ConversaUI): Promise<ConversaUI | null> => {
    if (!user) return null;

    setLoadingConversa(true);
    try {
      const { data: novaConversaData, error } = await supabase.functions.invoke('create_conversation_with_aluno', {
        body: { p_aluno_id: conversaPlaceholder.outroParticipanteId },
      });

      if (error) throw error;
      
      if (!novaConversaData || !novaConversaData.conversa_id) {
        throw new Error('ID da conversa inválido');
      }

      const novaConversa: ConversaUI = {
        ...conversaPlaceholder,
        id: novaConversaData.conversa_id,
        ultimaMsg: 'Nenhuma mensagem ainda.',
        updated_at: new Date().toISOString(),
      };

      // Atualiza a conversa específica na lista, mantendo as outras
      setConversas(prev => prev.map(c => c.outroParticipanteId === novaConversa.outroParticipanteId ? novaConversa : c));

      return novaConversa;
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      return null;
    } finally {
      setLoadingConversa(false);
    }
  };

  const criarGrupo = async (nomeGrupo: string, participantesIds: string[], avatarUrl: string | null = null): Promise<ConversaUI | null> => {
    if (!user) return null;

    setLoadingConversa(true);
    try {
      const todosParticipantes = [...new Set([user.id, ...participantesIds])];

      const { data, error } = await supabase.functions.invoke('create_group_conversation', {
        body: {
          nome_grupo: nomeGrupo,
          participantes_ids: todosParticipantes,
          avatar_grupo: avatarUrl,
        },
      });

      if (error) throw error;

      if (!data || !data.conversa_id) {
        throw new Error('A criação do grupo não retornou um ID de conversa válido.');
      }

      const novoGrupo: ConversaUI = {
        id: data.conversa_id,
        nome: nomeGrupo,
        outroParticipanteId: null,
        avatar: {
          type: 'group',
          url: avatarUrl,
          letter: nomeGrupo.charAt(0).toUpperCase(),
          color: '#60A5FA', // Cor padrão para grupos
        },
        ultimaMsg: 'Grupo criado. Dê as boas-vindas!',
        naoLidas: 0,
        isGroup: true,
        updated_at: new Date().toISOString(),
      };

      await fetchEFormatar(); // Recarrega a lista para incluir o novo grupo
      return novoGrupo;
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      return null;
    } finally {
      setLoadingConversa(false);
    }
  };

  // ✅ NOVO - Calcula total de mensagens não lidas
  const unreadCount = useMemo(() => {
    return conversas.reduce((total, conversa) => total + conversa.naoLidas, 0);
  }, [conversas]);
  
  return { 
    conversas, 
    loading, 
    iniciarConversa, 
    criarGrupo, // ✅ NOVO
    loadingConversa, 
    refetchConversas: fetchEFormatar,
    unreadCount // ✅ NOVO - exporta contagem total
  };
};