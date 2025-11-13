// Caminho: pages/CopiaExercicio.tsx
// Mantendo estrutura original, apenas trocando estratégia de upload

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import Modal from 'react-modal';
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Copy, Upload, Trash2, Eye, ExternalLink, Camera, Video, X, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from "@/hooks/useAuth";
import { VideoRecorder } from '@/components/media/VideoRecorder';
import { resizeAndOptimizeImage, validateImageFile } from '@/lib/imageUtils';
import { Tables } from "@/integrations/supabase/types";
import CustomSelect from "@/components/ui/CustomSelect";

type Exercicio = Tables<"exercicios">;

const CopiaExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    video_thumbnail_path: string | File | null;
  }>({
    imagem_1_url: null, 
    imagem_2_url: null, 
    video_url: null, 
    youtube_url: null,
    video_thumbnail_path: null,
  });

  const [coverMediaKey, setCoverMediaKey] = useState<keyof typeof midias | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<{
    imagem1?: string;
    imagem2?: string;
    video?: string;
    videoThumbnail?: string;
  }>({});
  const [initialMediaUrls, setInitialMediaUrls] = useState({
    imagem_1_url: null as string | null,
    imagem_2_url: null as string | null,
    video_url: null as string | null,
    video_thumbnail_path: null as string | null,
  });

  const [loadingImages, setLoadingImages] = useState(false);

  const gruposMusculares = [
    'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'
  ];

  const equipamentos = [
    'Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo', 'Kettlebell',
    'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais', 'Landmine', 'Bola Bosu'
  ];

  const dificuldades = ['Baixa', 'Média', 'Alta'];

  const GRUPOS_MUSCULARES_OPTIONS = gruposMusculares.map(o => ({ value: o, label: o }));
  const EQUIPAMENTOS_OPTIONS = equipamentos.map(d => ({ value: d, label: d }));
  const DIFICULDADES_OPTIONS = dificuldades.map(f => ({ value: f, label: f }));

  // ✅ SOLUÇÃO: Cache local para evitar múltiplas chamadas
  const urlCache = useRef<Map<string, string>>(new Map());

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
    const handleClose = () => onOpenChange(false);

    return (
      <Modal
        isOpen={open}
        onRequestClose={handleClose}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        {/* Header com botão X */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Conteúdo */}
        <div className="p-6">
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
        
        {/* Botões no footer */}
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={onConfirm} variant="destructive">Excluir</Button>
        </div>
      </Modal>
    );
  };

  const VideoInfoModal = () => {
    const handleConfirm = () => {
      setShowVideoInfoModal(false);
      setShowVideoRecorder(true);
    };
    const handleClose = () => setShowVideoInfoModal(false);

    return (
      <Modal
        isOpen={showVideoInfoModal}
        onRequestClose={handleClose}
        shouldCloseOnOverlayClick={true}
        shouldCloseOnEsc={true}
        className="bg-white rounded-lg max-w-md w-full mx-4 outline-none"
        overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Gravar Vídeo do Exercício</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            <strong>📱 Posicione o celular em pé (vertical):</strong>
          </p>
          <p className="text-sm text-muted-foreground mb-2">
            Para melhor visualização, segure o celular na posição vertical durante a gravação.
          </p>
          <p className="text-sm text-muted-foreground">
            O vídeo terá duração máxima de <strong>12 segundos</strong> e será salvo <strong>sem áudio</strong> para otimização.
          </p>
        </div>
        <div className="flex justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Iniciar Gravação</Button>
        </div>
      </Modal>
    );
  };

  // ✅ FUNÇÃO OTIMIZADA: Busca a URL da mídia com cache
  const getMediaUrl = useCallback(async (path: string, tipo: 'personalizado' | 'padrao'): Promise<string> => {
    if (!path) throw new Error('Caminho da mídia não fornecido');
    
    // ✅ Verifica cache primeiro
    const cacheKey = `${tipo}_${path}`;
    if (urlCache.current.has(cacheKey)) {
      return urlCache.current.get(cacheKey)!;
    }

    try {
      const bucket_type = tipo === 'personalizado' ? 'exercicios' : 'exercicios-padrao';

      const { data: result, error } = await supabase.functions.invoke('get-image-url', {
        body: {
          filename: path,
          bucket_type: bucket_type
        }
      });

      if (error) {
        throw error;
      }

      if (!result.success || !result.url) {
        throw new Error('URL não retornada pelo servidor');
      }

      // ✅ Armazena no cache
      urlCache.current.set(cacheKey, result.url);
      return result.url;
    } catch (error) {
      console.error(`Erro ao obter URL para ${tipo} (${path}):`, error);
      throw error;
    }
  }, []);

  // ✅ FUNÇÃO SIMPLIFICADA: Carrega URLs apenas uma vez
  const loadSignedUrls = useCallback(async (tipoExercicioOriginal: 'padrao' | 'personalizado') => {
    if (!exercicioOriginal?.id || loading) return;

    console.log('🚀 INICIANDO CARREGAMENTO DE URLs...');

    try {
      const urlsToLoad = [];
      const newUrls: Record<string, string | undefined> = {};

      // Processa imagens e vídeos existentes (não arquivos novos)
      if (midias.imagem_1_url && typeof midias.imagem_1_url === 'string') {
        urlsToLoad.push(
          getMediaUrl(midias.imagem_1_url, tipoExercicioOriginal)
            .then(url => ({ key: 'imagem1', url }))
            .catch(() => ({ key: 'imagem1', url: undefined }))
        );
      }

      if (midias.imagem_2_url && typeof midias.imagem_2_url === 'string') {
        urlsToLoad.push(
          getMediaUrl(midias.imagem_2_url, tipoExercicioOriginal)
            .then(url => ({ key: 'imagem2', url }))
            .catch(() => ({ key: 'imagem2', url: undefined }))
        );
      }

      if (midias.video_url && typeof midias.video_url === 'string') {
        urlsToLoad.push(
          getMediaUrl(midias.video_url, tipoExercicioOriginal)
            .then(url => ({ key: 'video', url }))
            .catch(() => ({ key: 'video', url: undefined }))
        );
      }

      // Processa arquivos novos (Files)
      if (midias.imagem_1_url instanceof File) {
        newUrls.imagem1 = URL.createObjectURL(midias.imagem_1_url);
      }
      if (midias.imagem_2_url instanceof File) {
        newUrls.imagem2 = URL.createObjectURL(midias.imagem_2_url);
      }
      if (midias.video_url instanceof File) {
        newUrls.video = URL.createObjectURL(midias.video_url);
      }

      // Aguarda todas as URLs externas
      if (urlsToLoad.length > 0) {
        const results = await Promise.all(urlsToLoad);
        results.forEach(result => {
          if (result.url) {
            newUrls[result.key] = result.url;
          }
        });
      }

      setSignedUrls(prev => ({ ...prev, ...newUrls }));
      console.log('✅ URLs carregadas com sucesso');

    } catch (error) {
      console.error('💥 Erro ao carregar URLs:', error);
    } finally {
      setLoadingImages(false);
    }
  }, [exercicioOriginal?.id, midias.imagem_1_url, midias.imagem_2_url, midias.video_url, getMediaUrl, loading]);

  // ✅ useEffect SIMPLIFICADO - Executa apenas quando necessário
  useEffect(() => {
    if (exercicioOriginal?.id && !loading) {
      console.log('🎯 EXECUTANDO CARREGAMENTO UMA VEZ');
      loadSignedUrls(exercicioOriginal.tipo as 'padrao' | 'personalizado');
    }
  }, [exercicioOriginal?.id, exercicioOriginal?.tipo, loading, loadSignedUrls]);

  // Função para seleção de mídia (adaptada para desktop)
  const handleSelectMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    console.log('🔍 [handleSelectMedia] Iniciado para tipo:', type);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'video' ? 'video/*' : 'image/jpeg, image/png, image/webp';

    // No celular, prioriza a câmera. No desktop, abre o seletor de arquivos.
    if (isMobile) {
      input.capture = type === 'video' ? 'user' : 'environment';
    }

    const handleFileSelection = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      console.log('🔍 [handleSelectMedia] Arquivo selecionado:', file ? { name: file.name, size: file.size, type: file.type } : 'Nenhum arquivo');
      if (!file) {
        target.value = '';
        return;
      }

      if (type.startsWith('imagem')) {
        console.log('🔍 [handleSelectMedia] Validando imagem...');
        const validation = validateImageFile(file);
        if (!validation.isValid) {
          toast.error("Arquivo de imagem inválido", { description: validation.error });
          target.value = '';
          return;
        }
      } else if (type === 'video') {
        console.log('🔍 [handleSelectMedia] Validando vídeo...');
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
          toast.error("Arquivo de vídeo muito grande", { description: "O tamanho máximo para vídeos é 20MB." });
          target.value = '';
          return;
        }
      }

      if (type === 'imagem1' || type === 'imagem2') {
        console.log('🔍 [handleSelectMedia] Chamando resizeAndOptimizeImage...');
        const resized = await resizeAndOptimizeImage(file, 640);
        if (!resized) {
          console.error('❌ [handleSelectMedia] resizeAndOptimizeImage retornou nulo.');
          toast.error("Erro ao processar imagem.");
          target.value = '';
          return;
        }
        console.log('✅ [handleSelectMedia] Imagem processada. Atualizando estado `midias`.');
        const key = type === 'imagem1' ? 'imagem_1_url' : 'imagem_2_url';
        setMidias(prev => ({ ...prev, [key]: resized }));
      } else if (type === 'video') {
        setMidias(prev => ({ ...prev, video_url: file }));
        console.log('✅ [handleSelectMedia] Vídeo selecionado. Atualizando estado `midias`.');
      }
      // Limpa o input para permitir a seleção do mesmo arquivo novamente
      target.value = '';
    };
    
    input.addEventListener('change', handleFileSelection);
    input.click();
  };

  const handleRecordingComplete = ({ 
    videoBlob, 
    thumbnailBlob 
  }: { 
    videoBlob: Blob, 
    thumbnailBlob: Blob 
  }) => {
    const videoFile = new File([videoBlob], `gravacao_${Date.now()}.webm`, { type: 'video/webm' });    
    const thumbnailFile = new File([thumbnailBlob], `thumbnail_${Date.now()}.jpeg`, { type: 'image/jpeg' });    
    setMidias(prev => ({ ...prev, video_url: videoFile, video_thumbnail_path: thumbnailFile }));
    setShowVideoRecorder(false);
  };

  const handleDeleteMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    try {
      const mediaKeyToDelete = type === 'imagem1' ? 'imagem_1_url' : type === 'imagem2' ? 'imagem_2_url' : 'video_url';

      // Se estiver deletando vídeo, também deleta o thumbnail
      if (type === 'video') {
        setMidias(prev => ({
          ...prev,
          video_url: null,
          video_thumbnail_path: null
        }));
      } else {
        setMidias(prev => ({ ...prev, [mediaKeyToDelete]: null }));
      }

      if (coverMediaKey === mediaKeyToDelete) {
        setCoverMediaKey(null);
      }

      setShowDeleteMediaDialog(null);
    } catch (error) {
      console.error('Erro ao deletar mídia:', error);
      toast.error("Erro ao excluir", {
        description: "Erro ao excluir mídia.",
      });
    }
  };

  // Efeito para definir a primeira mídia como capa automaticamente
  useEffect(() => {
    if (coverMediaKey) return;

    const firstAvailableMedia = (['imagem_1_url', 'imagem_2_url', 'video_url', 'youtube_url'] as const).find(
      key => midias[key] !== null
    );

    if (firstAvailableMedia) {
      setCoverMediaKey(firstAvailableMedia);
    }
  }, [midias, coverMediaKey]);

  // useEffect para carregar exercício original (mantido igual)
  useEffect(() => {
    const handleVoltar = () => {
      const returnTo = searchParams.get('returnTo');

      if (returnTo) {
        const decodedReturnTo = decodeURIComponent(returnTo);
        navigate(decodedReturnTo, { replace: true });
      } else {
        navigate('/exercicios', { replace: true });
      }
    };

    const fetchExercicio = async () => {
      if (!id) {
        handleVoltar();
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
          video_thumbnail_path: exercicio.video_thumbnail_path || null,
          youtube_url: exercicio.youtube_url || null,
        });
        setInitialMediaUrls({
          imagem_1_url: exercicio.imagem_1_url,
          imagem_2_url: exercicio.imagem_2_url,
          video_url: exercicio.video_url,
          video_thumbnail_path: exercicio.video_thumbnail_path,
        });

        setCoverMediaKey(exercicio.cover_media_url as keyof typeof midias | null);
        console.log('✅ Exercício original carregado:', exercicio);
      } catch (error) {
        console.error('❌ Erro ao carregar exercício:', error);
        toast.error("Erro ao carregar", {
          description: "Não foi possível carregar o exercício. Verifique se o ID está correto.",
        });
        handleVoltar();
      } finally {
        setLoading(false);
      }
    };

    fetchExercicio();
  }, [id, navigate, toast]);

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

        if (presignedError || !presignedData.signedUrl) throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
        
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
        throw error;
      }
    }

    // Se é uma string (URL do exercício padrão)
    if (typeof file === 'string') {
      if (exercicioOriginal?.tipo === 'padrao') {
        try {
          // ✅ NOVA LÓGICA: Chamar a Edge Function de cópia server-to-server
          console.log('🔄 Solicitando cópia de mídia do exercício padrão:', file);

          const { data: copyResult, error: copyError } = await supabase.functions.invoke('copy-media', {
            body: {
              sourcePath: file,
            }
          });

          if (copyError || !copyResult.success) throw new Error(copyError?.message || copyResult.error || 'Não foi possível copiar a mídia.');
          
          console.log('✅ Cópia criada com sucesso via Edge Function:', copyResult.path);
          return copyResult.path;
          
        } catch (error) {
          console.error('❌ Erro ao copiar mídia:', error);
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

    setSaving(true); // O botão já indica "Salvando..."

    try {
      // 1. Processar e fazer upload/cópia de todas as mídias
      const [imagem_1_url_final, imagem_2_url_final, video_url_final, video_thumbnail_path_final] = await Promise.all([
        uploadFile(midias.imagem_1_url),
        uploadFile(midias.imagem_2_url),
        uploadFile(midias.video_url),
        uploadFile(midias.video_thumbnail_path),
      ]);

      const instrucoesFinal = instrucoesList.filter(i => i.trim()).join('#');

      // 2. Inserir o novo exercício no banco de dados
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
          video_thumbnail_path: video_thumbnail_path_final,
          youtube_url: midias.youtube_url as string || null,
          cover_media_url: coverMediaKey ? String(coverMediaKey) : null,
          tipo: 'personalizado',
          professor_id: user.id,
          exercicio_padrao_id: exercicioOriginal?.id,
          is_ativo: true,
          status_midia: 'concluido'
        })
        .select()
        .single();

      if (error) throw error;

      // O redirecionamento já indica o sucesso da operação.
      const returnTo = searchParams.get('returnTo');

      if (returnTo) {
        const decodedReturnTo = decodeURIComponent(returnTo);
        navigate(decodedReturnTo, { replace: true });
      } else {
        navigate('/exercicios', { replace: true });
      }
    } catch (err) {
      const error = err as Error;
      console.error('❌ Erro ao criar cópia:', error);
      toast.error("Erro ao criar cópia", { description: error.message });
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
          <Button variant="ghost" onClick={() => {
            const returnTo = searchParams.get('returnTo');
            if (returnTo) {
              navigate(decodeURIComponent(returnTo), { replace: true });
            } else {
              navigate('/exercicios', { replace: true });
            }
          }} className="h-10 w-10 p-0">
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
                <Button variant="ghost" onClick={() => {
                  const returnTo = searchParams.get('returnTo');
                  if (returnTo) {
                    navigate(decodeURIComponent(returnTo), { replace: true });
                  } else {
                    navigate('/exercicios', { replace: true });
                  }
                }} className="h-10 w-10 p-0">
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
                <CustomSelect
                  inputId="grupo_muscular"
                  value={GRUPOS_MUSCULARES_OPTIONS.find(opt => opt.value === formData.grupo_muscular)}
                  onChange={(option) => setFormData(prev => ({ ...prev, grupo_muscular: option ? String(option.value) : '' }))}
                  options={GRUPOS_MUSCULARES_OPTIONS}
                  placeholder="Selecione..."
                />
                  {errors.grupo_muscular && (
                    <p className="text-sm text-red-500 mt-1">{errors.grupo_muscular}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="equipamento" className="text-sm font-medium text-muted-foreground">Equipamento</Label>
                <CustomSelect
                  inputId="equipamento"
                  value={EQUIPAMENTOS_OPTIONS.find(opt => opt.value === formData.equipamento)}
                  onChange={(option) => setFormData(prev => ({ ...prev, equipamento: option ? String(option.value) : '' }))}
                  options={EQUIPAMENTOS_OPTIONS}
                  placeholder="Selecione..."
                />
                  {errors.equipamento && (
                    <p className="text-sm text-red-500 mt-1">{errors.equipamento}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="dificuldade" className="text-sm font-medium text-muted-foreground">Dificuldade</Label>
                <CustomSelect
                  inputId="dificuldade"
                  value={DIFICULDADES_OPTIONS.find(opt => opt.value === formData.dificuldade)}
                  onChange={(option) => setFormData(prev => ({ ...prev, dificuldade: option ? option.value as "Baixa" | "Média" | "Alta" : 'Baixa' }))}
                  options={DIFICULDADES_OPTIONS}
                />
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
                      <div className="relative inline-block w-40 h-40 bg-muted rounded-lg border flex items-center justify-center overflow-hidden">
                        {midias.imagem_1_url instanceof File ? (
                          <img 
                            src={URL.createObjectURL(midias.imagem_1_url)} 
                            alt="Preview da primeira imagem" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : signedUrls.imagem1 ? (
                          <img 
                            src={signedUrls.imagem1} 
                            alt="Primeira imagem" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">Carregando...</span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-8 w-8 bg-white/30 hover:bg-white/50 backdrop-blur-sm text-gray-800 rounded-full"
                          onClick={() => setCoverMediaKey('imagem_1_url')}
                          title="Definir como capa"
                        >
                          <Star
                            className={`h-4 w-4 transition-all ${coverMediaKey === 'imagem_1_url' ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent'}`}
                          />
                        </Button>
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
                          <Camera className="h-4 w-4" /> {isMobile ? 'Nova' : 'Nova Foto'}
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
                      <div className="relative inline-block w-40 h-40 bg-muted rounded-lg border flex items-center justify-center overflow-hidden">
                        {midias.imagem_2_url instanceof File ? (
                          <img 
                            src={URL.createObjectURL(midias.imagem_2_url)} 
                            alt="Preview da segunda imagem" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : signedUrls.imagem2 ? (
                          <img 
                            src={signedUrls.imagem2} 
                            alt="Segunda imagem" 
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">Carregando...</span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-8 w-8 bg-white/30 hover:bg-white/50 backdrop-blur-sm text-gray-800 rounded-full"
                          onClick={() => setCoverMediaKey('imagem_2_url')}
                          title="Definir como capa"
                        >
                          <Star
                            className={`h-4 w-4 transition-all ${coverMediaKey === 'imagem_2_url' ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent'}`}
                          />
                        </Button>
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
                          <Camera className="h-4 w-4" /> {isMobile ? 'Nova' : 'Nova Foto'}
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
                      <div className="relative inline-block w-40 bg-muted rounded-lg border shadow-sm overflow-hidden flex items-center justify-center">
                        {signedUrls.video && (
                          <video
                            src={signedUrls.video}
                            className="w-full h-auto object-contain rounded-lg"
                            controls
                          />
                        )}
                        {!signedUrls.video && (
                          <div className="w-full h-40 bg-muted rounded-lg border flex items-center justify-center">
                            <span className="text-sm text-muted-foreground">Carregando...</span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-8 w-8 bg-white/30 hover:bg-white/50 backdrop-blur-sm text-gray-800 rounded-full"
                          onClick={() => setCoverMediaKey('video_url')}
                          title="Definir como capa"
                        >
                          <Star
                            className={`h-4 w-4 transition-all ${coverMediaKey === 'video_url' ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent'}`}
                          />
                        </Button>
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
                          {isMobile ? (
                            <div className="flex flex-col items-center text-center leading-tight">
                              <div className="flex items-center gap-2"><Video className="h-4 w-4" /> <span>Novo Vídeo</span></div>
                              <span className="text-xs block font-normal">(Segure em pé)</span>
                            </div>
                          ) : <><Video className="h-4 w-4" /> Novo Vídeo</>}
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
                          className="flex items-center gap-2"
                          disabled={saving || !isMobile}
                        >
                          <div className="flex flex-col items-center leading-tight">
                              <div className="flex items-center gap-2"><Video className="h-4 w-4" /> <span>Gravar</span></div>
                              <span className="text-xs block font-normal">(Segure em pé)</span>
                            </div>
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
                <div className="relative">
                  <Input
                    value={midias.youtube_url as string || ''}
                    onChange={(e) => setMidias(prev => ({ ...prev, youtube_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=... (cole aqui sua URL do YouTube)"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 -translate-y-1/2 right-1 h-8 w-8"
                    onClick={() => setCoverMediaKey('youtube_url')}
                    title="Definir como capa"
                    disabled={!midias.youtube_url}
                  >
                    <Star className={`h-4 w-4 transition-all ${coverMediaKey === 'youtube_url' ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
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
          <Button
            variant="default"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-foreground"></div>
            ) : (
              <Save />
            )}
            <span className="sr-only">{saving ? "Salvando..." : "Salvar Cópia"}</span>
          </Button>
        </div>
      </div>
  );
};

export default CopiaExercicio;
