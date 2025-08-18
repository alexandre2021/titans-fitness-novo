// src/components/rotina/execucao/shared/ExercicioDetalhesModal.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Target, AlertCircle, Play, Video, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Hook para detectar mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
};

interface Props {
  visible: boolean;
  exercicioId: string;
  onClose: () => void;
}

interface ExercicioDetalhes {
  id: string;
  nome: string;
  equipamento: string;
  grupo_muscular: string;
  grupo_muscular_primario: string;
  grupos_musculares_secundarios: string[];
  descricao?: string;
  instrucoes?: string;
  tipo: string;
  imagem_1_url?: string;
  imagem_2_url?: string;
  video_url?: string;
  youtube_url?: string;
}

// Tipagem usando os tipos do Supabase
type ExercicioSupabase = Tables<'exercicios'>;

// Componente de conteúdo compartilhado
const ExercicioDetalhesContent: React.FC<{ 
  isMobile: boolean; 
  exercicio: ExercicioDetalhes | null;
  loading: boolean;
  onClose: () => void;
}> = ({ isMobile, exercicio, loading, onClose }) => {
  const GET_IMAGE_URL_ENDPOINT = 'https://prvfvlyzfyprjliqniki.supabase.co/functions/v1/get-image-url';
  
  const [mediaUrls, setMediaUrls] = useState<{ 
    imagem1?: string; 
    imagem2?: string; 
    video?: string;
  }>({});
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [imageAspectRatios, setImageAspectRatios] = useState<{[key: string]: number}>({});

  // Função para detectar aspect ratio da imagem
  const handleImageLoad = (key: string, event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const ratio = img.naturalWidth / img.naturalHeight;
    setImageAspectRatios(prev => ({ ...prev, [key]: ratio }));
  };

  // Função para determinar se imagem é quadrada (aspect ratio próximo de 1:1)
  const isSquareImage = (key: string): boolean => {
    const ratio = imageAspectRatios[key];
    return ratio && ratio > 0.85 && ratio < 1.15; // Tolerância para considerar quadrada
  };

  // Função para formatar instruções
  const formatarInstrucoes = (texto: string): string => {
    return texto
      .split('#')
      .filter(item => item.trim())
      .map((item, index) => `${index + 1}. ${item.trim()}`)
      .join('\n');
  };

  async function getSignedUrl(filename: string): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("Usuário não autenticado");
      }
      
      const response = await fetch(GET_IMAGE_URL_ENDPOINT, {
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
        throw new Error(`Erro ao obter URL da mídia: ${response.status} - ${errorText}`);
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
  }

  // Função para construir URL do Supabase (exercícios padrão)
  const getSupabaseUrl = (filename: string, grupoMuscular: string): string => {
    const { data } = supabase.storage
      .from('exercicios-padrao')
      .getPublicUrl(`${grupoMuscular.toLowerCase()}/${filename}`);
    return data.publicUrl;
  };

  // Função para converter URL do YouTube para embed
  const getYouTubeEmbedUrl = (url: string): string | null => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  // Função para carregar mídias do exercício
  const loadMedia = useCallback(async (exercicio: ExercicioDetalhes) => {
    setIsLoadingMedia(true);
    setMediaUrls({});
    
    try {
      const urls: { imagem1?: string; imagem2?: string; video?: string } = {};
      
      if (exercicio.tipo === 'padrao') {
        // Exercícios padrão - URLs diretas do Supabase
        if (exercicio.imagem_1_url) {
          let filename = exercicio.imagem_1_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop() || filename;
          }
          urls.imagem1 = getSupabaseUrl(filename, exercicio.grupo_muscular);
        }
        
        if (exercicio.imagem_2_url) {
          let filename = exercicio.imagem_2_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop() || filename;
          }
          urls.imagem2 = getSupabaseUrl(filename, exercicio.grupo_muscular);
        }
        
        if (exercicio.video_url) {
          let filename = exercicio.video_url;
          if (filename.includes('/')) {
            filename = filename.split('/').pop() || filename;
          }
          urls.video = getSupabaseUrl(filename, exercicio.grupo_muscular);
        }
      } else {
        // Exercícios personalizados - URLs assinadas do Cloudflare
        if (exercicio.imagem_1_url) {
          try {
            let filename = exercicio.imagem_1_url;
            if (filename.includes('/')) {
              filename = filename.split('/').pop()?.split('?')[0] || filename;
            }
            if (filename) {
              urls.imagem1 = await getSignedUrl(filename);
            }
          } catch (error) {
            console.error('Erro ao carregar imagem 1:', error);
          }
        }
        
        if (exercicio.imagem_2_url) {
          try {
            let filename = exercicio.imagem_2_url;
            if (filename.includes('/')) {
              filename = filename.split('/').pop()?.split('?')[0] || filename;
            }
            if (filename) {
              urls.imagem2 = await getSignedUrl(filename);
            }
          } catch (error) {
            console.error('Erro ao carregar imagem 2:', error);
          }
        }
        
        if (exercicio.video_url) {
          try {
            let filename = exercicio.video_url;
            if (filename.includes('/')) {
              filename = filename.split('/').pop()?.split('?')[0] || filename;
            }
            if (filename) {
              urls.video = await getSignedUrl(filename);
            }
          } catch (error) {
            console.error('Erro ao carregar vídeo:', error);
          }
        }
      }
      
      setMediaUrls(urls);
    } catch (error) {
      console.error('Erro geral ao carregar mídias:', error);
    } finally {
      setIsLoadingMedia(false);
    }
  }, []);

  // Carregar mídias quando exercício for carregado
  useEffect(() => {
    if (exercicio) {
      loadMedia(exercicio);
    }
  }, [exercicio, loadMedia]);

  return (
    <>
      {/* Header */}
      <div className="px-6 py-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            <span className="font-semibold">Detalhes do Exercício</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Conteúdo com scroll */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : exercicio ? (
          <div className="space-y-6">
            {/* Nome do exercício */}
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                {exercicio.nome}
              </h3>
            </div>
            
            {/* Tags para equipamento e tipo */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">{exercicio.equipamento}</Badge>
              <Badge variant="outline" className={exercicio.tipo === 'padrao' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}>
                {exercicio.tipo === 'padrao' ? 'Padrão' : 'Personalizado'}
              </Badge>
            </div>
            
            {/* Grupo muscular */}
            {exercicio.grupo_muscular && (
              <div className="mb-4">
                <h4 className="font-medium text-foreground mb-2">Grupo muscular</h4>
                <p className="text-base text-foreground">{exercicio.grupo_muscular}</p>
              </div>
            )}
            
            {/* Músculo primário */}
            {exercicio.grupo_muscular_primario && (
              <div className="mb-4">
                <h4 className="font-medium text-foreground mb-2">Músculo primário</h4>
                <p className="text-base text-foreground">{exercicio.grupo_muscular_primario}</p>
              </div>
            )}
            
            {/* Músculos secundários */}
            {(() => {
              const secundarios = exercicio.grupos_musculares_secundarios;
              let secundariosStr = '';
              if (Array.isArray(secundarios)) {
                secundariosStr = secundarios.join(', ');
              } else if (typeof secundarios === 'string') {
                secundariosStr = secundarios;
              }
              secundariosStr = (secundariosStr ?? '').trim();
              return secundariosStr !== '' ? (
                <div className="mb-4">
                  <h4 className="font-medium text-foreground mb-2">Músculo(s) secundário(s)</h4>
                  <p className="text-base text-foreground">{secundariosStr}</p>
                </div>
              ) : null;
            })()}

            {/* Mídias do Exercício - Responsivo */}
            {(exercicio.imagem_1_url || exercicio.imagem_2_url || exercicio.video_url || exercicio.youtube_url) && (
              <div>
                <h4 className="font-medium text-foreground mb-4 flex items-center space-x-2">
                  <Video className="h-4 w-4" />
                  <span>Mídias do Exercício</span>
                </h4>
                
                {isLoadingMedia ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                    <span className="text-sm text-muted-foreground">Carregando mídias...</span>
                  </div>
                ) : (
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {/* Imagem 1 */}
                    {exercicio.imagem_1_url && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Demonstração 1</span>
                        </div>
                        <div className={`w-full border rounded-lg overflow-hidden flex items-center justify-center ${
                          isSquareImage('imagem1') 
                            ? isMobile ? 'h-64' : 'h-64 w-64 mx-auto' // Mobile: largura total, Desktop: quadrado
                            : 'h-48' // Container retangular
                        }`}>
                          {mediaUrls.imagem1 ? (
                            <img
                              src={mediaUrls.imagem1}
                              alt="Demonstração do exercício 1"
                              className="max-w-full max-h-full object-contain"
                              onLoad={(e) => handleImageLoad('imagem1', e)}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">Erro ao carregar imagem</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Imagem 2 */}
                    {exercicio.imagem_2_url && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Demonstração 2</span>
                        </div>
                        <div className={`w-full border rounded-lg overflow-hidden flex items-center justify-center ${
                          isSquareImage('imagem2') 
                            ? isMobile ? 'h-64' : 'h-64 w-64 mx-auto' // Mobile: largura total, Desktop: quadrado
                            : 'h-48' // Container retangular
                        }`}>
                          {mediaUrls.imagem2 ? (
                            <img
                              src={mediaUrls.imagem2}
                              alt="Demonstração do exercício 2"
                              className="max-w-full max-h-full object-contain"
                              onLoad={(e) => handleImageLoad('imagem2', e)}
                            />
                          ) : (
                            <span className="text-sm text-muted-foreground">Erro ao carregar imagem</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Vídeo Local */}
                    {exercicio.video_url && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Video className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Vídeo Demonstrativo</span>
                        </div>
                        <div className="w-full h-48 border rounded-lg overflow-hidden bg-muted">
                          {mediaUrls.video ? (
                            <video
                              src={mediaUrls.video}
                              controls
                              className="w-full h-full object-cover"
                            >
                              Seu navegador não suporta vídeos.
                            </video>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-sm text-muted-foreground">Erro ao carregar vídeo</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* YouTube */}
                    {exercicio.youtube_url && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Play className="h-4 w-4 text-red-600" />
                          <span className="text-sm font-medium">Vídeo YouTube</span>
                        </div>
                        <div className="w-full h-48 border rounded-lg overflow-hidden bg-muted">
                          {getYouTubeEmbedUrl(exercicio.youtube_url) ? (
                            <iframe
                              src={getYouTubeEmbedUrl(exercicio.youtube_url)!}
                              className="w-full h-full"
                              allowFullScreen
                              title="Vídeo demonstrativo do exercício"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-sm text-muted-foreground">URL do YouTube inválida</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Descrição */}
            {exercicio.descricao && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Descrição</h4>
                <p className="text-foreground leading-relaxed">
                  {exercicio.descricao}
                </p>
              </div>
            )}

            {/* Instruções */}
            {exercicio.instrucoes && (
              <div>
                <h4 className="font-medium text-foreground mb-2">Instruções de execução</h4>
                <div className="bg-white p-4 rounded-lg">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {formatarInstrucoes(exercicio.instrucoes)}
                  </p>
                </div>
              </div>
            )}

            {/* Dicas de segurança */}
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center space-x-2">
                <AlertCircle className="h-4 w-4" />
                <span>Dicas de Segurança</span>
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                • Pare imediatamente se sentir dor ou desconforto
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Detalhes do exercício não encontrados.</p>
          </div>
        )}
      </div>
    </>
  );
};

export const ExercicioDetalhesModal = ({ visible, exercicioId, onClose }: Props) => {
  const isMobile = useIsMobile();
  const [exercicio, setExercicio] = useState<ExercicioDetalhes | null>(null);
  const [loading, setLoading] = useState(false);

  const carregarDetalhes = useCallback(async () => {
    if (!exercicioId) return;
    
    try {
      setLoading(true);
      
      const { data: exercicioRaw, error } = await supabase
        .from('exercicios')
        .select('id, nome, equipamento, grupo_muscular, grupo_muscular_primario, grupos_musculares_secundarios, descricao, instrucoes, tipo, imagem_1_url, imagem_2_url, video_url, youtube_url')
        .eq('id', exercicioId)
        .single();

      if (error) {
        console.error('Erro ao carregar detalhes do exercício:', error);
        setExercicio(null);
        return;
      }

      if (!exercicioRaw) {
        setExercicio(null);
        return;
      }

      // Cast com tipagem correta
      const exercicioData = exercicioRaw as ExercicioSupabase;

      // Transformar para a interface esperada
      const exercicioFormatado: ExercicioDetalhes = {
        id: exercicioData.id,
        nome: exercicioData.nome,
        equipamento: exercicioData.equipamento || '',
        grupo_muscular: exercicioData.grupo_muscular || '',
        grupo_muscular_primario: exercicioData.grupo_muscular_primario || exercicioData.grupo_muscular || '',
        grupos_musculares_secundarios: exercicioData.grupos_musculares_secundarios || [],
        descricao: exercicioData.descricao || undefined,
        instrucoes: exercicioData.instrucoes || undefined,
        tipo: exercicioData.tipo || 'padrao',
        imagem_1_url: exercicioData.imagem_1_url || undefined,
        imagem_2_url: exercicioData.imagem_2_url || undefined,
        video_url: exercicioData.video_url || undefined,
        youtube_url: exercicioData.youtube_url || undefined
      };

      setExercicio(exercicioFormatado);
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      setExercicio(null);
    } finally {
      setLoading(false);
    }
  }, [exercicioId]);

  useEffect(() => {
    if (visible && exercicioId) {
      carregarDetalhes();
    }
  }, [visible, exercicioId, carregarDetalhes]);

  // Criar conteúdo com as props necessárias
  const content = (
    <ExercicioDetalhesContent 
      isMobile={isMobile}
      exercicio={exercicio}
      loading={loading}
      onClose={onClose}
    />
  );

  if (isMobile) {
    // Mobile: Drawer
    return (
      <Drawer open={visible} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog
  return (
    <Dialog open={visible} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 flex flex-col">
        {content}
      </DialogContent>
    </Dialog>
  );
};