// src/pages/IndexProfessor.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Modal from 'react-modal';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationEllipsis, PaginationNext } from "@/components/ui/pagination";
import { 
  Users,
  Dumbbell,
  Plus,
  Target,
  ClipboardList,
  Edit,
  Newspaper,
  Trash2,
  Eye,
  MoreVertical,
  ChevronDown,
  AlertTriangle,
  X
} from 'lucide-react';
import { useMediaQuery } from "@/hooks/use-media-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

// Configurar o react-modal para acessibilidade
if (typeof window !== 'undefined') {
  Modal.setAppElement('#root');
}

interface DashboardStats {
  alunosAtivos: number;
  rotinasAtivas: number;
  meusModelos: number;
  exerciciosPersonalizados: number;
}

type Post = Tables<'posts'>;

const IndexProfessor = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    alunosAtivos: 0,
    rotinasAtivas: 0,
    meusModelos: 0,
    exerciciosPersonalizados: 0
  });
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const postsPerPage = 5;
  const [postParaExcluir, setPostParaExcluir] = useState<Post | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Carregar estatísticas principais e posts recentes
  const carregarDados = useCallback(async (page = 1) => {
    if (!user?.id) return;
    setLoading(true);
    setCurrentPage(page);

    try {
      // Executa as contagens em paralelo para otimizar
      // Fetch stats
      const { count: seguidores } = await supabase.from('alunos_professores').select('aluno_id', { count: 'exact', head: true }).eq('professor_id', user.id);
      const { count: rotinasAtivas } = await supabase.from('rotinas').select('id', { count: 'exact', head: true }).eq('professor_id', user.id).eq('status', 'Ativa');
      const { count: meusModelos } = await supabase.from('modelos_rotina').select('id', { count: 'exact', head: true }).eq('professor_id', user.id);
      const { count: exerciciosPersonalizados } = await supabase.from('exercicios').select('id', { count: 'exact', head: true }).eq('professor_id', user.id).eq('is_ativo', true);
      
      setStats({
        alunosAtivos: seguidores || 0,
        rotinasAtivas: rotinasAtivas || 0,
        meusModelos: meusModelos || 0,
        exerciciosPersonalizados: exerciciosPersonalizados || 0
      });
      
      // Fetch recent posts
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
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  
  const abrirModalExclusao = (post: Post) => {
    setPostParaExcluir(post);
    setShowDeleteDialog(true);
  };

  const handleConfirmarExclusao = async () => {
    if (!postParaExcluir) return;
    try {
      setIsDeleting(true);
      const filesToDelete = [];
      if (postParaExcluir.cover_image_desktop_url) {
        filesToDelete.push(postParaExcluir.cover_image_desktop_url);
      }
      if (postParaExcluir.cover_image_mobile_url) {
        filesToDelete.push(postParaExcluir.cover_image_mobile_url);
      }

      if (filesToDelete.length > 0) {
        // Chama a função para cada arquivo individualmente
        const deletePromises = filesToDelete.map(filename =>
          supabase.functions.invoke('delete-media', {
            body: { filename, bucket_type: 'posts' },
          })
        );
        await Promise.all(deletePromises);
      }

      // Deleta o post do banco
      const { error } = await supabase.from('posts').delete().eq('id', postParaExcluir.id);
      if (error) throw error;
      toast.success("Post excluído com sucesso!");
      // Recarrega os dados da página atual
      await carregarDados(currentPage);
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

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const formatarDataRelativa = (data: string) => {
    const agora = new Date();
    const dataConvite = new Date(data);

    // Zera a hora, minuto e segundo para comparar apenas os dias (no fuso horário local)
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const diaConvite = new Date(dataConvite.getFullYear(), dataConvite.getMonth(), dataConvite.getDate());

    const diferencaMs = hoje.getTime() - diaConvite.getTime();
    const diferencaDias = Math.round(diferencaMs / (1000 * 60 * 60 * 24));

    if (diferencaDias === 0) return 'Hoje';
    if (diferencaDias === 1) return 'Ontem';
    if (diferencaDias > 1 && diferencaDias < 7) return `${diferencaDias} dias atrás`;
    
    // Para datas mais antigas, formata para o padrão BR
    return new Intl.DateTimeFormat('pt-BR').format(dataConvite);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando Inicial...</p>
          </div>
        </div>
      </div>
    );
  }

  return ( // Adicionado React.Fragment como elemento raiz
    <>
      <div className="space-y-6">
      {/* Header */}
      {isDesktop && (
        <div>
          <h1 className="text-3xl font-bold">Inicial</h1>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.user_metadata?.full_name || 'Professor(a)'}!
          </p>
        </div>
      )}

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Exercícios</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.exerciciosPersonalizados}</div>
            <p className="text-xs text-muted-foreground">
              exercícios personalizados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meus Modelos</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.meusModelos}</div>
            <p className="text-xs text-muted-foreground">
              modelos de rotina de treino
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotinas Ativas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rotinasAtivas}</div>
            <p className="text-xs text-muted-foreground">
              em andamento
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.alunosAtivos}</div>
            <p className="text-xs text-muted-foreground">
              total de alunos que te seguem
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal */}
      <div className="grid gap-6">
        <div className="space-y-6">
          {/* Gerenciamento de Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Newspaper className="h-5 w-5" />
                Meus Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {posts.length > 0 ? (
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
                            {isDesktop ? (
                              <Button variant="outline" size="sm">
                                Ações <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                            ) : (
                              <Button variant="ghost" className="h-10 w-10 rounded-full p-0 flex-shrink-0">
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" >
                            <DropdownMenuItem onClick={() => navigate(`/blog/${post.slug}`)} disabled={post.status !== 'published'}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Publicação
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/posts/editar/${post.slug}`)}>
                              <Edit className="mr-2 h-4 w-4" /> 
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModalExclusao(post)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); carregarDados(currentPage - 1); }} className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''} />
                          </PaginationItem>
                          {[...Array(totalPages)].map((_, i) => (
                            <PaginationItem key={i}>
                              <PaginationLink href="#" onClick={(e) => { e.preventDefault(); carregarDados(i + 1); }} isActive={currentPage === i + 1}>{i + 1}</PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); carregarDados(currentPage + 1); }} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''} />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </div>
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
      </div>
      </div>
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
      {/* Mobile: Round floating button */}
      <Button
        onClick={() => navigate('/posts/novo')}
        className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
        aria-label="Novo Post"
      >
        <Plus />
      </Button>

      {/* Desktop: Standard floating button */}
      <Button
        onClick={() => navigate('/posts/novo')}
        className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
        size="lg"
      >
        <Plus />
        Novo Post
      </Button>
    </div>

    {/* Modal de Confirmação de Exclusão */}
    <Modal
      isOpen={showDeleteDialog}
      onRequestClose={() => {}} // Não permite fechar
      shouldCloseOnOverlayClick={false}
      shouldCloseOnEsc={false}
      className="bg-white rounded-lg p-6 max-w-md w-full mx-4 outline-none"
      overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-semibold">Excluir Post</h2>
      </div>
      
      <div className="mb-6">
        <p className="text-sm text-gray-600 leading-relaxed">
          Tem certeza que deseja excluir o post{" "}
          <span className="font-semibold text-gray-900">
            "{postParaExcluir?.title}"
          </span>?
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Esta ação não pode ser desfeita.
        </p>
      </div>
      
      <div className="flex gap-3 justify-end">
        <Button 
          variant="outline" 
          onClick={handleCancelarExclusao}
          disabled={isDeleting}
        >
          Cancelar
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleConfirmarExclusao} 
          disabled={isDeleting}
          className="flex items-center gap-2"
        >
          {isDeleting ? 'Excluindo...' : 'Excluir'}
        </Button>
      </div>
    </Modal>
    </> // Fechamento do React.Fragment
  );
};

export default IndexProfessor;