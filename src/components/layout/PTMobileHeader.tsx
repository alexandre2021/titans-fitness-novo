import { useState } from "react";
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
import { LogOut, User, Settings, ArrowLeft, Copy, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfessorProfile } from "@/hooks/useProfessorProfile";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const PTMobileHeader = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfessorProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [showRotinaStatusInfo, setShowRotinaStatusInfo] = useState(false);
  const [showAlunoStatusInfo, setShowAlunoStatusInfo] = useState(false);

  const getPageConfig = (): { 
    title: React.ReactNode; 
    subtitle?: string; 
    showBackButton: boolean; 
    backPath?: string;
    showInfoButton?: boolean; } => {
    const path = location.pathname;

    // Páginas de Ação (com botão de voltar)
    if (path.startsWith('/exercicios/novo')) return { title: 'Novo Exercício', showBackButton: true };
    if (path.startsWith('/exercicios/editar')) return { title: 'Editar Exercício', showBackButton: true };
    if (path.startsWith('/exercicios/copia')) return { title: 'Copiar Exercício', showBackButton: true };
    if (path.startsWith('/exercicios/detalhes')) return { title: 'Detalhes do Exercício', showBackButton: true };
    
    // Páginas de Rotina com botão de info
    if (path.startsWith('/rotinas')) return { title: 'Rotinas', subtitle: "Gerencie as rotinas de todos os seus alunos", showBackButton: false, showInfoButton: true };
    
    // Página de Alunos com botão de info
    if (path.startsWith('/alunos')) return { title: 'Alunos', subtitle: "Gerencie seus alunos e acompanhe seu progresso", showBackButton: false, showInfoButton: true };

    // Regex para /alunos-rotinas/{uuid}/{uuid} (página de detalhes)
    if (/^\/alunos-rotinas\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-]+\/?$/.test(path)) {
      return { title: 'Detalhes da Rotina', showBackButton: true };
    }

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
      "/exercicios": { title: "Exercícios", subtitle: "Gerencie seus exercícios padrão e personalizados" },
      "/avaliacoes": { title: "Avaliações", subtitle: "Acompanhe o histórico de avaliações" },
      "/meus-modelos": { title: "Meus Modelos", subtitle: "Gerencie seus modelos de rotina" },
      "/meus-posts": { title: "Meus Posts", subtitle: "Gerencie todos os seus artigos e publicações" },
      "/mais": { title: "Mais Opções", subtitle: "Navegue por outras seções e configurações" },
      "/agenda-pt": { title: "Agenda" },
      "/app/ajuda": { title: "Central de Ajuda", subtitle: "Encontre respostas para suas dúvidas" },
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

  const { title, subtitle, showBackButton, backPath, showInfoButton } = getPageConfig();

  return (
    <header className="fixed top-0 left-0 right-0 z-20 h-20 flex items-center justify-between px-4 border-b shadow-sm bg-gray-50/80 backdrop-blur-sm md:hidden">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {showBackButton && (
          <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={() => (backPath ? navigate(backPath) : navigate(-1))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="flex-1 truncate">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold truncate">{title}</div>
            {showInfoButton && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (location.pathname.startsWith('/rotinas')) setShowRotinaStatusInfo(true);
                  if (location.pathname.startsWith('/alunos')) setShowAlunoStatusInfo(true);
                }}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground flex-shrink-0"
              >
                <Info className="h-4 w-4" />
              </Button>
            )}
          </div>
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

      {/* Modal de Informações sobre Status das Rotinas */}
      <AlertDialog open={showRotinaStatusInfo} onOpenChange={setShowRotinaStatusInfo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Situação das Rotinas</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-blue-800 mb-1">Rascunho</p>
                <p className="text-sm text-muted-foreground">
                  Rotina em processo de criação pelo professor, ainda não finalizada.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-green-800 mb-1">Ativa</p>
                <p className="text-sm text-muted-foreground">
                  Aluno pode acessar e executar os treinos normalmente.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-red-800 mb-1">Bloqueada</p>
                <p className="text-sm text-muted-foreground">
                  Acesso aos treinos foi suspenso temporariamente pelo professor.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-gray-800 mb-1">Encerrada</p>
                <p className="text-sm text-muted-foreground">
                  Rotina concluída ou cancelada, movida para o histórico do aluno.
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Informações sobre Status dos Alunos */}
      <AlertDialog open={showAlunoStatusInfo} onOpenChange={setShowAlunoStatusInfo}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Situação dos Alunos</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-green-800 mb-1">Ativo</p>
                <p className="text-sm text-muted-foreground">
                  O aluno completou o cadastro inicial (onboarding) e está pronto para receber rotinas e avaliações.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 flex-shrink-0"></div>
              <div>
                <p className="font-medium text-yellow-800 mb-1">Pendente</p>
                <p className="text-sm text-muted-foreground">
                  O aluno se cadastrou na plataforma, mas ainda não finalizou a configuração inicial do seu perfil.
                </p>
              </div>
            </div>
          </div>
          <AlertDialogFooter><AlertDialogCancel>Fechar</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
};

export default PTMobileHeader;