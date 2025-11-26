// src/pages/EditarExercicioPadrao.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import Modal from 'react-modal';
import { ArrowLeft, Save, Trash2, Eye, Video, Upload, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from "@/hooks/useAuth";
import { VideoRecorder } from '@/components/media/VideoRecorder';
import { Tables } from "@/integrations/supabase/types";
import { resizeAndOptimizeImage, validateImageFile } from '@/lib/imageUtils';
import CustomSelect from "@/components/ui/CustomSelect";

type Exercicio = Tables<"exercicios">;

const EditarExercicioPadrao = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = sonnerToast;
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const ADMIN_EMAIL = 'contato@titans.fitness';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercicio, setExercicio] = useState<Exercicio | null>(null);

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

  const [midias, setMidias] = useState<{ [key: string]: string | File | null; video_thumbnail_path: string | File | null; }>({
    imagem_1_url: null,
    imagem_2_url: null,
    video_url: null,
    youtube_url: null,
    video_thumbnail_path: null,
  });

  const [coverMediaKey, setCoverMediaKey] = useState<keyof typeof midias | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<{ imagem1?: string; imagem2?: string; video?: string }>({});
  const [initialMediaUrls, setInitialMediaUrls] = useState({ imagem_1_url: null as string | null, imagem_2_url: null as string | null, video_url: null as string | null, video_thumbnail_path: null as string | null });

  const [showVideoInfoModal, setShowVideoInfoModal] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showDeleteMediaDialog, setShowDeleteMediaDialog] = useState<string | null>(null);

  const gruposMusculares = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'];
  const equipamentos = ['Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo', 'Kettlebell', 'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais', 'Landmine', 'Bola Bosu'];
  const dificuldades = ['Baixa', 'Média', 'Alta'];

  const GRUPOS_MUSCULARES_OPTIONS = gruposMusculares.map(o => ({ value: o, label: o }));
  const EQUIPAMENTOS_OPTIONS = equipamentos.map(d => ({ value: d, label: d }));
  const DIFICULDADES_OPTIONS = dificuldades.map(f => ({ value: f, label: f }));

  // ✅ SOLUÇÃO RADICAL: Cache local das URLs para evitar múltiplas chamadas
  const urlCache = useRef<Map<string, string>>(new Map());

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
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
            <span className="sr-only">Fechar</span>
            ×
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

  // Função para voltar preservando filtros
  const handleVoltar = () => {
    const returnTo = searchParams.get('returnTo');
    
    if (returnTo) {
      const decodedReturnTo = decodeURIComponent(returnTo);
      navigate(decodedReturnTo, { replace: true });
    } else {
      navigate('/exercicios', { replace: true });
    }
  };

  const getSignedImageUrl = useCallback(async (filename: string): Promise<string | null> => {
    if (!filename) return null;
    
    // ✅ Verifica cache primeiro
    if (urlCache.current.has(filename)) {
      return urlCache.current.get(filename) || null;
    }

    try {
      console.log(`🔄 Buscando URL para: ${filename}`);
      const startTime = Date.now();
      
      const { data, error } = await supabase.functions.invoke('get-image-url', {
        body: { 
          filename, 
          bucket_type: 'exercicios-padrao'
        }
      });
      
      if (error) throw error;
      
      const url = data?.url || null;
      if (url) {
        urlCache.current.set(filename, url);
        console.log(`✅ URL obtida em ${Date.now() - startTime}ms: ${filename}`);
      }
      
      return url;
    } catch (error) {
      console.error('❌ Erro ao obter URL assinada:', error);
      return null;
    }
  }, []);

  // ✅ SOLUÇÃO SIMPLIFICADA: Carrega URLs apenas uma vez
  const loadSignedUrls = useCallback(async () => {
    if (!exercicio?.id || loading) return;

    console.log('🚀 INICIANDO CARREGAMENTO DE URLs...');

    try {
      const urlsToLoad = [];

      if (midias.imagem_1_url && typeof midias.imagem_1_url === 'string') {
        urlsToLoad.push(getSignedImageUrl(midias.imagem_1_url).then(url => ({ key: 'imagem1', url })));
      }

      if (midias.imagem_2_url && typeof midias.imagem_2_url === 'string') {
        urlsToLoad.push(getSignedImageUrl(midias.imagem_2_url).then(url => ({ key: 'imagem2', url })));
      }

      if (midias.video_url && typeof midias.video_url === 'string') {
        urlsToLoad.push(getSignedImageUrl(midias.video_url).then(url => ({ key: 'video', url })));
      }

      if (urlsToLoad.length === 0) {
        console.log('⏭️ Nenhuma URL para carregar');
        return;
      }

      const results = await Promise.all(urlsToLoad);
      const newUrls: Record<string, string | undefined> = {};

      results.forEach(result => {
        if (result.url) {
          newUrls[result.key] = result.url;
        }
      });

      setSignedUrls(prev => ({ ...prev, ...newUrls }));
      console.log('✅ URLs carregadas com sucesso');

    } catch (error) {
      console.error('💥 Erro ao carregar URLs:', error);
    }
  }, [exercicio?.id, midias.imagem_1_url, midias.imagem_2_url, midias.video_url, getSignedImageUrl, loading]);

  // ✅ useEffect SIMPLIFICADO - Executa apenas uma vez
  useEffect(() => {
    if (exercicio?.id && !loading) {
      console.log('🎯 EXECUTANDO CARREGAMENTO UMA VEZ');
      loadSignedUrls();
    }
  }, [exercicio?.id, loading, loadSignedUrls]); // Apenas estas dependências

  // useEffect para carregar exercício
  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id || !user) { handleVoltar(); return; }
      if (user.email !== ADMIN_EMAIL) {
        toast.error("Acesso Negado");
        handleVoltar();
        return;
      }

      try {
        const { data, error } = await supabase.from('exercicios').select('*').eq('id', id).single();
        if (error || !data || data.tipo !== 'padrao') throw new Error('Exercício padrão não encontrado.');

        setExercicio(data);
        setFormData({
          nome: data.nome ?? "",
          descricao: data.descricao ?? "",
          grupo_muscular: data.grupo_muscular ?? "",
          equipamento: data.equipamento ?? "",
          dificuldade: (data.dificuldade as "Baixa" | "Média" | "Alta") || "Baixa",
          instrucoes: data.instrucoes ?? "",
          grupo_muscular_primario: data.grupo_muscular_primario ?? "",
          grupos_musculares_secundarios: Array.isArray(data.grupos_musculares_secundarios) ? data.grupos_musculares_secundarios.join(', ') : (data.grupos_musculares_secundarios ?? ""),
        });
        setInstrucoesList(data.instrucoes ? data.instrucoes.split('#').filter(Boolean).map(i => i.trim()) : []);
        
        const initialMidias = { 
          imagem_1_url: data.imagem_1_url, 
          imagem_2_url: data.imagem_2_url, 
          video_url: data.video_url, 
          youtube_url: data.youtube_url, 
          video_thumbnail_path: data.video_thumbnail_path 
        };
        
        setMidias(initialMidias);
        setCoverMediaKey(data.cover_media_url as keyof typeof midias | null);
        setInitialMediaUrls({ imagem_1_url: data.imagem_1_url, imagem_2_url: data.imagem_2_url, video_url: data.video_url, video_thumbnail_path: data.video_thumbnail_path });
      } catch (error) {
        toast.error("Erro ao carregar exercício", { description: (error as Error).message });
        handleVoltar();
      } finally {
        setLoading(false);
      }
    };
    fetchExercicio();
  }, [id, user, navigate, ADMIN_EMAIL, toast]);

  const handleSelectMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'video' ? 'video/*' : 'image/jpeg, image/png, image/webp';
    if (isMobile) input.capture = type === 'video' ? 'user' : 'environment';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const validation = validateImageFile(file);
      if (type.startsWith('imagem') && !validation.isValid) {
        toast.error("Arquivo inválido", { description: validation.error });
        return;
      }

      try {
        const processedFile = type.startsWith('imagem')
          ? await resizeAndOptimizeImage(file, 640)
          : file;
        const key = type === 'imagem1' ? 'imagem_1_url' : type === 'imagem2' ? 'imagem_2_url' : 'video_url';
        setMidias(prev => ({ ...prev, [key]: processedFile }));
      } catch (error) {
        toast.error("Erro ao processar imagem");
        console.error(error);
      }
    };
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

  const handleDeleteMedia = useCallback((mediaKey: 'imagem1' | 'imagem2' | 'video') => {
    const stateKeys = [];
    if (mediaKey === 'imagem1') stateKeys.push('imagem_1_url');
    if (mediaKey === 'imagem2') stateKeys.push('imagem_2_url');
    
    if (mediaKey === 'video') {
      stateKeys.push('video_url');
      stateKeys.push('video_thumbnail_path');
    }

    setMidias(prev => {
      const newMidias = { ...prev };
      stateKeys.forEach(key => {
        newMidias[key as keyof typeof newMidias] = null;
      });
      return newMidias;
    });

    if (mediaKey === 'imagem1' && coverMediaKey === 'imagem_1_url') {
      setCoverMediaKey(null);
    }
    if (mediaKey === 'imagem2' && coverMediaKey === 'imagem_2_url') {
      setCoverMediaKey(null);
    }
    if (mediaKey === 'video' && coverMediaKey === 'video_url') {
      setCoverMediaKey(null);
    }

    setShowDeleteMediaDialog(null);
    toast.success("Mídia Excluída", { description: "Lembre-se de salvar para confirmar a exclusão no banco de dados." });
  }, [setMidias, setShowDeleteMediaDialog, toast, coverMediaKey]);

  const uploadFile = async (file: File | string | null): Promise<string | null> => {
    if (!file || !(file instanceof File)) return null;

    try {
      const uniqueFilename = `padrao_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
        body: { action: 'generate_upload_url', filename: uniqueFilename, contentType: file.type, bucket_type: 'exercicios-padrao' }
      });
      if (presignedError || !presignedData.signedUrl) throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
      const uploadResponse = await fetch(presignedData.signedUrl, { method: 'PUT', body: file });
      if (!uploadResponse.ok) throw new Error('Falha no upload direto para o R2.');
      return presignedData.path;
    } catch (error) {
      toast.error("Falha no Upload", { description: (error as Error).message });
      throw error;
    }
  };

  const deleteFile = async (fileUrl: string) => {
    if (!fileUrl) return;
    if (fileUrl.includes('storage.googleapis.com')) return;

    try {
      const filename = fileUrl.split('?')[0].split('/').pop();
      if (!filename) return;
      await supabase.functions.invoke('delete-media', { body: { filename, bucket_type: 'exercicios-padrao' } });
    } catch (error) {
      console.error(`Erro ao deletar arquivo antigo (${fileUrl}):`, error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.descricao.trim()) newErrors.descricao = 'Descrição é obrigatória';
    if (instrucoesList.every(i => !i.trim())) newErrors.instrucoes = 'Pelo menos uma instrução é obrigatória';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!id || !user) return;
    setSaving(true);

    if (!validateForm()) {
      toast.error("Erro de Validação", {
        description: "Por favor, preencha todos os campos obrigatórios.",
      });
      setSaving(false);
      return;
    }

    try {
      const finalMediaUrls: { [key: string]: string | null } = {};
      for (const key of ['imagem_1_url', 'imagem_2_url', 'video_url', 'video_thumbnail_path']) {
        const currentValue = midias[key];
        const initialValue = initialMediaUrls[key as keyof typeof initialMediaUrls];

        if (currentValue instanceof File) {
          finalMediaUrls[key] = await uploadFile(currentValue);
          if (initialValue) await deleteFile(initialValue);
        } else if (currentValue === null && initialValue) {
          finalMediaUrls[key] = null;
          await deleteFile(initialValue);
        } else {
          finalMediaUrls[key] = currentValue as string | null;
        }
      }

      // Atualizar exercício padrão diretamente no banco (RLS policy garante permissão)
      const { error } = await supabase
        .from('exercicios')
        .update({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
          grupo_muscular: formData.grupo_muscular,
          equipamento: formData.equipamento,
          dificuldade: formData.dificuldade,
          instrucoes: instrucoesList.filter(i => i.trim()).join('#'),
          grupo_muscular_primario: formData.grupo_muscular_primario.trim() || null,
          grupos_musculares_secundarios: formData.grupos_musculares_secundarios.trim() || null,
          cover_media_url: coverMediaKey ? String(coverMediaKey) : null,
          imagem_1_url: finalMediaUrls.imagem_1_url,
          imagem_2_url: finalMediaUrls.imagem_2_url,
          video_url: finalMediaUrls.video_url,
          video_thumbnail_path: finalMediaUrls.video_thumbnail_path,
          youtube_url: midias.youtube_url as string || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success("Exercício Padrão Atualizado", {
        description: `O exercício "${formData.nome.trim()}" foi atualizado com sucesso.`
      });
      
      handleVoltar();
    } catch (error) {
      toast.error("Erro ao salvar", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (!exercicio) return <div>Exercício não encontrado.</div>;

  return (
    <div className="space-y-6">
      {!isMobile && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={handleVoltar} className="h-10 w-10 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Exercício Padrão</h1>
            <p className="text-muted-foreground">Modificando: <span className="font-medium">{exercicio.nome}</span></p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} className={errors.nome ? "border-red-500" : ""} />
              {errors.nome && <p className="text-sm text-red-500 mt-1">{errors.nome}</p>}
            </div>
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea id="descricao" value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} className={errors.descricao ? "border-red-500" : ""} />
              {errors.descricao && <p className="text-sm text-red-500 mt-1">{errors.descricao}</p>}
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="grupo_muscular">Grupo Muscular</Label>
                <CustomSelect inputId="grupo_muscular" value={GRUPOS_MUSCULARES_OPTIONS.find(opt => opt.value === formData.grupo_muscular)} onChange={(option) => setFormData(prev => ({ ...prev, grupo_muscular: option ? String(option.value) : '' }))} options={GRUPOS_MUSCULARES_OPTIONS} />
              </div>
              <div>
                <Label htmlFor="equipamento">Equipamento</Label>
                <CustomSelect inputId="equipamento" value={EQUIPAMENTOS_OPTIONS.find(opt => opt.value === formData.equipamento)} onChange={(option) => setFormData(prev => ({ ...prev, equipamento: option ? String(option.value) : '' }))} options={EQUIPAMENTOS_OPTIONS} />
              </div>
              <div>
                <Label htmlFor="dificuldade">Dificuldade</Label>
                <CustomSelect inputId="dificuldade" value={DIFICULDADES_OPTIONS.find(opt => opt.value === formData.dificuldade)} onChange={(option) => setFormData(prev => ({ ...prev, dificuldade: option ? option.value as "Baixa" | "Média" | "Alta" : 'Baixa' }))} options={DIFICULDADES_OPTIONS} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="grupo_muscular_primario">Músculo primário</Label>
                <Input id="grupo_muscular_primario" value={formData.grupo_muscular_primario} onChange={e => setFormData(prev => ({ ...prev, grupo_muscular_primario: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="grupos_musculares_secundarios">Músculo(s) secundário(s)</Label>
                <Input id="grupos_musculares_secundarios" value={formData.grupos_musculares_secundarios} onChange={e => setFormData(prev => ({ ...prev, grupos_musculares_secundarios: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Instruções de execução</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {instrucoesList.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="w-6 text-right text-base font-semibold text-muted-foreground">{idx + 1}.</span>
                  <Input value={item} onChange={e => { const newList = [...instrucoesList]; newList[idx] = e.target.value; setInstrucoesList(newList); }} placeholder={`Etapa ${idx + 1}`} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setInstrucoesList(list => list.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setInstrucoesList(list => [...list, ""])}>Adicionar etapa</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mídias</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Imagem 1 */}
            <div>
              <Label className="text-sm font-medium">Primeira Imagem</Label>
              <div className="mt-2 space-y-4">
                {midias.imagem_1_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block w-40 h-40 bg-muted rounded-lg border flex items-center justify-center overflow-hidden">
                      {midias.imagem_1_url instanceof File ? (
                        <img src={URL.createObjectURL(midias.imagem_1_url)} alt="Preview da primeira imagem" className="max-w-full max-h-full object-contain" />
                      ) : signedUrls.imagem1 ? (
                        <img 
                          src={signedUrls.imagem1} 
                          alt="Primeira imagem" 
                          className="max-w-full max-h-full object-contain"
                          loading="eager"
                          decoding="sync"
                          fetchPriority="high"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">Carregando...</div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-8 w-8 bg-white/30 hover:bg-white/50 backdrop-blur-sm text-gray-800 rounded-full"
                        onClick={() => setCoverMediaKey('imagem_1_url')}
                        title="Definir como capa"
                      >
                        <Star className={`h-4 w-4 transition-all ${coverMediaKey === 'imagem_1_url' ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent'}`} />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.imagem1 && window.open(signedUrls.imagem1, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.imagem1}><Eye className="h-4 w-4" /> Ver</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem1')} className="flex items-center gap-2" disabled={saving}><Upload className="h-4 w-4" /> Alterar</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('imagem1')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Button type="button" variant="default" onClick={() => handleSelectMedia('imagem1')} className="flex items-center gap-2" disabled={saving}><Upload className="h-4 w-4" /> Selecionar Imagem</Button>
                  </div>
                )}
              </div>
            </div>

            {/* Imagem 2 */}
            <div>
              <Label className="text-sm font-medium">Segunda Imagem</Label>
              <div className="mt-2 space-y-4">
                {midias.imagem_2_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                      {midias.imagem_2_url instanceof File ? (
                        <img src={URL.createObjectURL(midias.imagem_2_url)} alt="Preview da segunda imagem" className="max-w-full max-h-full object-contain" />
                      ) : signedUrls.imagem2 ? (
                        <img 
                          src={signedUrls.imagem2} 
                          alt="Segunda imagem" 
                          className="max-w-full max-h-full object-contain"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">Carregando...</div>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-8 w-8 bg-white/30 hover:bg-white/50 backdrop-blur-sm text-gray-800 rounded-full"
                        onClick={() => setCoverMediaKey('imagem_2_url')}
                        title="Definir como capa"
                      >
                        <Star className={`h-4 w-4 transition-all ${coverMediaKey === 'imagem_2_url' ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent'}`} />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.imagem2 && window.open(signedUrls.imagem2, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.imagem2}><Eye className="h-4 w-4" /> Ver</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem2')} className="flex items-center gap-2" disabled={saving}><Upload className="h-4 w-4" /> Alterar</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('imagem2')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Button type="button" variant="default" onClick={() => handleSelectMedia('imagem2')} className="flex items-center gap-2" disabled={saving}><Upload className="h-4 w-4" /> Selecionar Imagem</Button>
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
                      {midias.video_url instanceof File ? (
                        <video src={URL.createObjectURL(midias.video_url)} className="w-full h-auto object-contain rounded-lg" controls />
                      ) : signedUrls.video ? (
                        <video
                          src={signedUrls.video}
                          className="w-full h-auto object-contain rounded-lg"
                          controls
                        />
                      ) : (
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
                        <Star className={`h-4 w-4 transition-all ${coverMediaKey === 'video_url' ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent'}`} />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.video && window.open(signedUrls.video, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.video}><Eye className="h-4 w-4" /> Assistir</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('video')} className="flex items-center gap-2" disabled={saving}><Video className="h-4 w-4" /> Novo Vídeo</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('video')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                    </div>
                  </div>
                ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">Adicione um vídeo para o exercício.</p>
                  <div className="flex justify-center">
                    <Button type="button" variant="default" onClick={() => handleSelectMedia('video')} className="flex items-center gap-2" disabled={saving}><Upload className="h-4 w-4" /> Selecionar Vídeo</Button>
                  </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pb-24 md:pb-12" />
      </div>

      {/* Modal de confirmação de exclusão */}
      <ResponsiveDeleteMediaConfirmation
        open={showDeleteMediaDialog !== null}
        onOpenChange={(open) => !open && setShowDeleteMediaDialog(null)}
        onConfirm={() => showDeleteMediaDialog && handleDeleteMedia(showDeleteMediaDialog as 'imagem1' | 'imagem2' | 'video')}
        title="Confirmar Exclusão"
        description="Tem certeza que deseja excluir esta mídia? Esta ação não pode ser desfeita."
      />

      <VideoRecorder
        open={showVideoRecorder}
        onOpenChange={setShowVideoRecorder}
        onRecordingComplete={handleRecordingComplete}
      />

      <VideoInfoModal />

      {/* Botão de salvar fixo */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="secondary"
          className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
        >
          {saving ? <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-foreground"></div> : <Save />}
          <span className="sr-only">{saving ? "Salvando..." : "Salvar Alterações"}</span>
        </Button>
      </div>
    </div>
  );
};

export default EditarExercicioPadrao;