import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import { supabase } from '@/integrations/supabase/client';
import 'react-quill/dist/quill.bubble.css'; // Adicione esta linha
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Loader2, Share2, Utensils, Dumbbell, HeartPulse, BrainCircuit, Zap, Stethoscope, FlaskConical, TrendingUp, ShieldCheck } from 'lucide-react';

type PostWithAuthor = Tables<'posts'> & {
  professores: {
    nome_completo: string;
    avatar_image_url: string | null;
    avatar_letter: string | null;
    avatar_color: string | null;
  } | null;
};

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
  default: { icon: Dumbbell, color: 'text-gray-500', badge: 'bg-gray-100 text-gray-800' },
};

const PostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

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

  const handleShare = async () => {
    if (!post) return;

    const shareData = {
      title: post.title,
      text: post.excerpt || `Confira este post incrível da Titans Fitness: ${post.title}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Erro ao compartilhar:', err);
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!', { description: 'O link do post foi copiado para sua área de transferência.' });
    }
  };

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

  const styles = categoryStyles[post.category as keyof typeof categoryStyles] || categoryStyles.default;
  const Icon = styles.icon;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </div>

      <article className="space-y-8">
        <header className="space-y-4">
          <div className="flex items-center gap-2"><Icon className={`h-5 w-5 ${styles.color}`} /><Badge variant="outline" className={`text-sm font-semibold ${styles.badge}`}>{post.category}</Badge></div>
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