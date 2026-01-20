import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Dumbbell, LogOut, User, Settings, BookCopy, SquarePen, Home, Copy, MessageCircle, FileText, LifeBuoy, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenuLabel,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useProfessorProfile } from "@/hooks/useProfessorProfile";

const PTSidebar = () => {
  const ADMIN_EMAIL = 'contato@titans.fitness';

  const { user, signOut } = useAuth();
  const { profile } = useProfessorProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.email === ADMIN_EMAIL;

  const navigationItems = [
    {
      title: "Painel",
      href: "/index-professor",
      icon: LayoutDashboard,
    },
    {
      title: "Alunos",
      href: "/alunos",
      icon: Users,
    },
    {
      title: "Exercícios",
      href: "/exercicios",
      icon: Dumbbell,
    },
    {
      title: "Rotinas",
      href: "/rotinas",
      icon: FileText,
    },
    {
      title: "Modelos",
      href: "/meus-modelos",
      icon: BookCopy,
    },
    {
      title: "Avaliações",
      href: "/avaliacoes",
      icon: BarChart3,
    },
    // Central de Ajuda - apenas para admin (usuários comuns usam o FAB)
    ...(isAdmin ? [{
      title: "Central de Ajuda",
      href: "/app/ajuda",
      icon: LifeBuoy,
    }] : []),
    {
      title: "Home",
      href: "/",
      icon: Home,
    },
  ];

  if (isAdmin) {
    const avaliacoesIndex = navigationItems.findIndex(item => item.href === "/avaliacoes");
    if (avaliacoesIndex !== -1) {
      navigationItems.splice(avaliacoesIndex + 1, 0, {
      title: "Meus Posts",
      href: "/meus-posts",
      icon: SquarePen,
    });
  }
  }

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const handleCopyCode = () => {
    if (profile?.codigo_vinculo) {
      navigator.clipboard.writeText(profile.codigo_vinculo);
      toast.success("Código copiado para a área de transferência!");
    }
  };

  const getAvatarContent = () => {
    if (profile?.avatar_type === 'image' && profile?.avatar_image_url) {
      return <AvatarImage src={profile.avatar_image_url} />;
    }
    
    const letter = profile?.avatar_letter || profile?.nome_completo?.charAt(0) || user?.user_metadata?.full_name?.charAt(0) || 'P';
    const color = profile?.avatar_color || '#3B82F6';
    
    return (
      <AvatarFallback style={{ backgroundColor: color, color: 'white' }}>
        {letter}
      </AvatarFallback>
    );
  };

  return (
    <div className="fixed top-0 left-0 h-screen w-64 flex flex-col bg-card border-r z-30">
      <div className="p-6 border-b">
        <div className="flex justify-center mb-1.5">
          <img 
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png" 
            alt="Titans Fitness" 
            className="w-full h-auto"
          />
        </div>
        <p className="text-sm text-muted-foreground text-center">Professor</p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navigationItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-4 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 p-2">
              <Avatar className="h-8 w-8">
                {getAvatarContent()}
              </Avatar>
              <div className="flex flex-col items-start text-sm">
                <span className="font-medium">
                  {profile?.nome_completo || user?.user_metadata?.full_name || 'Professor(a)'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {profile && 'codigo_vinculo' in profile && profile.codigo_vinculo && (
              <>
                <DropdownMenuLabel className="font-normal p-4 pb-3">
                  <div className="flex flex-col items-center text-center space-y-3">
                    <Avatar className="h-16 w-16 mb-2">
                      {getAvatarContent()}
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-base font-semibold leading-none">{profile.nome_completo || 'Professor(a)'}</p>
                      <p className="text-sm leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="w-full pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Identificação</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="text-base font-mono bg-muted px-3 py-1.5 rounded-md select-all truncate">{profile.codigo_vinculo}</div>
                        <Button variant="outline" size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleCopyCode}><Copy className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-2 bg-neutral-200 dark:bg-neutral-700" />
              </>
            )}
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => navigate('/perfil-pt')} className="py-3">
                <User className="mr-3 h-5 w-5" />
                <span className="text-base font-medium">Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/configuracoes-pt')} className="py-3">
                <Settings className="mr-3 h-5 w-5" />
                <span className="text-base font-medium">Configurações</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 py-3">
              <LogOut className="mr-3 h-5 w-5" />
              <span className="text-base font-medium">Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default PTSidebar;