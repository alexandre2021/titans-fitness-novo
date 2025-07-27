// components/exercicios/MediaUploadSection.tsx
import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Image, Video, Youtube, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface MediaUploadSectionProps {
  midias: {
    imagem_1_url: string;
    imagem_2_url: string;
    video_url: string;
    youtube_url: string;
  };
  onMidiasChange: (midias: {
    imagem_1_url: string;
    imagem_2_url: string;
    video_url: string;
    youtube_url: string;
  }) => void;
}

export const MediaUploadSection: React.FC<MediaUploadSectionProps> = ({
  midias,
  onMidiasChange
}) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadType, setCurrentUploadType] = useState<string>('');

  // Otimizar imagem para webp
  const optimizeImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      img.onload = () => {
        // Calcular dimensões mantendo aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = reader.result as string;
                  resolve(base64.split(',')[1]); // Remover data:image/webp;base64,
                };
                reader.readAsDataURL(blob);
              } else {
                reject(new Error('Erro ao otimizar imagem'));
              }
            },
            'image/webp',
            0.8
          );
        } else {
          reject(new Error('Contexto canvas não disponível'));
        }
      };

      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Validar vídeo
  const validateVideo = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      
      video.onloadedmetadata = () => {
        const duration = video.duration;
        const size = file.size;
        
        // Validações: max 20MB e 30 segundos
        const maxSize = 20 * 1024 * 1024; // 20MB
        const maxDuration = 30; // 30 segundos
        
        if (size > maxSize) {
          toast({
            title: "Arquivo muito grande",
            description: "O vídeo deve ter no máximo 20MB.",
            variant: "destructive",
          });
          resolve(false);
          return;
        }
        
        if (duration > maxDuration) {
          toast({
            title: "Vídeo muito longo",
            description: "O vídeo deve ter no máximo 30 segundos.",
            variant: "destructive",
          });
          resolve(false);
          return;
        }
        
        resolve(true);
      };
      
      video.onerror = () => {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo de vídeo válido.",
          variant: "destructive",
        });
        resolve(false);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // Upload para Cloudflare via Edge Function
  const uploadToCloudflare = async (file: File, tipo: string): Promise<string> => {
    try {
      let base64: string;
      let filename: string;

      if (tipo.startsWith('imagem')) {
        // Otimizar imagem
        base64 = await optimizeImage(file);
        filename = `exercicio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.webp`;
      } else {
        // Validar vídeo
        const isValid = await validateVideo(file);
        if (!isValid) throw new Error('Vídeo inválido');

        // Converter vídeo para base64
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array, (byte: number) => String.fromCharCode(byte)).join('');
        base64 = btoa(binaryString);
        
        filename = `exercicio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.mp4`;
      }

      // Buscar token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Sessão expirada');
      }

      // Chamar edge function de upload
      const { data, error } = await supabase.functions.invoke('upload-imagem', {
        body: {
          filename,
          image_base64: base64,
          bucket_type: 'exercicios',
          tipo
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro no upload');

      return data.url;
      
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }
  };

  // Handler para upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUploadType) return;

    setUploading(currentUploadType);

    try {
      const url = await uploadToCloudflare(file, currentUploadType);
      
      onMidiasChange({
        ...midias,
        [currentUploadType]: url
      });

      toast({
        title: "Upload concluído",
        description: "Arquivo enviado com sucesso!",
      });

    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
      setCurrentUploadType('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler para iniciar upload
  const startUpload = (type: string) => {
    setCurrentUploadType(type);
    fileInputRef.current?.click();
  };

  // Handler para remover mídia
  const removeMidia = (type: string) => {
    onMidiasChange({
      ...midias,
      [type]: ''
    });
  };

  // Validar URL do YouTube
  const validateYouTubeURL = (url: string): boolean => {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return regex.test(url);
  };

  const handleYouTubeChange = (url: string) => {
    if (url && !validateYouTubeURL(url)) {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida do YouTube.",
        variant: "destructive",
      });
      return;
    }
    
    onMidiasChange({
      ...midias,
      youtube_url: url
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Imagens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Imagem 1 */}
          <div>
            <Label>Primeira Imagem</Label>
            {midias.imagem_1_url ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Imagem carregada</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(midias.imagem_1_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMidia('imagem_1_url')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => startUpload('imagem_1_url')}
                disabled={uploading === 'imagem_1_url'}
                className="mt-2 w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading === 'imagem_1_url' ? 'Enviando...' : 'Selecionar Imagem'}
              </Button>
            )}
          </div>

          {/* Imagem 2 */}
          <div>
            <Label>Segunda Imagem (opcional)</Label>
            {midias.imagem_2_url ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Imagem carregada</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(midias.imagem_2_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMidia('imagem_2_url')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => startUpload('imagem_2_url')}
                disabled={uploading === 'imagem_2_url'}
                className="mt-2 w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading === 'imagem_2_url' ? 'Enviando...' : 'Selecionar Imagem'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Vídeo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Vídeo (opcional)</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Máximo: 20MB e 30 segundos
            </p>
            {midias.video_url ? (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Vídeo carregado</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(midias.video_url, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMidia('video_url')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => startUpload('video_url')}
                disabled={uploading === 'video_url'}
                className="mt-2 w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading === 'video_url' ? 'Enviando...' : 'Selecionar Vídeo'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5" />
            YouTube
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="youtube_url">Link do YouTube (opcional)</Label>
            <Input
              id="youtube_url"
              type="url"
              value={midias.youtube_url}
              onChange={(e) => handleYouTubeChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="mt-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={currentUploadType?.startsWith('imagem') ? 'image/*' : 'video/mp4'}
        onChange={handleFileUpload}
        className="hidden"
      />
    </>
  );
};