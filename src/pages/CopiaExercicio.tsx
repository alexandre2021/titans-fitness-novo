// Caminho: pages/CopiaExercicio.tsx
// Mantendo estrutura original, apenas trocando estratégia de upload

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
import { toast as sonnerToast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from "@/hooks/useAuth";
import { VideoRecorder } from '@/components/media/VideoRecorder';
import { Tables } from "@/integrations/supabase/types";

type Exercicio = Tables<"exercicios">;

const CopiaExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = sonnerToast;
  const isMobile = useIsMobile();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercicioOriginal, setExercicioOriginal] = useState<Exercicio | null>(null);
  const [showVideoInfoModal, setShowVideoInfoModal] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showDeleteMediaDialog, setShowDeleteMediaDialog] = useState<string | null>(null);
  
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

  const [instrucoesList, setInstrucoesList] = useState<string[]>([]);

  // MANTENDO estrutura original do estado de mídias
  const [midias, setMidias] = useState<{
    [key: string]: string | File | null;
  }>({
    imagem_1_url: null, 
    imagem_2_url: null, 
    video_url: null, 
    youtube_url: null
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<{
    imagem1?: string;
    imagem2?: string;
    video?: string;
  }>({});
  const [loadingImages, setLoadingImages] = useState(false);

  const gruposMusculares = [
    'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'
  ];

  const equipamentos = [
    'Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo', 'Kettlebell',
    'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais', 'Landmine', 'Bola Bosu'
  ];

  const dificuldades = ['Baixa', 'Média', 'Alta'];

  // Componentes de UI mantidos iguais
  const ResponsiveDeleteMediaConfirmation = ({ 
    open, onOpenChange, onConfirm, title, description
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
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button onClick={onConfirm} variant="destructive">Excluir</Button>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} variant="destructive">Excluir</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  const VideoInfoModal = () => {
    const handleConfirm = () => {
      setShowVideoInfoModal(false);
      setShowVideoRecorder(true);
    };

    if (isMobile) {
      return (
        <Drawer open={showVideoInfoModal} onOpenChange={setShowVideoInfoModal}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Gravar Vídeo do Exercício</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                O vídeo terá duração máxima de <strong>12 segundos</strong> e será salvo <strong>sem áudio</strong> para otimização.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowVideoInfoModal(false)}>Cancelar</Button>
                <Button onClick={handleConfirm}>Iniciar Gravação</Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <AlertDialog open={showVideoInfoModal} onOpenChange={setShowVideoInfoModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gravar Vídeo do Exercício</AlertDialogTitle>
            <AlertDialogDescription>
              O vídeo terá duração máxima de <strong>12 segundos</strong> e será salvo <strong>sem áudio</strong> para otimização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setShowVideoInfoModal(false)}>Cancelar</Button>
            <Button onClick={handleConfirm}>Iniciar Gravação</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  };

  // ✅ NOVA FUNÇÃO: Para exercícios PADRÃO, constrói a URL pública do Cloudflare R2
  const getPublicImageUrlPadrao = useCallback((imagePath: string): string => {
    const r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL_EXERCICIOS_PADRAO;
    if (!r2PublicUrl) {
      console.error("VITE_R2_PUBLIC_URL_EXERCICIOS_PADRAO não está configurada no .env");
      return '';
    }
    // Constrói a URL final, por exemplo: https://pub-xxx.r2.dev/peito/supino.jpg
    return `${r2PublicUrl}/${imagePath}`;
  }, []);

  // Função para obter URL assinada (mantida igual)
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

  // ✅ FUNÇÃO ATUALIZADA: Carrega as URLs das mídias corretamente
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

      const processarUrl = (urlValue: string | File | null): string | undefined => {
        // Se for um novo arquivo selecionado pelo usuário, cria uma URL local para preview
        if (urlValue instanceof File) {
          return URL.createObjectURL(urlValue);
        }
        // Se for um caminho de string (do exercício padrão), constrói a URL pública do R2
        if (typeof urlValue === 'string' && urlValue) {
          return getPublicImageUrlPadrao(urlValue);
        }
        return undefined;
      };

      urls.imagem1 = processarUrl(midias.imagem_1_url);
      urls.imagem2 = processarUrl(midias.imagem_2_url);
      urls.video = processarUrl(midias.video_url);

      setSignedUrls(urls);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoadingImages(false);
    }
  }, [midias, getPublicImageUrlPadrao]);

  // Função para redimensionar imagem (mantida igual)
  const resizeImageFile = (file: File, maxWidth = 640): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
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

  // Função para seleção de mídia (adaptada para desktop)
  const handleSelectMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'video' ? 'video/*' : 'image/*';

    // No celular, prioriza a câmera. No desktop, abre o seletor de arquivos.
    if (isMobile) {
      input.capture = type === 'video' ? 'user' : 'environment';
    }

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const maxSize = type === 'video' ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Arquivo muito grande", {
          description: `Arquivo muito grande. Máximo: ${type === 'video' ? '20MB' : '5MB'}`,
        });
        return;
      }

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

  const handleDeleteMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    try {
      const key = type === 'imagem1' ? 'imagem_1_url' : type === 'imagem2' ? 'imagem_2_url' : 'video_url';
      setMidias(prev => ({ ...prev, [key]: null }));
      
      toast.success("Mídia removida", {
        description: "Mídia removida da cópia!",
      });

      setShowDeleteMediaDialog(null);
    } catch (error) {
      console.error('Erro ao deletar mídia:', error);
      toast.error("Erro ao excluir", {
        description: "Erro ao excluir mídia.",
      });
    }
  };

  // useEffect para carregar exercício original (mantido igual)
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

        setFormData({
          nome: `${exercicio.nome} (Personalizado)`,
          descricao: exercicio.descricao || "",
          grupo_muscular: exercicio.grupo_muscular || "",
          equipamento: exercicio.equipamento || "",
          dificuldade: (exercicio.dificuldade as "Baixa" | "Média" | "Alta") || "Baixa",
          instrucoes: exercicio.instrucoes || "",
          grupo_muscular_primario: Array.isArray(exercicio.grupo_muscular_primario) 
            ? exercicio.grupo_muscular_primario.join(', ') 
            : (exercicio.grupo_muscular_primario || ""),
          grupos_musculares_secundarios: (() => {
            const value = exercicio.grupos_musculares_secundarios as unknown;
            if (typeof value === 'string') {
              return value.replace(/[[\]"]/g, '');
            }
            if (Array.isArray(value)) {
              return value.join(', ');
            }
            return "";
          })(),
        });

        if (exercicio.instrucoes) {
          setInstrucoesList(exercicio.instrucoes.split('#').filter(Boolean).map(i => i.trim()));
        } else {
          setInstrucoesList([]);
        }

        setMidias({
          imagem_1_url: exercicio.imagem_1_url || null,
          imagem_2_url: exercicio.imagem_2_url || null,
          video_url: exercicio.video_url || null,
          youtube_url: exercicio.youtube_url || null,
        });

        console.log('✅ Exercício original carregado:', exercicio);
      } catch (error) {
        console.error('❌ Erro ao carregar exercício:', error);
        toast.error("Erro ao carregar", {
          description: "Não foi possível carregar o exercício. Verifique se o ID está correto.",
        });
        navigate('/exercicios-pt');
      } finally {
        setLoading(false);
      }
    };

    fetchExercicio();
  }, [id, navigate, toast]);

  // MANTENDO useEffect original (sem mudanças nas dependências)
  useEffect(() => {
    if (exercicioOriginal) {
      console.log('🔄 Recarregando URLs assinadas...');
      loadSignedUrls();
    }
  }, [exercicioOriginal, midias, loadSignedUrls]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.descricao.trim()) newErrors.descricao = 'Descrição é obrigatória';
    if (!formData.grupo_muscular) newErrors.grupo_muscular = 'Grupo muscular é obrigatório';
    if (!formData.equipamento) newErrors.equipamento = 'Equipamento é obrigatório';
    if (instrucoesList.every(i => !i.trim())) newErrors.instrucoes = 'Pelo menos uma instrução é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // NOVA ESTRATÉGIA: Upload direto para Cloudflare usando URL pré-assinada
  const uploadFile = async (file: File | string | null): Promise<string | null> => {
    if (!file) return null;

    // Se é um File (novo arquivo), faz upload direto
    if (file instanceof File) {
      try {
        const uniqueFilename = `pt_${user?.id}_${Date.now()}_${file.name.replace(/\s/g, '_')}`;

        console.log('📤 Fazendo upload direto para Cloudflare:', uniqueFilename);

        // Obter URL pré-assinada
        const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
          body: {
            action: 'generate_upload_url',
            filename: uniqueFilename,
            contentType: file.type,
            bucket_type: 'exercicios'
          }
        });

        if (presignedError || !presignedData.signedUrl) {
          throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
        }

        // Upload direto para Cloudflare R2
        const uploadResponse = await fetch(presignedData.signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file
        });

        if (!uploadResponse.ok) {
          throw new Error('Falha no upload direto para o R2.');
        }

        console.log('✅ Upload concluído:', presignedData.path);
        return presignedData.path;
      } catch (error) {
        console.error("Erro no upload:", error);
        toast.error("Falha no Upload", { description: `Erro ao enviar o arquivo: ${error.message}` });
        throw error;
      }
    }

    // Se é uma string (URL do exercício padrão)
    if (typeof file === 'string') {
      if (exercicioOriginal?.tipo === 'padrao') {
        try {
          // ✅ NOVA LÓGICA: Chamar a Edge Function de cópia server-to-server
          console.log('🔄 Solicitando cópia de mídia do exercício padrão:', file);
          toast.info("Copiando mídia", { description: "Criando cópia da mídia para seu exercício..." });

          const { data: copyResult, error: copyError } = await supabase.functions.invoke('copy-media', {
            body: {
              sourcePath: file,
            }
          });

          if (copyError || !copyResult.success) {
            throw new Error(copyError?.message || copyResult.error || 'Não foi possível copiar a mídia.');
          }

          console.log('✅ Cópia criada com sucesso via Edge Function:', copyResult.path);
          toast.success("Cópia criada", { description: "Mídia copiada com sucesso!" });
          return copyResult.path;
          
        } catch (error) {
          console.error('❌ Erro ao copiar mídia:', error);
          toast.error("Erro na cópia", { 
            description: `Falha ao copiar mídia: ${error.message}` 
          });
          throw error;
        }
      }
      
      console.log('📎 Mantendo URL existente:', file);
      return file;
    }

    return null;
  };

  // handleSave usando nova estratégia de upload
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Erro de Validação", {
        description: "Por favor, preencha todos os campos obrigatórios antes de salvar.",
      });
      return;
    }

    if (!user?.id) {
      toast.error("Erro de Autenticação", {
        description: "Usuário não autenticado.",
      });
      return;
    }

    setSaving(true);

    try {
      toast.info("Processando", { description: "Salvando e otimizando mídias..." });

      // Upload direto das mídias para Cloudflare
      const [imagem_1_url_final, imagem_2_url_final, video_url_final] = await Promise.all([
        uploadFile(midias.imagem_1_url),
        uploadFile(midias.imagem_2_url),
        uploadFile(midias.video_url),
      ]);

      const instrucoesFinal = instrucoesList.filter(i => i.trim()).join('#');
      const gruposSecundariosArray = formData.grupos_musculares_secundarios
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      // Criar cópia personalizada no banco
      const { data: exercicio, error } = await supabase
        .from('exercicios')
        .insert({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          grupo_muscular: formData.grupo_muscular,
          equipamento: formData.equipamento,
          dificuldade: formData.dificuldade,
          instrucoes: instrucoesFinal.trim(),
          grupo_muscular_primario: formData.grupo_muscular_primario.trim() || null,
          grupos_musculares_secundarios: formData.grupos_musculares_secundarios.trim() || null,
          imagem_1_url: imagem_1_url_final,
          imagem_2_url: imagem_2_url_final,
          video_url: video_url_final,
          youtube_url: midias.youtube_url as string || null,
          tipo: 'personalizado',
          pt_id: user.id,
          exercicio_padrao_id: exercicioOriginal?.id,
          is_ativo: true,
          status_midia: 'concluido'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Sucesso", {
        description: "Cópia do exercício criada com imagens otimizadas!",
      });

      console.log('✅ Cópia do exercício criada:', exercicio);
      navigate('/exercicios-pt');
      
    } catch (error) {
      console.error('❌ Erro ao criar cópia:', error);
      toast.error("Erro ao criar cópia", {
        description: "Não foi possível criar a cópia do exercício. Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando exercício...</p>
        </div>
      </div>
    );
  }

  if (!exercicioOriginal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/exercicios-pt')} className="h-10 w-10 p-0">
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
    <div className="space-y-6">
        {/* Cabeçalho Responsivo */}
        {!isMobile && (
          <div className="space-y-4">
          {/* Layout Desktop */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/exercicios-pt')} className="h-10 w-10 p-0">
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
            </div>
          </div>
        )}

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
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setInstrucoesList(list => list.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Remover</span>
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setInstrucoesList(list => [...list, ""])}>Adicionar etapa</Button>
                {errors.instrucoes && (
                  <p className="text-sm text-red-500 mt-1">{errors.instrucoes}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 3. Mídias */}
          <Card>
            <CardHeader>
              <CardTitle>Mídias</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload direto para Cloudflare com otimização automática
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
                          onClick={() => signedUrls.imagem1 && window.open(signedUrls.imagem1, '_blank')}
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
                          onClick={() => handleSelectMedia('imagem1')}
                          className="flex items-center gap-2"
                          disabled={saving}
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
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => handleSelectMedia('imagem1')}
                          className="flex items-center gap-2"
                          disabled={saving}
                        >
                          {isMobile ? (
                            <Camera className="h-4 w-4" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {isMobile ? 'Tirar Foto' : 'Selecionar Imagem'}
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
                          onClick={() => signedUrls.imagem2 && window.open(signedUrls.imagem2, '_blank')}
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
                          onClick={() => handleSelectMedia('imagem2')}
                          className="flex items-center gap-2"
                          disabled={saving}
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
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => handleSelectMedia('imagem2')}
                          className="flex items-center gap-2"
                          disabled={saving}
                        >
                          {isMobile ? (
                            <Camera className="h-4 w-4" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          {isMobile ? 'Tirar Foto' : 'Selecionar Imagem'}
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
                      <div className="relative inline-block w-48 aspect-video bg-black rounded-lg border shadow-sm">
                        {loadingImages ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">Carregando...</span>
                          </div>
                        ) : signedUrls.video ? (
                          <video 
                            src={signedUrls.video} 
                            className="w-full h-full object-contain rounded-lg"
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
                          onClick={() => signedUrls.video && window.open(signedUrls.video, '_blank')}
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
                          onClick={() => { if (isMobile) { setShowVideoInfoModal(true); } else { handleSelectMedia('video'); } }}
                          className="flex items-center gap-2"
                          disabled={saving}
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
                      <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => { if (isMobile) setShowVideoInfoModal(true); else toast.info("Funcionalidade móvel", { description: "A gravação de vídeo está disponível apenas no celular." }); }}
                          className="flex items-center gap-2 md:hidden"
                          disabled={saving || !isMobile}
                        >
                          <Video className="h-4 w-4" />
                          Gravar Vídeo
                        </Button>
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => handleSelectMedia('video')}
                          className="hidden md:flex items-center gap-2"
                          disabled={saving}
                        >
                          <Upload className="h-4 w-4" />
                          Selecionar Vídeo
                        </Button>
                      </div>
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

          {/* 4. YouTube */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Link do YouTube</CardTitle>
              <p className="text-sm text-muted-foreground">
                Adicione um vídeo do YouTube como referência.
              </p>
            </CardHeader>
            <CardContent>
              <div>
                {exercicioOriginal.youtube_url && (
                  <div className="border rounded-lg p-3 bg-muted/30 mb-4">
                    <p className="text-sm font-medium text-muted-foreground mb-1">YouTube Original:</p>
                    <p className="text-sm text-blue-600 break-all">{exercicioOriginal.youtube_url}</p>
                  </div>
                )}
                <Input
                  value={midias.youtube_url as string || ''}
                  onChange={(e) => setMidias(prev => ({ ...prev, youtube_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=... (cole aqui sua URL do YouTube)"
                />
                {midias.youtube_url && (
                  <div className="flex items-center gap-2 mt-3">
                    <div className="text-sm text-green-600 flex items-center gap-1">
                      ✅ URL do YouTube configurada
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => midias.youtube_url && window.open(midias.youtube_url as string, '_blank')} className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" /> Ver no YouTube
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Espaçador para o botão flutuante */}
          <div className="pb-24 md:pb-12" />
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

        <VideoInfoModal />

        {/* Botão Salvar Flutuante */}
        <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
          {/* Mobile: Round floating button */}
          <Button
            variant="default"
            onClick={handleSave}
            disabled={saving}
            className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-foreground"></div>
            ) : (
              <Save />
            )}
            <span className="sr-only">Salvar Cópia</span>
          </Button>

          {/* Desktop: Standard floating button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6"
            size="lg"
          >
            <Save />
            {saving ? "Salvando..." : "Salvar Cópia"}
          </Button>
        </div>
      </div>
  );
};

export default CopiaExercicio;