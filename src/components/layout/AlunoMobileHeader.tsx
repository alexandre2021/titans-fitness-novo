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
import { LogOut, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";

const AlunoMobileHeader = () => {
  const { user, signOut } = useAuth();
  const { profile } = useAlunoProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageConfig = (): { title: React.ReactNode; showBackButton: boolean; backPath?: string } => {
    const path = location.pathname;

    // Páginas de Ação (com botão de voltar)
    if (path.startsWith('/execucao-rotina/')) {
      return { title: 'Execução de Treino', showBackButton: true };
    }

    // Páginas Principais (sem botão de voltar)
    switch (path) {
      case "/index-aluno":
        return { title: "Painel", showBackButton: false };
      case "/minhas-rotinas":
        return { title: "Minhas Rotinas", showBackButton: false };
      case "/avaliacoes-aluno":
        return { title: "Minhas Avaliações", showBackButton: false };
      case "/perfil-aluno":
        return { title: "Meu Perfil", showBackButton: false };
      default:
        return {
          title: (
            <img 
              src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-logo-mobile.png" 
              alt="Titans Fitness"
              className="h-12"
            />
          ),
          showBackButton: false
        };
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
    
    const letter = profile?.avatar_letter || profile?.nome_completo?.charAt(0) || 'A';
    const color = profile?.avatar_color || '#60A5FA';
    
    return (
      <AvatarFallback style={{ backgroundColor: color, color: 'white', fontSize: '1rem', fontWeight: 400 }}>
        {letter}
      </AvatarFallback>
    );
  };

  const { title, showBackButton, backPath } = getPageConfig();

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-4 border-b bg-background md:hidden">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBackButton && (
          <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => (backPath ? navigate(backPath) : navigate(-1))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="text-lg font-semibold truncate">{title}</div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-12 w-12 rounded-full">
            <Avatar className="h-12 w-12">
              {getAvatarContent()}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate('/perfil-aluno')}>
            <User className="mr-2 h-5 w-5" />
            <span className="text-base">Perfil</span>
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

export default AlunoMobileHeader;