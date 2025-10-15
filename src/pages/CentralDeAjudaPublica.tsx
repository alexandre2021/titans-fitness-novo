import { useState, useEffect } from "react";
import { useQuery } from '@tanstack/react-query';
import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import { supabase } from '@/integrations/supabase/client';
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

// --- Funções de Destaque ---
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightText = (text: string, query: string) => {
  if (!text || !query.trim()) return text;
  const escapedQuery = escapeRegExp(query.trim());
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  return text.replace(regex, `<mark class="bg-yellow-200 px-1 rounded">$1</mark>`);
};

// --- Componente para um Artigo ---
const ArticleItem = ({ article, searchTerm }: { article: Article, searchTerm: string }) => {
  return (
    <AccordionItem value={article.id} className="border rounded-md bg-background">
      <AccordionTrigger className="px-3 py-2 hover:no-underline">
        <div className="flex items-center gap-2 w-full">
          <span className="flex-1 truncate text-left" dangerouslySetInnerHTML={{ __html: highlightText(article.title, searchTerm) }} />
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pt-0 pb-4 ml-10">
        <div className="prose prose-sm max-w-none dark:prose-invert [&_h1]:font-bold [&_h1]:text-3xl [&_h2]:font-bold [&_h2]:text-2xl [&_h3]:font-semibold [&_h3]:text-xl" dangerouslySetInnerHTML={{ __html: highlightText(article.content, searchTerm) }} />
      </AccordionContent>
    </AccordionItem>
  );
};

// --- Componente para uma Categoria ---
const CategorySection = ({ category, articles, searchTerm }: GroupedArticles & { searchTerm: string }) => {
  return (
    <AccordionItem value={category} className="border rounded-lg bg-card mb-4">
      <AccordionTrigger className="text-xl font-semibold px-6 py-4 hover:no-underline text-left">
        <div className="flex items-center gap-3 w-full">
          <span className="flex-1">{category}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pt-0 pb-4">
        <div className="space-y-2">
          <Accordion type="multiple" className="w-full space-y-2" defaultValue={searchTerm ? articles.map(a => a.id) : []}>
            {articles.map(article => <ArticleItem key={article.id} article={article} searchTerm={searchTerm} />)}
          </Accordion>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

const CentralDeAjudaPublica = () => {
  const [groupedArticles, setGroupedArticles] = useState<GroupedArticles[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState<'aluno' | 'professor'>(
    'professor'
  );

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ['knowledge_base_articles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('knowledge_base_articles').select('*');
      if (error) throw new Error(error.message);
      return (data as Article[]) || [];
    },
  });

  useEffect(() => {
    if (articles) {
      // 1. Filtra por tipo de usuário (aluno/professor)
      const userTypeFilteredArticles = articles.filter(article => {
        if (userTypeFilter === 'aluno') {
          return article.user_type === 'aluno' || article.user_type === 'ambos';
        }
        if (userTypeFilter === 'professor') {
          return article.user_type === 'professor' || article.user_type === 'ambos';
        }
        return false;
      });

      let articlesToDisplay = userTypeFilteredArticles;

      // 2. Se houver busca, filtra pelo termo
      if (searchTerm.trim()) {
        articlesToDisplay = userTypeFilteredArticles.filter(article =>
          article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          article.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // 3. Agrupa os artigos (já filtrados)
      const grouped = articlesToDisplay.reduce((acc, article) => {
        const category = article.category || 'Sem Categoria';
        if (!acc[category]) {
          acc[category] = { category, order: article.category_order ?? 0, articles: [] };
        }
        acc[category].articles.push(article);
        return acc;
      }, {} as Record<string, GroupedArticles>);

      // 4. Ordena os artigos dentro de cada grupo
      Object.values(grouped).forEach(group => {
        group.articles.sort((a, b) => (a.article_order ?? 0) - (b.article_order ?? 0));
      });

      // 5. Ordena os grupos
      const sortedGroups = Object.values(grouped).sort((a, b) => a.order - b.order);
      setGroupedArticles(sortedGroups);
    }
  }, [articles, userTypeFilter, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LandingHeader />
        <main>
          <section className="py-12 md:py-20">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-lg text-muted-foreground">Carregando artigos...</p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <LandingFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl space-y-6">
            {/* Seletor movido para o topo e centralizado */}
            <Tabs
              value={userTypeFilter}
              onValueChange={(value) => setUserTypeFilter(value as 'aluno' | 'professor')}
              className="w-full max-w-md mx-auto"
            >
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="professor" className="text-base">Para Professores</TabsTrigger>
                <TabsTrigger value="aluno" className="text-base">Para Alunos</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="text-center pt-4">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
                Central de Ajuda
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Encontre respostas para suas dúvidas sobre a plataforma.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Busque por artigos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>

            <Accordion type="multiple" className="w-full space-y-4">
              {groupedArticles.map((group) => (
                <CategorySection
                  key={group.category}
                  {...group}
                  searchTerm={searchTerm}
                />
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default CentralDeAjudaPublica;