import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAlunosSeguidores } from '@/hooks/useAlunosSeguidores';
import { RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export interface ConversaUI {
  id: string;
  nome: string;
  outroParticipanteId: string | null;
  ultimaMsg: string;
  naoLidas: number;
  isGroup: boolean;
  updated_at: string;
  creatorId: string | null;
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
          creatorId: conversa.creator_id,
          avatar: {
            type: conversa.is_grupo
              ? conversa.avatar ? 'image' : 'group'
              : conversa.avatar_type as 'image' | 'letter' | null,
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
            creatorId: null,
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

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!user || loadingAlunos) {
      setLoading(false);
      return;
    }

    let channel: RealtimeChannel | null = null;

    fetchEFormatar();

    const debouncedFetch = () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        fetchEFormatar();
      }, 500); // Aguarda 500ms antes de re-buscar
    };

    channel = supabase
      .channel('public:mensagens')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (payload) => {
        const novaMensagem = payload.new as { conversa_id: string; conteudo: string; remetente_id: string; created_at: string };
        
        setConversas(prevConversas => {
          const conversaIndex = prevConversas.findIndex(c => c.id === novaMensagem.conversa_id);

          // Se a conversa não está na lista, busca tudo para garantir consistência
          if (conversaIndex === -1) {
            debouncedFetch();
            return prevConversas;
          }

          const conversaAntiga = prevConversas[conversaIndex];
          const isMine = novaMensagem.remetente_id === user?.id;

          const conversaAtualizada: ConversaUI = {
            ...conversaAntiga,
            ultimaMsg: isMine ? `Você: ${novaMensagem.conteudo}` : novaMensagem.conteudo,
            updated_at: novaMensagem.created_at,
            naoLidas: isMine ? conversaAntiga.naoLidas : (conversaAntiga.naoLidas || 0) + 1,
          };

          // Remove a conversa da posição antiga e a coloca no topo
          const outrasConversas = [
            ...prevConversas.slice(0, conversaIndex),
            ...prevConversas.slice(conversaIndex + 1),
          ];

          return [conversaAtualizada, ...outrasConversas];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'mensagens'
      }, payload => {
        // Usado principalmente para marcar como lida, que zera o contador.
        // Uma busca completa é mais segura aqui.
        if (payload.new.lida_em) {
          console.log('Mensagem atualizada (lida), atualizando lista de conversas...');
          debouncedFetch();
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'conversas'
      }, payload => {
        console.log('Nova conversa criada!', payload);
        debouncedFetch();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversas'
      }, payload => {
        console.log('Conversa atualizada (nome/avatar), atualizando lista de conversas...');
        debouncedFetch();
      })
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
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
        creatorId: user.id,
        avatar: {
          type: 'group',
          url: avatarUrl,
          letter: nomeGrupo.charAt(0).toUpperCase(),
          color: '#60A5FA',
        },
        ultimaMsg: 'Grupo criado. Dê as boas-vindas!',
        naoLidas: 0,
        isGroup: true,
        updated_at: new Date().toISOString(),
      };

      await fetchEFormatar();
      return novoGrupo;
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      return null;
    } finally {
      setLoadingConversa(false);
    }
  };

  const removerParticipante = async (conversaId: string, participantId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('remove_group_participant', {
        body: {
          conversa_id: conversaId,
          participant_id: participantId,
        },
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao remover participante:', error);
      return false;
    }
  };

  const adicionarParticipantes = async (conversaId: string, participantIds: string[]): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.functions.invoke('add_group_participant', {
        body: {
          conversa_id: conversaId,
          participant_ids: participantIds,
        },
      });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao adicionar participantes:', error);
      return false;
    }
  };

  const editarGrupo = async (conversaId: string, updates: { nome?: string; avatarUrl?: string }): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.functions.invoke('update_group_info', {
        body: {
          conversa_id: conversaId,
          nome_grupo: updates.nome,
          avatar_grupo: updates.avatarUrl,
        },
      });

      if (error) throw error;

      // Atualização otimista do estado local
      setConversas(prev =>
        prev.map(c => {
          if (c.id === conversaId) {
            return {
              ...c,
              ...(updates.nome && { nome: updates.nome }),
              ...(updates.avatarUrl && { avatar: { ...c.avatar, url: updates.avatarUrl, type: 'image' } }),
            };
          }
          return c;
        })
      );
      return true;
    } catch (error) {
      console.error('Erro ao editar informações do grupo:', error);
      // Adicionar toast de erro aqui seria uma boa prática
      return false;
    }
  };

  const unreadCount = useMemo(() => {
    return conversas.reduce((total, conversa) => total + conversa.naoLidas, 0);
  }, [conversas]);
  
  return { 
    conversas, 
    loading, 
    iniciarConversa, 
    criarGrupo,
    removerParticipante,
    adicionarParticipantes, // ✅ ADICIONE ESTA LINHA
    editarGrupo,
    loadingConversa, 
    refetchConversas: fetchEFormatar,
    unreadCount
  };
};