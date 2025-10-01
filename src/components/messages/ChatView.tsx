// src/components/messages/ChatView.tsx
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Smile } from 'lucide-react';
import { useMensagens } from '@/hooks/useMensagens';
import { ConversaUI } from '@/hooks/useConversas';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

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
  const { mensagens, loading, sending, enviarMensagem } = useMensagens(conversa.id);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (mensagens.length > 0) {
      if (isInitialLoad.current) {
        // Rolagem instantânea na primeira carga
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        isInitialLoad.current = false;
      } else {
        // Rolagem suave para novas mensagens
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [mensagens]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reseta a altura para calcular o novo scrollHeight
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Nenhuma mensagem ainda.</p>
            <p className="text-sm mt-2">Envie a primeira mensagem para {conversa.nome}</p>
          </div>
        ) : (
          <>
            {mensagens.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} gap-2`}
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
                      {(conversa.isGroup && msg.remetente?.avatar_letter) || conversa.avatar.letter || conversa.nome.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
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
                  <p className="whitespace-pre-wrap break-words">{msg.conteudo}</p>
                  <p
                    className={`text-xs mt-1 ${
                      msg.isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}
                  >
                    {formatMessageTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input de mensagem */}
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
    </div>
  );
};