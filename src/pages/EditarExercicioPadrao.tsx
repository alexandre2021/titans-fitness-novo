// src/pages/EditarExercicioPadrao.tsx
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

const EditarExercicioPadrao = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  const [midias, setMidias] = useState<{ [key: string]: string | File | null }>({
    imagem_1_url: null,
    imagem_2_url: null,
    video_url: null,
    youtube_url: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<{ imagem1?: string; imagem2?: string; video?: string }>({});
  const [initialMediaUrls, setInitialMediaUrls] = useState({ imagem_1_url: null as string | null, imagem_2_url: null as string | null, video_url: null as string | null });

  const [showVideoInfoModal, setShowVideoInfoModal] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showDeleteMediaDialog, setShowDeleteMediaDialog] = useState<string | null>(null);

  const gruposMusculares = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'];
  const equipamentos = ['Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo', 'Kettlebell', 'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais', 'Landmine', 'Bola Bosu'];
  const dificuldades = ['Baixa', 'Média', 'Alta'];

  const GRUPOS_MUSCULARES_OPTIONS = gruposMusculares.map(o => ({ value: o, label: o }));
  const EQUIPAMENTOS_OPTIONS = equipamentos.map(d => ({ value: d, label: d }));
  const DIFICULDADES_OPTIONS = dificuldades.map(f => ({ value: f, label: f }));

  const getSignedImageUrl = useCallback(async (filename: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('get-image-url', {
        body: { filename, bucket_type: 'exercicios-padrao' }
      });
      if (error) throw error;
      if (!data.success || !data.url) throw new Error('URL não retornada pelo servidor');
      return data.url;
    } catch (error) {
      console.error('Erro ao obter URL assinada:', error);
      throw error;
    }
  }, []);

  const loadSignedUrls = useCallback(async () => {
    const processMedia = async (mediaKey: 'imagem_1_url' | 'imagem_2_url' | 'video_url', signedUrlKey: 'imagem1' | 'imagem2' | 'video') => {
      const mediaValue = midias[mediaKey];
      if (mediaValue instanceof File) return { [signedUrlKey]: URL.createObjectURL(mediaValue) };
      if (typeof mediaValue === 'string' && mediaValue) {
        try {
          return { [signedUrlKey]: await getSignedImageUrl(mediaValue) };
        } catch (error) {
          return { [signedUrlKey]: undefined };
        }
      }
      return { [signedUrlKey]: undefined };
    };

    const [img1Result, img2Result, videoResult] = await Promise.all([
      processMedia('imagem_1_url', 'imagem1'),
      processMedia('imagem_2_url', 'imagem2'),
      processMedia('video_url', 'video'),
    ]);
    setSignedUrls(prev => ({ ...prev, ...img1Result, ...img2Result, ...videoResult }));
  }, [midias, getSignedImageUrl]);

  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id || !user) { navigate('/exercicios'); return; }
      if (user.email !== ADMIN_EMAIL) {
        toast.error("Acesso Negado");
        navigate('/exercicios');
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
        setMidias({ imagem_1_url: data.imagem_1_url, imagem_2_url: data.imagem_2_url, video_url: data.video_url, youtube_url: data.youtube_url });
        setInitialMediaUrls({ imagem_1_url: data.imagem_1_url, imagem_2_url: data.imagem_2_url, video_url: data.video_url });
      } catch (error) {
        toast.error("Erro ao carregar exercício", { description: (error as Error).message });
        navigate('/exercicios');
      } finally {
        setLoading(false);
      }
    };
    fetchExercicio();
  }, [id, user, navigate, ADMIN_EMAIL, toast]);

  useEffect(() => {
    if (exercicio) {
      loadSignedUrls();
    }
  }, [exercicio, midias, loadSignedUrls]);

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

      const resizedFile = type.startsWith('imagem') ? await resizeAndOptimizeImage(file, 640) : file;
      if (!resizedFile) { toast.error("Erro ao processar imagem."); return; }

      const key = type === 'imagem1' ? 'imagem_1_url' : type === 'imagem2' ? 'imagem_2_url' : 'video_url';
      setMidias(prev => ({ ...prev, [key]: resizedFile }));
    };
    input.click();
  };

  const handleDeleteMedia = (type: 'imagem1' | 'imagem2' | 'video') => {
    const key = type === 'imagem1' ? 'imagem_1_url' : type === 'imagem2' ? 'imagem_2_url' : 'video_url';
    setMidias(prev => ({ ...prev, [key]: null }));
    setShowDeleteMediaDialog(null);
  };

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
    try {
      const filename = fileUrl.split('?')[0].split('/').pop();
      if (!filename) return;
      await supabase.functions.invoke('delete-media', { body: { filename, bucket_type: 'exercicios-padrao' } });
    } catch (error) {
      console.error(`Erro ao deletar arquivo antigo (${fileUrl}):`, error);
    }
  };

  const handleSave = async () => {
    if (!id || !user) return;
    setSaving(true);

    try {
      const finalMediaUrls: { [key: string]: string | null } = {};
      for (const key of ['imagem_1_url', 'imagem_2_url', 'video_url']) {
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

      const { error } = await supabase.from('exercicios').update({
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        grupo_muscular: formData.grupo_muscular,
        equipamento: formData.equipamento,
        dificuldade: formData.dificuldade,
        instrucoes: instrucoesList.filter(i => i.trim()).join('#'),
        grupo_muscular_primario: formData.grupo_muscular_primario.trim() || null,
        grupos_musculares_secundarios: formData.grupos_musculares_secundarios.trim() || null,
        ...finalMediaUrls,
        youtube_url: midias.youtube_url as string || null,
      }).eq('id', id);

      if (error) throw error;
      navigate('/exercicios');
    } catch (error) {
      toast.error("Erro ao salvar", { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (!exercicio) return <div>Exercício não encontrado.</div>;

  // O restante do JSX é muito similar ao de NovoExercicioPadrao, então vou omitir para brevidade
  // e focar na lógica. A UI pode ser copiada de `EditarExercicio.tsx` e adaptada.
  // A lógica principal de fetch e save está acima.

  // UI (similar a EditarExercicio.tsx, mas com a lógica de save e upload para 'exercicios-padrao')
  return (
    <div className="space-y-6">
      {!isMobile && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/exercicios')} className="h-10 w-10 p-0">
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
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" value={formData.descricao} onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))} />
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
                    <div className="relative inline-block">
                      {signedUrls.imagem1 ? (
                        <img src={signedUrls.imagem1} alt="Primeira imagem" className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"/>
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Carregando...</span></div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.imagem1 && window.open(signedUrls.imagem1, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.imagem1}><Eye className="h-4 w-4" /> Ver</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem1')} className="flex items-center gap-2" disabled={saving}><Upload className="h-4 w-4" /> Alterar</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteMedia('imagem1')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
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
                    <div className="relative inline-block">
                      {signedUrls.imagem2 ? (
                        <img src={signedUrls.imagem2} alt="Segunda imagem" className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"/>
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Carregando...</span></div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.imagem2 && window.open(signedUrls.imagem2, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.imagem2}><Eye className="h-4 w-4" /> Ver</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('imagem2')} className="flex items-center gap-2" disabled={saving}><Upload className="h-4 w-4" /> Alterar</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteMedia('imagem2')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
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
                    <div className="relative inline-block w-48 aspect-video bg-black rounded-lg border shadow-sm">
                      {signedUrls.video ? (
                        <video src={signedUrls.video} className="w-full h-full object-contain" controls />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><span className="text-sm text-white/70">Carregando...</span></div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => signedUrls.video && window.open(signedUrls.video, '_blank')} className="flex items-center gap-2" disabled={!signedUrls.video}><Eye className="h-4 w-4" /> Assistir</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleSelectMedia('video')} className="flex items-center gap-2" disabled={saving}><Video className="h-4 w-4" /> Novo Vídeo</Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteMedia('video')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> Excluir</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Button type="button" variant="default" onClick={() => handleSelectMedia('video')} className="flex items-center gap-2" disabled={saving}><Upload className="h-4 w-4" /> Selecionar Vídeo</Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="pb-24 md:pb-12" />
      </div>

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