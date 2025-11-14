import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, Loader2, Search, Users, Settings, ShieldAlert, Bell } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "../ui/input";
import { Badge } from "@/components/ui/badge";
import { ChatView } from "./ChatView";
import { CreateGroupView } from "./CreateGroupView";
import { GroupInfoView } from "./GroupInfoView";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "../ui/card";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

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

type View = 'list' | 'chat' | 'create-group' | 'group-info';

type Contato = {
  id: string;
  nome_completo: string;
  avatar_image_url: string | null;
  avatar_type: 'image' | 'letter' | null;
  avatar_letter: string | null;
  avatar_color: string | null;
};


interface MessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction?: 'left' | 'right';
  onUnreadCountChange?: (count: number) => void;
}

const ConversaItem = ({ conversa, onClick }: { conversa: ConversaUI, onClick: () => void }) => (
  <div onClick={onClick} className="flex items-center p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
    {conversa.isGroup ? (
      <div className="h-12 w-12 mr-4 rounded-full flex items-center justify-center bg-muted">
        <Users className="h-6 w-6 text-muted-foreground" />
      </div>
    ) : (
      conversa.avatar.type === 'image' && conversa.avatar.url ? (
        <Avatar className="h-12 w-12 mr-4">
          <AvatarImage src={conversa.avatar.url} alt={conversa.nome} />
          <AvatarFallback 
            style={{ backgroundColor: conversa.avatar.color || '#ccc', color: 'white' }}
            className="text-lg font-semibold"
          >
            {conversa.nome.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div 
          className="h-12 w-12 mr-4 rounded-full flex items-center justify-center text-lg font-semibold"
          style={{ backgroundColor: conversa.avatar.color || '#ccc', color: 'white' }}
        >
          {conversa.avatar.letter || conversa.nome.charAt(0).toUpperCase()}
        </div>
      )
    )}
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-semibold truncate">{conversa.nome}</p>
          {conversa.isGroup && (
            <Badge variant="secondary" className="text-xs">Grupo</Badge>
          )}
        </div>
        {conversa.naoLidas > 0 && (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {conversa.naoLidas}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground truncate">{conversa.ultimaMsg}</p>
    </div>
  </div>
);

const MessagesDrawer = ({ isOpen, onClose, direction = 'right', onUnreadCountChange }: MessagesDrawerProps) => {
  const [view, setView] = useState<View>('list');
  const [activeConversation, setActiveConversation] = useState<ConversaUI | null>(null);
  const { user } = useAuth();
  const [conversas, setConversas] = useState<ConversaUI[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConversa, setLoadingConversa] = useState(false);
  const [adminConversation, setAdminConversation] = useState<ConversaUI | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Hook de notificações
  const { permission, isSupported, subscribe, isLoading: isLoadingNotification } = useNotificationPermission();
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);

  const isProfessor = user?.user_metadata?.user_type === 'professor';

  // Verificar se deve mostrar banner de notificações
  useEffect(() => {
    console.log('🔔 [MessageDrawer] useEffect - isOpen:', isOpen, 'isSupported:', isSupported, 'permission:', permission);
    if (isOpen && isSupported && permission !== 'granted') {
      console.log('🔔 [MessageDrawer] Mostrando banner de notificações');
      setShowNotificationBanner(true);
    } else {
      console.log('🔔 [MessageDrawer] Ocultando banner de notificações');
      setShowNotificationBanner(false);
    }
  }, [isOpen, isSupported, permission]);

  // Handler para ativar notificações
  const handleEnableNotifications = async () => {
    console.log('🔔 [MessageDrawer] Botão "Ativar agora" clicado');
    try {
      const success = await subscribe();
      console.log('🔔 [MessageDrawer] Resultado:', success);
      if (success) {
        setShowNotificationBanner(false);
        console.log('✅ [MessageDrawer] Banner ocultado');
      } else {
        console.error('❌ [MessageDrawer] Falha ao ativar notificações');
        alert('Não foi possível ativar as notificações. Verifique as permissões do navegador.');
      }
    } catch (error) {
      console.error('❌ [MessageDrawer] Erro ao ativar:', error);
      alert('Erro ao ativar notificações: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    }
  };

  const fetchConversas = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 1. Buscar todos os contatos (alunos ou professores)
      // Simplificação: Chamar uma única RPC que já retorna a lista completa e formatada.
      const { data: conversasData, error: conversasError } = await supabase.rpc('get_conversas_e_contatos');
      if (conversasError) throw conversasError;

      const conversasFormatadas: ConversaUI[] = Array.isArray(conversasData)
        ? conversasData.map((conversa) => ({
            id: conversa.conversa_id,
            nome: conversa.nome,
            outroParticipanteId: conversa.outro_participante_id,
            creatorId: conversa.creator_id,
            avatar: {
              type: conversa.avatar_type as 'image' | 'letter' | 'group' | null,
              url: conversa.avatar,
              letter: conversa.avatar_letter,
              color: conversa.avatar_color,
            },
            ultimaMsg: conversa.ultima_mensagem_conteudo,
            naoLidas: conversa.mensagens_nao_lidas,
            isGroup: conversa.is_grupo,
            updated_at: conversa.ultima_mensagem_criada_em,
          }))
        : [];

      // ✅ ADICIONADO:
      console.log('Conversas retornadas:', conversasFormatadas);

      // Separa a conversa do admin das outras
      // NOTA PARA MANUTENÇÃO FUTURA:
      // A conversa com o "Administrador" é um canal de notificações do sistema para o usuário.
      // Atualmente, existem 4 cenários principais que geram uma mensagem aqui:
      // 1. Boas-vindas: Uma mensagem é enviada quando um novo usuário (aluno ou PT) se cadastra.
      // 2. Rotina Cancelada: Quando um professor é excluído por inatividade, suas rotinas
      //    são canceladas e os alunos afetados recebem uma notificação do sistema.
      // 3. Rotina Excluída: Quando um professor exclui uma rotina de um aluno, o aluno
      //    recebe uma notificação.
      // 4. Aviso de Inatividade: O sistema envia um aviso para usuários que estão inativos
      //    há mais de 60 dias, antes de a conta ser excluída (conforme a cron `check-inactive-users`).
      //
      // Essas notificações são enviadas pela Edge Function `enviar-notificacao`, que tem como
      // remetente o ID do administrador (VITE_ADMIN_USER_ID).
      const rawAdminId = import.meta.env.VITE_ADMIN_USER_ID;
      let adminId: string | null = null;
      if (typeof rawAdminId === 'string' && rawAdminId.length > 0) {
        adminId = rawAdminId;
      } else {
        // Se VITE_ADMIN_USER_ID não está configurado, loga um aviso e não tenta criar o card fixo.
        // A conversa do admin, se existir, aparecerá na lista geral.
        console.warn('VITE_ADMIN_USER_ID não está configurado ou é inválido. A conversa do administrador pode não ser exibida corretamente no topo.');
      }

      const adminConvReal = conversasFormatadas.find(c => c.outroParticipanteId === adminId);
      const outrasConversas = conversasFormatadas.filter(c => c.outroParticipanteId !== adminId);

      // ✅ CORREÇÃO: Garante que a conversa real sempre substitua o placeholder.
      let finalAdminConv = adminConvReal;
      if (!finalAdminConv && adminId) {
        // Se não houver conversa real, cria um placeholder.
        finalAdminConv = {
          id: `placeholder-admin-${adminId}`, // ID temporário
          nome: 'Administrador',
          outroParticipanteId: adminId,
          ultimaMsg: 'Nenhuma notificação',
          naoLidas: 0,
          isGroup: false,
          updated_at: new Date(0).toISOString(),
          creatorId: null,
          avatar: { type: 'group', url: null, letter: 'A', color: '#3B82F6' }
        };
      }

      setAdminConversation(finalAdminConv || null);
      setConversas(outrasConversas);

      // ✅ Reporta o total de mensagens não lidas para o componente pai
      if (onUnreadCountChange) {
        const totalNaoLidas = conversasFormatadas.reduce((acc, c) => acc + (c.naoLidas || 0), 0);
        onUnreadCountChange(totalNaoLidas);
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
    } finally {
      setLoading(false);
    }
  }, [user, onUnreadCountChange]);

  useEffect(() => {
    // ✅ CORREÇÃO: Busca as conversas na montagem inicial (mesmo fechado) e quando for aberto.
    // Isso garante que o contador de mensagens não lidas seja carregado imediatamente.
    if (user) {
      void fetchConversas();
    }
    // A dependência `isOpen` garante que a lista seja atualizada se o usuário
    // abrir o drawer após um tempo, mas a busca inicial já terá acontecido.
  }, [isOpen, user, fetchConversas]); // O comentário eslint-disable foi removido pois não é mais necessário.

  useEffect(() => {
    if (!isOpen) {
      setActiveConversation(null);
      setSearchTerm("");
      setView('list');
    }
  }, [isOpen]);

  // Realtime: Ouve por novas mensagens e atualiza a lista
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:mensagens')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'mensagens',
          filter: `remetente_id=neq.${user.id}` // ✅ CORREÇÃO: Só reage a mensagens de outros usuários
        },
        (payload) => {
          console.log('Nova mensagem recebida, atualizando conversas:', payload);
          void fetchConversas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversas]);

  const handleGroupCreated = (conversa: ConversaUI) => {
    setConversas(prev => [conversa, ...prev].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    setActiveConversation(conversa);
    setView('chat');
  };

  const handleConversationClick = async (conversa: ConversaUI) => {
    // ✅ CORREÇÃO: Lógica unificada para todos os cliques.

    // Se a conversa já existe de verdade (não é um placeholder), abre o chat.
    if (conversa.id && !conversa.id.startsWith('placeholder-admin-')) {
      setActiveConversation(conversa);
      setView('chat');
      return;
    }

    // Se a conversa não existe ou é o placeholder do admin, cria a conversa.
    if ((!conversa.id || conversa.id.startsWith('placeholder-admin-')) && conversa.outroParticipanteId) {
      setLoadingConversa(true);
      try {
        const { data: novaConversaData, error } = await supabase.functions.invoke('create_conversation_with_aluno', {
          body: { p_aluno_id: conversa.outroParticipanteId },
        });

        if (error || !novaConversaData || !novaConversaData.conversa_id) {
          throw new Error('ID da conversa inválido retornado pela função.');
        }

        const novaConversa: ConversaUI = {
          ...conversa,
          id: novaConversaData.conversa_id,
        };        setConversas(prev => prev.map(c => c.outroParticipanteId === novaConversa.outroParticipanteId ? novaConversa : c));
        setActiveConversation(novaConversa);
        setView('chat');
      } catch (error) {
        console.error('Erro ao iniciar conversa:', error);
      } finally {
        setLoadingConversa(false);
      }
    }
  };

  const filteredConversas = conversas.filter(conversa =>
    conversa.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBackClick = useCallback(() => {
    void fetchConversas();
    if (view === 'chat') {
      setActiveConversation(null);
    }
    setView(view === 'group-info' ? 'chat' : 'list');
  }, [view, fetchConversas]);

  const positionClasses = direction === 'right' ? 'right-0 border-l' : 'left-0 border-r';
  const transformClasses = isOpen ? 'translate-x-0' : (direction === 'right' ? 'translate-x-full' : '-translate-x-full');

  return (
    <div
      className={`fixed top-0 h-full w-full max-w-md bg-card shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${positionClasses} ${transformClasses}`}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div className="flex items-center p-4 border-b flex-shrink-0 gap-2">
        {(view === 'chat' || view === 'group-info') && (
          <Button variant="ghost" size="icon" onClick={handleBackClick} aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-lg font-semibold flex-1 truncate">
          {view === 'chat' && activeConversation ? activeConversation.nome : 
           view === 'group-info' ? 'Informações do Grupo' : 
           'Mensagens'}
        </h2>
        <div className="flex items-center flex-shrink-0">
          {view === 'list' && isProfessor && (
            <Button variant="ghost" size="icon" onClick={() => setView('create-group')}>
              <Users className="h-5 w-5" />
            </Button>
          )}
          {view === 'chat' && activeConversation?.isGroup && (
            <Button variant="ghost" size="icon" onClick={() => setView('group-info')}>
              <Settings className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto flex flex-col">
        {view === 'list' && (
          loading ? (
            <div className="flex justify-center items-center h-full p-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* 1. Card Fixo do Administrador */}
              {adminConversation && (
                <div className="p-4 border-b">
                  <Card
                    className="bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer transition-colors"
                    onClick={() => handleConversationClick(adminConversation)}
                  >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-blue-300">
                      <AvatarFallback className="bg-blue-500 text-white">
                        <ShieldAlert className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-blue-900">{adminConversation.nome}</p>
                      <p className="text-xs text-blue-700 truncate">{adminConversation.ultimaMsg || 'Nenhuma notificação'}</p>
                    </div>
                    <div>
                      {adminConversation.naoLidas > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{adminConversation.naoLidas}</span>
                      )}
                    </div>
                  </CardContent>
                  </Card>
                </div>
              )}

              {/* 1.5. Banner de Notificações */}
              {showNotificationBanner && (
                <div className="p-4 border-b">
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-amber-900 text-sm">Ative as notificações</p>
                        <p className="text-xs text-amber-700 mt-1">
                          Receba alertas quando receber novas mensagens, mesmo com o app fechado.
                        </p>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🔔 [Button] onClick disparado!');
                            handleEnableNotifications();
                          }}
                          disabled={isLoadingNotification}
                          size="sm"
                          type="button"
                          className="mt-2 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          {isLoadingNotification ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Ativando...
                            </>
                          ) : (
                            <>
                              <Bell className="h-3 w-3 mr-1" />
                              Ativar agora
                            </>
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNotificationBanner(false)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 2. Barra de Busca */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* 3. Lista de Conversas Rolável */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loadingConversa && (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {filteredConversas.length > 0 ? (
                  filteredConversas.map(conversa => (
                    <ConversaItem
                      key={conversa.id || conversa.outroParticipanteId}
                      conversa={conversa}
                      onClick={() => handleConversationClick(conversa)}
                    />
                  ))
                ) : (
                  <p className="p-4 text-center text-muted-foreground">Nenhuma conversa ou aluno encontrado.</p>
                )}
              </div>
            </>
          )
        )}
        {view === 'chat' && activeConversation && <ChatView conversa={activeConversation} />}
        {view === 'create-group' && (
          <CreateGroupView onCancel={() => setView('list')} onGroupCreated={handleGroupCreated} />
        )}
        {view === 'group-info' && activeConversation && (
          <GroupInfoView 
            conversa={activeConversation} 
            onBack={() => setView('chat')}
            onGroupUpdated={async (updatedName) => {
              await fetchConversas();
              // Atualiza a conversa ativa com o novo nome para refletir imediatamente na UI
              setActiveConversation(prev => prev ? { ...prev, nome: updatedName } : null);
            }}
            onGroupDeleted={() => {
              setActiveConversation(null);
              setView('list');
              void fetchConversas();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MessagesDrawer;