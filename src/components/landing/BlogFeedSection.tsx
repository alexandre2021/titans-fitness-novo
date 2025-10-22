import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Utensils, Dumbbell, HeartPulse, BrainCircuit, Zap, Stethoscope, FlaskConical, TrendingUp, ShieldCheck, Search, MoreHorizontal } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Post = {
  id: string;
  category: 'Nutrição' | 'Treino' | 'Bem-estar' | 'Mentalidade' | string;
  title: string;
  excerpt: string;
  imageUrl: string;
  slug: string;
};

const postCategories = ["Todos", "Exercícios", "Planos de Treino", "Nutrição", "Suplementação", "Recuperação", "Bem-estar", "Saúde mental", "Tendências", "Ciência", "Performance"];

const categoryStyles = {
  Nutrição: { icon: Utensils, color: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  Exercícios: { icon: Dumbbell, color: 'text-blue-500', badge: 'bg-blue-100 text-blue-800' },
  'Planos de Treino': { icon: Dumbbell, color: 'text-sky-500', badge: 'bg-sky-100 text-sky-800' },
  'Bem-estar': { icon: HeartPulse, color: 'text-rose-500', badge: 'bg-rose-100 text-rose-800' },
  'Saúde mental': { icon: BrainCircuit, color: 'text-purple-500', badge: 'bg-purple-100 text-purple-800' },
  Suplementação: { icon: Stethoscope, color: 'text-cyan-500', badge: 'bg-cyan-100 text-cyan-800' },
  Recuperação: { icon: ShieldCheck, color: 'text-indigo-500', badge: 'bg-indigo-100 text-indigo-800' },
  Tendências: { icon: TrendingUp, color: 'text-orange-500', badge: 'bg-orange-100 text-orange-800' },
  Ciência: { icon: FlaskConical, color: 'text-pink-500', badge: 'bg-pink-100 text-pink-800' },
  Performance: { icon: Zap, color: 'text-yellow-500', badge: 'bg-yellow-100 text-yellow-800' },
  // Fallback style
  default: { icon: Dumbbell, color: 'text-gray-500', badge: 'bg-gray-100 text-gray-800' },
};

const BlogFeedSection = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6; // Alterado de 8 para 6
  const location = useLocation();

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, excerpt, category, cover_image_desktop_url, slug')
          .eq('status', 'published')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const postsWithImages = await Promise.all(
          data.map(async (post) => {
            const { data: imageUrlData } = await supabase.functions.invoke('get-image-url', {
              body: { filename: post.cover_image_desktop_url, bucket_type: 'posts' },
            });

            return {
              ...post,
              category: post.category || 'Exercícios',
              excerpt: post.excerpt || '', // Removido o texto de fallback
              imageUrl: imageUrlData?.url || '', // Usar a URL da Edge Function
            };
          })
        );

        setPosts(postsWithImages);
      } catch (error) {
        console.error("Erro ao buscar posts:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchPosts();
  }, [location.pathname]);

  const filteredPosts = posts.filter(post => {
    const matchesCategory = selectedCategory === 'Todos' || post.category === selectedCategory;
    const matchesSearch = searchTerm === '' ||
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  return (
    <>
        <div className="mb-12 grid gap-4 md:grid-cols-3 max-w-4xl mx-auto w-full">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              {postCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-4 w-1/4 mt-2" />
                </CardContent>
              </Card>
            ))
          ) : (
            paginatedPosts.map((post) => {
            const styles = categoryStyles[post.category as keyof typeof categoryStyles] || categoryStyles.default;
            const Icon = styles.icon;

            return (
              <Link to={`/blog/${post.slug}`} key={post.id} className="group">
                <Card className="h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`h-4 w-4 ${styles.color}`} />
                      <Badge variant="outline" className={`text-xs font-semibold ${styles.badge}`}>
                        {post.category}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground text-sm flex-1">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center text-sm font-medium text-primary group-hover:underline">
                      Ler mais <ArrowRight className="h-4 w-4 ml-1 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          }))}
        </div>

        {totalPages > 1 && (
          <div className="mt-12 pt-8 border-t">
            <Pagination>
              <PaginationContent>
                <PaginationItem className="mr-4">
                  <PaginationLink 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.max(1, p - 1)); }}
                    className={`whitespace-nowrap gap-1 pl-2.5 ${currentPage === 1 ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    Anterior
                  </PaginationLink>
                </PaginationItem>
                
                {(() => {
                  const pageNumbers = [];
                  const siblingCount = 1;
                  const totalPageNumbers = siblingCount + 5;

                  if (totalPages <= totalPageNumbers) {
                    for (let i = 1; i <= totalPages; i++) {
                      pageNumbers.push(i);
                    }
                  } else {
                    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
                    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
                    const shouldShowLeftDots = leftSiblingIndex > 2;
                    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

                    pageNumbers.push(1);
                    if (shouldShowLeftDots) pageNumbers.push('...');
                    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
                      pageNumbers.push(i);
                    }
                    if (shouldShowRightDots) pageNumbers.push('...');
                    pageNumbers.push(totalPages);
                  }

                  return pageNumbers.map((page, index) => (
                    <PaginationItem key={`${page}-${index}`}>
                      {page === '...' ? <span className="flex h-9 w-9 items-center justify-center"><MoreHorizontal className="h-4 w-4" /></span> : <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(page as number); }} isActive={currentPage === page}>{page}</PaginationLink>}
                    </PaginationItem>
                  ));
                })()}

                <PaginationItem className="ml-4">
                  <PaginationLink 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                    className={`whitespace-nowrap gap-1 pr-2.5 ${currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}`}
                  >
                    Próximo
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
    </>
  );
};

export default BlogFeedSection;