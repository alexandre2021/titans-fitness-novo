// src/components/layout/ProtectedRoutes.tsx
import React, { useState, useEffect, Suspense, lazy } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMediaQuery } from '@/hooks/use-media-query';

// Import all layout components
import AlunoSidebar from "./AlunoSidebar";
import PTSidebar from "./PTSidebar";
import AlunoMobileHeader from "./AlunoMobileHeader";
import PTMobileHeader from "./PTMobileHeader";
import AlunoBottomNav from "./AlunoBottomNav";
import PTBottomNav from "./PTBottomNav";

// Lazy load message components for better performance
const MessagesDrawer = lazy(() => import('@/components/messages/MessageDrawer'));
const MessagesButton = lazy(() => import('@/components/messages/MessageButton'));

const ProtectedRoutes = () => {
  const { user, loading: authLoading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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

  const isFocusedMode = 
    location.pathname.startsWith('/rotinas-criar/') || 
    location.pathname.startsWith('/execucao-rotina/executar-treino/');

  const isMaisPage = location.pathname === '/mais';

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
        {!isFocusedMode && <MobileHeader />}
        <main className={`p-4 ${isFocusedMode ? 'pt-6' : 'pt-24 pb-16'}`}>
          <Outlet />
        </main>
        {!isFocusedMode && <BottomNav />}
        <Suspense>
          <MessagesButton onClick={() => setIsDrawerOpen(true)} position="bottom-left" unreadCount={unreadCount} />
          <MessagesDrawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)} 
            direction="left" 
            onUnreadCountChange={setUnreadCount} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!isFocusedMode && <Sidebar />}
      <main className={`flex-1 p-6 ${!isFocusedMode ? 'pl-72' : ''} transition-all duration-300`}>
        <Outlet />
      </main>
      <Suspense>
        <MessagesButton onClick={() => setIsDrawerOpen(true)} position="top-right" unreadCount={unreadCount} />
        <MessagesDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          direction="right" 
          onUnreadCountChange={setUnreadCount} />
      </Suspense>
    </div>
  );
};

export default ProtectedRoutes;