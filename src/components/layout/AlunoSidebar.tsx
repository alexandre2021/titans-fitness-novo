import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Dumbbell, BarChart3, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const AlunoSidebar = () => {
  const { user, signOut } = useAuth();
  const { profile } = useAlunoProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      title: "Inicial",
      href: "/index-aluno",
      icon: Home,
    },
    {
      title: "Treinos",
      href: "/treinos-aluno",
      icon: Dumbbell,
    },
    {
      title: "Avaliações",
      href: "/avaliacoes-aluno",
      icon: BarChart3,
    },
  ];

  const isActive = (path: string) => location.pathname === path;

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
      <AvatarFallback style={{ backgroundColor: color, color: 'white' }}>
        {letter}
      </AvatarFallback>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Titans Fitness</h2>
        <p className="text-sm text-muted-foreground">Aluno</p>
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
                  {profile?.nome_completo || 'Aluno'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/perfil-aluno')}>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default AlunoSidebar;