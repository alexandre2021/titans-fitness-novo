import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuLabel,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ArrowLeft, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAlunoProfile } from "@/hooks/useAlunoProfile";
import { toast } from "sonner";

const AlunoMobileHeader = () => {
  const { user, signOut } = useAuth();
  const { profile } = useAlunoProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageConfig = (): { title: React.ReactNode; subtitle?: string; showBackButton: boolean; backPath?: string } => {
    const path = location.pathname;

    // Páginas de Ação (com botão de voltar)
    if (path.startsWith('/execucao-rotina/')) {
      return { title: 'Execução de Treino', subtitle: 'Siga as instruções e registre seu progresso', showBackButton: true };
    }

    // Páginas Principais (sem botão de voltar)
    const mainPages: { [key: string]: { title: string; subtitle?: string } } = {
      "/index-aluno": { title: "Painel", subtitle: `Olá, ${profile?.nome_completo?.split(' ')[0] || 'Aluno(a)'}!` },
      "/minhas-rotinas": { title: "Minhas Rotinas", subtitle: "Acesse e acompanhe seus treinos" },
      "/professores": { title: "Professores", subtitle: "Veja os profissionais que você segue" },
      "/avaliacoes-aluno": { title: "Avaliações", subtitle: "Acompanhe sua evolução física" },
      "/perfil-aluno": { title: "Meu Perfil", subtitle: "Gerencie suas informações e avatar" },
      "/mais": { title: "Mais Opções", subtitle: "Navegue por outras seções" },
    };

    if (mainPages[path]) {
      const page = mainPages[path];
      return { title: page.title, subtitle: page.subtitle, showBackButton: false };
    }

    // Default: Logo (para páginas não mapeadas)
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
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
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
    
    const letter = profile?.avatar_letter || profile?.nome_completo?.charAt(0) || 'A';
    const color = profile?.avatar_color || '#60A5FA';
    
    return (
      <AvatarFallback style={{ backgroundColor: color, color: 'white', fontSize: '1rem', fontWeight: 400 }}>
        {letter}
      </AvatarFallback>
    );
  };

  const { title, subtitle, showBackButton, backPath } = getPageConfig();

  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-4 border-b bg-background md:hidden">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBackButton && (
          <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => (backPath ? navigate(backPath) : navigate(-1))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 truncate">
          <div className="text-lg font-semibold truncate">{title}</div>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-12 w-12 rounded-full">
            <Avatar className="h-12 w-12">
              {getAvatarContent()}
            </Avatar>
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
                    <p className="text-base font-semibold leading-none">{profile.nome_completo || 'Aluno(a)'}</p>
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
            <DropdownMenuItem onClick={() => navigate('/perfil-aluno')}>
              <User className="mr-2 h-5 w-5" />
              <span className="text-base">Meu Perfil</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
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