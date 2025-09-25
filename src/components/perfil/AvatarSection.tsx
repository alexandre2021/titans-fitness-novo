// src/components/perfil/AvatarSection.tsx

import React, { useState, useCallback } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Crop, Loader2, Palette, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Slider } from "@/components/ui/slider";
import { Button } from '@/components/ui/button';
import { optimizeAndCropImage, resizeAndOptimizeImage } from '@/lib/imageUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';

const AVATAR_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

interface ImageCropDialogProps {
  imageSrc: string | null;
  isUploading: boolean;
  onClose: () => void;
  onSave: () => void;
  setCroppedAreaPixels: (pixels: Area | null) => void;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  imageSrc,
  isUploading,
  onClose,
  onSave,
  setCroppedAreaPixels,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [setCroppedAreaPixels]
  );

  if (!imageSrc) return null;

  const Content = (
    <div className="p-4">
      <div className="relative h-64 w-full bg-muted" data-vaul-no-drag>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          cropShape="round"
          showGrid={false}
        />
      </div>
      <div className="space-y-2 p-4">
        <label className="text-sm font-medium">Zoom</label>
        <Slider
          value={[zoom]}
          min={1}
          max={3}
          step={0.1}
          onValueChange={(value) => setZoom(value[0])}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={!!imageSrc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajustar Imagem</DialogTitle>
        </DialogHeader>
        {Content}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={onSave} disabled={isUploading}>
            {isUploading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface AvatarSectionProps {
  profile: {
    id: string;
    nome_completo?: string | null;
    avatar_type?: string | null;
    avatar_image_url?: string | null;
    avatar_letter?: string | null;
    avatar_color?: string | null;
  } | null;
  onProfileUpdate: () => void;
  userType: 'professor' | 'aluno';
}

export const AvatarSection: React.FC<AvatarSectionProps> = ({ profile, onProfileUpdate, userType }) => {
  const tableName = userType === 'professor' ? 'professores' : 'alunos'; // Corrigido para usar a tabela correta
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Defensive check for when userProfile is still loading
  if (!profile) {
    return (
      <div className="relative w-24 h-24 mx-auto">
        <div className="w-full h-full bg-muted rounded-full animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
      </div>
    );
  }

  const handleImageUpload = async (file: File) => {
    if (!user) return;

    setIsUploading(true);
    try {
      // Otimiza a imagem para um tamanho razoável antes de enviar
      const optimizedFile = await resizeAndOptimizeImage(file, 512);
      if (!optimizedFile) throw new Error('Falha ao otimizar a imagem');

      const filePath = `${user.id}/${optimizedFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, optimizedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const finalUrl = `${publicUrl}?t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from(tableName)
        .update({ avatar_type: 'image', avatar_image_url: finalUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await supabase.auth.updateUser({ data: { avatar_url: finalUrl } });

      onProfileUpdate();
      toast.success("Nova foto de perfil enviada!");
    } catch (error) {
      console.error("Erro ao enviar nova foto:", error);
      toast.error("Erro", { description: "Não foi possível enviar a nova foto." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'user'; // Prioriza a câmera no mobile

    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        await handleImageUpload(file);
      }
    };

    input.click();
  };

  const handleUploadCroppedImage = async () => {
    if (!imageSrc || !croppedAreaPixels || !user) return;
    setIsUploading(true);
    try {
      // Usa a função otimizada do nosso utilitário, definindo uma largura máxima de 256px para avatares.
      const file = await optimizeAndCropImage(imageSrc, croppedAreaPixels, 256);
      if (!file) throw new Error('Falha ao cortar e otimizar a imagem');
      
      const filePath = `${user.id}/${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      const finalUrl = `${publicUrl}?t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          avatar_type: 'image',
          avatar_image_url: finalUrl,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 5. Atualizar user_metadata no Supabase Auth para propagar a mudança globalmente
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: finalUrl 
        }
      });

      if (userUpdateError) {
        console.error("Erro ao atualizar metadados do usuário no Auth:", userUpdateError);
      }

      onProfileUpdate();
      toast.success("Avatar atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      toast.error("Erro", { description: "Não foi possível atualizar seu avatar." });
    } finally {
      setIsUploading(false);
      setImageSrc(null);
    }
  };

  const handleRemoveImage = async () => {
    if (!user || !profile?.avatar_image_url) return;
    try {
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ avatar_type: 'letter', avatar_image_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Atualizar user_metadata no Supabase Auth para propagar a mudança
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      if (userUpdateError) {
        console.error("Erro ao remover metadados do usuário no Auth:", userUpdateError);
      }

      const url = new URL(profile.avatar_image_url);
      const path = url.pathname.split('/avatars/')[1];
      if (path) {
        await supabase.storage.from('avatars').remove([path]);
      }

      toast.success("Foto removida", { description: "Seu avatar de letra foi restaurado." });
      onProfileUpdate();
    } catch (error) {
      console.error("Erro ao remover imagem:", error);
      toast.error("Erro", { description: "Não foi possível remover sua foto." });
    }
  };

  const handleColorChange = async (color: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ avatar_color: color })
        .eq('id', user.id);

      if (error) throw error;

      toast.success("Cor atualizada", { description: "A cor do seu avatar foi alterada." });
      onProfileUpdate();
      setIsColorPickerOpen(false);
    } catch (error) {
      console.error("Erro ao alterar cor:", error);
      toast.error("Erro", { description: "Não foi possível alterar a cor." });
    }
  };

  const letter = profile.avatar_letter || profile.nome_completo?.charAt(0).toUpperCase() || 'P';
  const hasImage = !!profile.avatar_image_url;


  const ColorPickerContent = (
    <div className="grid grid-cols-5 gap-3 p-4 sm:py-4">
      {AVATAR_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => handleColorChange(color)}
          className="h-12 w-12 rounded-full border-2 border-transparent hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );

  // --- CENÁRIO 1: AVATAR COM IMAGEM ---
  if (hasImage) {
    return (
      <>
        <div className="flex flex-col items-center gap-4 mx-auto">
          <div className="relative w-24 h-24">
            <Avatar className="w-full h-full text-4xl border-2 border-background">
              <AvatarImage src={profile.avatar_image_url!} alt="Avatar do Usuário" />
              <AvatarFallback style={{ backgroundColor: profile.avatar_color || '#3B82F6' }} className="text-white font-semibold">
                {letter}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleFileSelect}
              className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 border-2 border-background hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleRemoveImage}>
            <UserIcon className="h-4 w-4 mr-2" />
            Usar Avatar
          </Button>
          <div className="flex flex-wrap justify-center items-center gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={handleFileSelect} disabled={isUploading}>
              <Camera className="h-4 w-4 mr-2" />
              Nova Foto
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImageSrc(profile.avatar_image_url)}>
              <Crop className="h-4 w-4 mr-2" />
              Ajustar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRemoveImage} className="text-muted-foreground hover:text-destructive">
              <UserIcon className="h-4 w-4 mr-2" />
              Letra
            </Button>
          </div>
        </div>
        
      </>
    );
  }

  // --- CENÁRIO 2: AVATAR DE LETRA ---
  const AvatarWithLetter = (
    <div className="relative w-24 h-24">
      <Avatar className="w-full h-full text-4xl border-2 border-background">
        <AvatarFallback style={{ backgroundColor: profile.avatar_color || '#3B82F6' }} className="text-white font-semibold">
          {letter}
        </AvatarFallback>
      </Avatar>
      <button
        type="button"
        onClick={handleFileSelect}
        disabled={isUploading}
        className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 border-2 border-background hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </button>
    </div>
  );

  return (
    <>
      <div className="flex flex-col items-center gap-4 mx-auto">
        {AvatarWithLetter}
        <Button variant="outline" size="sm" onClick={() => setIsColorPickerOpen(true)}>
          <Palette className="h-4 w-4 mr-2" />
          Alterar Cor
        </Button>
      </div>

      <Dialog open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Escolher Cor</DialogTitle>
          </DialogHeader>
          {ColorPickerContent}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Fechar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageCropDialog
        imageSrc={imageSrc}
        isUploading={isUploading}
        onClose={() => setImageSrc(null)}
        onSave={handleUploadCroppedImage}
        setCroppedAreaPixels={setCroppedAreaPixels}
      />
    </>
  );
};
