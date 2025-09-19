// pages/DetalhesExercicio.tsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, Copy, Edit, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";
import { useIsMobile } from "@/hooks/use-mobile";

type Exercicio = Tables<"exercicios">;

const DetalhesExercicio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const [loading, setLoading] = useState(true);
  const [exercicio, setExercicio] = useState<Exercicio | null>(null);
  const [nomeExercicioPadrao, setNomeExercicioPadrao] = useState<string>('');
  
  // Estados para URLs assinadas das mídias
  const [signedUrls, setSignedUrls] = useState<{
    imagem1?: string;
    imagem2?: string;
    video?: string;
  }>({});
  const [loadingImages, setLoadingImages] = useState(false);

  // ✅ FUNÇÃO UNIFICADA: Busca a URL da mídia (padrão ou personalizada) via Edge Function.
  // Isso elimina a dependência de variáveis de ambiente no frontend, resolvendo o problema em produção.
  const getMediaUrl = useCallback(async (path: string, tipo: 'personalizado' | 'padrao'): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Usuário não autenticado");
      }

      // Determina o tipo de bucket a ser usado na Edge Function
      const bucket_type = tipo === 'personalizado' ? 'exercicios' : 'exercicios-padrao';

      const response = await fetch('https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/get-image-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          filename: path,
          bucket_type: bucket_type
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
      console.error(`Erro ao obter URL para ${tipo} (${path}):`, error);
      throw error;
    }
  }, []);

  // ✅ FUNÇÃO ATUALIZADA: Carregar URLs com lógica condicional
  const loadSignedUrls = useCallback(async (exercicio: Exercicio) => {
    setLoadingImages(true);
    setSignedUrls({});
    
    console.log('🔄 Carregando URLs para exercício:', {
      tipo: exercicio.tipo,
      grupoMuscular: exercicio.grupo_muscular,
      imagem1: exercicio.imagem_1_url,
      imagem2: exercicio.imagem_2_url,
      video: exercicio.video_url
    });
    
    try {
      const urls: { imagem1?: string; imagem2?: string; video?: string } = {};
      
      // Carregar imagem 1 se existir
      if (exercicio.imagem_1_url) {
        try {
          console.log(`📸 Carregando imagem 1 (${exercicio.tipo})...`);
          const signedUrl = await getMediaUrl(exercicio.imagem_1_url, exercicio.tipo as 'personalizado' | 'padrao');
          urls.imagem1 = signedUrl;
          console.log('✅ Imagem 1 carregada');
        } catch (error) {
          console.error('❌ Erro ao carregar imagem 1:', error);
        }
      }
      
      // Carregar imagem 2 se existir
      if (exercicio.imagem_2_url) {
        try {
          console.log(`📸 Carregando imagem 2 (${exercicio.tipo})...`);
          const signedUrl = await getMediaUrl(exercicio.imagem_2_url, exercicio.tipo as 'personalizado' | 'padrao');
          urls.imagem2 = signedUrl;
          console.log('✅ Imagem 2 carregada');
        } catch (error) {
          console.error('❌ Erro ao carregar imagem 2:', error);
        }
      }
      
      // Carregar vídeo se existir
      if (exercicio.video_url) {
        try {
          console.log(`🎥 Carregando vídeo (${exercicio.tipo})...`);
          const signedUrl = await getMediaUrl(exercicio.video_url, exercicio.tipo as 'personalizado' | 'padrao');
          urls.video = signedUrl;
          console.log('✅ Vídeo carregado');
        } catch (error) {
          console.error('❌ Erro ao carregar vídeo:', error);
        }
      }
      
      setSignedUrls(urls);
      console.log('🎉 Todas as URLs carregadas:', urls);
    } catch (error) {
      console.error('❌ Erro geral ao carregar URLs assinadas:', error);
    } finally {
      setLoadingImages(false);
    }
  }, [getMediaUrl]);

  // Carregar exercício
  useEffect(() => {
    const fetchExercicio = async () => {
      if (!id || !user) {
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

        // Verificar se é exercício personalizado e se pertence ao PT
        if (exercicio.tipo === 'personalizado' && exercicio.pt_id !== user?.id) {
          throw new Error('Você não tem permissão para ver este exercício');
        }

        setExercicio(exercicio);
        
        // Se é exercício personalizado baseado em outro, buscar o nome do original
        if (exercicio.tipo === 'personalizado' && exercicio.exercicio_padrao_id) {
          const { data: exercicioPadrao } = await supabase
            .from('exercicios')
            .select('nome')
            .eq('id', exercicio.exercicio_padrao_id)
            .single();
          
          if (exercicioPadrao) {
            setNomeExercicioPadrao(exercicioPadrao.nome);
          }
        }
        
        // ✅ Carregar URLs assinadas das mídias com nova lógica
        await loadSignedUrls(exercicio);
        
        console.log('✅ Exercício carregado:', exercicio);
        
      } catch (error) {
        console.error('❌ Erro ao carregar exercício:', error);
        toast.error("Erro", {
          description: "Não foi possível carregar os detalhes do exercício."
        })
        navigate('/exercicios-pt');
      } finally {
        setLoading(false);
      }
    };

    fetchExercicio();
  }, [id, user, navigate, loadSignedUrls]);

  const handleCriarCopia = () => {
    if (!exercicio) return;
    // A verificação de limite agora é feita na página principal de exercícios.
    // Aqui, apenas navegamos para a página de cópia.
    navigate(`/exercicios-pt/copia/${exercicio.id}`);
  };

  const handleEditar = () => {
    if (!exercicio) return;
    navigate(`/exercicios-pt/editar/${exercicio.id}`);
  };

  const handleViewMedia = (url: string) => {
    if (url) {
      window.open(url, '_blank');
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

  if (!exercicio) {
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
            <h1 className="text-3xl font-bold">Erro</h1>
            <p className="text-muted-foreground">Exercício não encontrado</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      {!isMobile && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/exercicios-pt')}
              className="h-10 w-10 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              {/* Badge acima do título para personalizado ou padrão */}
              {exercicio.tipo === 'personalizado' && (
                <span className="mb-1 inline-block text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                  Personalizado
                </span>
              )}
              {exercicio.tipo === 'padrao' && (
                <span className="mb-1 inline-block text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                  Padrão
                </span>
              )}
              <h1 className="text-3xl font-bold flex items-center gap-2">
                {exercicio.nome}
              </h1>
              <p className="text-muted-foreground">
                Detalhes completos do exercício
              </p>
            </div>
          </div>

          {/* Nenhuma ação no topo, visualização apenas */}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informações principais */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info básica */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                <p className="text-lg font-semibold">{exercicio.nome}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                <p className="text-base">{exercicio.descricao || 'Sem descrição'}</p>
              </div>

              <Separator />

              {/* Removido: Grupo Muscular e Equipamento já exibidos na sessão Classificação */}
            </CardContent>
          </Card>

          {/* Instruções */}
          <Card>
            <CardHeader>
                <CardTitle>Instruções de execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-base leading-relaxed">
                {exercicio.instrucoes && exercicio.instrucoes.includes('#')
                  ? (
                      <ol className="list-decimal pl-5">
                        {exercicio.instrucoes.split('#').filter(Boolean).map((item, idx) => (
                          <li key={idx}>{item.trim()}</li>
                        ))}
                      </ol>
                    )
                  : (exercicio.instrucoes || 'Instruções não disponíveis')
                }
              </div>
            </CardContent>
          </Card>

          {/* ✅ MÍDIAS COM DEBUG */}
          <Card>
            <CardHeader>
              <CardTitle>Mídias</CardTitle>
              {/* Debug info */}
              <div className="text-xs text-muted-foreground">
                Tipo: {exercicio.tipo} | Grupo: {exercicio.grupo_muscular}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Primeira Imagem */}
              {exercicio.imagem_1_url && (
                <div>
                  <Label className="text-sm font-medium">
                    Primeira Imagem
                  </Label>
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
                          className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"
                          onError={(e) => {
                            console.error('Erro ao carregar imagem 1');
                            e.currentTarget.style.display = 'none';
                          }}
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
                        onClick={() => handleViewMedia(signedUrls.imagem1 || exercicio.imagem_1_url!)}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.imagem1}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Segunda Imagem */}
              {exercicio.imagem_2_url && (
                <div>
                  <Label className="text-sm font-medium">
                    Segunda Imagem
                  </Label>
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
                          className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"
                          onError={(e) => {
                            console.error('Erro ao carregar imagem 2');
                            e.currentTarget.style.display = 'none';
                          }}
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
                        onClick={() => handleViewMedia(signedUrls.imagem2 || exercicio.imagem_2_url!)}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.imagem2}
                      >
                        <Eye className="h-4 w-4" />
                        Visualizar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vídeo */}
              {exercicio.video_url && (
                <div>
                  <Label className="text-sm font-medium">
                    Vídeo
                  </Label>
                  <div className="mt-2 space-y-3">
                    <div className="relative inline-block">
                      {loadingImages ? (
                        <div className="w-40 h-40 bg-muted rounded-lg border flex items-center justify-center">
                          <span className="text-sm text-muted-foreground">Carregando...</span>
                        </div>
                      ) : signedUrls.video ? (
                        <video 
                          src={signedUrls.video} 
                          className="max-w-40 max-h-40 object-contain rounded-lg border shadow-sm bg-muted"
                          controls
                          onError={(e) => {
                            console.error('Erro ao carregar vídeo');
                          }}
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
                        onClick={() => handleViewMedia(signedUrls.video || exercicio.video_url!)}
                        className="flex items-center gap-2"
                        disabled={!signedUrls.video}
                      >
                        <Eye className="h-4 w-4" />
                        Assistir
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* YouTube */}
              {exercicio.youtube_url && (
                <div>
                  <Label className="text-sm font-medium">URL do YouTube</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        ✅ URL do YouTube configurada
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMedia(exercicio.youtube_url!)}
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver no YouTube
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {!exercicio.imagem_1_url && !exercicio.imagem_2_url && !exercicio.video_url && !exercicio.youtube_url && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma mídia disponível para este exercício
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Classificação */}
          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Grupo muscular</Label>
                <p className="text-sm font-medium">{exercicio.grupo_muscular || 'Não especificado'}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Músculo primário</Label>
                <p className="text-sm font-medium">{exercicio.grupo_muscular_primario}</p>
              </div>

              {Array.isArray(exercicio.grupos_musculares_secundarios)
                ? exercicio.grupos_musculares_secundarios.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Músculo(s) secundário(s)</Label>
                      <p className="text-sm font-medium">{exercicio.grupos_musculares_secundarios.join(', ')}</p>
                    </div>
                  )
                : (typeof exercicio.grupos_musculares_secundarios === 'string' && exercicio.grupos_musculares_secundarios && (exercicio.grupos_musculares_secundarios as string).trim() !== '') && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Músculo(s) secundário(s)</Label>
                      <p className="text-sm font-medium">{exercicio.grupos_musculares_secundarios}</p>
                    </div>
                  )
              }
              
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Equipamento</Label>
                <p className="text-sm font-medium">{exercicio.equipamento || 'Não especificado'}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Dificuldade</Label>
                <p className="text-sm font-medium">{exercicio.dificuldade || 'Não definida'}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Criação</Label>
                  <p className="text-sm">
                    {exercicio.created_at ? new Date(exercicio.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                
                {exercicio.tipo === 'personalizado' && exercicio.exercicio_padrao_id && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Baseado no exercício</Label>
                    <p className="text-sm">{nomeExercicioPadrao || 'Carregando...'}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      Ativo
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetalhesExercicio;