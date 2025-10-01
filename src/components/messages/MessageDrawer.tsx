import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, Loader2, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useConversas, ConversaUI } from "@/hooks/useConversas";
import { Input } from "../ui/input";
import { ChatView } from "./ChatView";
import { CreateGroupView } from "./CreateGroupView";

type View = 'list' | 'chat' | 'create-group';
interface MessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction?: 'left' | 'right';
}

const ConversaItem = ({ conversa, onClick }: { conversa: ConversaUI, onClick: () => void }) => (
  <div onClick={onClick} className="flex items-center p-3 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors">
    {conversa.avatar.type === 'image' && conversa.avatar.url ? (
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
    )}
    <div className="flex-1">
      <div className="flex items-center justify-between">
        <p className="font-semibold">{conversa.nome}</p>
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

const MessagesDrawer = ({ isOpen, onClose, direction = 'right' }: MessagesDrawerProps) => {
  const [view, setView] = useState<View>('list');
  const [activeConversation, setActiveConversation] = useState<ConversaUI | null>(null);
  const { conversas, loading, iniciarConversa, loadingConversa } = useConversas();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredConversas = conversas.filter(conversa =>
    conversa.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    if (!isOpen) {
      // Reset view when drawer is closed
      setActiveConversation(null);
      setSearchTerm("");
      setView('list');
    }
  }, [isOpen]);

  const handleBack = () => {
    setActiveConversation(null);
  };

  const handleConversationClick = async (conversa: ConversaUI) => {
    if (conversa.id) {
      setActiveConversation(conversa);
      setView('chat'); // ✅ Muda para a view do chat
    } else {
      const novaConversa = await iniciarConversa(conversa);
      if (novaConversa) {
        setActiveConversation(novaConversa);
        setView('chat'); // ✅ Muda para a view do chat
      } else {
        console.error("Não foi possível iniciar a conversa.");
      }
    }
  };

  const handleGroupCreated = (conversa: ConversaUI) => {
    setActiveConversation(conversa);
    setView('chat');
  };

  const positionClasses = direction === 'right'
    ? 'right-0 border-l'
    : 'left-0 border-r';
  const transformClasses = direction === 'right'
    ? (isOpen ? 'translate-x-0' : 'translate-x-full')
    : (isOpen ? 'translate-x-0' : '-translate-x-full');

  return (
    <div
      className={`fixed top-0 h-full w-full max-w-md bg-card shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${positionClasses} ${transformClasses}`}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        {view === 'chat' && (
          <Button variant="ghost" size="icon" onClick={() => setView('list')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-lg font-semibold">
          {view === 'chat' && activeConversation ? activeConversation.nome : 'Mensagens'}
        </h2>
        {view === 'list' && (
          <Button variant="ghost" size="icon" onClick={() => setView('create-group')}>
            <Users className="h-5 w-5" />
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-grow overflow-y-auto">
        {view === 'list' && (
          loading ? (
            <div className="flex justify-center items-center h-full p-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="p-2 space-y-1">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar conversa ou aluno..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
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
          )
        )}
        {view === 'chat' && activeConversation && <ChatView conversa={activeConversation} />}
        {view === 'create-group' && (
          <CreateGroupView onCancel={() => setView('list')} onGroupCreated={handleGroupCreated} />
        )}
      </div>
    </div>
  );
};

export default MessagesDrawer;