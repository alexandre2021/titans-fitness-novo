import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Search, Loader2, ChevronRight, ThumbsUp, ThumbsDown, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Article = {
  id: string;
  title: string;
  content: string;
  category: string;
  description: string | null;
  user_type: 'ambos' | 'aluno' | 'professor';
  category_order: number;
  article_order: number;
};

type GroupedArticles = {
  category: string;
  order: number;
  articles: Article[];
};

type AISearchResult = {
  found: boolean;
  fromCache?: boolean;
  cacheId?: string;
  article?: {
    id: string;
    title: string;
    content: string;
    category: string;
  };
  message?: string;
  error?: string;
};

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction?: 'left' | 'right';
}

// Componente para um artigo individual
const ArticleItem = ({ article, isExpanded: initialExpanded = false, onToggle }: {
  article: Article;
  isExpanded?: boolean;
  onToggle?: () => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  useEffect(() => {
    setIsExpanded(initialExpanded);
  }, [initialExpanded]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  };

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{article.title}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      {isExpanded && (
        <div
          className="px-3 pb-3 prose prose-sm max-w-none dark:prose-invert text-muted-foreground [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-2"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      )}
    </div>
  );
};

const HelpDrawer = ({ isOpen, onClose, direction = 'left' }: HelpDrawerProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [userType, setUserType] = useState<'aluno' | 'professor'>('professor');

  // Estado para busca por IA
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiResult, setAiResult] = useState<AISearchResult | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // Detectar tipo de usuário
  useEffect(() => {
    if (user?.user_metadata?.user_type) {
      setUserType(user.user_metadata.user_type);
    }
  }, [user]);

  // Limpar busca ao fechar drawer
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setAiResult(null);
      setFeedbackGiven(false);
    }
  }, [isOpen]);

  // Buscar artigo via IA
  const handleAISearch = useCallback(async () => {
    if (!searchTerm.trim() || searchTerm.trim().length < 3) return;

    setIsAISearching(true);
    setAiResult(null);
    setFeedbackGiven(false);

    try {
      const { data, error } = await supabase.functions.invoke('ask-help-center', {
        body: { question: searchTerm, userType },
      });

      if (error) throw error;
      setAiResult(data as AISearchResult);
    } catch (err) {
      console.error('Erro na busca IA:', err);
      setAiResult({ found: false, error: 'Falha na busca. Tente novamente.' });
    } finally {
      setIsAISearching(false);
    }
  }, [searchTerm, userType]);

  // Enviar feedback
  const handleFeedback = useCallback(async (helpful: boolean) => {
    if (!aiResult?.cacheId) return;

    try {
      if (helpful) {
        // Feedback positivo: marca como útil no cache
        await (supabase as any)
          .from('help_search_cache')
          .update({ helpful: true })
          .eq('id', aiResult.cacheId);
      } else {
        // Feedback negativo: notifica admin e remove do cache
        const adminId = import.meta.env.VITE_ADMIN_USER_ID;
        const userName = user?.user_metadata?.nome_completo || user?.email || 'Usuário';

        if (adminId && aiResult.article) {
          // Enviar notificação ao admin
          await supabase.functions.invoke('enviar-notificacao', {
            body: {
              destinatario_id: adminId,
              conteudo: `❓ Feedback negativo na Central de Ajuda:\n\n👤 ${userName}\n💬 "${searchTerm}"\n📄 Artigo sugerido: "${aiResult.article.title}"\n\nO usuário indicou que a resposta não foi útil.`
            }
          });
        }

        // Remove do cache
        await (supabase as any)
          .from('help_search_cache')
          .delete()
          .eq('id', aiResult.cacheId);
      }

      setFeedbackGiven(true);
      toast.success(helpful ? 'Obrigado pelo feedback!' : 'Obrigado! Vamos melhorar.');
    } catch (err) {
      console.error('Erro ao enviar feedback:', err);
    }
  }, [aiResult?.cacheId, aiResult?.article, user, searchTerm]);

  // Handler para Enter na busca
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim().length >= 3) {
      handleAISearch();
    }
  };

  // Buscar artigos
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ['knowledge_base_articles_help'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select('id, title, content, category, description, user_type, category_order, article_order')
        .order('category_order', { ascending: true })
        .order('article_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as unknown as Article[]) || [];
    },
    staleTime: 60000,
    enabled: isOpen,
  });

  // Filtrar e agrupar artigos por categoria
  const groupedArticles = useMemo(() => {
    if (!articles) return [];

    // Filtrar por tipo de usuário
    const filtered = articles.filter(
      article => article.user_type === 'ambos' || article.user_type === userType
    );

    // Agrupar por categoria
    const grouped: Record<string, GroupedArticles> = {};
    filtered.forEach(article => {
      if (!grouped[article.category]) {
        grouped[article.category] = {
          category: article.category,
          order: article.category_order,
          articles: [],
        };
      }
      grouped[article.category].articles.push(article);
    });

    return Object.values(grouped).sort((a, b) => a.order - b.order);
  }, [articles, userType]);

  const positionClasses = direction === 'right' ? 'right-0 border-l' : 'left-0 border-r';
  const transformClasses = isOpen
    ? 'translate-x-0'
    : (direction === 'right' ? 'translate-x-full' : '-translate-x-full');

  return (
    <div
      className={`fixed top-0 h-full w-full max-w-md bg-card shadow-2xl z-[100] transform transition-transform duration-300 ease-in-out ${positionClasses} ${transformClasses}`}
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <h2 className="text-lg font-semibold">Central de Ajuda</h2>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Busca com IA */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Faça uma pergunta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
              disabled={isAISearching}
            />
          </div>
          <Button
            onClick={handleAISearch}
            disabled={isAISearching || searchTerm.trim().length < 3}
            size="icon"
            variant="default"
            className="flex-shrink-0"
          >
            {isAISearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Digite sua dúvida e pressione Enter ou clique no botão
        </p>
      </div>

      {/* Conteúdo */}
      <div className="flex-grow overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full p-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : aiResult ? (
          // Resultado da busca por IA
          <div>
            {aiResult.found && aiResult.article ? (
              <div className="p-4">
                {/* Badge de resultado IA */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                    <Sparkles className="h-3 w-3" />
                    {aiResult.fromCache ? 'Resposta encontrada' : 'IA encontrou'}
                  </span>
                  <span className="text-xs text-muted-foreground">{aiResult.article.category}</span>
                </div>

                {/* Artigo encontrado */}
                <div className="border rounded-lg overflow-hidden bg-card">
                  <div className="p-4 border-b bg-muted/30">
                    <h3 className="font-semibold">{aiResult.article.title}</h3>
                  </div>
                  <div
                    className="p-4 prose prose-sm max-w-none dark:prose-invert text-muted-foreground [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-2"
                    dangerouslySetInnerHTML={{ __html: aiResult.article.content }}
                  />
                </div>

                {/* Feedback */}
                {aiResult.cacheId && !feedbackGiven && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Esta resposta foi útil?</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeedback(true)}
                        className="flex-1"
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Sim
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeedback(false)}
                        className="flex-1"
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Não
                      </Button>
                    </div>
                  </div>
                )}

                {feedbackGiven && (
                  <p className="mt-4 text-sm text-muted-foreground text-center">
                    Obrigado pelo seu feedback!
                  </p>
                )}

                {/* Navegue por mais */}
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm font-medium mb-3">Navegue por mais artigos:</p>
                  <Accordion type="multiple" className="w-full">
                    {groupedArticles.map((group) => (
                      <AccordionItem key={group.category} value={group.category}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                          <span className="font-semibold text-left">{group.category}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          {group.articles.map((article) => (
                            <ArticleItem key={article.id} article={article} />
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            ) : (
              // Nenhum resultado da IA
              <div className="p-4 text-center">
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full mb-3">
                  <Sparkles className="h-3 w-3" />
                  Busca por IA
                </div>
                <p className="text-muted-foreground mb-2">
                  {aiResult.message || aiResult.error || 'Não encontrei um artigo para sua pergunta.'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Tente reformular ou navegue pelas categorias abaixo.
                </p>

                <div className="mt-6 pt-4 border-t text-left">
                  <Accordion type="multiple" className="w-full">
                    {groupedArticles.map((group) => (
                      <AccordionItem key={group.category} value={group.category}>
                        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                          <span className="font-semibold text-left">{group.category}</span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0">
                          {group.articles.map((article) => (
                            <ArticleItem key={article.id} article={article} />
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            )}
          </div>
        ) : groupedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-muted-foreground">
              Nenhum artigo de ajuda disponível.
            </p>
          </div>
        ) : (
          // Lista padrão de categorias
          <Accordion type="multiple" className="w-full">
            {groupedArticles.map((group) => (
              <AccordionItem key={group.category} value={group.category}>
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <span className="font-semibold text-left">{group.category}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  {group.articles.map((article) => (
                    <ArticleItem key={article.id} article={article} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default HelpDrawer;
