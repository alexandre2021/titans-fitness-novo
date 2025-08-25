import { useState, useRef, useEffect } from "react";
import { Camera, User, Palette } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AvatarSectionProps {
  profile: {
    nome_completo: string;
    codigo_pt?: string;
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

// Hook para detectar se é mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Componente responsivo que escolhe entre Modal e Drawer
interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

const ResponsiveModal = ({ open, onOpenChange, title, children }: ResponsiveModalProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

// Botão da câmera responsivo
const CameraButton = ({ onClick }: { onClick?: () => void }) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <button 
        onClick={onClick}
        className="flex items-center justify-center h-8 w-8 rounded-full border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Camera className="h-5 w-5" />
      </button>
    );
  }
  
  return (
    <Button size="sm" variant="outline" className="h-6 w-6 rounded-full p-0" onClick={onClick}>
      <Camera className="h-3 w-3" />
    </Button>
  );
};

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

export const AvatarSection = ({ profile, onProfileUpdate }: AvatarSectionProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
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
          .from('personal_trainers')
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
        .from('personal_trainers')
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
        .from('personal_trainers')
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
    
    const letter = profile.avatar_letter || profile.nome_completo?.charAt(0) || 'PT';
    
    return (
      <AvatarFallback style={{ backgroundColor: profile.avatar_color, color: 'white', fontSize: '1.35rem', fontWeight: 400 }}>
        {letter}
      </AvatarFallback>
    );
  };

  return (
    <Card className="p-4 text-center">
      <div className="flex flex-col items-center space-y-3">
        <div className="relative">
          <Avatar className="h-16 w-16">
            {getAvatarContent()}
          </Avatar>
          <div className="absolute -bottom-1 -right-1 flex space-x-1">
            <CameraButton onClick={() => setShowAvatarModal(true)} />
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold">{profile.nome_completo}</h2>
          {profile.codigo_pt && (
            <p className="text-sm text-muted-foreground">
              Código: {profile.codigo_pt}
            </p>
          )}
        </div>
      </div>

      {/* Modal Responsivo para Gerenciar Avatar */}
      <ResponsiveModal
        open={showAvatarModal}
        onOpenChange={setShowAvatarModal}
        title="Gerenciar Avatar"
      >
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
              className="w-full text-base py-3" 
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-6 w-6 mr-2" />
              {isUploading ? "Enviando..." : "Selecionar Nova Foto"}
            </Button>
          </div>
          
          {profile.avatar_type === 'image' && (
            <Button variant="outline" onClick={handleRemoveImage} className="w-full text-base py-3">
              <User className="h-6 w-6 mr-2" />
              Usar Avatar de Letra
            </Button>
          )}
          
          {profile.avatar_type === 'letter' && (
            <Button variant="outline" onClick={() => setShowColorPicker(true)} className="w-full text-base py-3">
              <Palette className="h-6 w-6 mr-2" />
              Alterar Cor
            </Button>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="text-base py-2"
              onClick={() => setShowAvatarModal(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      {/* Modal Responsivo para Escolher Cor */}
      <ResponsiveModal
        open={showColorPicker}
        onOpenChange={setShowColorPicker}
        title="Escolher Cor"
      >
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

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowColorPicker(false)}
          >
            Cancelar
          </Button>
        </div>
      </ResponsiveModal>
    </Card>
  );
};