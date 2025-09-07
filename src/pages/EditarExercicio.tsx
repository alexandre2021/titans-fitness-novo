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
import { ArrowLeft, Save, Trash2, Eye, ExternalLink, Camera, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from "@/hooks/useAuth";
import { VideoRecorder } from '@/components/media/VideoRecorder';
import { Tables } from "@/integrations/supabase/types";

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
                  >
                    Excluir
                  </Button>
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
            >
              Excluir
            </Button>
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
        canvas.toBlob((blob) => resolve(new File([blob!], file.name, { type: 'image/jpeg', lastModified: Date.now() })), 'image/jpeg', 0.85);
      };
      img.src = URL.createObjectURL(file);
    });
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

  const handleSelectMedia = async (type: 'imagem1' | 'imagem2' | 'video', capture: boolean = false) => {
    if (capture) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        toast.error("Navegador incompatível", { description: "Seu navegador não parece suportar a captura de mídia." });
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!devices.some(device => device.kind === 'videoinput')) {
        toast.error("Câmera não encontrada", { description: "Esta função requer uma câmera. Por favor, acesse de um dispositivo móvel com câmera." });
        return;
      }
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'video' ? 'video/*' : 'image/*';
    if (capture) input.capture = type === 'video' ? 'user' : 'environment';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const maxSize = type === 'video' ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error("Arquivo muito grande", { description: `Máximo: ${type === 'video' ? '20MB' : '5MB'}` });
        return;
      }

      let finalFile = file;
      if (type.startsWith('imagem')) {
        finalFile = await resizeImageFile(file, 640);
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
    const urlMap = { imagem1: 'imagem_1_url', imagem2: 'imagem_2_url', video: 'video_url' };
    setMidias(prev => ({ ...prev, [urlMap[type]]: null }));
    toast.success("Mídia removida.");
    setShowDeleteMediaDialog(null);
  };

  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id || !user) { navigate('/exercicios-pt'); return; }

      try {
        const { data, error } = await supabase.from('exercicios').select('*').eq('id', id).single();
        if (error || !data) throw new Error('Exercício não encontrado ou erro ao buscar.');
        if (data.tipo !== 'personalizado' || data.pt_id !== user.id) {
          toast.error("Acesso Negado", { description: "Você não pode editar este exercício." });
          navigate('/exercicios-pt');
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
        navigate('/exercicios-pt');
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

  const deleteFiles = async (filenames: string[]) => {
    if (filenames.length === 0) return;
    try {
      await supabase.functions.invoke('upload-media', {
        body: { action: 'delete_files', filenames, bucket_type: 'exercicios' }
      });
    } catch (error) {
      console.error("Erro ao deletar arquivos antigos:", error);
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

      const filesToDelete: string[] = [];
      const finalMediaUrls: { [key: string]: string | null } = {};

      for (const key of ['imagem_1_url', 'imagem_2_url', 'video_url']) {
        const currentValue = midias[key];
        const initialValue = initialMediaUrls[key as keyof typeof initialMediaUrls];

        if (currentValue instanceof File) {
          finalMediaUrls[key] = await uploadFile(currentValue);
          if (initialValue) filesToDelete.push(initialValue);
        } else if (currentValue === null && initialValue) {
          finalMediaUrls[key] = null;
          filesToDelete.push(initialValue);
        } else {
          finalMediaUrls[key] = currentValue as string | null;
        }
      }

      await deleteFiles(filesToDelete);

      const { error } = await supabase.from('exercicios').update({
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        grupo_muscular: formData.grupo_muscular,
        equipamento: formData.equipamento,
        dificuldade: formData.dificuldade,
        instrucoes: instrucoesFinal,
        grupo_muscular_primario: formData.grupo_muscular_primario.trim() || null,
        grupos_musculares_secundarios: formData.grupos_musculares_secundarios.split(',').map(s => s.trim()).filter(Boolean),
        ...finalMediaUrls,
        youtube_url: midias.youtube_url as string || null,
      }).eq('id', id).eq('pt_id', user.id);

      if (error) throw error;

      toast.success("Sucesso", { description: "Exercício atualizado com sucesso!" });
      navigate('/exercicios-pt');
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
                <Select value={formData.grupo_muscular} onValueChange={(value) => setFormData(prev => ({ ...prev, grupo_muscular: value }))}>
                  <SelectTrigger className={errors.grupo_muscular ? "border-red-500" : ""}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{gruposMusculares.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
                {errors.grupo_muscular && <p className="text-sm text-red-500 mt-1">{errors.grupo_muscular}</p>}
              </div>
              <div>
                <Label htmlFor="equipamento">Equipamento</Label>
                <Select value={formData.equipamento} onValueChange={(value) => setFormData(prev => ({ ...prev, equipamento: value }))}>
                  <SelectTrigger className={errors.equipamento ? "border-red-500" : ""}><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{equipamentos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
                {errors.equipamento && <p className="text-sm text-red-500 mt-1">{errors.equipamento}</p>}
              </div>
              <div>
                <Label htmlFor="dificuldade">Dificuldade</Label>
                <Select value={formData.dificuldade} onValueChange={(value) => setFormData(prev => ({ ...prev, dificuldade: value as "Baixa" | "Média" | "Alta" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{dificuldades.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
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
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem1', true)} className="flex items-center gap-2" disabled={saving || !isMobile}><Camera className="h-4 w-4" /> Nova Foto</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('imagem1')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                      </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Adicione uma imagem para o exercício.</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button type="button" variant="default" onClick={() => handleSelectMedia('imagem1', true)} className="flex items-center gap-2" disabled={saving || !isMobile}><Camera className="h-4 w-4" /> Tirar Foto</Button>
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
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem2', true)} className="flex items-center gap-2" disabled={saving || !isMobile}><Camera className="h-4 w-4" /> Nova Foto</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('imagem2')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                      </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Adicione uma segunda imagem (opcional).</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button type="button" variant="default" onClick={() => handleSelectMedia('imagem2', true)} className="flex items-center gap-2" disabled={saving || !isMobile}><Camera className="h-4 w-4" /> Tirar Foto</Button>
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
                      <Button type="button" variant="outline" size="sm" onClick={() => { if (isMobile) setShowVideoInfoModal(true); else toast.info("Funcionalidade móvel", { description: "A gravação de vídeo está disponível apenas no celular." }); }} className="flex items-center gap-2" disabled={saving || !isMobile}><Video className="h-4 w-4" /> Novo Vídeo</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('video')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Adicione um vídeo para o exercício.</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button type="button" variant="default" onClick={() => { if (isMobile) setShowVideoInfoModal(true); else toast.info("Funcionalidade móvel", { description: "A gravação de vídeo está disponível apenas no celular." }); }} className="flex items-center gap-2" disabled={saving || !isMobile}><Video className="h-4 w-4" /> Gravar Vídeo</Button>
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