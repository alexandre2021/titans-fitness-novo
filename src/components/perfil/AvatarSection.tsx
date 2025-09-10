// src/components/perfil/AvatarSection.tsx

import React, { useRef, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// NOTA: Assumindo que existe uma função para processar imagens.
// Se não existir, ela precisaria ser criada, similar à lógica de upload de exercícios.
const processImage = async (file: File, options: { width: number, height: number, quality: number }): Promise<Blob> => {
  // Lógica de redimensionamento e compressão aqui.
  // Por enquanto, retornamos o próprio arquivo como um Blob.
  console.log("Processando imagem (simulação)...", options);
  return new Promise((resolve) => resolve(file));
};

interface AvatarSectionProps {
  userProfile: {
    id: string;
    nome_completo: string | null;
    avatar_type: string | null;
    avatar_image_url: string | null;
    avatar_letter: string | null;
    avatar_color: string | null;
  } | null;
  onProfileUpdate: () => void;
}

export const AvatarSection: React.FC<AvatarSectionProps> = ({ userProfile, onProfileUpdate }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Defensive check for when userProfile is still loading
  if (!userProfile) {
    return (
      <div className="relative w-24 h-24 mx-auto">
        <div className="w-full h-full bg-muted rounded-full animate-pulse" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
      </div>
    );
  }

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // 1. Processar a imagem (redimensionar e comprimir)
      const processedBlob = await processImage(file, { width: 400, height: 400, quality: 0.8 });
      const processedFile = new File([processedBlob], `avatar_${user.id}.webp`, { type: 'image/webp' });

      // 2. Fazer upload para o Supabase Storage
      const filePath = `public/${user.id}/${processedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, processedFile, {
          cacheControl: '3600',
          upsert: true, // Sobrescreve a foto anterior com o mesmo nome
        });

      if (uploadError) throw uploadError;

      // 3. Obter a URL pública (com timestamp para evitar cache)
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath, {
          transform: {
            // Adiciona um timestamp para forçar a atualização do cache
            width: 400,
            height: 400,
          },
        });
      const finalUrl = `${publicUrl}?t=${new Date().getTime()}`;

      // 4. Atualizar o perfil do usuário no banco de dados
      const { error: updateError } = await supabase
        .from('personal_trainers')
        .update({
          avatar_type: 'image',
          avatar_image_url: finalUrl,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // 5. Notificar o componente pai para refazer o fetch dos dados
      onProfileUpdate();

      toast({ title: "Avatar atualizado com sucesso!" });

    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar seu avatar.", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const letter = userProfile.avatar_letter || userProfile.nome_completo?.charAt(0).toUpperCase() || 'P';

  return (
    <div className="relative w-24 h-24 mx-auto">
      <Avatar className="w-full h-full text-4xl border-2 border-background">
        {userProfile.avatar_type === 'image' && userProfile.avatar_image_url ? (
          <AvatarImage src={userProfile.avatar_image_url} alt="Avatar" />
        ) : (
          <AvatarFallback style={{ backgroundColor: userProfile.avatar_color || '#3B82F6' }} className="text-white font-semibold">
            {letter}
          </AvatarFallback>
        )}
      </Avatar>

      <button onClick={handleAvatarClick} disabled={isUploading} className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-2 border-2 border-background hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
        {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
      </button>

      <input type="file" accept="image/*" capture="user" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
    </div>
  );
};

export default AvatarSection;