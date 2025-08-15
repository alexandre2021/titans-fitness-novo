// pages/EditarExercicio.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye, Upload, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";

type Exercicio = Tables<"exercicios">;

const EditarExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exercicio, setExercicio] = useState<Exercicio | null>(null);

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [grupoMuscular, setGrupoMuscular] = useState('');
  const [equipamento, setEquipamento] = useState('');
  const [dificuldade, setDificuldade] = useState('');
  
  // Estados para mídias
  const [imagem1Url, setImagem1Url] = useState('');
  const [imagem2Url, setImagem2Url] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  
  // Estados para URLs assinadas das mídias
  const [signedUrls, setSignedUrls] = useState<{
    imagem1?: string;
    imagem2?: string;
    video?: string;
  }>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState<string | null>(null);

  // Opções baseadas no padroes.md
  const gruposMusculares = [
    'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps',
    'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha', 'Trapézio'
  ];

  const equipamentos = [
    'Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo',
    'Kettlebell', 'Fitas de Suspensão', 'Elásticos', 'Bola Suíça', 'Bolas Medicinais'
  ];

  const dificuldades = ['Baixa', 'Média', 'Alta'];

  // Função para obter URL assinada (baseada no código das avaliações)
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
  const loadSignedUrls = useCallback(async (exercicio: Exercicio) => {
    setLoadingImages(true);
    setSignedUrls({});
    try {
      const urls: { imagem1?: string; imagem2?: string; video?: string } = {};
      // Carregar imagem 1 se existir
      if (exercicio.imagem_1_url) {
        try {
          let filename = exercicio.imagem_1_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop()?.split('?')[0] || filename;
          }
          if (filename) {
            const signedUrl = await getSignedImageUrl(filename);
            urls.imagem1 = signedUrl;
          }
        } catch (error) {
          console.error('Erro ao carregar imagem 1:', error);
        }
      }
      // Carregar imagem 2 se existir
      if (exercicio.imagem_2_url) {
        try {
          let filename = exercicio.imagem_2_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop()?.split('?')[0] || filename;
          }
          if (filename) {
            const signedUrl = await getSignedImageUrl(filename);
            urls.imagem2 = signedUrl;
          }
        } catch (error) {
          console.error('Erro ao carregar imagem 2:', error);
        }
      }
      // Carregar vídeo se existir
      if (exercicio.video_url) {
        try {
          let filename = exercicio.video_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop()?.split('?')[0] || filename;
          }
          if (filename) {
            const signedUrl = await getSignedImageUrl(filename);
            urls.video = signedUrl;
          }
        } catch (error) {
          console.error('Erro ao carregar vídeo:', error);
        }
      }
      setSignedUrls(urls);
    } catch (error) {
      console.error('Erro geral ao carregar URLs assinadas:', error);
    } finally {
      setLoadingImages(false);
    }
  }, [getSignedImageUrl]);

  // Carregar exercício
  useEffect(() => {
    const fetchExercicio = async () => {
      console.log('🚀 EditarExercicio - Iniciando com:', { 
        url_id: id, 
        user_id: user?.id,
        user_exists: !!user 
      });

      if (!id) {
        console.log('❌ ID não encontrado na URL');
        toast({
          title: "Erro",
          description: "ID do exercício não encontrado na URL.",
          variant: "destructive",
        });
        navigate('/exercicios-pt');
        return;
      }

      if (!user) {
        console.log('❌ Usuário não autenticado');
        toast({
          title: "Erro",
          description: "Usuário não autenticado.",
          variant: "destructive",
        });
        navigate('/exercicios-pt');
        return;
      }

      try {
        console.log('🔍 Buscando exercício ID:', id);
        
        // Query simplificada
        const { data: exercicio, error } = await supabase
          .from('exercicios')
          .select('*')
          .eq('id', id)
          .single();

        console.log('📊 Resultado da busca:', { exercicio, error });

        if (error) {
          console.error('❌ Erro na query:', error);
          throw new Error(`Erro ao buscar exercício: ${error.message}`);
        }

        if (!exercicio) {
          throw new Error('Exercício não encontrado');
        }

        // Validações
        if (exercicio.tipo !== 'personalizado') {
          throw new Error('Apenas exercícios personalizados podem ser editados');
        }

        if (exercicio.pt_id !== user.id) {
          throw new Error('Você só pode editar seus próprios exercícios');
        }

        if (!exercicio.is_ativo) {
          throw new Error('Este exercício está inativo');
        }

        // Sucesso - carregar dados
        setExercicio(exercicio);
        setNome(exercicio.nome || '');
        setDescricao(exercicio.descricao || '');
        setInstrucoes(exercicio.instrucoes || '');
        setGrupoMuscular(exercicio.grupo_muscular || '');
        setEquipamento(exercicio.equipamento || '');
        setDificuldade(exercicio.dificuldade || '');
        
        // Carregar mídias
        setImagem1Url(exercicio.imagem_1_url || '');
        setImagem2Url(exercicio.imagem_2_url || '');
        setVideoUrl(exercicio.video_url || '');
        setYoutubeUrl(exercicio.youtube_url || '');

        // Carregar URLs assinadas das mídias
        await loadSignedUrls(exercicio);

        console.log('✅ Exercício carregado com sucesso:', exercicio.nome);
        
      } catch (error) {
        console.error('❌ Erro ao carregar exercício:', error);
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        toast({
          title: "Erro",
          description: message,
          variant: "destructive",
        });
        navigate('/exercicios-pt');
      } finally {
        setLoading(false);
      }
    };

    fetchExercicio();
  }, [id, user, navigate, toast, loadSignedUrls]);

  const handleSave = async () => {
    if (!exercicio || !user) return;

    // Validações
    if (!nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do exercício é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!grupoMuscular) {
      toast({
        title: "Erro",
        description: "O grupo muscular é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      console.log('💾 Salvando alterações...');

      const { error } = await supabase
        .from('exercicios')
        .update({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          instrucoes: instrucoes.trim() || null,
          grupo_muscular: grupoMuscular,
          equipamento: equipamento || null,
          dificuldade: dificuldade || null,
          imagem_1_url: imagem1Url.trim() || null,
          imagem_2_url: imagem2Url.trim() || null,
          video_url: videoUrl.trim() || null,
          youtube_url: youtubeUrl.trim() || null,
        })
        .eq('id', exercicio.id)
        .eq('pt_id', user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Exercício atualizado com sucesso!",
      });

      console.log('✅ Exercício salvo com sucesso');
      navigate('/exercicios-pt');

    } catch (error) {
      console.error('❌ Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Função para visualizar mídia em nova aba
  const handleViewMedia = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Função para deletar mídia
  const handleDeleteMedia = async (type: 'imagem1' | 'imagem2' | 'video') => {
    if (!window.confirm('Tem certeza que deseja deletar esta mídia?')) {
      return;
    }

    try {
      let currentUrl = '';
      switch (type) {
        case 'imagem1':
          currentUrl = imagem1Url;
          setImagem1Url('');
          break;
        case 'imagem2':
          currentUrl = imagem2Url;
          setImagem2Url('');
          break;
        case 'video':
          currentUrl = videoUrl;
          setVideoUrl('');
          break;
      }

      // Se existe URL, tentar deletar do Cloudflare
      if (currentUrl && currentUrl.includes('pub-exerciciospt')) {
        await deleteMediaFromCloudflare(currentUrl);
      }

      toast({
        title: "Sucesso",
        description: "Mídia removida com sucesso!",
      });

    } catch (error) {
      console.error('Erro ao deletar mídia:', error);
      toast({
        title: "Aviso",
        description: "Mídia removida do exercício, mas pode não ter sido deletada do servidor.",
        variant: "destructive",
      });
    }
  };

  // Função auxiliar para pegar URL atual
  const getCurrentUrl = (type: 'imagem1' | 'imagem2' | 'video') => {
    switch (type) {
      case 'imagem1': return imagem1Url;
      case 'imagem2': return imagem2Url;
      case 'video': return videoUrl;
      default: return '';
    }
  };

  // Função auxiliar para deletar do Cloudflare (melhorada)
  const deleteMediaFromCloudflare = async (fileUrl: string) => {
    try {
      let filename = fileUrl;
      // Se é URL do Cloudflare, extrair só o nome do arquivo
      if (filename.includes('pub-exerciciospt.r2.dev/')) {
        filename = filename.split('/').pop()?.split('?')[0] || filename;
      } else if (filename.includes('/')) {
        filename = filename.split('/').pop()?.split('?')[0] || filename;
      }
      // Validar se é arquivo de exercício
      if (!filename.includes('exercicio_')) {
        console.log('Não é arquivo de exercício, pulando deleção');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      await supabase.functions.invoke('delete-image', {
        body: { filename, bucket_type: 'exercicios' }
      });
    } catch (error) {
      console.warn('Erro ao deletar:', error);
    }
  };

  // Função para upload de nova mídia usando Edge Function (fluxo seguro)
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

        // 1. Guardar URL antiga
        const oldUrl = getCurrentUrl(type);

        try {
          // 2. Upload nova mídia
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

          // 3. Atualizar estado local
          switch (type) {
            case 'imagem1':
              setImagem1Url(result.url);
              break;
            case 'imagem2':
              setImagem2Url(result.url);
              break;
            case 'video':
              setVideoUrl(result.url);
              break;
          }

          // 4. Deletar mídia antiga (se existia e não é igual à nova)
          if (oldUrl && oldUrl !== result.url) {
            await deleteMediaFromCloudflare(oldUrl);
          }

          // 5. Recarregar URLs assinadas se exercício existe
          if (exercicio) {
            const updatedExercicio = { ...exercicio };
            switch (type) {
              case 'imagem1':
                updatedExercicio.imagem_1_url = result.url;
                break;
              case 'imagem2':
                updatedExercicio.imagem_2_url = result.url;
                break;
              case 'video':
                updatedExercicio.video_url = result.url;
                break;
            }
            await loadSignedUrls(updatedExercicio);
          }

          toast({
            title: "Sucesso",
            description: "Mídia enviada com sucesso!",
          });

        } catch (error) {
          // NÃO deletar a antiga se upload falhou
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

  // Função auxiliar para converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:image/jpeg;base64," ou similar
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
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
            <h1 className="text-3xl font-bold">Editar Exercício</h1>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Carregando exercício...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/exercicios-pt')}
            className="h-10 w-10 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Exercício</h1>
            <p className="text-muted-foreground">
              {exercicio?.nome}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Formulário */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Informações básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome do Exercício *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Supino Reto com Barra"
                />
              </div>

              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição breve do exercício..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="instrucoes">Instruções de Execução</Label>
                <Textarea
                  id="instrucoes"
                  value={instrucoes}
                  onChange={(e) => setInstrucoes(e.target.value)}
                  placeholder="Instruções detalhadas de como executar o exercício..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Mídias */}
          <Card>
            <CardHeader>
              <CardTitle>Mídias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primeira Imagem */}
              <div>
                <Label className="text-sm font-medium">Primeira Imagem</Label>
                {imagem1Url ? (
                  <div className="mt-2 space-y-3">
                    <div className="relative inline-block">
                      {loadingImages ? (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Carregando...</span>
                        </div>
                      ) : signedUrls.imagem1 ? (
                        <img 
                          src={signedUrls.imagem1} 
                          alt="Primeira imagem do exercício" 
                          className="w-40 h-40 object-cover rounded-lg border shadow-sm"
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
                        onClick={() => handleViewMedia(signedUrls.imagem1 || imagem1Url)}
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
                        Deletar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-3">Nenhuma imagem adicionada</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUploadMedia('imagem1')}
                        className="flex items-center gap-2"
                        disabled={uploadingMedia === 'imagem1'}
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingMedia === 'imagem1' ? 'Enviando...' : 'Adicionar Primeira Imagem'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Segunda Imagem */}
              <div>
                <Label className="text-sm font-medium">Segunda Imagem</Label>
                {imagem2Url ? (
                  <div className="mt-2 space-y-3">
                    <div className="relative inline-block">
                      {loadingImages ? (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Carregando...</span>
                        </div>
                      ) : signedUrls.imagem2 ? (
                        <img 
                          src={signedUrls.imagem2} 
                          alt="Segunda imagem do exercício" 
                          className="w-40 h-40 object-cover rounded-lg border shadow-sm"
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
                        onClick={() => handleViewMedia(signedUrls.imagem2 || imagem2Url)}
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
                        Deletar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-3">Nenhuma imagem adicionada</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUploadMedia('imagem2')}
                        className="flex items-center gap-2"
                        disabled={uploadingMedia === 'imagem2'}
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingMedia === 'imagem2' ? 'Enviando...' : 'Adicionar Segunda Imagem'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Vídeo */}
              <div>
                <Label className="text-sm font-medium">Vídeo</Label>
                {videoUrl ? (
                  <div className="mt-2 space-y-3">
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
                        onClick={() => handleViewMedia(signedUrls.video || videoUrl)}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.video}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
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
                        Deletar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <p className="text-sm text-muted-foreground mb-3">Nenhum vídeo adicionado</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUploadMedia('video')}
                        className="flex items-center gap-2"
                        disabled={uploadingMedia === 'video'}
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingMedia === 'video' ? 'Enviando...' : 'Adicionar Vídeo'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* YouTube */}
              <div>
                <Label htmlFor="youtube">URL do YouTube</Label>
                <div className="mt-2 space-y-2">
                  <Input
                    id="youtube"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                  {youtubeUrl && (
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        ✅ URL do YouTube configurada
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMedia(youtubeUrl)}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="grupo_muscular">Grupo Muscular *</Label>
                <Select value={grupoMuscular} onValueChange={setGrupoMuscular}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o grupo muscular" />
                  </SelectTrigger>
                  <SelectContent>
                    {gruposMusculares.map((grupo) => (
                      <SelectItem key={grupo} value={grupo}>
                        {grupo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="equipamento">Equipamento</Label>
                <Select value={equipamento} onValueChange={setEquipamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipamentos.map((equip) => (
                      <SelectItem key={equip} value={equip}>
                        {equip}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dificuldade">Dificuldade</Label>
                <Select value={dificuldade} onValueChange={setDificuldade}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a dificuldade" />
                  </SelectTrigger>
                  <SelectContent>
                    {dificuldades.map((diff) => (
                      <SelectItem key={diff} value={diff}>
                        {diff}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EditarExercicio;