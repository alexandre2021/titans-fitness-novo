import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LifeBuoy, Send, X, Loader2, Bot } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { pipeline, env, FeatureExtractionPipeline } from '@xenova/transformers';

// Configuração do Transformers.js para não usar modelos locais no navegador
env.allowLocalModels = false;

// Singleton para garantir que o modelo de embedding seja carregado apenas uma vez
class PipelineSingleton {
  static instance: FeatureExtractionPipeline | null = null;
  static async getInstance(): Promise<FeatureExtractionPipeline> {
    if (this.instance === null) {
      this.instance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
    }
    return this.instance;
  }
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

const HelpChat = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Efeito para inicializar a mensagem de boas-vindas quando o chat é aberto
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'initial',
          text: 'Olá! Sou Cronos, seu assistente de IA. Como posso ajudar você a usar a plataforma Titans Fitness hoje?',
          sender: 'ai',
        },
      ]);
    }
  }, [isOpen, messages.length]);

  // Efeito para rolar para a última mensagem
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    const question = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsEmbedding(true);

    try {
      // 1. Gerar o embedding no lado do cliente
      const extractor = await PipelineSingleton.getInstance();
      const output = await extractor(question, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);

      setIsEmbedding(false);

      // 2. Chamar a Edge Function com a pergunta e o embedding
      const { data, error } = await supabase.functions.invoke('ask-ai-help-center', {
        body: { question, embedding },
      });

      if (error) throw new Error(error.message);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply || "Desculpe, não consegui processar sua pergunta no momento.",
        sender: 'ai',
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast.error("Erro ao contatar o assistente", { description: errorMessage });
      
      const errorAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Desculpe, estou com problemas para me conectar. Por favor, tente novamente mais tarde.",
        sender: 'ai',
      };
      setMessages(prev => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
      setIsEmbedding(false);
    }
  };

  return (
    <>
      {/* Botão Flutuante - Comentado para desativar temporariamente a funcionalidade */}
      {/* <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full h-16 w-16 p-0 shadow-lg flex items-center justify-center bg-primary hover:bg-primary/90"
          aria-label="Abrir Central de Ajuda"
        >
          {isOpen ? <X className="h-8 w-8" /> : <LifeBuoy className="h-8 w-8" />}
        </Button>
      </div> */}

      {/* Janela do Chat */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l shadow-2xl">
          <div className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <div className="flex items-center gap-3">
                <Bot className="h-6 w-6" />
                <CardTitle className="text-lg">Assistente Titans</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-hidden">
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="space-y-4 pr-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 ${
                        message.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.sender === 'ai' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                          message.sender === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Bot className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-muted flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-xs">{isEmbedding ? 'Analisando...' : 'Buscando...'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4">
              <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                <Input
                  id="message"
                  placeholder="Digite sua dúvida..."
                  className="flex-1"
                  autoComplete="off"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={isLoading}
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Enviar</span>
                </Button>
              </form>
            </CardFooter>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpChat;