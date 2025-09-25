import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import Modal from 'react-modal';
import { ArrowLeft, Save, Trash2, Eye, ExternalLink, Camera, Video, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from "@/hooks/useAuth";
import { VideoRecorder } from '@/components/media/VideoRecorder';
import { Tables } from "@/integrations/supabase/types";
import { resizeAndOptimizeImage, validateImageFile } from '@/lib/imageUtils';
import CustomSelect from "@/components/ui/CustomSelect";

type Exercicio = Tables<"exercicios">;

const EditarExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = sonnerToast;
  const { user } = useAuth();
  const isMobile = useIsMobile();

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

  const [midias, setMidias] = useState<{
    [key: string]: string | File | null;
  }>({
    imagem_1_url: null,
    imagem_2_url: null,
    video_url: null,
    youtube_url: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<{
    imagem1?: string;
    imagem2?: string;
    video?: string;
  }>({});
  const [initialMediaUrls, setInitialMediaUrls] = useState({
    imagem_1_url: null as string | null,
    imagem_2_url: null as string | null,
    video_url: null as string | null,
  });

  const [showVideoInfoModal, setShowVideoInfoModal] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showDeleteMediaDialog, setShowDeleteMediaDialog] = useState<string | null>(null);

  const gruposMusculares = [
    'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps',
    'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'
  ];

  const equipamentos = [
    'Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo',
    'Kettlebell', 'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais'
  ];

  const dificuldades = ['Baixa', 'Média', 'Alta'];

  const GRUPOS_MUSCULARES_OPTIONS = gruposMusculares.map(o => ({ value: o, label: o }));
  const EQUIPAMENTOS_OPTIONS = equipamentos.map(d => ({ value: d, label: d }));
  const DIFICULDADES_OPTIONS = dificuldades.map(f => ({ value: f, label: f }));

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

  const getSignedImageUrl = useCallback(async (filename: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Usuário não autenticado");
      
      const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/get-image-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ filename, bucket_type: 'exercicios' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao obter URL da imagem: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      if (!result.success || !result.url) throw new Error('URL não retornada pelo servidor');
      return result.url;
    } catch (error) {
      console.error('Erro ao obter URL assinada:', error);
      throw error;
    }
  }, []);

  const loadSignedUrls = useCallback(async () => {
    if (!Object.values(midias).some(v => v)) return;

    setSignedUrls({});
    try {
      const urls: { imagem1?: string; imagem2?: string; video?: string } = {};

      const processUrl = async (urlValue: string | File | null) => {
        if (typeof urlValue === 'string' && urlValue) {
          const filename = urlValue.split('/').pop()?.split('?')[0] || urlValue;
          return getSignedImageUrl(filename);
        }
        if (urlValue instanceof File) {
          return URL.createObjectURL(urlValue);
        }
        return undefined;
      };

      const [url1, url2, urlVideo] = await Promise.all([
        processUrl(midias.imagem_1_url),
        processUrl(midias.imagem_2_url),
        processUrl(midias.video_url),
      ]);

      if (url1) urls.imagem1 = url1;
      if (url2) urls.imagem2 = url2;
      if (urlVideo) urls.video = urlVideo;

      setSignedUrls(urls);
    } catch (error) {
      console.error('Erro:', error);
    }
  }, [midias, getSignedImageUrl]);

  const handleSelectMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
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
      if (!file) {
        target.value = '';
        return;
      }

      if (type.startsWith('imagem')) {
        const validation = validateImageFile(file);
        if (!validation.isValid) {
          toast.error("Arquivo de imagem inválido", { description: validation.error });
          target.value = '';
          return;
        }
      } else if (type === 'video') {
        const maxSize = 20 * 1024 * 1024; // 20MB
        if (file.size > maxSize) {
          toast.error("Arquivo de vídeo muito grande", { description: "O tamanho máximo para vídeos é 20MB." });
          target.value = '';
          return;
        }
      }

      if (type === 'imagem1' || type === 'imagem2') {
        const resized = await resizeAndOptimizeImage(file, 640);
        if (!resized) {
          toast.error("Erro ao processar imagem.");
          target.value = '';
          return;
        }
        const key = type === 'imagem1' ? 'imagem_1_url' : 'imagem_2_url';
        setMidias(prev => ({ ...prev, [key]: resized }));
        setSignedUrls(prev => ({ ...prev, [type]: URL.createObjectURL(resized) }));
      } else if (type === 'video') {
        setMidias(prev => ({ ...prev, video_url: file }));
        setSignedUrls(prev => ({ ...prev, video: URL.createObjectURL(file) }));
      }

      // Limpa o input para permitir a seleção do mesmo arquivo novamente
      target.value = '';
    };

    input.addEventListener('change', handleFileSelection);
    input.click();
  };

  const handleRecordingComplete = (videoBlob: Blob) => {
    const videoFile = new File([videoBlob], `gravacao_${Date.now()}.webm`, { type: 'video/webm' });
    setMidias(prev => ({ ...prev, video_url: videoFile }));
    setShowVideoRecorder(false);
  };

  const handleDeleteMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    const urlMap = { imagem1: 'imagem_1_url', imagem2: 'imagem_2_url', video: 'video_url' };
    setMidias(prev => ({ ...prev, [urlMap[type]]: null }));
    toast.success("Mídia removida.");
    setShowDeleteMediaDialog(null);
  };

  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id || !user) { navigate('/exercicios-pt', { state: { activeTab: 'personalizados' } }); return; }

      try {
        const { data, error } = await supabase.from('exercicios').select('*').eq('id', id).single();
        if (error || !data) throw new Error('Exercício não encontrado ou erro ao buscar.');
        if (data.tipo !== 'personalizado' || data.professor_id !== user.id) {
          toast.error("Acesso Negado", { description: "Você não pode editar este exercício." });
          navigate('/exercicios-pt', { state: { activeTab: 'personalizados' } });
          return;
        }

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
        setMidias({
          imagem_1_url: data.imagem_1_url,
          imagem_2_url: data.imagem_2_url,
          video_url: data.video_url,
          youtube_url: data.youtube_url,
        });
        setInitialMediaUrls({
          imagem_1_url: data.imagem_1_url,
          imagem_2_url: data.imagem_2_url,
          video_url: data.video_url,
        });
      } catch (error) {
        console.error('Erro ao carregar exercício:', error);
        toast.error("Erro", { description: "Não foi possível carregar o exercício." });
        navigate('/exercicios-pt', { state: { activeTab: 'personalizados' } });
      } finally {
        setLoading(false);
      }
    };
    fetchExercicio();
  }, [id, user, navigate, toast]);

  useEffect(() => {
    if (exercicio) {
      loadSignedUrls();
    }
  }, [exercicio, midias, loadSignedUrls]);

  const uploadFile = async (file: File | string | null): Promise<string | null> => {
    if (!file || !(file instanceof File)) return null;
    try {
      const uniqueFilename = `pt_${user?.id}_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
        body: { action: 'generate_upload_url', filename: uniqueFilename, contentType: file.type, bucket_type: 'exercicios' }
      });
      if (presignedError || !presignedData.signedUrl) throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
      const uploadResponse = await fetch(presignedData.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!uploadResponse.ok) throw new Error('Falha no upload direto para o R2.');
      return presignedData.path;
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Falha no Upload", { description: `Erro ao enviar o arquivo: ${error.message}` });
      throw error;
    }
  };

  const deleteFile = async (fileUrl: string) => {
    if (!fileUrl) return;
    try {
      // Extrai o nome do arquivo da URL, seja ela completa ou apenas o caminho
      const filename = fileUrl.split('?')[0].split('/').pop();
      if (!filename) return;

      // A função de exclusão espera um 'filename', não 'filenames'
      await supabase.functions.invoke('delete-media', {
        body: { filename, bucket_type: 'exercicios' }
      });
    } catch (error) {
      console.error(`Erro ao deletar arquivo antigo (${fileUrl}):`, error);
      // Não notificamos o usuário aqui para não interromper o fluxo de salvamento.
    }
  };
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

  const handleSave = async () => {
    const instrucoesFinal = instrucoesList.filter(i => i.trim()).join('#');
    if (!validateForm()) { toast.error("Erro de Validação", { description: "Por favor, preencha todos os campos obrigatórios." }); return; }
    if (!id || !user) return;

    setSaving(true);
    try {
      toast.info("Processando", { description: "Salvando e otimizando mídias..." });

      const finalMediaUrls: { [key: string]: string | null } = {};

      for (const key of ['imagem_1_url', 'imagem_2_url', 'video_url']) {
        const currentValue = midias[key];
        const initialValue = initialMediaUrls[key as keyof typeof initialMediaUrls];

        if (currentValue instanceof File) {
          finalMediaUrls[key] = await uploadFile(currentValue);
          if (initialValue) {
            await deleteFile(initialValue);
          }
        } else if (currentValue === null && initialValue) {
          finalMediaUrls[key] = null;
          await deleteFile(initialValue);
        } else {
          finalMediaUrls[key] = currentValue as string | null;
        }
      }

      const { error } = await supabase
        .from('exercicios')
        .update({
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        grupo_muscular: formData.grupo_muscular,
        equipamento: formData.equipamento,
        dificuldade: formData.dificuldade,
        instrucoes: instrucoesFinal,
        grupo_muscular_primario: formData.grupo_muscular_primario.trim() || null,
        grupos_musculares_secundarios: formData.grupos_musculares_secundarios.trim() || null,
        ...finalMediaUrls,
        youtube_url: midias.youtube_url as string || null,
      })
      .eq('id', id)
      .eq('professor_id', user.id);

      if (error) throw error;

      toast.success("Sucesso", { description: "Exercício atualizado com sucesso!" });
      navigate('/exercicios-pt', { state: { activeTab: 'personalizados' } });
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast.error("Erro", { description: "Não foi possível salvar as alterações." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Carregando...</div>; // Replace with a proper skeleton loader later
  }

  if (!exercicio) {
    return <div>Exercício não encontrado.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho Responsivo */}
      {!isMobile && (
        <div className="space-y-4">
        {/* Layout Desktop */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/exercicios-pt', { state: { activeTab: 'personalizados' } })} className="h-10 w-10 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1">
                <h1 className="text-3xl font-bold">Editar Exercício</h1>
                <p className="text-muted-foreground">Modificando: <span className="font-medium">{exercicio.nome}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Informações Básicas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} className={errors.nome ? "border-red-500" : ""} />
              {errors.nome && <p className="text-sm text-red-500 mt-1">{errors.nome}</p>}
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} className={errors.descricao ? "border-red-500" : ""} />
              {errors.descricao && <p className="text-sm text-red-500 mt-1">{errors.descricao}</p>}
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="grupo_muscular">Grupo Muscular</Label>
                <CustomSelect
                  inputId="grupo_muscular"
                  value={GRUPOS_MUSCULARES_OPTIONS.find(opt => opt.value === formData.grupo_muscular)}
                  onChange={(option) => setFormData(prev => ({ ...prev, grupo_muscular: option ? String(option.value) : '' }))}
                  options={GRUPOS_MUSCULARES_OPTIONS}
                  placeholder="Selecione..."
                />
                {errors.grupo_muscular && <p className="text-sm text-red-500 mt-1">{errors.grupo_muscular}</p>}
              </div>
              <div>
                <Label htmlFor="equipamento">Equipamento</Label>
                <CustomSelect
                  inputId="equipamento"
                  value={EQUIPAMENTOS_OPTIONS.find(opt => opt.value === formData.equipamento)}
                  onChange={(option) => setFormData(prev => ({ ...prev, equipamento: option ? String(option.value) : '' }))}
                  options={EQUIPAMENTOS_OPTIONS}
                  placeholder="Selecione..."
                />
                {errors.equipamento && <p className="text-sm text-red-500 mt-1">{errors.equipamento}</p>}
              </div>
              <div>
                <Label htmlFor="dificuldade">Dificuldade</Label>
                <CustomSelect
                  inputId="dificuldade"
                  value={DIFICULDADES_OPTIONS.find(opt => opt.value === formData.dificuldade)}
                  onChange={(option) => setFormData(prev => ({ ...prev, dificuldade: option ? option.value as "Baixa" | "Média" | "Alta" : 'Baixa' }))}
                  options={DIFICULDADES_OPTIONS}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="grupo_muscular_primario">Músculo primário</Label>
                <Input id="grupo_muscular_primario" value={formData.grupo_muscular_primario} onChange={e => setFormData(prev => ({ ...prev, grupo_muscular_primario: e.target.value }))} placeholder="Ex: Peitoral maior" />
              </div>
              <div>
                <Label htmlFor="grupos_musculares_secundarios">Músculo(s) secundário(s)</Label>
                <Input id="grupos_musculares_secundarios" value={formData.grupos_musculares_secundarios} onChange={e => setFormData(prev => ({ ...prev, grupos_musculares_secundarios: e.target.value }))} placeholder="Ex: Tríceps, deltoide anterior" />
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
                  <Input value={item} onChange={e => { const newList = [...instrucoesList]; newList[idx] = e.target.value; setInstrucoesList(newList); }} placeholder={`Etapa ${idx + 1}`} className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setInstrucoesList(list => list.filter((_, i) => i !== idx))}
                  ><Trash2 className="h-4 w-4 text-muted-foreground" /><span className="sr-only">Remover</span></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setInstrucoesList(list => [...list, ""])}>Adicionar etapa</Button>
              {errors.instrucoes && <p className="text-sm text-red-500 mt-1">{errors.instrucoes}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mídias</CardTitle>
            <p className="text-sm text-muted-foreground">Adicione ou modifique as mídias do exercício.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primeira Imagem */}
            <div>
              <Label className="text-sm font-medium">Primeira Imagem</Label>
              <div className="mt-2 space-y-4">
                {midias.imagem_1_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      {signedUrls.imagem1 ? (
                        <img src={signedUrls.imagem1} alt="Primeira imagem" className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"/>
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Erro ao carregar</span></div>
                      )}
                    </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.imagem1 && window.open(signedUrls.imagem1, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.imagem1}><Eye className="h-4 w-4" /> Ver</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem1')} className="flex items-center gap-2" disabled={saving}>
                          {isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                          {isMobile ? 'Nova Foto' : 'Alterar'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('imagem1')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
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
                        {isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
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
                      {signedUrls.imagem2 ? (
                        <img src={signedUrls.imagem2} alt="Segunda imagem" className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"/>
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Erro ao carregar</span></div>
                      )}
                    </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.imagem2 && window.open(signedUrls.imagem2, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.imagem2}><Eye className="h-4 w-4" /> Ver</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem2')} className="flex items-center gap-2" disabled={saving}>
                          {isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                          {isMobile ? 'Nova Foto' : 'Alterar'}
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('imagem2')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
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
                        {isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
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
                      {signedUrls.video ? (
                        <video src={signedUrls.video} className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted" controls />
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Erro ao carregar</span></div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.video && window.open(signedUrls.video, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.video}><Eye className="h-4 w-4" /> Assistir</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { if (isMobile) { setShowVideoInfoModal(true); } else { handleSelectMedia('video'); } }} className="flex items-center gap-2" disabled={saving}>
                        <Video className="h-4 w-4" /> Novo Vídeo
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('video')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Adicione um vídeo para o exercício.</p>
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="default"
                        onClick={() => { if (isMobile) { setShowVideoInfoModal(true); } else { handleSelectMedia('video'); } }}
                        className="flex items-center gap-2"
                        disabled={saving}
                      >
                        {isMobile ? (
                          <><Video className="h-4 w-4" /> Gravar Vídeo</>
                        ) : (
                          <><Upload className="h-4 w-4" /> Selecionar Vídeo</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* YouTube */}
            <div>
              <Label htmlFor="youtube_url" className="text-sm font-medium">URL do YouTube</Label>
              <div className="mt-2 space-y-3">
                <Input
                  id="youtube_url"
                  value={midias.youtube_url as string || ''}
                  onChange={(e) => setMidias(prev => ({ ...prev, youtube_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
                {midias.youtube_url && (
                  <Button type="button" variant="outline" size="sm" onClick={() => midias.youtube_url && window.open(midias.youtube_url as string, '_blank')}><ExternalLink className="h-4 w-4 mr-2" />Ver no YouTube</Button>
                )}
              </div>
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
        title="Excluir Mídia"
        description="Tem certeza que deseja excluir esta mídia. Esta ação não pode ser desfeita."
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
        <Button onClick={handleSave} disabled={saving} className="md:hidden rounded-full h-14 w-14 p-0 shadow-lg flex items-center justify-center [&_svg]:size-8">
          {saving ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-foreground"></div>
          ) : (
            <Save />
          )}
          <span className="sr-only">Salvar Alterações</span>
        </Button>

        {/* Desktop: Standard floating button */}
        <Button onClick={handleSave} disabled={saving} className="hidden md:flex items-center gap-2 shadow-lg [&_svg]:size-6" size="lg">
          <Save />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default EditarExercicio;