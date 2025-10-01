// src/components/layout/ProtectedRoutes.tsx
import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useConversas } from '@/hooks/useConversas'; // ✅ ADICIONE

// Import all layout components
import AlunoSidebar from "./AlunoSidebar";
import PTSidebar from "./PTSidebar";
import AlunoMobileHeader from "./AlunoMobileHeader";
import PTMobileHeader from "./PTMobileHeader";
import AlunoBottomNav from "./AlunoBottomNav";
import PTBottomNav from "./PTBottomNav";
import MessagesButton from "../messages/MessageButton";
import MessagesDrawer from "../messages/MessageDrawer";

const useMessageDrawer = () => {
  const [isOpen, setOpen] = useState(false);
  const { refetchConversas } = useConversas();

  const handleClose = () => {
    setOpen(false);
    refetchConversas(); // ✅ Recarrega as conversas ao fechar
  };

  return { isOpen, setOpen, handleClose };
};

const ProtectedRoutes = () => {
  const { user, loading: authLoading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { unreadCount, refetchConversas } = useConversas(); // ✅ ADICIONE

  const [isMessagesDrawerOpen, setMessagesDrawerOpen] = useState(false); // ✅ ADICIONE

  const handleDrawerClose = () => {
    setMessagesDrawerOpen(false);
    refetchConversas(); // ✅ Recarrega as conversas ao fechar
  };

  useEffect(() => {
    const determineUserType = async () => {
      if (authLoading) {
        return;
      }
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
        {!isFocusedMode && (
          <>
            <MobileHeader />
            <MessagesButton 
              onClick={() => setMessagesDrawerOpen(true)} 
              position="bottom-left"
              unreadCount={unreadCount} // ✅ ADICIONE
            />
            <MessagesDrawer 
              isOpen={isMessagesDrawerOpen} 
              onClose={handleDrawerClose}
              direction="left"
            />
          </>
        )}
        <main className={`p-4 ${isFocusedMode ? 'pt-6' : 'pt-24 pb-16'}`}>
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
          <MessagesButton 
            onClick={() => setMessagesDrawerOpen(true)} 
            position="top-right"
            unreadCount={unreadCount} // ✅ ADICIONE
          />
          <MessagesDrawer 
            isOpen={isMessagesDrawerOpen} 
            onClose={handleDrawerClose}
            direction="right"
          />
        </>
      )}
      <main className={`flex-1 p-6 ${!isFocusedMode ? 'pl-72' : ''} transition-all duration-300`}>
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedRoutes;