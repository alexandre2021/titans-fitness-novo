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

export const AvatarSection = ({ profile, onProfileUpdate }: AvatarSectionProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // Estado para forçar refresh do avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // Delete existing image if exists
      if (profile.avatar_image_url) {
        const oldPath = profile.avatar_image_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.data.user.id}/${oldPath}`]);
        }
      }

      // Upload new image
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.data.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('personal_trainers')
        .update({
          avatar_type: 'image',
          avatar_image_url: urlData.publicUrl
        })
        .eq('id', user.data.user.id);

      if (updateError) throw updateError;

      // Force avatar refresh
      setAvatarKey(Date.now());

      toast({
        title: "Avatar atualizado",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });

      onProfileUpdate();
      setShowAvatarModal(false);
      
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar avatar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      // Delete image from storage
      if (profile.avatar_image_url) {
        const oldPath = profile.avatar_image_url.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([`${user.data.user.id}/${oldPath}`]);
        }
      }

      // Update profile
      const { error } = await supabase
        .from('personal_trainers')
        .update({
          avatar_type: 'letter',
          avatar_image_url: null
        })
        .eq('id', user.data.user.id);

      if (error) throw error;

      // Force avatar refresh
      setAvatarKey(Date.now());

      toast({
        title: "Avatar removido",
        description: "Foto de perfil removida com sucesso.",
      });

      onProfileUpdate();
      setShowAvatarModal(false);
      
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover avatar. Tente novamente.",
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
      // Adiciona cache buster apenas para exibição
      const imageUrl = `${profile.avatar_image_url}?v=${avatarKey}`;
      
      return (
        <AvatarImage 
          src={imageUrl}
          key={avatarKey} // Force re-render quando avatarKey muda
          onLoad={() => console.log('Avatar loaded successfully')}
          onError={(e) => {
            console.error('Failed to load avatar:', imageUrl);
            // Fallback para letra se a imagem falhar
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    const letter = profile.avatar_letter || profile.nome_completo?.charAt(0) || 'PT';
    
    return (
      <AvatarFallback 
        style={{ 
          backgroundColor: profile.avatar_color, 
          color: 'white', 
          fontSize: '1.35rem', 
          fontWeight: 400 
        }}
      >
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