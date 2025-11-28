// src/components/messages/ChatView.tsx
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Smile, ShieldAlert, Trash2 } from 'lucide-react';
import { useMensagens } from '@/hooks/useMensagens';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

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

interface ChatViewProps {
  conversa: ConversaUI;
  onEditGroup?: () => void;
}

const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  
  if (isToday(date)) {
    return format(date, 'HH:mm', { locale: ptBR });
  } else if (isYesterday(date)) {
    return `Ontem ${format(date, 'HH:mm', { locale: ptBR })}`;
  } else {
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  }
};

export const ChatView = ({ conversa, onEditGroup }: ChatViewProps) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const { mensagens, loading, sending, enviarMensagem, deletarMensagem } = useMensagens(conversa.id);

  const ADMIN_USER_ID = import.meta.env.VITE_ADMIN_USER_ID;
  const isReadOnly = conversa.outroParticipanteId === ADMIN_USER_ID;

  useEffect(() => {
    if (mensagens.length > 0) {
      if (isInitialLoad.current) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isInitialLoad.current = false;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [mensagens]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [inputValue]);

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    const success = await enviarMensagem(inputValue);
    if (success) {
      setInputValue('');
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInputValue(prev => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;

    setDeletingMessageId(messageToDelete);
    await deletarMensagem(messageToDelete);
    setDeletingMessageId(null);
    setMessageToDelete(null);
  };

  const cancelDelete = () => {
    setMessageToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            {isReadOnly ? (
              <p>Nenhuma mensagem do sistema</p>
            ) : (
              <>
                <p>Nenhuma mensagem ainda.</p>
                <p className="text-sm mt-2">Envie a primeira mensagem para {conversa.nome}</p>
              </>
            )}
          </div>
        ) : (
          <>
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} gap-2 group`}
              >
                {!msg.isMine && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        conversa.isGroup && msg.remetente?.avatar_url
                          ? msg.remetente.avatar_url
                          : conversa.avatar.url
                      }
                      alt={
                        conversa.isGroup && msg.remetente?.nome
                          ? msg.remetente.nome
                          : conversa.nome
                      }
                    />
                    <AvatarFallback
                      style={{
                        backgroundColor:
                          conversa.isGroup && msg.remetente?.avatar_color
                            ? msg.remetente.avatar_color
                            : conversa.avatar.color || '#ccc',
                        color: 'white',
                      }}
                      className="text-sm font-semibold"
                    >
                      {isReadOnly ? (
                        <ShieldAlert className="h-4 w-4" />
                      ) : (
                        (conversa.isGroup && msg.remetente?.avatar_letter) || conversa.avatar.letter || conversa.nome.charAt(0).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 inline-block ${
                      msg.isMine
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {!msg.isMine && conversa.isGroup && msg.remetente && (
                      <p className="text-xs font-bold text-primary mb-1">
                        {msg.remetente.nome}
                      </p>
                    )}
                    <p className="break-words whitespace-pre-wrap">{msg.conteudo}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {formatMessageTime(msg.created_at)}
                    </p>
                  </div>
                  {msg.isMine && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingMessageId === msg.id}
                    >
                      {deletingMessageId === msg.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {!isReadOnly && (
        <div className="p-4 border-t flex items-start gap-2 flex-shrink-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 border-0 z-[200]">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                lazyLoadEmojis
              />
            </PopoverContent>
          </Popover>
          <textarea
            ref={textareaRef}
            placeholder="Digite uma mensagem..."
            rows={1}
            className="flex-grow bg-muted p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none overflow-y-auto max-h-32"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !inputValue.trim()}>
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      )}

      <AlertDialog open={messageToDelete !== null} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent className="z-[250]">
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta mensagem será apagada para todos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};