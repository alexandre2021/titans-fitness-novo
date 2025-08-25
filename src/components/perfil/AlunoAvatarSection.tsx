import { useState, useRef } from "react";
import { Camera, User, Palette } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AlunoAvatarSectionProps {
  profile: {
    nome_completo: string;
    avatar_type: string;
    avatar_image_url?: string;
    avatar_letter?: string;
    avatar_color: string;
  };
  onProfileUpdate: () => void;
}

const AVATAR_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
];

// Helper functions for Cloudflare R2 Edge Functions
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const callEdgeFunction = async (functionName: string, payload: Record<string, unknown>) => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas.');
  }
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Erro na função Edge ${functionName}: ${response.statusText}`);
  }
  return response.json();
};

const uploadImageToR2 = async (filename: string, image_base64: string, bucket_type: string) => {
  return callEdgeFunction('upload-imagem', { filename, image_base64, bucket_type });
};

const deleteImageFromR2 = async (filename: string, bucket_type: string) => {
  return callEdgeFunction('delete-image', { filename, bucket_type });
};

export const AlunoAvatarSection = ({ profile, onProfileUpdate }: AlunoAvatarSectionProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // 1. Delete existing image from R2 if it exists
      if (profile.avatar_type === 'image' && profile.avatar_image_url) {
        const oldFilename = profile.avatar_image_url.split('/').pop();
        if (oldFilename) {
          console.log(`Attempting to delete old avatar: ${oldFilename}`);
          const deleteResult = await deleteImageFromR2(oldFilename, 'avatars');
          if (!deleteResult.success) {
            console.warn('Failed to delete old avatar from R2:', deleteResult.error);
            // Continue with upload even if old delete fails, but log it.
          } else {
            console.log('Old avatar deleted successfully from R2.');
          }
        }
      }

      // 2. Convert new image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const image_base64 = base64data.split(',')[1]; // Remove data:image/jpeg;base64, prefix

        const fileExt = file.name.split('.').pop();
        // Use user ID as part of filename to ensure uniqueness and easy identification
        const fileName = `${user.data.user?.id}-${Date.now()}.${fileExt}`; 

        // 3. Upload new image to R2 via Edge Function
        const uploadResult = await uploadImageToR2(fileName, image_base64, 'avatars');

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Erro ao fazer upload da imagem para R2.');
        }

        const newImageUrl = uploadResult.url;

        // 4. Update profile in Supabase
        const { error: updateError } = await supabase
          .from('alunos')
          .update({
            avatar_type: 'image',
            avatar_image_url: newImageUrl
          })
          .eq('id', user.data.user.id);

        if (updateError) throw updateError;

        toast({
          title: "Avatar atualizado",
          description: "Sua foto de perfil foi atualizada com sucesso.",
        });

        onProfileUpdate();
        setIsUploading(false); // Set to false here after all async operations
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast({
          title: "Erro",
          description: "Erro ao ler o arquivo da imagem. Tente novamente.",
          variant: "destructive",
        });
        setIsUploading(false);
      };

    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro",
        description: `Erro ao atualizar avatar: ${error.message}.`,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // Delete image from R2
      if (profile.avatar_type === 'image' && profile.avatar_image_url) {
        const filenameToDelete = profile.avatar_image_url.split('/').pop();
        if (filenameToDelete) {
          const deleteResult = await deleteImageFromR2(filenameToDelete, 'avatars');
          if (!deleteResult.success) {
            console.error('Failed to delete avatar from R2:', deleteResult.error);
            throw new Error(deleteResult.error || 'Erro ao deletar imagem do R2.');
          }
          toast({
            title: "Avatar removido do R2",
            description: "A foto de perfil foi removida do armazenamento.",
          });
        }
      }

      // Update profile in Supabase
      const { error } = await supabase
        .from('alunos')
        .update({
          avatar_type: 'letter',
          avatar_image_url: null
        })
        .eq('id', user.data.user.id);

      if (error) throw error;

      toast({
        title: "Avatar removido",
        description: "Foto de perfil removida com sucesso.",
      });

      onProfileUpdate();
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Erro",
        description: `Erro ao remover avatar: ${error.message}.`,
        variant: "destructive",
      });
    }
  };

  const handleColorChange = async (color: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('alunos')
        .update({ avatar_color: color })
        .eq('id', user.data.user.id);

      if (error) throw error;

      toast({
        title: "Cor atualizada",
        description: "Cor do avatar atualizada com sucesso.",
      });

      onProfileUpdate();
      setShowColorPicker(false);
    } catch (error) {
      console.error('Error updating color:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar cor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getAvatarContent = () => {
    if (profile.avatar_type === 'image' && profile.avatar_image_url) {
      return <AvatarImage src={profile.avatar_image_url} />;
    }
    
    const letter = profile.avatar_letter || profile.nome_completo?.charAt(0) || 'A';
    
    return (
      <AvatarFallback 
        style={{ backgroundColor: profile.avatar_color, color: 'white' }}
        className="text-2xl font-semibold"
      >
        {letter}
      </AvatarFallback>
    );
  };

  return (
    <Card className="p-6 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <Avatar className="h-24 w-24">
            {getAvatarContent()}
          </Avatar>
          
          <div className="absolute -bottom-2 -right-2 flex space-x-1">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 rounded-full p-0">
                  <Camera className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerenciar Avatar</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {isUploading ? "Enviando..." : "Selecionar Nova Foto"}
                    </Button>
                  </div>
                  
                  {profile.avatar_type === 'image' && (
                    <Button variant="outline" onClick={handleRemoveImage} className="w-full">
                      <User className="h-4 w-4 mr-2" />
                      Usar Avatar de Letra
                    </Button>
                  )}
                  
                  {profile.avatar_type === 'letter' && (
                    <Dialog open={showColorPicker} onOpenChange={setShowColorPicker}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Palette className="h-4 w-4 mr-2" />
                          Alterar Cor
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Escolher Cor</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-5 gap-3">
                          {AVATAR_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => handleColorChange(color)}
                              className="h-12 w-12 rounded-full border-2 border-gray-200 hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold">{profile.nome_completo}</h2>
        </div>
      </div>
    </Card>
  );
};