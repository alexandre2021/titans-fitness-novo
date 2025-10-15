// src/pages/NovoExercicioPadrao.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import Modal from 'react-modal';
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Plus, Trash2, Eye, ExternalLink, Camera, Video, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from "@/hooks/useAuth";
import { VideoRecorder } from '@/components/media/VideoRecorder';
import { resizeAndOptimizeImage, validateImageFile } from '@/lib/imageUtils';
import CustomSelect from "@/components/ui/CustomSelect";

const NovoExercicioPadrao = () => {
  const navigate = useNavigate();
  const toast = sonnerToast;
  const isMobile = useIsMobile();
  
  const [saving, setSaving] = useState(false);
  
  const { user } = useAuth();
  const ADMIN_EMAIL = 'contato@titans.fitness';

  // Proteção de Rota: Apenas o admin pode acessar
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      toast.error("Acesso Negado", { description: "Você não tem permissão para criar exercícios padrão." });
      navigate('/exercicios');
    }
  }, [user, navigate, toast, ADMIN_EMAIL]);
  
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

  const [instrucoesList, setInstrucoesList] = useState<string[]>([""]);

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
  const [showVideoInfoModal, setShowVideoInfoModal] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showDeleteMediaDialog, setShowDeleteMediaDialog] = useState<string | null>(null);

  const gruposMusculares = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'];
  const equipamentos = ['Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo', 'Kettlebell', 'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais', 'Landmine', 'Bola Bosu'];
  const dificuldades = ['Baixa', 'Média', 'Alta'];

  const GRUPOS_MUSCULARES_OPTIONS = gruposMusculares.map(o => ({ value: o, label: o }));
  const EQUIPAMENTOS_OPTIONS = equipamentos.map(d => ({ value: d, label: d }));
  const DIFICULDADES_OPTIONS = dificuldades.map(f => ({ value: f, label: f }));

  const ResponsiveDeleteMediaConfirmation = ({ open, onOpenChange, onConfirm, title, description }: { open: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void; title: string; description: React.ReactNode; }) => {
    const handleClose = () => onOpenChange(false);
    return (
      <Modal isOpen={open} onRequestClose={handleClose} shouldCloseOnOverlayClick={true} shouldCloseOnEsc={true} className="bg-white rounded-lg max-w-md w-full mx-4 outline-none" overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold">{title}</h2><Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button></div>
        <div className="p-6"><div className="text-sm text-muted-foreground">{description}</div></div>
        <div className="flex justify-end gap-2 p-6 border-t"><Button variant="outline" onClick={handleClose}>Cancelar</Button><Button onClick={onConfirm} variant="destructive">Excluir</Button></div>
      </Modal>
    );
  };

  const VideoInfoModal = () => {
    const handleConfirm = () => { setShowVideoInfoModal(false); setShowVideoRecorder(true); };
    const handleClose = () => setShowVideoInfoModal(false);
    return (
      <Modal isOpen={showVideoInfoModal} onRequestClose={handleClose} shouldCloseOnOverlayClick={true} shouldCloseOnEsc={true} className="bg-white rounded-lg max-w-md w-full mx-4 outline-none" overlayClassName="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="text-lg font-semibold">Gravar Vídeo do Exercício</h2><Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0"><X className="h-4 w-4" /></Button></div>
        <div className="p-6"><p className="text-sm text-muted-foreground">O vídeo terá duração máxima de <strong>12 segundos</strong> e será salvo <strong>sem áudio</strong> para otimização.</p></div>
        <div className="flex justify-end gap-2 p-6 border-t"><Button variant="outline" onClick={handleClose}>Cancelar</Button><Button onClick={handleConfirm}>Iniciar Gravação</Button></div>
      </Modal>
    );
  };

  const handleSelectMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'video' ? 'video/*' : 'image/jpeg, image/png, image/webp';
    if (isMobile) { input.capture = type === 'video' ? 'user' : 'environment'; }

    const handleFileSelection = async (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) { target.value = ''; return; }

      if (type.startsWith('imagem')) {
        const validation = validateImageFile(file);
        if (!validation.isValid) { toast.error("Arquivo de imagem inválido", { description: validation.error }); target.value = ''; return; }
      } else if (type === 'video') {
        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) { toast.error("Arquivo de vídeo muito grande", { description: "O tamanho máximo para vídeos é 20MB." }); target.value = ''; return; }
      }

      if (type === 'imagem1' || type === 'imagem2') {
        const resized = await resizeAndOptimizeImage(file, 640);
        if (!resized) { toast.error("Erro ao processar imagem."); target.value = ''; return; }
        const key = type === 'imagem1' ? 'imagem_1_url' : 'imagem_2_url';
        setMidias(prev => ({ ...prev, [key]: resized }));
      } else if (type === 'video') {
        setMidias(prev => ({ ...prev, video_url: file }));
      }
      target.value = '';
    };

    input.addEventListener('change', handleFileSelection);
    input.click();
  };

  const loadSignedUrls = useCallback(() => {
    const processMedia = (mediaKey: 'imagem_1_url' | 'imagem_2_url' | 'video_url', signedUrlKey: 'imagem1' | 'imagem2' | 'video') => {
      const mediaValue = midias[mediaKey];
      if (signedUrls[signedUrlKey] && !(mediaValue instanceof File)) { return null; }
      if (mediaValue instanceof File) { const objectURL = URL.createObjectURL(mediaValue); return { [signedUrlKey]: objectURL }; }
      else { return { [signedUrlKey]: undefined }; }
    };
    const updates = { ...processMedia('imagem_1_url', 'imagem1'), ...processMedia('imagem_2_url', 'imagem2'), ...processMedia('video_url', 'video') };
    if (Object.keys(updates).length > 0) { setSignedUrls(prev => ({ ...prev, ...updates })); }
  }, [midias, signedUrls]);

  const handleRecordingComplete = (videoBlob: Blob) => {
    const videoFile = new File([videoBlob], `gravacao_${Date.now()}.webm`, { type: 'video/webm' });
    setMidias(prev => ({ ...prev, video_url: videoFile }));
    setShowVideoRecorder(false);
  };

  const handleDeleteMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    const key = type === 'imagem1' ? 'imagem_1_url' : type === 'imagem2' ? 'imagem_2_url' : 'video_url';
    setMidias(prev => ({ ...prev, [key]: null }));
    setSignedUrls(prev => ({ ...prev, [type === 'video' ? 'video' : type]: undefined }));
    setShowDeleteMediaDialog(null);
  };

  useEffect(() => { loadSignedUrls(); }, [loadSignedUrls]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.descricao.trim()) newErrors.descricao = 'Descrição é obrigatória';
    if (!formData.grupo_muscular) newErrors.grupo_muscular = 'Grupo muscular é obrigatório';
    if (!formData.equipamento) newErrors.equipamento = 'Equipamento é obrigatório';
    if (instrucoesList.filter(i => i.trim()).length === 0) newErrors.instrucoes = 'Pelo menos uma instrução é obrigatória';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFile = async (file: File | string | null): Promise<string | null> => {
    if (!file || !(file instanceof File)) return null;
    try {
      const uniqueFilename = `padrao_${Date.now()}_${file.name.replace(/\s/g, '_')}`;
      const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
        body: { action: 'generate_upload_url', filename: uniqueFilename, contentType: file.type, bucket_type: 'exercicios-padrao' }
      });
      if (presignedError || !presignedData.signedUrl) throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
      const uploadResponse = await fetch(presignedData.signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!uploadResponse.ok) throw new Error('Falha no upload direto para o R2.');
      return presignedData.path;
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error("Falha no Upload", { description: `Erro ao enviar o arquivo: ${(error as Error).message}` });
      throw error;
    }
  };

  const handleSave = async () => {
    const instrucoesFinal = instrucoesList.filter(i => i.trim()).join('#');
    if (!validateForm()) { toast.error("Erro de Validação", { description: "Por favor, preencha todos os campos obrigatórios." }); return; }
    if (!user?.id) { toast.error("Erro de Autenticação", { description: "Usuário não autenticado." }); return; }

    setSaving(true);
    try {
      const [imagem_1_url_final, imagem_2_url_final, video_url_final] = await Promise.all([
        uploadFile(midias.imagem_1_url),
        uploadFile(midias.imagem_2_url),
        uploadFile(midias.video_url),
      ]);

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
          tipo: 'padrao',
          professor_id: null,
          is_ativo: true,
          status_midia: 'concluido'
        })
        .select()
        .single();

      if (error) throw error;

      navigate('/exercicios');
    } catch (error) {
      console.error('Erro ao criar exercício padrão:', error);
      toast.error("Erro ao criar exercício", { description: "Não foi possível criar o exercício padrão. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {!isMobile && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/exercicios')} className="h-10 w-10 p-0"><ArrowLeft className="h-4 w-4" /></Button>
              <div className="flex-1">
                <div className="mb-1"><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Plus className="h-3 w-3 mr-1" />Exercício Padrão</Badge></div>
                <h1 className="text-3xl font-bold flex items-center gap-2">Novo Exercício Padrão</h1>
                <p className="text-muted-foreground">Crie um exercício para a biblioteca principal da plataforma.</p>
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
              <Label htmlFor="nome" className="text-sm font-medium text-muted-foreground">Nome *</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: Supino Reto com Barra" className={errors.nome ? "border-red-500" : ""} />
              {errors.nome && <p className="text-sm text-red-500 mt-1">{errors.nome}</p>}
            </div>
            <div>
              <Label htmlFor="descricao" className="text-sm font-medium text-muted-foreground">Descrição *</Label>
              <Textarea id="descricao" value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Descreva o exercício brevemente..." className={errors.descricao ? "border-red-500" : ""} />
              {errors.descricao && <p className="text-sm text-red-500 mt-1">{errors.descricao}</p>}
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="grupo_muscular" className="text-sm font-medium text-muted-foreground">Grupo Muscular *</Label>
                <CustomSelect inputId="grupo_muscular" value={GRUPOS_MUSCULARES_OPTIONS.find(opt => opt.value === formData.grupo_muscular)} onChange={(option) => setFormData(prev => ({ ...prev, grupo_muscular: option ? String(option.value) : '' }))} options={GRUPOS_MUSCULARES_OPTIONS} placeholder="Selecione..." />
                {errors.grupo_muscular && <p className="text-sm text-red-500 mt-1">{errors.grupo_muscular}</p>}
              </div>
              <div>
                <Label htmlFor="equipamento" className="text-sm font-medium text-muted-foreground">Equipamento *</Label>
                <CustomSelect inputId="equipamento" value={EQUIPAMENTOS_OPTIONS.find(opt => opt.value === formData.equipamento)} onChange={(option) => setFormData(prev => ({ ...prev, equipamento: option ? String(option.value) : '' }))} options={EQUIPAMENTOS_OPTIONS} placeholder="Selecione..." />
                {errors.equipamento && <p className="text-sm text-red-500 mt-1">{errors.equipamento}</p>}
              </div>
              <div>
                <Label htmlFor="dificuldade" className="text-sm font-medium text-muted-foreground">Dificuldade</Label>
                <CustomSelect inputId="dificuldade" value={DIFICULDADES_OPTIONS.find(opt => opt.value === formData.dificuldade)} onChange={(option) => setFormData(prev => ({ ...prev, dificuldade: option ? option.value as "Baixa" | "Média" | "Alta" : 'Baixa' }))} options={DIFICULDADES_OPTIONS} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="grupo_muscular_primario" className="text-sm font-medium text-muted-foreground">Músculo primário</Label>
                <Input id="grupo_muscular_primario" value={formData.grupo_muscular_primario} onChange={e => setFormData(prev => ({ ...prev, grupo_muscular_primario: e.target.value }))} placeholder="Ex: Peitoral maior" />
              </div>
              <div>
                <Label htmlFor="grupos_musculares_secundarios" className="text-sm font-medium text-muted-foreground">Músculo(s) secundário(s)</Label>
                <Input id="grupos_musculares_secundarios" value={formData.grupos_musculares_secundarios} onChange={e => setFormData(prev => ({ ...prev, grupos_musculares_secundarios: e.target.value }))} placeholder="Ex: Tríceps, deltoide anterior" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Instruções de execução *</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {instrucoesList.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="w-6 text-right text-base font-semibold text-muted-foreground">{idx + 1}.</span>
                  <Input value={item} onChange={e => { const newList = [...instrucoesList]; newList[idx] = e.target.value; setInstrucoesList(newList); }} placeholder={`Etapa ${idx + 1}`} className="flex-1" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setInstrucoesList(list => list.filter((_, i) => i !== idx))} disabled={instrucoesList.length === 1}><Trash2 className="h-4 w-4 text-muted-foreground" /><span className="sr-only">Remover</span></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setInstrucoesList(list => [...list, ""])}>Adicionar etapa</Button>
              {errors.instrucoes && <p className="text-sm text-red-500 mt-1">{errors.instrucoes}</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Mídias</CardTitle><p className="text-sm text-muted-foreground">Mídias para o exercício padrão.</p></CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Primeira Imagem</Label>
              <div className="mt-2 space-y-4">
                {midias.imagem_1_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block"><img src={signedUrls.imagem1} alt="Primeira imagem" className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted" /></div>
                    <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => signedUrls.imagem1 && window.open(signedUrls.imagem1, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.imagem1 || saving}><Eye className="h-4 w-4" /> Ver</Button><Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem1')} className="flex items-center gap-2" disabled={saving}>{isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}{isMobile ? 'Nova Foto' : 'Alterar'}</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('imagem1')} className="flex items-center gap-2" disabled={saving}><Trash2 className="h-4 w-4" /> Excluir</Button></div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"><p className="text-sm text-muted-foreground mb-3">Adicione uma imagem para o exercício.</p><div className="flex justify-center"><Button type="button" variant="default" onClick={() => handleSelectMedia('imagem1')} className="flex items-center gap-2" disabled={saving}>{isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}{isMobile ? 'Tirar Foto' : 'Selecionar Imagem'}</Button></div></div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Segunda Imagem</Label>
              <div className="mt-2 space-y-4">
                {midias.imagem_2_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block"><img src={signedUrls.imagem2} alt="Segunda imagem" className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted" /></div>
                    <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => signedUrls.imagem2 && window.open(signedUrls.imagem2, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.imagem2 || saving}><Eye className="h-4 w-4" /> Ver</Button><Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem2')} className="flex items-center gap-2" disabled={saving}>{isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}{isMobile ? 'Nova Foto' : 'Alterar'}</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('imagem2')} className="flex items-center gap-2" disabled={saving}><Trash2 className="h-4 w-4" /> Excluir</Button></div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"><p className="text-sm text-muted-foreground mb-3">Adicione uma segunda imagem (opcional).</p><div className="flex justify-center"><Button type="button" variant="default" onClick={() => handleSelectMedia('imagem2')} className="flex items-center gap-2" disabled={saving}>{isMobile ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}{isMobile ? 'Tirar Foto' : 'Selecionar Imagem'}</Button></div></div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Vídeo</Label>
              <div className="mt-2 space-y-4">
                {midias.video_url ? (
                  <div className="space-y-3">
                    <div className="relative inline-block w-48 aspect-video bg-black rounded-lg border shadow-sm"><video src={signedUrls.video} className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted" controls /></div>
                    <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => signedUrls.video && window.open(signedUrls.video, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.video || saving}><Eye className="h-4 w-4" /> Assistir</Button><Button type="button" variant="outline" size="sm" onClick={() => { if (isMobile) { setShowVideoInfoModal(true); } else { handleSelectMedia('video'); } }} className="flex items-center gap-2" disabled={saving}><Video className="h-4 w-4" /> Novo Vídeo</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteMediaDialog('video')} className="flex items-center gap-2" disabled={saving}><Trash2 className="h-4 w-4" /> Excluir</Button></div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"><p className="text-sm text-muted-foreground mb-3">Adicione um vídeo para o exercício.</p><div className="flex flex-col sm:flex-row gap-2 justify-center items-center"><Button type="button" variant="default" onClick={() => setShowVideoInfoModal(true)} className="flex items-center gap-2" disabled={saving}>{isMobile ? <><Video className="h-4 w-4" /> Gravar Vídeo</> : <><Upload className="h-4 w-4" /> Selecionar Vídeo</>}</Button></div></div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg font-semibold">Link do YouTube</CardTitle><p className="text-sm text-muted-foreground">Adicione um vídeo do YouTube como referência.</p></CardHeader>
          <CardContent>
            <div>
              <Input value={midias.youtube_url as string || ''} onChange={(e) => setMidias(prev => ({ ...prev, youtube_url: e.target.value }))} placeholder="https://youtube.com/watch?v=... (cole aqui sua URL do YouTube)" />
              {midias.youtube_url && (<div className="flex items-center gap-2 mt-3"><div className="text-sm text-green-600 flex items-center gap-1">✅ URL do YouTube configurada</div><Button type="button" variant="outline" size="sm" onClick={() => midias.youtube_url && window.open(midias.youtube_url as string, '_blank')} className="flex items-center gap-2"><ExternalLink className="h-4 w-4" /> Ver no YouTube</Button></div>)}
            </div>
          </CardContent>
        </Card>

        <div className="pb-24 md:pb-12" />
      </div>

      <ResponsiveDeleteMediaConfirmation open={showDeleteMediaDialog !== null} onOpenChange={(open) => !open && setShowDeleteMediaDialog(null)} onConfirm={() => showDeleteMediaDialog && handleDeleteMedia(showDeleteMediaDialog as 'imagem1' | 'imagem2' | 'video')} title="Excluir mídia" description="Tem certeza que deseja excluir esta mídia? Esta ação não pode ser desfeita." />
      <VideoRecorder open={showVideoRecorder} onOpenChange={setShowVideoRecorder} onRecordingComplete={handleRecordingComplete} />
      <VideoInfoModal />

      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="secondary"
          className="rounded-full h-12 w-12 p-0 shadow-lg flex items-center justify-center [&_svg]:size-7"
        >
          {saving ? <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-foreground"></div> : <Save />}
          <span className="sr-only">{saving ? "Salvando..." : "Salvar Exercício Padrão"}</span>
        </Button>
      </div>
    </div>
  );
};

export default NovoExercicioPadrao;