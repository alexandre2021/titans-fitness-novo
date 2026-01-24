// src/components/layout/ProtectedRoutes.tsx
import { useState, useEffect, Suspense, lazy } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMediaQuery } from "@/hooks/use-media-query";

// Import all layout components
import AlunoSidebar from "./AlunoSidebar";
import PTSidebar from "./PTSidebar";
import AlunoMobileHeader from "./AlunoMobileHeader";
import PTMobileHeader from "./PTMobileHeader";
import AlunoBottomNav from "./AlunoBottomNav";
import PTBottomNav from "./PTBottomNav";

// Lazy load message, help and feedback components for better performance
const MessagesDrawer = lazy(() => import('@/components/messages/MessageDrawer'));
const MessagesButton = lazy(() => import('@/components/messages/MessageButton'));
const HelpDrawer = lazy(() => import('@/components/help/HelpDrawer'));
const HelpButton = lazy(() => import('@/components/help/HelpButton'));
const HelpSpotlight = lazy(() => import('@/components/help/HelpSpotlight'));
const FeedbackButton = lazy(() => import('@/components/feedback/FeedbackButton'));
const FeedbackModal = lazy(() => import('@/components/feedback/FeedbackModal'));

const ProtectedRoutes = () => {
  const { user, loading: authLoading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isMessagesDrawerOpen, setMessagesDrawerOpen] = useState(false);
  const [isHelpDrawerOpen, setHelpDrawerOpen] = useState(false);
  const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleDrawerClose = () => {
    setMessagesDrawerOpen(false);
  };

  // Listener para abrir drawer quando notificação é clicada
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'OPEN_MESSAGES_DRAWER') {
        console.log('📬 Abrindo drawer de mensagens via notificação');
        setMessagesDrawerOpen(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // Detecta se veio de notificação via URL e abre o drawer após login
  useEffect(() => {
    if (!authLoading && user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('openMessages') === 'true') {
        console.log('📬 Abrindo drawer - usuário veio de notificação');
        setMessagesDrawerOpen(true);
        // Remove o parâmetro da URL
        params.delete('openMessages');
        const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [authLoading, user]);

  useEffect(() => {
    const determineUserType = async () => {
      if (authLoading) {
        return;
      }
      if (!user) {
        setLoading(false);
        return;
      }

      // ✅ CORREÇÃO: Se o usuário foi deslogado (por exemplo, sessão expirou),
      // interrompe a execução para evitar redirecionamentos incorretos.
      if (!user) {
        setLoading(false);
        return;
      }
      let type = user.user_metadata?.user_type;

      if (!type) {
        console.warn('Tipo de usuário não encontrado nos metadados. Buscando no banco de dados como fallback.');
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
          
          type = profile?.user_type;

          if (!type) {
            console.warn('Tipo de usuário não encontrado no banco de dados. Forçando atualização da sessão.');
            const { data: { session } } = await supabase.auth.refreshSession();
            type = session?.user?.user_metadata?.user_type;
          }
        } catch (error) {
          console.error("Erro ao buscar perfil de usuário ou atualizar sessão:", error);
        }
      }
      
      setUserType(type || null);
      setLoading(false);
    };

    determineUserType();
  }, [user, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isFocusedMode =
    location.pathname.startsWith('/rotinas-criar/') ||
    location.pathname.startsWith('/execucao-rotina/executar-treino/');

  let Sidebar, MobileHeader, BottomNav;

  switch (userType) {
    case 'aluno':
      Sidebar = AlunoSidebar;
      MobileHeader = AlunoMobileHeader;
      BottomNav = AlunoBottomNav;
      break;
    case 'professor':
      Sidebar = PTSidebar;
      MobileHeader = PTMobileHeader;
      BottomNav = PTBottomNav;
      break;
    default:
      return <Outlet />;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {!isFocusedMode && (
          <>
            <MobileHeader />
            <Suspense fallback={null}>
              <MessagesButton
                onClick={() => setMessagesDrawerOpen(true)}
                unreadCount={unreadCount}
              />
              <MessagesDrawer
                isOpen={isMessagesDrawerOpen}
                onClose={handleDrawerClose}
                direction="left"
                onUnreadCountChange={setUnreadCount}
              />
              <HelpButton
                onClick={() => setHelpDrawerOpen(true)}
              />
              <HelpDrawer
                isOpen={isHelpDrawerOpen}
                onClose={() => setHelpDrawerOpen(false)}
                direction="left"
              />
              <HelpSpotlight />
              <FeedbackButton
                onClick={() => setFeedbackModalOpen(true)}
              />
              <FeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setFeedbackModalOpen(false)}
              />
            </Suspense>
          </>
        )}
        <main className={`p-4 ${isFocusedMode ? 'pt-6' : 'pt-20 pb-16'}`}>
          <Outlet />
        </main>
        {!isFocusedMode && <BottomNav />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isFocusedMode && (
        <>
          <Sidebar />
          <Suspense fallback={null}>
            <MessagesButton
              onClick={() => setMessagesDrawerOpen(true)}
              unreadCount={unreadCount}
            />
            <MessagesDrawer
              isOpen={isMessagesDrawerOpen}
              onClose={handleDrawerClose}
              direction="right"
              onUnreadCountChange={setUnreadCount}
            />
            <HelpButton
              onClick={() => setHelpDrawerOpen(true)}
            />
            <HelpDrawer
              isOpen={isHelpDrawerOpen}
              onClose={() => setHelpDrawerOpen(false)}
              direction="right"
            />
            <HelpSpotlight />
            <FeedbackButton
              onClick={() => setFeedbackModalOpen(true)}
            />
            <FeedbackModal
              isOpen={isFeedbackModalOpen}
              onClose={() => setFeedbackModalOpen(false)}
            />
          </Suspense>
        </>
      )}
      <main className={`flex-1 p-6 ${!isFocusedMode ? 'pl-72' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedRoutes;