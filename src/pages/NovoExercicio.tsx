// pages/NovoExercicio.tsx
import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Save, Plus, Upload, Trash2, Eye, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const NovoExercicio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  
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
  const [instrucoesList, setInstrucoesList] = useState<string[]>([""]);

  const [midias, setMidias] = useState({
    imagem_1_url: "",
    imagem_2_url: "",
    video_url: "",
    youtube_url: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Estados para URLs assinadas das mídias
  const [signedUrls, setSignedUrls] = useState<{
    imagem1?: string;
    imagem2?: string;
    video?: string;
  }>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);

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
    if (!midias.imagem_1_url && !midias.imagem_2_url && !midias.video_url) {
      return;
    }
    setLoadingImages(true);
    setSignedUrls({});
    try {
      const urls: { imagem1?: string; imagem2?: string; video?: string } = {};
      // Para imagem 1
      if (midias.imagem_1_url) {
        const filename = midias.imagem_1_url.split('/').pop()?.split('?')[0] || midias.imagem_1_url;
        urls.imagem1 = await getSignedImageUrl(filename);
      }
      // Para imagem 2
      if (midias.imagem_2_url) {
        const filename = midias.imagem_2_url.split('/').pop()?.split('?')[0] || midias.imagem_2_url;
        urls.imagem2 = await getSignedImageUrl(filename);
      }
      // Para vídeo
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

  // Função para upload de nova mídia
  const handleUploadMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = type === 'video' ? 'video/*' : 'image/*';

      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        // Validações
        const maxSize = type === 'video' ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
          toast({
            title: "Erro",
            description: `Arquivo muito grande. Máximo: ${type === 'video' ? '20MB' : '5MB'}`,
            variant: "destructive",
          });
          return;
        }

        setUploadingMedia(type);

        try {
          // Upload nova mídia
          const base64 = await fileToBase64(file);
          const timestamp = Date.now();
          const extension = file.name.split('.').pop();
          const filename = `exercicio_${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;

          console.log('📤 Fazendo upload:', { filename, type, size: file.size });

          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error("Usuário não autenticado");
          }

          const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/upload-imagem', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              filename,
              image_base64: base64,
              bucket_type: 'exercicios'
            })
          });

          if (!response.ok) {
            throw new Error(`Erro no upload: ${response.status}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || 'Erro no upload');
          }

          // Atualizar estado local
          switch (type) {
            case 'imagem1':
              setMidias(prev => ({ ...prev, imagem_1_url: result.url }));
              break;
            case 'imagem2':
              setMidias(prev => ({ ...prev, imagem_2_url: result.url }));
              break;
            case 'video':
              setMidias(prev => ({ ...prev, video_url: result.url }));
              break;
          }

          toast({
            title: "Sucesso",
            description: "Mídia enviada com sucesso!",
          });

        } catch (error) {
          console.error('Upload falhou:', error);
          toast({
            title: "Erro",
            description: "Falha no upload. Tente novamente.",
            variant: "destructive",
          });
        } finally {
          setUploadingMedia(null);
        }
      };

      input.click();

    } catch (error) {
      console.error('Erro ao abrir seletor:', error);
      toast({
        title: "Erro",
        description: "Erro ao abrir seletor de arquivo.",
        variant: "destructive",
      });
    }
  };

  // Função para deletar mídia
  const handleDeleteMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    if (!window.confirm('Tem certeza que deseja deletar esta mídia?')) {
      return;
    }

    try {
      switch (type) {
        case 'imagem1':
          setMidias(prev => ({ ...prev, imagem_1_url: '' }));
          break;
        case 'imagem2':
          setMidias(prev => ({ ...prev, imagem_2_url: '' }));
          break;
        case 'video':
          setMidias(prev => ({ ...prev, video_url: '' }));
          break;
      }

      toast({
        title: "Sucesso",
        description: "Mídia removida com sucesso!",
      });

    } catch (error) {
      console.error('Erro ao deletar mídia:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover mídia.",
        variant: "destructive",
      });
    }
  };

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

    const instrucoesValidas = instrucoesList.filter(i => i.trim()).length;
    if (instrucoesValidas === 0) {
      newErrors.instrucoes = 'Pelo menos uma instrução é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      // Criar exercício personalizado no banco
      const { data: exercicio, error } = await supabase
        .from('exercicios')
        .insert({
          nome: currentFormData.nome.trim(),
          descricao: currentFormData.descricao.trim(),
          grupo_muscular: currentFormData.grupo_muscular,
          equipamento: currentFormData.equipamento,
          dificuldade: currentFormData.dificuldade,
          instrucoes: currentFormData.instrucoes.trim(),
          grupo_muscular_primario: currentFormData.grupo_muscular_primario.trim() || null,
          grupos_musculares_secundarios: currentFormData.grupos_musculares_secundarios.split(',').map(s => s.trim()).filter(s => s) || null,
          imagem_1_url: midias.imagem_1_url || null,
          imagem_2_url: midias.imagem_2_url || null,
          video_url: midias.video_url || null,
          youtube_url: midias.youtube_url || null,
          tipo: 'personalizado',
          pt_id: user.id,
          is_ativo: true
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Exercício criado com sucesso!",
      });

      console.log('✅ Exercício criado:', exercicio);
      navigate('/exercicios-pt');
      
    } catch (error) {
      console.error('❌ Erro ao criar exercício:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o exercício. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Recarregar URLs assinadas quando mídias mudarem
  useEffect(() => {
    if (midias.imagem_1_url || midias.imagem_2_url || midias.video_url) {
      console.log('🔄 Recarregando URLs assinadas...');
      loadSignedUrls();
    }
  }, [midias.imagem_1_url, midias.imagem_2_url, midias.video_url, loadSignedUrls]);

  return (
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
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Plus className="h-3 w-3 mr-1" />
                  Exercício personalizado
                </Badge>
              </div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                Novo Exercício
              </h1>
              <p className="text-muted-foreground">
                Crie um exercício personalizado do zero
              </p>
            </div>
          </div>

          {/* Ações no cabeçalho - Desktop */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Exercício"}
            </Button>
          </div>
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
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Exercício personalizado
              </Badge>
              <h1 className="text-2xl font-bold leading-tight">Novo Exercício</h1>
              <p className="text-sm text-muted-foreground">
                Crie um exercício personalizado do zero
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 w-10 flex-shrink-0"
          >
            <Save className="h-6 w-6" />
            <span className="sr-only">Salvar Exercício</span>
          </button>
        </div>
      </div>

      {/* Layout em coluna única */}
      <div className="space-y-6">
          
        {/* 1. Informações Básicas - Igual estrutura do CopiaExercicio */}
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
                placeholder="Ex: Supino com halteres"
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

            {/* Novos inputs para músculo primário e secundários */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="grupo_muscular_primario" className="text-sm font-medium text-muted-foreground">Músculo primário</Label>
                <Input
                  id="grupo_muscular_primario"
                  value={formData.grupo_muscular_primario}
                  onChange={e => setFormData(prev => ({ ...prev, grupo_muscular_primario: e.target.value }))}
                  placeholder="Ex: Peitoral maior"
                />
              </div>
              <div>
                <Label htmlFor="grupos_musculares_secundarios" className="text-sm font-medium text-muted-foreground">Músculo(s) secundário(s)</Label>
                <Input
                  id="grupos_musculares_secundarios"
                  value={formData.grupos_musculares_secundarios}
                  onChange={e => setFormData(prev => ({ ...prev, grupos_musculares_secundarios: e.target.value }))}
                  placeholder="Ex: Tríceps, deltoide anterior"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Instruções de Execução - Sistema dinâmico igual ao CopiaExercicio */}
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
                    variant="outline"
                    size="sm" 
                    onClick={() => {
                      setInstrucoesList(list => list.filter((_, i) => i !== idx));
                    }}
                    disabled={instrucoesList.length === 1}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setInstrucoesList(list => [...list, ""])}
              >
                Adicionar etapa
              </Button>
              {errors.instrucoes && (
                <p className="text-sm text-red-500 mt-1">{errors.instrucoes}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Mídias com Upload Funcional - Exatamente igual ao CopiaExercicio */}
        <Card>
          <CardHeader>
            <CardTitle>Mídias</CardTitle>
            <p className="text-sm text-muted-foreground">
              Adicione imagens, vídeos e links do YouTube para demonstrar o exercício
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
                          alt="Primeira imagem" 
                          className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Erro ao carregar</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(signedUrls.imagem1 || midias.imagem_1_url, '_blank')}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.imagem1}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUploadMedia('imagem1')}
                        className="flex items-center gap-2"
                        disabled={uploadingMedia === 'imagem1'}
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingMedia === 'imagem1' ? 'Enviando...' : 'Trocar'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMedia('imagem1')}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Faça upload da primeira imagem</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleUploadMedia('imagem1')}
                      className="flex items-center gap-2"
                      disabled={uploadingMedia === 'imagem1'}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingMedia === 'imagem1' ? 'Enviando...' : 'Fazer Upload da Primeira Imagem'}
                    </Button>
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
                          alt="Segunda imagem" 
                          className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"
                        />
                      ) : (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Erro ao carregar</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(signedUrls.imagem2 || midias.imagem_2_url, '_blank')}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.imagem2}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleUploadMedia('imagem2')}
                        className="flex items-center gap-2"
                        disabled={uploadingMedia === 'imagem2'}
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingMedia === 'imagem2' ? 'Enviando...' : 'Trocar'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMedia('imagem2')}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Faça upload da segunda imagem</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleUploadMedia('imagem2')}
                      className="flex items-center gap-2"
                      disabled={uploadingMedia === 'imagem2'}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingMedia === 'imagem2' ? 'Enviando...' : 'Fazer Upload da Segunda Imagem'}
                    </Button>
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
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(signedUrls.video || midias.video_url, '_blank')}
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
                        onClick={() => handleUploadMedia('video')}
                        className="flex items-center gap-2"
                        disabled={uploadingMedia === 'video'}
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingMedia === 'video' ? 'Enviando...' : 'Trocar'}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteMedia('video')}
                        className="flex items-center gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">Faça upload do seu vídeo (máx. 20MB)</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleUploadMedia('video')}
                      className="flex items-center gap-2"
                      disabled={uploadingMedia === 'video'}
                    >
                      <Upload className="h-4 w-4" />
                      {uploadingMedia === 'video' ? 'Enviando...' : 'Fazer Upload do Vídeo'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* YouTube - Apenas URL */}
            <div>
              <Label className="text-sm font-medium">URL do YouTube</Label>
              <div className="mt-2 space-y-3">
                <Input
                  value={midias.youtube_url}
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
                      onClick={() => window.open(midias.youtube_url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ver no YouTube
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NovoExercicio;