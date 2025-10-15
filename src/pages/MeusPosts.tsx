import React, { useState, useEffect, useCallback } from 'react';
import Modal from 'react-modal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from "@/components/ui/pagination";
import { 
  Plus,
  Edit,
  Newspaper,
  Trash2,
  Eye,
  MoreVertical,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

if (typeof window !== 'undefined') {
  Modal.setAppElement('#root');
}

type Post = Tables<'posts'>;

const MeusPosts = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const postsPerPage = 10;
  const [postParaExcluir, setPostParaExcluir] = useState<Post | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const carregarPosts = useCallback(async (page = 1) => {
    if (!user?.id) return;
    setLoading(true);
    setCurrentPage(page);

    try {
      const from = (page - 1) * postsPerPage;
      const to = from + postsPerPage - 1;

      const { data: postsData, error: postsError, count: totalCount } = await supabase
        .from('posts')
        .select('*', { count: 'exact' })
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (postsError) throw postsError;
      setPosts(postsData || []);
      setTotalPages(Math.ceil((totalCount || 0) / postsPerPage));

    } catch (error) {
      console.error('Erro ao carregar posts:', error);
      toast.error("Erro ao carregar posts.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void carregarPosts();
  }, [carregarPosts]);

  const abrirModalExclusao = (post: Post) => {
    setPostParaExcluir(post);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!postParaExcluir) return;
    setIsDeleting(true);
    try {
      const filesToDelete = [postParaExcluir.cover_image_desktop_url, postParaExcluir.cover_image_mobile_url].filter(Boolean) as string[];
      if (filesToDelete.length > 0) {
        const deletePromises = filesToDelete.map(filename =>
          supabase.functions.invoke('delete-media', { body: { filename, bucket_type: 'posts' } })
        );
        await Promise.all(deletePromises);
      }

      const { error } = await supabase.from('posts').delete().eq('id', postParaExcluir.id);
      if (error) throw error;
      await carregarPosts(currentPage);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
      toast.error("Erro ao excluir post", { description: message });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setPostParaExcluir(null);
    }
  };

  const handleCancelarExclusao = () => {
    if (isDeleting) return;
    setShowDeleteDialog(false);
    setPostParaExcluir(null);
  };

  const formatarDataRelativa = (data: string) => {
    const dataPost = new Date(data);
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(dataPost);
  };

  return (
    <>
      <div className="space-y-6">
        {isDesktop && (
          <div>
            <h1 className="text-3xl font-bold">Meus Posts</h1>
            <p className="text-muted-foreground">Gerencie todos os seus artigos e publicações.</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Newspaper className="h-5 w-5" />
              Gerenciamento de Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8"><p>Carregando posts...</p></div>
            ) : posts.length > 0 ? (
              <>
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div key={post.id} className="flex items-center gap-4 pt-4 border-t first:pt-0 first:border-t-0">
                      <div className="flex-1">
                        <h4 className="font-medium">{post.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {post.status === 'published' ? 'Publicado' : 'Rascunho'} em {formatarDataRelativa(post.created_at)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 md:h-8 md:w-8 rounded-full p-0 flex-shrink-0 [&_svg]:size-6 md:[&_svg]:size-4"><MoreVertical /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/blog/${post.slug}`)} disabled={post.status !== 'published'}><Eye className="mr-2 h-4 w-4" />Ver Publicação</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/posts/editar/${post.slug}`)}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => abrirModalExclusao(post)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-4 pt-4 border-t">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); carregarPosts(currentPage - 1); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
                        {[...Array(totalPages)].map((_, i) => (<PaginationItem key={i}><PaginationLink href="#" onClick={(e) => { e.preventDefault(); carregarPosts(i + 1); }} isActive={currentPage === i + 1}>{i + 1}</PaginationLink></PaginationItem>))}
                        <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); carregarPosts(currentPage + 1); }} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} /></PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Você ainda não criou nenhum post.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        <Button
          onClick={() => navigate('/posts/novo')}
          className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
          aria-label="Novo Post"
        ><Plus /></Button>
      </div>

      <Modal isOpen={showDeleteDialog} onRequestClose={() => {}} shouldCloseOnOverlayClick={false} shouldCloseOnEsc={false} className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none" overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="flex items-center gap-2 mb-4"><AlertTriangle className="h-5 w-5 text-red-500" /><h2 className="text-lg font-semibold">Excluir Post</h2></div>
        <div className="mb-6"><p className="text-sm text-gray-600 leading-relaxed">Tem certeza que deseja excluir o post <span className="font-semibold text-gray-900">"{postParaExcluir?.title}"</span>?</p><p className="text-sm text-gray-600 mt-2">Esta ação não pode ser desfeita.</p></div>
        <div className="flex gap-3 justify-end"><Button variant="outline" onClick={handleCancelarExclusao} disabled={isDeleting}>Cancelar</Button><Button variant="destructive" onClick={handleConfirmarExclusao} disabled={isDeleting} className="flex items-center gap-2">{isDeleting ? 'Excluindo...' : 'Excluir'}</Button></div>
      </Modal>
    </>
  );
};

export default MeusPosts;