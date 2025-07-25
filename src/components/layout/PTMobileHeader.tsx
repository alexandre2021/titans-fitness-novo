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
import { usePTProfile } from "@/hooks/usePTProfile";

const PTMobileHeader = () => {
  const { user, signOut } = useAuth();
  const { profile } = usePTProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
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
        return "Titans Fitness";
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
    
    const letter = profile?.avatar_letter || profile?.nome_completo?.charAt(0) || 'PT';
    const color = profile?.avatar_color || '#3B82F6';
    
    return (
      <AvatarFallback style={{ backgroundColor: color, color: 'white' }}>
        {letter}
      </AvatarFallback>
    );
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-background md:hidden">
      <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              {getAvatarContent()}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate('/perfil-pt')}>
            <User className="mr-2 h-4 w-4" />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/configuracoes-pt')}>
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default PTMobileHeader;