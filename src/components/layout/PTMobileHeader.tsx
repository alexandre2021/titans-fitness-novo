import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type PTProfile = Tables<'personal_trainers'>;

const PTMobileHeader = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PTProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.from('personal_trainers').select('*').eq('id', user.id).single();
        if (error) throw error;
        setProfile(data);
      } catch (error) {
        console.error("Erro ao buscar perfil do PT no header mobile:", error);
      }
    };
    if (user) fetchProfile();
  }, [user]);

  const getPageTitle = (): React.ReactNode => {
    switch (location.pathname) {
      case "/index-pt":
        return "Inicial";
      case "/alunos-pt":
        return "Alunos";
      case "/exercicios-pt":
        return "Exercícios";
      case "/agenda-pt":
        return "Agenda";
      case "/mensagens-pt":
        return "Mensagens";
      case "/perfil-pt":
        return "Meu Perfil";
      case "/configuracoes-pt":
        return "Configurações";
      default:
        return (
          <img 
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-logo-mobile.png" 
            alt="Titans Fitness"
            className="h-12"
          />
        );
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getAvatarContent = () => {
    if (profile?.avatar_type === 'image' && profile?.avatar_image_url) {
      return <AvatarImage src={profile.avatar_image_url} />;
    }
    
    const letter = profile?.avatar_letter || profile?.nome_completo?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || 'P';
    const color = profile?.avatar_color || '#3B82F6';
    
    return (
      <AvatarFallback style={{ backgroundColor: color, color: 'white', fontSize: '1rem', fontWeight: 400 }}>
        {letter}
      </AvatarFallback>
    );
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background md:hidden">
      <div className="text-lg font-semibold">{getPageTitle()}</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-12 w-12 rounded-full">
            <Avatar className="h-12 w-12">
              {getAvatarContent()}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate('/perfil-pt')}>
            <User className="mr-2 h-5 w-5" />
            <span className="text-base">Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/configuracoes-pt')}>
            <Settings className="mr-2 h-5 w-5" />
            <span className="text-base">Configurações</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600">
            <LogOut className="mr-2 h-5 w-5" />
            <span className="text-base">Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default PTMobileHeader;