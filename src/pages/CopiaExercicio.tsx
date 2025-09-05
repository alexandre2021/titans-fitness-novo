// Caminho: pages/CopiaExercicio.tsx
// Função handleUploadMedia adaptada para nova estratégia de otimização

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Copy, Upload, Trash2, Eye, ExternalLink, Camera, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from "@/hooks/useAuth";
import { VideoRecorder } from '@/components/media/VideoRecorder'; // Importar o novo componente
import { Tables } from "@/integrations/supabase/types";

type Exercicio = Tables<"exercicios">;

const CopiaExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercicioOriginal, setExercicioOriginal] = useState<Exercicio | null>(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showDeleteMediaDialog, setShowDeleteMediaDialog] = useState<string | null>(null);
  
  // Usuário autenticado
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    grupo_muscular: "",
    equipamento: "",
    dificuldade: "Baixa" as "Baixa" | "Média" | "Alta",
    instrucoes: "",
    grupo_muscular_primario: "",
    grupos_musculares_secundarios: "",
  });

  // Campo dinâmico para instruções
  const [instrucoesList, setInstrucoesList] = useState<string[]>([]);

  // MODIFICAÇÃO: O estado agora pode armazenar a URL (string) ou o arquivo (File)
  const [midias, setMidias] = useState<{
    [key: string]: string | File | null;
  }>({
    imagem_1_url: null, imagem_2_url: null, video_url: null, youtube_url: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Estados para URLs assinadas das mídias
  const [signedUrls, setSignedUrls] = useState<{
    imagem1?: string;
    imagem2?: string;
    video?: string;
  }>({});
  const [loadingImages, setLoadingImages] = useState(false);

  const gruposMusculares = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Pernas',
  'Glúteos',
  'Panturrilha'
  ];

  const equipamentos = [
    'Barra',
    'Halteres',
    'Máquina',
    'Peso Corporal',
    'Cabo',
    'Kettlebell',
    'Fitas de Suspensão',
    'Elásticos',
    'Bola Suíça',
    'Bolas Medicinais',
    'Landmine',
    'Bola Bosu'
  ];

  const dificuldades = ['Baixa', 'Média', 'Alta'];

  // Componente responsivo para confirmação de exclusão de mídia
  const ResponsiveDeleteMediaConfirmation = ({ 
    open, 
    onOpenChange, 
    onConfirm, 
    title,
    description
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: React.ReactNode;
  }) => {
    if (isMobile) {
      return (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>{title}</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">{description}</div>
              <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={onConfirm}
                    variant="destructive"
                  >Excluir</Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              variant="destructive"
            >Excluir</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // Função para obter URL assinada do Cloudflare
  const getSignedImageUrl = useCallback(async (filename: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Usuário não autenticado");
      }
      
      const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/get-image-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filename,
          bucket_type: 'exercicios'
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao obter URL da imagem: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.url) {
        throw new Error('URL não retornada pelo servidor');
      }
      
      return result.url;
    } catch (error) {
      console.error('Erro ao obter URL assinada:', error);
      throw error;
    }
  }, []);

  // Função para carregar URLs assinadas das mídias
  const loadSignedUrls = useCallback(async () => {
    const temMidiaParaProcessar = Object.values(midias).some(v => v);
    if (!temMidiaParaProcessar) {
      setSignedUrls({});
      return;
    }
    setLoadingImages(true);
    setSignedUrls({});
    try {
      const urls: { imagem1?: string; imagem2?: string; video?: string } = {};

      const processarUrl = async (urlValue: string | File | null) => {
        if (typeof urlValue !== 'string' || !urlValue) return undefined;
        if (urlValue.includes('/storage/v1/object/public/exercicios-padrao/')) {
          return urlValue;
        }
        const filename = urlValue.split('/').pop()?.split('?')[0] || urlValue;
        return getSignedImageUrl(filename);
      };

      const [url1, url2, urlVideo] = await Promise.all([
        processarUrl(midias.imagem_1_url),
        processarUrl(midias.imagem_2_url),
        processarUrl(midias.video_url),
      ]);

      if (url1) {
        urls.imagem1 = url1;
      }
      if (url2) {
        urls.imagem2 = url2;
      }
      if (urlVideo) {
        urls.video = urlVideo;
      }

      // MODIFICAÇÃO: Gerar URLs locais para previews de arquivos não salvos
      if (midias.imagem_1_url instanceof File) urls.imagem1 = URL.createObjectURL(midias.imagem_1_url);
      if (midias.imagem_2_url instanceof File) urls.imagem2 = URL.createObjectURL(midias.imagem_2_url);
      if (midias.video_url instanceof File) urls.video = URL.createObjectURL(midias.video_url);

      setSignedUrls(urls);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoadingImages(false);
    }
  }, [midias, getSignedImageUrl]);

  // Função para converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Função para redimensionar imagem no frontend
  const resizeImageFile = (file: File, maxWidth = 640): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calcular dimensões mantendo proporção
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Converter para blob/file
        canvas.toBlob((blob) => {
          const resizedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(resizedFile);
        }, 'image/jpeg', 0.85);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // FUNÇÃO MODIFICADA: Agora redimensiona antes de guardar
  const handleSelectMedia = async (type: 'imagem1' | 'imagem2' | 'video', capture: boolean = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'video' ? 'video/*' : 'image/*';

    // Ponto chave: se for para capturar e for mobile, abre a câmera
    if (capture && isMobile) {
      input.capture = type === 'video' ? 'user' : 'environment'; // 'user' para selfie, 'environment' para traseira
    } else if (capture && !isMobile) {
      toast({ title: "Funcionalidade móvel", description: "Tirar fotos ou gravar vídeos está disponível apenas no celular." });
    }

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const maxSize = type === 'video' ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: `Arquivo muito grande. Máximo: ${type === 'video' ? '20MB' : '5MB'}`,
          variant: "destructive",
        });
        return;
      }

      // RESIZE para imagens antes de guardar no estado
      let finalFile = file;
      if (type === 'imagem1' || type === 'imagem2') {
        finalFile = await resizeImageFile(file, 640);
        console.log(`Imagem redimensionada: ${file.size} -> ${finalFile.size} bytes`);
      }

      const key = type === 'imagem1' ? 'imagem_1_url' : type === 'imagem2' ? 'imagem_2_url' : 'video_url';
      setMidias(prev => ({ ...prev, [key]: finalFile }));
    };

    input.click();
  };

  const handleRecordingComplete = (videoBlob: Blob) => {
    const videoFile = new File([videoBlob], `gravacao_${Date.now()}.webm`, { type: 'video/webm' });
    setMidias(prev => ({ ...prev, video_url: videoFile }));
    setShowVideoRecorder(false);
  };

  // Função para deletar mídia
  const handleDeleteMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    try {
      const key = type === 'imagem1' ? 'imagem_1_url' : type === 'imagem2' ? 'imagem_2_url' : 'video_url';
      setMidias(prev => ({ ...prev, [key]: null }));

      toast({
        title: "Sucesso",
        description: "Mídia removida da cópia!",
      });

      setShowDeleteMediaDialog(null);
    } catch (error) {
      console.error('Erro ao deletar mídia:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir mídia.",
        variant: "destructive",
      });
    }
  };

  // Carregar exercício original
  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id) {
        navigate('/exercicios-pt');
        return;
      }

      try {
        const { data: exercicio, error } = await supabase
          .from('exercicios')
          .select('*')
          .eq('id', id)
          .eq('is_ativo', true)
          .single();

        if (error) throw error;
        if (!exercicio) throw new Error('Exercício não encontrado');

        setExercicioOriginal(exercicio);

        // Preencher formulário com dados do exercício original
        setFormData({
          nome: `${exercicio.nome} (Personalizado)`,
          descricao: exercicio.descricao || "",
          grupo_muscular: exercicio.grupo_muscular || "",
          equipamento: exercicio.equipamento || "",
          dificuldade: (exercicio.dificuldade as "Baixa" | "Média" | "Alta") || "Baixa",
          instrucoes: exercicio.instrucoes || "",
          grupo_muscular_primario: Array.isArray(exercicio.grupo_muscular_primario) ? exercicio.grupo_muscular_primario.join(', ') : (exercicio.grupo_muscular_primario || ""),
          grupos_musculares_secundarios: Array.isArray(exercicio.grupos_musculares_secundarios) ? exercicio.grupos_musculares_secundarios.join(', ') : (exercicio.grupos_musculares_secundarios || ""),
        });

        // Preencher instruções dinâmicas
        if (exercicio.instrucoes) {
          setInstrucoesList(exercicio.instrucoes.split('#').filter(Boolean).map(i => i.trim()));
        } else {
          setInstrucoesList([]);
        }

        // Preencher mídias (URLs do exercício original)
        setMidias({
          imagem_1_url: exercicio.imagem_1_url || null,
          imagem_2_url: exercicio.imagem_2_url || null,
          video_url: exercicio.video_url || null,
          youtube_url: exercicio.youtube_url || null,
        });

        console.log('✅ Exercício original carregado:', exercicio);
      } catch (error) {
        console.error('❌ Erro ao carregar exercício:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o exercício. Verifique se o ID está correto.",
          variant: "destructive",
        });
        navigate('/exercicios-pt');
      } finally {
        setLoading(false);
      }
    };

    fetchExercicio();
  }, [id, navigate, toast]);

  // Recarregar URLs assinadas quando exercicioOriginal ou mídias mudarem
  useEffect(() => {
    if (exercicioOriginal) {
      console.log('🔄 Recarregando URLs assinadas...');
      loadSignedUrls();
    }
  }, [exercicioOriginal, midias, loadSignedUrls]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }

    if (!formData.descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória';
    }

    if (!formData.grupo_muscular) {
      newErrors.grupo_muscular = 'Grupo muscular é obrigatório';
    }

    if (!formData.equipamento) {
      newErrors.equipamento = 'Equipamento é obrigatório';
    }

    if (!formData.instrucoes.trim()) {
      newErrors.instrucoes = 'Instruções são obrigatórias';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função auxiliar para baixar imagem de uma URL pública e converter para base64
  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // NOVA FUNÇÃO: Centraliza a lógica de upload que agora está no handleSave
  const uploadFile = async (file: File | string): Promise<string | null> => {
    if (typeof file === 'string') {
      // Se for uma URL pública do Supabase, baixa e faz upload
      if (file.includes('/storage/v1/object/public/exercicios-padrao/')) {
        const base64 = await fetchImageAsBase64(file);
        const extension = file.split('.').pop()?.split('?')[0] || 'webp';
        return uploadBase64(base64, extension);
      }
      // Se for uma URL já do Cloudflare, mantém
      return file;
    }

    if (file instanceof File) {
      const base64 = await fileToBase64(file);
      const extension = file.name.split('.').pop() || 'webp';
      return uploadBase64(base64, extension);
    }

    return null;
  };

  const uploadBase64 = async (base64: string, extension: string): Promise<string | null> => {
    const timestamp = Date.now();
    const filename = `exercicio_${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Usuário não autenticado');

    const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/upload-imagem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ filename, image_base64: base64, bucket_type: 'exercicios' })
    });

    if (!response.ok) throw new Error('Falha no upload da mídia');
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'Falha no upload da mídia');
    }

    // Para uploads otimizados, a URL não vem na hora. Usamos o 'filename' retornado como placeholder.
    // Para outros, a 'url' virá. Se não vier nenhum dos dois, lança erro.
    if (!result.url && !result.filename) throw new Error('URL ou filename não retornado pelo servidor');
    return result.filename || result.url;
  };

  // FUNÇÃO MODIFICADA: handleSave agora orquestra os uploads
  const handleSave = async () => {
    // Monta instruções do campo dinâmico
    const instrucoesFinal = instrucoesList.filter(i => i.trim()).join('#');
    const currentFormData = { ...formData, instrucoes: instrucoesFinal };

    if (!user || !user.id || !validateForm()) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado ou formulário inválido.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      toast({ title: "Processando", description: "Salvando e otimizando mídias..." });

      // MODIFICAÇÃO: Processa e faz upload de cada mídia apenas agora
      const [imagem_1_url_final, imagem_2_url_final, video_url_final] = await Promise.all([
        uploadFile(midias.imagem_1_url as File | string),
        uploadFile(midias.imagem_2_url as File | string),
        uploadFile(midias.video_url as File | string),
      ]);

      // Criar cópia personalizada no banco usando as URLs finais (otimizadas)
      const { data: exercicio, error } = await supabase
        .from('exercicios')
        .insert({
          nome: currentFormData.nome.trim(),
          descricao: currentFormData.descricao.trim(),
          grupo_muscular: currentFormData.grupo_muscular,
          equipamento: currentFormData.equipamento,
          dificuldade: currentFormData.dificuldade,
          instrucoes: currentFormData.instrucoes.trim(),
          imagem_1_url: imagem_1_url_final,
          imagem_2_url: imagem_2_url_final,
          video_url: video_url_final,
          youtube_url: midias.youtube_url as string || null,
          tipo: 'personalizado',
          pt_id: user.id,
          exercicio_padrao_id: exercicioOriginal?.id,
          is_ativo: true,
          status_midia: 'processando' // NOVO: Define o status inicial como processando
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cópia do exercício criada com imagens otimizadas!",
      });

      console.log('✅ Cópia do exercício criada:', exercicio);
      navigate('/exercicios-pt');
      
    } catch (error) {
      console.error('❌ Erro ao criar cópia:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a cópia do exercício. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/exercicios-pt')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Criar Cópia Personalizada</h1>
            <p className="text-muted-foreground">Carregando exercício...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exercicioOriginal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/exercicios-pt')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Erro</h1>
            <p className="text-muted-foreground">Exercício não encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      {/* Cabeçalho Responsivo */}
      <div className="space-y-4">
        {/* Layout Desktop */}
        <div className="hidden md:flex md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/exercicios-pt')}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div className="mb-1">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <Copy className="h-3 w-3 mr-1" />
                  Baseado em exercício padrão
                </Badge>
              </div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                Criar Cópia Personalizada
              </h1>
              <p className="text-muted-foreground">
                Criando cópia de: <span className="font-medium">{exercicioOriginal.nome}</span>
              </p>
            </div>
          </div>

          {/* Ações no cabeçalho - Desktop (Botão foi movido para flutuante) */}
        </div>

        {/* Layout Mobile - Padrão da aplicação */}
        <div className="md:hidden flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 overflow-hidden">
            <Button
              variant="ghost"
              onClick={() => navigate('/exercicios-pt')}
              className="h-10 w-10 p-0 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1 space-y-1 overflow-hidden">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                <Copy className="h-3 w-3 mr-1" />
                Baseado em exercício padrão
              </Badge>
              <h1 className="text-2xl font-bold leading-tight">Criar Cópia Personalizada</h1>
              <p className="text-sm text-muted-foreground">
                Criando cópia de: {exercicioOriginal.nome}
              </p>
            </div>
          </div>
          {/* Botão Salvar movido para flutuante */}
        </div>
      </div>

      {/* Layout em coluna única */}
      <div className="space-y-6">
          
        {/* 1. Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome" className="text-sm font-medium text-muted-foreground">Nome</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Supino com halteres (Personalizado)"
                className={errors.nome ? "border-red-500" : ""}
              />
              {errors.nome && (
                <p className="text-sm text-red-500 mt-1">{errors.nome}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="descricao" className="text-sm font-medium text-muted-foreground">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descreva o exercício brevemente..."
                className={errors.descricao ? "border-red-500" : ""}
              />
              {errors.descricao && (
                <p className="text-sm text-red-500 mt-1">{errors.descricao}</p>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="grupo_muscular" className="text-sm font-medium text-muted-foreground">Grupo Muscular</Label>
                <Select
                  value={formData.grupo_muscular}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, grupo_muscular: value }))}
                >
                  <SelectTrigger className={errors.grupo_muscular ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {gruposMusculares.map((grupo) => (
                      <SelectItem key={grupo} value={grupo}>
                        {grupo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.grupo_muscular && (
                  <p className="text-sm text-red-500 mt-1">{errors.grupo_muscular}</p>
                )}
              </div>
              <div>
                <Label htmlFor="equipamento" className="text-sm font-medium text-muted-foreground">Equipamento</Label>
                <Select
                  value={formData.equipamento}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, equipamento: value }))}
                >
                  <SelectTrigger className={errors.equipamento ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {equipamentos.map((equipamento) => (
                      <SelectItem key={equipamento} value={equipamento}>
                        {equipamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.equipamento && (
                  <p className="text-sm text-red-500 mt-1">{errors.equipamento}</p>
                )}
              </div>
              <div>
                <Label htmlFor="dificuldade" className="text-sm font-medium text-muted-foreground">Dificuldade</Label>
                <Select
                  value={formData.dificuldade}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, dificuldade: value as "Baixa" | "Média" | "Alta" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dificuldades.map((dificuldade) => (
                      <SelectItem key={dificuldade} value={dificuldade}>
                        {dificuldade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Inputs para músculo primário e secundários */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="grupo_muscular_primario" className="text-sm font-medium text-muted-foreground">Músculo primário</Label>
                <Input
                  id="grupo_muscular_primario"
                  value={formData.grupo_muscular_primario || ""}
                  onChange={e => setFormData(prev => ({ ...prev, grupo_muscular_primario: e.target.value }))}
                  placeholder="Ex: Peitoral maior"
                />
              </div>
              <div>
                <Label htmlFor="grupos_musculares_secundarios" className="text-sm font-medium text-muted-foreground">Músculo(s) secundário(s)</Label>
                <Input
                  id="grupos_musculares_secundarios"
                  value={formData.grupos_musculares_secundarios || ""}
                  onChange={e => setFormData(prev => ({ ...prev, grupos_musculares_secundarios: e.target.value }))}
                  placeholder="Ex: Tríceps, deltoide anterior"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Instruções de Execução */}
        <Card>
          <CardHeader>
            <CardTitle>Instruções de execução</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {instrucoesList.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="w-6 text-right text-base font-semibold text-muted-foreground">{idx + 1}.</span>
                  <Input
                    value={item}
                    onChange={e => {
                      const newList = [...instrucoesList];
                      newList[idx] = e.target.value;
                      setInstrucoesList(newList);
                    }}
                    placeholder={`Etapa ${idx + 1}`}
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={() => {
                    setInstrucoesList(list => list.filter((_, i) => i !== idx));
                  }}>Remover</Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setInstrucoesList(list => [...list, ""])}>Adicionar etapa</Button>
              {errors.instrucoes && (
                <p className="text-sm text-red-500 mt-1">{errors.instrucoes}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Mídias com Upload Otimizado */}
        <Card>
          <CardHeader>
            <CardTitle>Mídias</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload automático com otimização (imagens reduzidas em até 97%)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primeira Imagem */}
            <div>
              <Label className="text-sm font-medium">Primeira Imagem</Label>
              <div className="mt-2 space-y-4">
                {midias.imagem_1_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      {loadingImages ? (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Carregando...</span>
                        </div>
                      ) : signedUrls.imagem1 ? (
                        <img 
                          src={signedUrls.imagem1} 
                          alt="Sua primeira imagem" 
                          className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Erro ao carregar</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(signedUrls.imagem1 || midias.imagem_1_url as string, '_blank')}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.imagem1}
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectMedia('imagem1', true)}
                        className="flex items-center gap-2"
                        disabled={saving || !isMobile}
                      >
                        <Camera className="h-4 w-4" />
                        Nova Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteMediaDialog('imagem1')}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Adicione uma imagem para o exercício.</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => handleSelectMedia('imagem1', true)}
                        className="flex items-center gap-2"
                        disabled={saving || !isMobile}
                      >
                        <Camera className="h-4 w-4" />
                        Tirar Foto
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Segunda Imagem */}
            <div>
              <Label className="text-sm font-medium">Segunda Imagem</Label>
              <div className="mt-2 space-y-4">
                {midias.imagem_2_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      {loadingImages ? (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Carregando...</span>
                        </div>
                      ) : signedUrls.imagem2 ? (
                        <img 
                          src={signedUrls.imagem2} 
                          alt="Sua segunda imagem" 
                          className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Erro ao carregar</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(signedUrls.imagem2 || midias.imagem_2_url as string, '_blank')}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.imagem2}
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectMedia('imagem2', true)}
                        className="flex items-center gap-2"
                        disabled={saving || !isMobile}
                      >
                        <Camera className="h-4 w-4" />
                        Nova Foto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteMediaDialog('imagem2')}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Adicione uma segunda imagem (opcional).</p>
                     <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => handleSelectMedia('imagem2', true)}
                        className="flex items-center gap-2"
                        disabled={saving || !isMobile}
                      >
                        <Camera className="h-4 w-4" />
                        Tirar Foto
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vídeo */}
            <div>
              <Label className="text-sm font-medium">Vídeo</Label>
              <div className="mt-2 space-y-4">
                {midias.video_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      {loadingImages ? (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Carregando...</span>
                        </div>
                      ) : signedUrls.video ? (
                        <video 
                          src={signedUrls.video} 
                          className="w-40 h-40 object-cover rounded-lg border shadow-sm"
                          controls
                        />
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Erro ao carregar</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(signedUrls.video || midias.video_url as string, '_blank')}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.video}
                      >
                        <Eye className="h-4 w-4" />
                        Assistir
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { if (isMobile) setShowVideoRecorder(true); else toast({ title: "Funcionalidade móvel", description: "A gravação de vídeo está disponível apenas no celular." }); }}
                        className="flex items-center gap-2"
                        disabled={saving || !isMobile}
                      >
                        <Video className="h-4 w-4" />
                        Novo Vídeo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteMediaDialog('video')}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Adicione um vídeo para o exercício.</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => {
                          if (isMobile) setShowVideoRecorder(true);
                          else toast({ title: "Funcionalidade móvel", description: "A gravação de vídeo está disponível apenas no celular." });
                        }}
                        className="flex items-center gap-2"
                        disabled={saving || !isMobile}
                      >
                        <Video className="h-4 w-4" />
                        Gravar Vídeo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* YouTube - URL apenas */}
            <div>
              <Label className="text-sm font-medium">URL do YouTube</Label>
              <div className="mt-2 space-y-3">
                {exercicioOriginal.youtube_url && (
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <p className="text-sm font-medium text-muted-foreground mb-1">YouTube Original:</p>
                    <p className="text-sm text-blue-600 break-all">{exercicioOriginal.youtube_url}</p>
                  </div>
                )}
                
                <Input
                  value={midias.youtube_url as string}
                  onChange={(e) => setMidias(prev => ({ ...prev, youtube_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=... (cole aqui sua URL do YouTube)"
                />
                {midias.youtube_url && (
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      ✅ URL do YouTube configurada
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(midias.youtube_url as string, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver no YouTube
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Mensagem quando exercício não tem mídias */}
            {!exercicioOriginal.imagem_1_url && !exercicioOriginal.imagem_2_url && !exercicioOriginal.video_url && !exercicioOriginal.youtube_url && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">
                  O exercício original não possui mídias. Adicione suas próprias mídias.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSelectMedia('imagem1')}
                    className="flex items-center gap-2"
                    disabled={saving}
                  >
                    <Upload className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Adicionar Imagem'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSelectMedia('video')}
                    className="flex items-center gap-2"
                    disabled={saving}
                  >
                    <Upload className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Adicionar Vídeo'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ResponsiveDeleteMediaConfirmation
        open={showDeleteMediaDialog !== null}
        onOpenChange={(open) => !open && setShowDeleteMediaDialog(null)}
        onConfirm={() => showDeleteMediaDialog && handleDeleteMedia(showDeleteMediaDialog as 'imagem1' | 'imagem2' | 'video')}
        title="Excluir mídia da cópia"
        description="Esta mídia será removida da sua cópia personalizada. O exercício original não será alterado."
      />

      <VideoRecorder 
        open={showVideoRecorder}
        onOpenChange={setShowVideoRecorder}
        onRecordingComplete={handleRecordingComplete}
      />

      {/* Botão Salvar Flutuante */}
      <div className="fixed bottom-20 md:bottom-6 left-4 md:left-6 z-50">
        {/* Mobile: Round floating button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-foreground"></div>
          ) : (
            <Save className="h-6 w-6" />
          )}
          <span className="sr-only">Salvar Cópia</span>
        </Button>

        {/* Desktop: Standard floating button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="hidden md:flex items-center gap-2 shadow-lg"
          size="lg"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvando..." : "Salvar Cópia"}
        </Button>
      </div>
    </div>
    </>
  );
};

export default CopiaExercicio;
