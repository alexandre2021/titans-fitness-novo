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
} from "@/components/ui/drawer";// pages/EditarExercicio.tsx
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
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Upload, Trash2, Eye, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";

type Exercicio = Tables<"exercicios">;

const EditarExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const [midias, setMidias] = useState({
    imagem_1_url: "",
    imagem_2_url: "",
    video_url: "",
    youtube_url: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signedUrls, setSignedUrls] = useState<{
    imagem1?: string;
    imagem2?: string;
    video?: string;
  }>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);

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
    if (!midias.imagem_1_url && !midias.imagem_2_url && !midias.video_url) return;
    setLoadingImages(true);
    setSignedUrls({});
    try {
      const urls: { imagem1?: string; imagem2?: string; video?: string } = {};
      if (midias.imagem_1_url) {
        const filename = midias.imagem_1_url.split('/').pop()?.split('?')[0] || midias.imagem_1_url;
        urls.imagem1 = await getSignedImageUrl(filename);
      }
      if (midias.imagem_2_url) {
        const filename = midias.imagem_2_url.split('/').pop()?.split('?')[0] || midias.imagem_2_url;
        urls.imagem2 = await getSignedImageUrl(filename);
      }
      if (midias.video_url) {
        const filename = midias.video_url.split('/').pop()?.split('?')[0] || midias.video_url;
        urls.video = await getSignedImageUrl(filename);
      }
      setSignedUrls(urls);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoadingImages(false);
    }
  }, [midias, getSignedImageUrl]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'video' ? 'video/*' : 'image/*';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const maxSize = type === 'video' ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({ title: "Erro", description: `Arquivo muito grande. Máximo: ${type === 'video' ? '20MB' : '5MB'}`, variant: "destructive" });
        return;
      }

      setUploadingMedia(type);
      try {
        const base64 = await fileToBase64(file);
        const filename = `exercicio_${Date.now()}_${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Usuário não autenticado");

        const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/upload-imagem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ filename, image_base64: base64, bucket_type: 'exercicios' })
        });

        if (!response.ok) throw new Error(`Erro no upload: ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Erro no upload');

        const urlMap = { imagem1: 'imagem_1_url', imagem2: 'imagem_2_url', video: 'video_url' };
        setMidias(prev => ({ ...prev, [urlMap[type]]: result.url }));

        toast({ title: "Sucesso", description: "Mídia enviada com sucesso!" });
      } catch (error) {
        console.error('Upload falhou:', error);
        toast({ title: "Erro", description: "Falha no upload. Tente novamente.", variant: "destructive" });
      } finally {
        setUploadingMedia(null);
      }
    };
    input.click();
  };

  const [showDeleteMediaDialog, setShowDeleteMediaDialog] = useState<string | null>(null);

  const handleDeleteMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    const urlMap = { imagem1: 'imagem_1_url', imagem2: 'imagem_2_url', video: 'video_url' };
    setMidias(prev => ({ ...prev, [urlMap[type]]: "" }));
    toast({ title: "Sucesso", description: "Mídia removida." });
    setShowDeleteMediaDialog(null);
  };

  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id || !user) {
        navigate('/exercicios-pt');
        return;
      }

      try {
        const { data, error } = await supabase.from('exercicios').select('*').eq('id', id).single();
        if (error || !data) throw new Error('Exercício não encontrado ou erro ao buscar.');
        if (data.tipo !== 'personalizado' || data.pt_id !== user.id) {
          toast({ title: "Acesso Negado", description: "Você não pode editar este exercício.", variant: "destructive" });
          navigate('/exercicios-pt');
          return;
        }

        setExercicio(data);
        setFormData({
          nome: data.nome || "",
          descricao: data.descricao || "",
          grupo_muscular: data.grupo_muscular || "",
          equipamento: data.equipamento || "",
          dificuldade: (data.dificuldade as "Baixa" | "Média" | "Alta") || "Baixa",
          instrucoes: data.instrucoes || "",
          grupo_muscular_primario: data.grupo_muscular_primario || "",
          grupos_musculares_secundarios: Array.isArray(data.grupos_musculares_secundarios) ? data.grupos_musculares_secundarios.join(', ') : (data.grupos_musculares_secundarios || ""),
        });
        setInstrucoesList(data.instrucoes ? data.instrucoes.split('#').filter(Boolean).map(i => i.trim()) : []);
        setMidias({
          imagem_1_url: data.imagem_1_url || "",
          imagem_2_url: data.imagem_2_url || "",
          video_url: data.video_url || "",
          youtube_url: data.youtube_url || "",
        });
      } catch (error) {
        console.error('Erro ao carregar exercício:', error);
        toast({ title: "Erro", description: "Não foi possível carregar o exercício.", variant: "destructive" });
        navigate('/exercicios-pt');
      } finally {
        setLoading(false);
      }
    };
    fetchExercicio();
  }, [id, user, navigate, toast]);

  useEffect(() => {
    if (exercicio) loadSignedUrls();
  }, [exercicio, midias.imagem_1_url, midias.imagem_2_url, midias.video_url, loadSignedUrls]);

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
    if (!validateForm()) {
      toast({ title: "Erro de Validação", description: "Por favor, preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    if (!id || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('exercicios').update({
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim(),
        grupo_muscular: formData.grupo_muscular,
        equipamento: formData.equipamento,
        dificuldade: formData.dificuldade,
        instrucoes: instrucoesFinal,
        grupo_muscular_primario: formData.grupo_muscular_primario.trim(),
        grupos_musculares_secundarios: formData.grupos_musculares_secundarios.split(',').map(s => s.trim()).filter(Boolean),
        imagem_1_url: midias.imagem_1_url || null,
        imagem_2_url: midias.imagem_2_url || null,
        video_url: midias.video_url || null,
        youtube_url: midias.youtube_url || null,
      }).eq('id', id).eq('pt_id', user.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Exercício atualizado com sucesso!" });
      navigate('/exercicios-pt');
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
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
      <div className="md:hidden flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
          <Button variant="ghost" onClick={() => navigate('/exercicios-pt')} className="h-10 w-10 p-0 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 space-y-1 overflow-hidden">
            <h1 className="text-2xl font-bold leading-tight">Editar Exercício</h1>
            <p className="text-sm text-muted-foreground truncate">{exercicio.nome}</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10 flex-shrink-0">
          <Save className="h-6 w-6" />
          <span className="sr-only">Salvar</span>
        </button>
      </div>

      <div className="hidden md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/exercicios-pt')} className="h-10 w-10 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Editar Exercício</h1>
            <p className="text-muted-foreground">Modificando: <span className="font-medium">{exercicio.nome}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

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
                  <Button type="button" size="sm" variant="destructive" onClick={() => setInstrucoesList(list => list.filter((_, i) => i !== idx))}>Remover</Button>
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
                      {loadingImages ? (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Carregando...</span></div>
                      ) : signedUrls.imagem1 ? (
                        <img src={signedUrls.imagem1} alt="Primeira imagem" className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"/>
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Erro ao carregar</span></div>
                      )}
                    </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => window.open(signedUrls.imagem1 || midias.imagem_1_url, '_blank')} disabled={!signedUrls.imagem1} className="flex items-center gap-2"><Eye className="h-4 w-4" />Visualizar</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleUploadMedia('imagem1')} disabled={uploadingMedia === 'imagem1'} className="flex items-center gap-2"><Upload className="h-4 w-4" />{uploadingMedia === 'imagem1' ? 'Enviando...' : 'Trocar'}</Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setShowDeleteMediaDialog('imagem1')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" />Excluir</Button>
                      </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Nenhuma imagem adicionada</p>
                    <Button type="button" variant="outline" onClick={() => handleUploadMedia('imagem1')} disabled={uploadingMedia === 'imagem1'}><Upload className="h-4 w-4 mr-2" />{uploadingMedia === 'imagem1' ? 'Enviando...' : 'Adicionar Imagem'}</Button>
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
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Carregando...</span></div>
                      ) : signedUrls.imagem2 ? (
                        <img src={signedUrls.imagem2} alt="Segunda imagem" className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"/>
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Erro ao carregar</span></div>
                      )}
                    </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => window.open(signedUrls.imagem2 || midias.imagem_2_url, '_blank')} disabled={!signedUrls.imagem2} className="flex items-center gap-2"><Eye className="h-4 w-4" />Visualizar</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleUploadMedia('imagem2')} disabled={uploadingMedia === 'imagem2'} className="flex items-center gap-2"><Upload className="h-4 w-4" />{uploadingMedia === 'imagem2' ? 'Enviando...' : 'Trocar'}</Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => setShowDeleteMediaDialog('imagem2')} className="flex items-center gap-2"><Trash2 className="h-4 w-4" />Excluir</Button>
                      </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Nenhuma imagem adicionada</p>
                    <Button type="button" variant="outline" onClick={() => handleUploadMedia('imagem2')} disabled={uploadingMedia === 'imagem2'}><Upload className="h-4 w-4 mr-2" />{uploadingMedia === 'imagem2' ? 'Enviando...' : 'Adicionar Imagem'}</Button>
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
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Carregando...</span></div>
                      ) : signedUrls.video ? (
                        <video src={signedUrls.video} className="w-40 h-40 object-cover rounded-lg border shadow-sm" controls />
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center"><span className="text-sm text-muted-foreground">Erro ao carregar</span></div>
                      )}
                    </div>
                    <div className="flex gap-2 md:gap-2 flex-wrap items-center justify-start">
                      <Button type="button" variant="outline" size="sm" className="text-xs px-2 md:px-3" onClick={() => window.open(signedUrls.video || midias.video_url, '_blank')} disabled={!signedUrls.video}><Eye className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />Ver</Button>
                      <Button type="button" variant="outline" size="sm" className="text-xs px-2 md:px-3" onClick={() => handleUploadMedia('video')} disabled={uploadingMedia === 'video'}><Upload className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />{uploadingMedia === 'video' ? 'Enviando...' : 'Trocar'}</Button>
                      <Button type="button" variant="destructive" size="sm" className="text-xs px-2 md:px-3" onClick={() => setShowDeleteMediaDialog('video')}><Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />Excluir</Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Nenhum vídeo adicionado</p>
                    <Button type="button" variant="outline" onClick={() => handleUploadMedia('video')} disabled={uploadingMedia === 'video'}><Upload className="h-4 w-4 mr-2" />{uploadingMedia === 'video' ? 'Enviando...' : 'Adicionar Vídeo'}</Button>
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
                  value={midias.youtube_url}
                  onChange={(e) => setMidias(prev => ({ ...prev, youtube_url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
                {midias.youtube_url && (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => window.open(midias.youtube_url, '_blank')}><ExternalLink className="h-4 w-4 mr-2" />Ver no YouTube</Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ResponsiveDeleteMediaConfirmation
        open={showDeleteMediaDialog !== null}
        onOpenChange={(open) => !open && setShowDeleteMediaDialog(null)}
        onConfirm={() => showDeleteMediaDialog && handleDeleteMedia(showDeleteMediaDialog as 'imagem1' | 'imagem2' | 'video')}
        title="Excluir Mídia"
        description="Tem certeza que deseja excluir esta mídia. Esta ação não pode ser desfeita."
      />
    </div>
  );
};

export default EditarExercicio;