import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Cropper, { type Area } from 'react-easy-crop';
import ReactQuill from 'react-quill';
import Modal from 'react-modal';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fileToDataURL, optimizeAndCropImage, validateImageFile } from '@/lib/imageUtils';
import type { Tables } from "@/integrations/supabase/types";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Send, Loader2, Upload, Trash2, X, RefreshCw } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type Post = Tables<'posts'>;
type ImageState = { file: File | string; previewUrl: string } | null;
type CropType = 'desktop' | 'mobile';

const postCategories = ["Exercícios", "Planos de Treino", "Nutrição", "Suplementação", "Recuperação", "Bem-estar", "Saúde mental", "Tendências", "Ciência", "Performance"];

const postSchema = z.object({
  title: z.string().min(5, 'O título deve ter pelo menos 5 caracteres.'),
  slug: z.string().min(3, 'O slug deve ter pelo menos 3 caracteres.').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hifens.'),
  content: z.string().min(10, 'O conteúdo é muito curto.'),
  excerpt: z.string().max(200, 'O resumo não pode ter mais de 200 caracteres.').optional(),
  category: z.string().min(1, 'A categoria é obrigatória.'),
});

type PostFormData = z.infer<typeof postSchema>;

const EditarPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [post, setPost] = useState<Post | null>(null);
  const [desktopImage, setDesktopImage] = useState<ImageState>(null);
  const [mobileImage, setMobileImage] = useState<ImageState>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [activeCropper, setActiveCropper] = useState<CropType | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
  });

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug || !user) return;

      try {
        const { data, error } = await supabase.from('posts').select('*').eq('slug', slug).eq('author_id', user.id).single();
        if (error) throw error;

        setPost(data);
        reset({
          title: data.title,
          slug: data.slug,
          content: data.content as string || '',
          excerpt: data.excerpt || '',
          category: data.category || '',
        });

        const getImageUrl = async (filename: string | null) => {
          if (!filename) return null;
          const { data: urlData } = await supabase.functions.invoke('get-image-url', {
            body: { filename, bucket_type: 'posts' },
          });
          return urlData?.url || null;
        };

        if (data.cover_image_desktop_url) {
          const url = await getImageUrl(data.cover_image_desktop_url);
          if (url) setDesktopImage({ file: data.cover_image_desktop_url, previewUrl: url });
        }
        if (data.cover_image_mobile_url) {
          const url = await getImageUrl(data.cover_image_mobile_url);
          if (url) setMobileImage({ file: data.cover_image_mobile_url, previewUrl: url });
        }
      } catch (error: unknown) {
        toast.error('Erro ao carregar post', { description: (error as Error).message || 'Post não encontrado.' });
        navigate('/index-professor');
      } finally {
        setLoading(false);
      }
    };

    void fetchPost();
  }, [slug, user, navigate, reset]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: CropType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) { toast.error('Arquivo inválido', { description: validation.error }); return; }

    try {
      const dataUrl = await fileToDataURL(file);
      setImageToCrop(dataUrl);
      setActiveCropper(type);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    } catch (error) {
      toast.error('Erro ao processar imagem.');
    }
    e.target.value = '';
  };

  const handleSaveCrop = async () => {
    if (!imageToCrop || !activeCropper || !croppedAreaPixels) return;

    try {
      const maxWidth = activeCropper === 'desktop' ? 1200 : 640;
      const croppedFile = await optimizeAndCropImage(imageToCrop, croppedAreaPixels, maxWidth);
      if (!croppedFile) { toast.error('Erro ao cortar imagem.'); return; }

      const previewUrl = URL.createObjectURL(croppedFile);
      const newImage = { file: croppedFile, previewUrl };

      if (activeCropper === 'desktop') {
        if (desktopImage) URL.revokeObjectURL(desktopImage.previewUrl);
        setDesktopImage(newImage);
      } else {
        if (mobileImage) URL.revokeObjectURL(mobileImage.previewUrl);
        setMobileImage(newImage);
      }

      setActiveCropper(null);
      setImageToCrop(null);
    } catch (error) {
      toast.error('Erro ao processar o corte da imagem.');
    }
  };

  const clearImage = (type: CropType) => {
    if (type === 'desktop' && desktopImage) {
      URL.revokeObjectURL(desktopImage.previewUrl);
      setDesktopImage(null);
    } else if (type === 'mobile' && mobileImage) {
      URL.revokeObjectURL(mobileImage.previewUrl);
      setMobileImage(null);
    }
  };

  const handleSave = async (data: PostFormData, status: 'draft' | 'published') => {
    if (!post || !user) return;
    setIsSaving(true);

    try {
      const updateData: Partial<Post> & { updated_at: string } = {
        title: data.title,
        slug: data.slug,
        content: data.content,
        status: status,
        excerpt: data.excerpt,
        category: data.category,
        updated_at: new Date().toISOString(),
      };

      const uploadImage = async (file: File, suffix: string): Promise<string | null> => {
        const fileName = `post_${user.id}_${Date.now()}_${suffix}.jpg`;
        const { data: uploadData } = await supabase.functions.invoke('upload-media', {
          body: { action: 'generate_upload_url', filename: fileName, bucket_type: 'posts' },
        });
        if (!uploadData?.signedUrl) throw new Error('Falha ao obter URL de upload.');
        const uploadResponse = await fetch(uploadData.signedUrl, { method: 'PUT', body: file });
        if (!uploadResponse.ok) throw new Error('Falha no upload para o R2.');
        return fileName;
      };

      const deleteImage = async (filename: string) => {
        await supabase.functions.invoke('delete-media', { body: { filename, bucket_type: 'posts' } });
      };

      if (desktopImage?.file instanceof File) {
        updateData.cover_image_desktop_url = await uploadImage(desktopImage.file, 'desktop');
        if (post.cover_image_desktop_url) await deleteImage(post.cover_image_desktop_url);
      } else if (!desktopImage && post.cover_image_desktop_url) {
        await deleteImage(post.cover_image_desktop_url);
        updateData.cover_image_desktop_url = null;
      }

      if (mobileImage?.file instanceof File) {
        updateData.cover_image_mobile_url = await uploadImage(mobileImage.file, 'mobile');
        if (post.cover_image_mobile_url) await deleteImage(post.cover_image_mobile_url);
      } else if (!mobileImage && post.cover_image_mobile_url) {
        await deleteImage(post.cover_image_mobile_url);
        updateData.cover_image_mobile_url = null;
      }

      const { error } = await supabase.from('posts').update(updateData).eq('id', post.id);
      if (error) throw error;

      toast.success(`Post ${status === 'published' ? 'atualizado' : 'salvo como rascunho'}!`);
      navigate('/meus-posts');
    } catch (error: unknown) {
      toast.error('Erro ao salvar post', { description: (error as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  const onFormSubmit = (data: PostFormData) => {
    handleSave(data, 'published');
  };

  const onSaveDraft = () => {
    handleSave(watch(), 'draft');
  };

  const renderImageUploader = (type: CropType) => {
    const image = type === 'desktop' ? desktopImage : mobileImage;
    const label = type === 'desktop' ? 'Imagem de Capa (Desktop)' : 'Imagem de Capa (Mobile)';
    const inputId = `${type}-image-input-edit`;

    return (
      <div className="space-y-2">
        <div className="space-y-1">
          <Label>{label}</Label>
          <p className="text-sm text-muted-foreground">
            {type === 'desktop' ? 'Recomendado: 1200px de largura (proporção 16:9).' : 'Recomendado: 640px de largura (proporção 1:1).'}
          </p>
        </div>
        {image ? (
          <div className="space-y-2">
            <div className={`rounded-lg border bg-muted overflow-hidden ${type === 'desktop' ? 'aspect-video w-full max-w-xl' : 'aspect-square w-40'}`}>
              <img src={image.previewUrl} alt={`Preview ${type}`} className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById(inputId)?.click()} disabled={isSaving}>Alterar</Button>
              <Button variant="destructive" size="sm" onClick={() => clearImage(type)} disabled={isSaving}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <Button type="button" onClick={() => document.getElementById(inputId)?.click()} disabled={isSaving}>
              <Upload className="h-4 w-4 mr-2" /> Selecionar Imagem
            </Button>
          </div>
        )}
        <Input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => handleFileChange(e, type)}
          className="hidden"
        />
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {isDesktop && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="h-10 w-10 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Post</h1>
            <p className="text-muted-foreground">Modifique o conteúdo do seu post.</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do Post</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <CardContent className="space-y-8">
            <div className="space-y-6">
              {renderImageUploader('desktop')}
              <Separator />
              {renderImageUploader('mobile')}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="title">Título do Post</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-destructive text-sm mt-1">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL (slug)</Label>
              <Input id="slug" {...register('slug')} />
              {errors.slug && <p className="text-destructive text-sm mt-1">{errors.slug.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="category"><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                    <SelectContent>{postCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-destructive text-sm mt-1">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Resumo (até 200 caracteres)</Label>
              <Textarea id="excerpt" {...register('excerpt')} />
              {errors.excerpt && <p className="text-destructive text-sm mt-1">{errors.excerpt.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <ReactQuill
                    theme="snow"
                    value={field.value}
                    onChange={field.onChange}
                    readOnly={isSaving}
                    modules={{
                      toolbar: [
                        [{ 'header': [2, 3, false] }],
                        ['bold', 'italic', 'underline'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'indent': '-1'}, { 'indent': '+1' }],
                        ['link'],
                        ['clean']
                      ],
                    }}
                    formats={[
                      'header',
                      'bold', 'italic', 'underline',
                      'list', 'bullet', 'indent',
                      'link'
                    ]}
                    className="bg-white [&>.ql-container_.ql-editor]:min-h-[300px]"
                  />
                )}
              />
              {errors.content && <p className="text-destructive text-sm mt-1">{errors.content.message}</p>}
            </div>
          </CardContent>
        </form>
        <CardFooter className="flex justify-end gap-4">
          <Button variant="outline" onClick={onSaveDraft} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            {post?.status === 'published' ? 'Reverter para Rascunho' : 'Salvar Rascunho'}
          </Button>
          <Button onClick={handleSubmit(onFormSubmit)} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {isDesktop && post?.status === 'published' ? 'Atualizar Publicação' : 'Publicar'}
          </Button>
        </CardFooter>
      </Card>

      <Modal
        isOpen={!!activeCropper}
        onRequestClose={() => !isSaving && setActiveCropper(null)}
        shouldCloseOnOverlayClick={!isSaving}
        className="bg-white rounded-lg max-w-lg w-full mx-4 outline-none flex flex-col max-h-[90vh]"
        overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">
            Ajustar Imagem {activeCropper === 'desktop' ? '(16:9)' : '(1:1)'}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setActiveCropper(null)} disabled={isSaving}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          <div className="space-y-2 pb-4">
            <Label>Zoom</Label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(value) => setZoom(value[0])}
              disabled={isSaving}
            />
          </div>

          <div className="relative h-64 md:h-80 w-full bg-muted">
            {imageToCrop && activeCropper && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={activeCropper === 'desktop' ? 16 / 9 : 1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={false}
              />
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => setActiveCropper(null)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSaveCrop} disabled={isSaving || !croppedAreaPixels}>
            Salvar Corte
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default EditarPost;