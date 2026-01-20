import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Search, Loader2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  user_type: 'ambos' | 'aluno' | 'professor';
  category_order: number;
  article_order: number;
};

type GroupedArticles = {
  category: string;
  order: number;
  articles: Article[];
};

interface HelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction?: 'left' | 'right';
}

// Função para destacar texto da busca
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  const escapedQuery = escapeRegExp(query.trim());
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, `<mark class="bg-yellow-200 px-1 rounded">$1</mark>`);
};

// Componente para um artigo individual
const ArticleItem = ({ article, searchTerm }: { article: Article; searchTerm: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <span
          className="font-medium text-sm"
          dangerouslySetInnerHTML={{ __html: highlightText(article.title, searchTerm) }}
        />
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>
      {isExpanded && (
        <div
          className="px-3 pb-3 prose prose-sm max-w-none dark:prose-invert text-muted-foreground [&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-2"
          dangerouslySetInnerHTML={{
            __html: searchTerm
              ? highlightText(article.content, searchTerm)
              : article.content
          }}
        />
      )}
    </div>
  );
};

const HelpDrawer = ({ isOpen, onClose, direction = 'left' }: HelpDrawerProps) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [userType, setUserType] = useState<'aluno' | 'professor'>('professor');

  // Detectar tipo de usuário
  useEffect(() => {
    if (user?.user_metadata?.user_type) {
      setUserType(user.user_metadata.user_type);
    }
  }, [user]);

  // Buscar artigos
  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ['knowledge_base_articles_help'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base_articles')
        .select('*')
        .order('category_order', { ascending: true })
        .order('article_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data as Article[]) || [];
    },
    staleTime: 60000, // 1 minuto
    enabled: isOpen, // Só carrega quando drawer está aberto
  });

  // Filtrar e agrupar artigos
  const groupedArticles = useMemo(() => {
    if (!articles) return [];

    // Filtrar por tipo de usuário
    let filtered = articles.filter(
      article => article.user_type === 'ambos' || article.user_type === userType
    );

    // Filtrar por busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        article =>
          article.title.toLowerCase().includes(term) ||
          article.content.toLowerCase().includes(term) ||
          article.category.toLowerCase().includes(term)
      );
    }

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

    // Ordenar categorias
    return Object.values(grouped).sort((a, b) => a.order - b.order);
  }, [articles, userType, searchTerm]);

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

      {/* Busca */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar na Central de Ajuda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-grow overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full p-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : groupedArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhum resultado encontrado para sua busca."
                : "Nenhum artigo de ajuda disponível."
              }
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {groupedArticles.map((group) => (
              <AccordionItem key={group.category} value={group.category}>
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <span
                    className="font-semibold text-left"
                    dangerouslySetInnerHTML={{ __html: highlightText(group.category, searchTerm) }}
                  />
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  {group.articles.map((article) => (
                    <ArticleItem
                      key={article.id}
                      article={article}
                      searchTerm={searchTerm}
                    />
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
