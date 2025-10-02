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
import { fileToDataURL, optimizeAndCropImage } from '@/lib/imageUtils';
import Modal from 'react-modal';

const AVATAR_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

interface ImageCropDialogProps {
  imageSrc: string | null;
  isUploading: boolean;
  onClose: () => void;
  onSave: (croppedAreaPixels: Area) => void;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  imageSrc,
  isUploading,
  onClose,
  onSave,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  if (!imageSrc) return null;

  return (
    <Modal
      isOpen={!!imageSrc}
      onRequestClose={onClose}
      shouldCloseOnOverlayClick={!isUploading}
      className="bg-white rounded-lg max-w-md w-full mx-4 outline-none flex flex-col max-h-[90vh]"
      overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Ajustar Imagem</h2>
        <Button variant="ghost" size="icon" onClick={onClose} disabled={isUploading}><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-4 overflow-y-auto">
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
          classes={{ containerClassName: 'bg-white h-64 md:h-80 w-full' }}
          style={{ containerStyle: { backgroundColor: 'white' }, mediaStyle: { backgroundColor: 'white' } }}
        />
        <div className="space-y-2 pt-4">
          <label className="text-sm font-medium">Zoom</label>
          <Slider value={[zoom]} min={1} max={3} step={0.1} onValueChange={(value) => setZoom(value[0])} />
        </div>
      </div>
      <div className="flex justify-end gap-2 p-4 border-t">
        <Button type="button" variant="outline" onClick={onClose} disabled={isUploading}>Cancelar</Button>
        <Button type="button" onClick={() => croppedAreaPixels && onSave(croppedAreaPixels)} disabled={isUploading || !croppedAreaPixels}>
          {isUploading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </Modal>
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataURL(file);
      setImageSrc(dataUrl);
    } catch (error) {
      toast.error('Erro ao processar imagem.');
    }
    e.target.value = ''; // Permite selecionar o mesmo arquivo novamente
  };

  const handleUploadCroppedImage = async (pixels: Area) => {
    if (!imageSrc || !user) return;
    setIsUploading(true);
    try {
      const file = await optimizeAndCropImage(imageSrc, pixels, 256);
      if (!file) throw new Error('Falha ao cortar e otimizar a imagem');
      
      const filePath = `${user.id}/${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

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

      onProfileUpdate();
      setIsColorPickerOpen(false);
    } catch (error) {
      console.error("Erro ao alterar cor:", error);
      toast.error("Erro", { description: "Não foi possível alterar a cor." });
    }
  };

  const letter = profile.avatar_letter || profile.nome_completo?.charAt(0).toUpperCase() || 'P';
  const hasImage = !!profile.avatar_image_url;


  const fileInputId = `avatar-input-${profile.id}`;
  const FileInput = (
    <input
      id={fileInputId}
      type="file"
      accept="image/*"
      onChange={handleFileSelect}
      className="hidden"
    />
  );

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
        {FileInput}
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
              onClick={() => document.getElementById(fileInputId)?.click()}
              className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 border-2 border-background hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => profile.avatar_image_url && setImageSrc(profile.avatar_image_url)}>
              <Crop className="h-4 w-4 mr-2" />
              Ajustar
            </Button>
            <Button variant="outline" size="sm" onClick={handleRemoveImage} className="text-muted-foreground hover:text-destructive">
              <UserIcon className="h-4 w-4 mr-2" />
              Usar Letra
            </Button>
          </div>
        </div>

        <ImageCropDialog
          imageSrc={imageSrc}
          isUploading={isUploading}
          onClose={() => setImageSrc(null)}
          onSave={handleUploadCroppedImage}
        />
        
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
        onClick={() => document.getElementById(fileInputId)?.click()}
        disabled={isUploading}
        className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 border-2 border-background hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </button>
    </div>
  );

  const ColorPickerDialog = (
    <Modal
      isOpen={isColorPickerOpen}
      onRequestClose={() => setIsColorPickerOpen(false)}
      shouldCloseOnOverlayClick={true}
      className="bg-white rounded-lg max-w-xs w-full mx-4 outline-none"
      overlayClassName="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Escolher Cor</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsColorPickerOpen(false)}><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-4">
          {ColorPickerContent}
      </div>
    </Modal>
  );

  return (
    <>
      {FileInput}
      <div className="flex flex-col items-center gap-4 mx-auto">
        {AvatarWithLetter}
        <Button variant="outline" size="sm" onClick={() => setIsColorPickerOpen(true)}>
          <Palette className="h-4 w-4 mr-2" />
          Alterar Cor
        </Button>
      </div>

      {ColorPickerDialog}

      <ImageCropDialog
        imageSrc={imageSrc}
        isUploading={isUploading}
        onClose={() => setImageSrc(null)}
        onSave={handleUploadCroppedImage}
      />
    </>
  );
};
