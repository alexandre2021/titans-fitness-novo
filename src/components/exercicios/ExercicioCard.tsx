import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tables } from "@/integrations/supabase/types";
import { useNavigate, useLocation } from "react-router-dom";
import { MoreVertical, Copy, Edit, Trash2, Eye, Camera } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';

interface ExercicioCardProps {
  exercicio: Tables<'exercicios'>;
  onCriarCopia?: (exercicioId: string) => void;
  onExcluir?: (exercicioId: string) => void;
  isAdmin: boolean;
  location: ReturnType<typeof useLocation>;
}

const GRUPO_CORES: { [key: string]: string } = {
  'Peito': 'bg-red-100 text-red-800', 'Costas': 'bg-blue-100 text-blue-800',
  'Pernas': 'bg-green-100 text-green-800', 'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800', 'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800', 'Glúteos': 'bg-violet-100 text-violet-800',
  'Panturrilha': 'bg-indigo-100 text-indigo-800'
};

export const ExercicioCard = ({ exercicio, onCriarCopia, onExcluir, isAdmin, location }: ExercicioCardProps) => {
  const navigate = useNavigate();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // ✅ LAZY LOADING MANUAL com Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const getMediaUrl = useCallback(async (path: string, tipo: 'personalizado' | 'padrao'): Promise<string | null> => {
    if (!path) return null;
    try {
      const bucket_type = tipo === 'personalizado' ? 'exercicios' : 'exercicios-padrao';
      const { data, error } = await supabase.functions.invoke('get-image-url', {
        body: { filename: path, bucket_type }
      });
      if (error) throw error;
      return data?.url || null;
    } catch (error) {
      console.error(`Erro ao obter URL para ${path}:`, error);
      return null;
    }
  }, []);

  // ✅ CARREGAMENTO DA MÍDIA
  useEffect(() => {
    if (isVisible && !mediaUrl && !isLoading) {
      const loadMedia = async () => {
        setIsLoading(true);
        
        const coverColumnName = exercicio.cover_media_url;
        let mediaPath: string | null = null;

        if (coverColumnName === 'video_url' && exercicio.video_thumbnail_path) {
          mediaPath = exercicio.video_thumbnail_path;
        } else {
          if (coverColumnName) {
            mediaPath = (exercicio[coverColumnName as keyof Tables<'exercicios'>] as string | null) || null;
          }
          
          if (!mediaPath) {
            mediaPath = exercicio.imagem_1_url || exercicio.imagem_2_url || null;
          }
        }

        if (mediaPath) {
          const url = await getMediaUrl(mediaPath, exercicio.tipo as 'personalizado' | 'padrao');
          setMediaUrl(url);
        }
        
        setIsLoading(false);
      };
      loadMedia();
    }
  }, [isVisible, mediaUrl, isLoading, exercicio, getMediaUrl]);

  const handleNavigation = (path: string) => {
    const returnToUrl = encodeURIComponent(location.pathname + location.search);
    navigate(`${path}?returnTo=${returnToUrl}`);
  };

  const isVideo = exercicio.cover_media_url === 'video_url' && !!exercicio.video_url;
  const isYouTube = exercicio.cover_media_url === 'youtube_url' && !!exercicio.youtube_url;
  const corGrupo = exercicio.grupo_muscular ? GRUPO_CORES[exercicio.grupo_muscular] || 'bg-gray-100 text-black' : 'bg-gray-100 text-black';

  return (
    <Card 
      ref={cardRef}
      className="hover:shadow-lg transition-shadow flex flex-col overflow-hidden" 
      onClick={() => handleNavigation(`/exercicios/detalhes/${exercicio.id}`)}
    >
      {/* ✅ CONTEÚDO NO TOPO */}
      <CardContent className="p-4 pb-2 flex-grow flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-foreground line-clamp-2 flex-1">{exercicio.nome}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full p-0 flex-shrink-0" 
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  handleNavigation(`/exercicios/detalhes/${exercicio.id}`); 
                }}
              >
                <Eye className="mr-2 h-4 w-4" />Ver Detalhes
              </DropdownMenuItem>
              
              {onCriarCopia && (
                <DropdownMenuItem 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    onCriarCopia(exercicio.id); 
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />Criar Cópia
                </DropdownMenuItem>
              )}
              
              {exercicio.tipo === 'personalizado' && (
                <>
                  <DropdownMenuItem 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleNavigation(`/exercicios/editar/${exercicio.id}`); 
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />Editar
                  </DropdownMenuItem>
                  
                  {onExcluir && (
                    <DropdownMenuItem 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onExcluir(exercicio.id); 
                      }} 
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />Excluir
                    </DropdownMenuItem>
                  )}
                </>
              )}
              
              {isAdmin && exercicio.tipo === 'padrao' && (
                <DropdownMenuItem 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleNavigation(`/exercicios/editar-padrao/${exercicio.id}`); 
                  }} 
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:bg-secondary/80 focus:text-secondary-foreground"
                >
                  <Edit className="mr-2 h-4 w-4" />Editar Padrão
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* ✅ BADGES */}
        <div className="flex flex-wrap gap-1 mb-3">
          {exercicio.grupo_muscular && (
            <Badge className={`text-xs border-0 ${corGrupo}`}>
              {exercicio.grupo_muscular}
            </Badge>
          )}
          {exercicio.equipamento && (
            <Badge className="text-xs bg-gray-100 text-black">
              {exercicio.equipamento}
            </Badge>
          )}
          {exercicio.dificuldade && (
            <Badge className="text-xs bg-gray-100 text-black border-0">
              {exercicio.dificuldade}
            </Badge>
          )}
        </div>
      </CardContent>

      {/* ✅ ÁREA DE MÍDIA */}
      <div className="relative h-48 bg-muted/50 border-t flex items-center justify-center overflow-hidden rounded-b-lg">
        {isLoading ? (
          <div className="animate-pulse bg-muted-foreground/20 w-full h-full" />
        ) : mediaUrl ? (
          <>
            {isVideo ? (
              <div className="w-full h-full flex items-center justify-center relative">
                <img 
                  src={mediaUrl} 
                  alt={`Thumbnail do vídeo - ${exercicio.nome}`}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
                {/* ✅ BADGE "VÍDEO" */}
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  Vídeo
                </div>
              </div>
            ) : isYouTube ? (
              <div className="w-full h-full bg-black flex items-center justify-center rounded-lg">
                <div className="text-white text-sm">YouTube</div>
              </div>
            ) : (
              <img 
                src={mediaUrl} 
                alt={exercicio.nome} 
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground/50">
            <Camera className="h-12 w-12 mb-2" />
            <span className="text-sm">Sem mídia</span>
          </div>
        )}
      </div>
    </Card>
  );
};