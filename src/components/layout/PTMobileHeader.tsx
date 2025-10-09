import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, ArrowLeft, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfessorProfile } from "@/hooks/useProfessorProfile";
import { toast } from "sonner";

const PTMobileHeader = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfessorProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const getPageConfig = (): { title: React.ReactNode; subtitle?: string; showBackButton: boolean; backPath?: string } => {
    const path = location.pathname;

    // Páginas de Ação (com botão de voltar)
    if (path.startsWith('/exercicios-pt/novo')) return { title: 'Novo Exercício', showBackButton: true };
    if (path.startsWith('/exercicios-pt/editar')) return { title: 'Editar Exercício', showBackButton: true };
    if (path.startsWith('/exercicios-pt/copia')) return { title: 'Copiar Exercício', showBackButton: true };
    if (path.startsWith('/exercicios-pt/detalhes')) return { title: 'Detalhes do Exercício', showBackButton: true };
    if (path.startsWith('/alunos-rotinas/')) return { title: 'Rotinas do Aluno', showBackButton: true };

    // ✅ Lógica específica para Avaliações (mais específicas primeiro)
    if (path.includes('/nova') && path.startsWith('/alunos-avaliacoes/')) {
      return { title: 'Nova Avaliação', showBackButton: true };
    }
    // Regex para /alunos-avaliacoes/{uuid}/{uuid} (página de detalhes)
    if (/^\/alunos-avaliacoes\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\/?$/.test(path)) {
      return { title: 'Detalhes da Avaliação', showBackButton: true };
    }
    if (path.startsWith('/alunos-avaliacoes/')) {
      return { title: 'Avaliações do Aluno', showBackButton: true, backPath: '/alunos' };
    }

    // ✅ Lógica mais específica para a página do PAR-Q
    if (path.startsWith('/alunos-parq/')) {
      return { title: 'PAR-Q do Aluno', showBackButton: true, backPath: '/alunos' };
    }

    // ✅ Adicionando lógica para os posts
    if (path.startsWith('/posts/novo')) return { title: 'Novo Post', showBackButton: true };
    if (path.startsWith('/posts/editar/')) return { title: 'Editar Post', showBackButton: true };
    
    if (path.startsWith('/detalhes-aluno/')) return { title: 'Detalhes do Aluno', showBackButton: true };
    if (path.startsWith('/convite-aluno')) return { title: 'Convidar Aluno', showBackButton: true };
    if (path.startsWith('/rotinas-criar/')) return { title: 'Criar Rotina', showBackButton: true };
    if (path.startsWith('/selecionar-modelo')) return { title: 'Selecionar Modelo', showBackButton: true };
    if (path.startsWith('/execucao-rotina/')) return { title: 'Execução de Treino', showBackButton: true };

    // ✅ Adicionando rota do Calendário
    if (path.startsWith('/calendario')) return { title: 'Agenda', showBackButton: true };

    // Páginas Principais (sem botão de voltar)
    const mainPages: { [key: string]: { title: string; subtitle?: string } } = {
      "/index-professor": { title: "Painel", subtitle: `Bem-vindo, ${profile?.nome_completo?.split(' ')[0] || 'Professor(a)'}!` },
      "/alunos": { title: "Alunos", subtitle: "Gerencie seus alunos e acompanhe seu progresso" },
      "/exercicios-pt": { title: "Exercícios", subtitle: "Gerencie seus exercícios padrão e personalizados" },
      "/meus-modelos": { title: "Meus Modelos", subtitle: "Gerencie seus modelos de rotina" },
      "/mais": { title: "Mais Opções", subtitle: "Navegue por outras seções e configurações" },
      "/agenda-pt": { title: "Agenda" },
      "/mensagens-pt": { title: "Mensagens" },
      "/perfil-pt": { title: "Meu Perfil" },
      "/configuracoes-pt": { title: "Configurações" },
    };

    if (mainPages[path]) {
      const page = mainPages[path];
      return { title: page.title, subtitle: page.subtitle, showBackButton: false };
    }

    // Default: Logo (para páginas não mapeadas ou a raiz do PT)
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
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
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
            <DropdownMenuItem onClick={() => navigate('/perfil-pt')}>
              <User className="mr-2 h-5 w-5" />
              <span className="text-base">Meu Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes-pt')}>
              <Settings className="mr-2 h-5 w-5" />
              <span className="text-base">Configurações</span>
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

export default PTMobileHeader;