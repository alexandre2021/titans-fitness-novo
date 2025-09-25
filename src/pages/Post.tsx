import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import { supabase } from '@/integrations/supabase/client';
import 'react-quill/dist/quill.bubble.css'; // Adicione esta linha
import type { Tables } from '@/integrations/supabase/types';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

type PostWithAuthor = Tables<'posts'> & {
  professores: {
    nome_completo: string;
    avatar_image_url: string | null;
    avatar_letter: string | null;
    avatar_color: string | null;
  } | null;
};

const PostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<{ desktop?: string; mobile?: string }>({});

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) {
        setError('Post não encontrado.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(`
            *,
            professores (
              nome_completo,
              avatar_image_url,
              avatar_letter,
              avatar_color
            )
          `)
          .eq('slug', slug)
          .eq('status', 'published')
          .single();

        if (fetchError || !data) {
          throw new Error('Post não encontrado ou não publicado.');
        }

        setPost(data as PostWithAuthor);

        // Obter URLs das imagens
        const getImageUrl = async (filename: string | null) => {
          if (!filename) return undefined;
          const { data: urlData } = await supabase.functions.invoke('get-image-url', {
            body: { filename, bucket_type: 'posts' },
          });
          return urlData?.url;
        };

        const [desktopUrl, mobileUrl] = await Promise.all([
          getImageUrl(data.cover_image_desktop_url),
          getImageUrl(data.cover_image_mobile_url),
        ]);

        setImageUrls({ desktop: desktopUrl, mobile: mobileUrl });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void fetchPost();
  }, [slug]);

  const formattedDate = useMemo(() => {
    if (!post?.created_at) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
    }).format(new Date(post.created_at));
  }, [post?.created_at]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex flex-col justify-center items-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Post não encontrado</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => navigate('/')}>Voltar para o Início</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      <article className="space-y-8">
        <header className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{post.title}</h1>
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.professores?.avatar_image_url || undefined} />
              <AvatarFallback style={{ backgroundColor: post.professores?.avatar_color || '#ccc' }}>
                {post.professores?.avatar_letter || 'P'}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <span className="font-medium text-foreground">{post.professores?.nome_completo || 'Autor'}</span>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </header>

        {(imageUrls.desktop || imageUrls.mobile) && (
          <picture className="block w-full overflow-hidden rounded-lg mb-8 bg-background aspect-square md:aspect-video">
            {imageUrls.mobile && <source media="(max-width: 767px)" srcSet={imageUrls.mobile} />}
            {imageUrls.desktop && <source media="(min-width: 768px)" srcSet={imageUrls.desktop} />}
            <img src={imageUrls.desktop || imageUrls.mobile} alt={`Capa do post: ${post.title}`} className="w-full h-full object-cover" />
          </picture>
        )}

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <ReactQuill value={post.content as string} readOnly={true} theme="bubble" />
        </div>
      </article>
    </div>
  );
};

export default PostPage;