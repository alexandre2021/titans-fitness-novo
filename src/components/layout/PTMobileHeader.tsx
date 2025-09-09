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
import { LogOut, User, Settings, ArrowLeft } from "lucide-react";
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

  const getPageConfig = (): { title: React.ReactNode; showBackButton: boolean; backPath?: string } => {
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
    if (/^\/alunos-par-q\/[a-zA-Z0-9-]+\/?$/.test(path)) {
      return { title: 'PAR-Q do Aluno', showBackButton: true, backPath: '/alunos' };
    }
    
    if (path.startsWith('/detalhes-aluno/')) return { title: 'Detalhes do Aluno', showBackButton: true };
    if (path.startsWith('/convite-aluno')) return { title: 'Convidar Aluno', showBackButton: true };
    if (path.startsWith('/rotinas-criar/')) return { title: 'Criar Rotina', showBackButton: true };
    if (path.startsWith('/execucao-rotina/')) return { title: 'Execução de Treino', showBackButton: true };

    // Páginas Principais (sem botão de voltar)
    const mainPages: { [key: string]: string } = {
      "/index-pt": "Inicial",
      "/alunos": "Alunos",
      "/exercicios-pt": "Exercícios",
      "/agenda-pt": "Agenda",
      "/mensagens-pt": "Mensagens",
      "/perfil-pt": "Meu Perfil",
      "/configuracoes-pt": "Configurações",
    };

    if (mainPages[path]) {
      return { title: mainPages[path], showBackButton: false };
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