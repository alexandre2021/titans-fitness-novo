// src/components/layout/ProtectedRoutes.tsx
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMediaQuery } from '@/hooks/use-media-query';

// Import all layout components
import AlunoSidebar from './AlunoSidebar';
import PTSidebar from './PTSidebar';
import AlunoMobileHeader from './AlunoMobileHeader';
import PTMobileHeader from './PTMobileHeader';
import AlunoBottomNav from './AlunoBottomNav';
import PTBottomNav from './PTBottomNav';

const ProtectedRoutes = () => {
  const { user, loading: authLoading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    const determineUserType = async () => {
      if (authLoading) {
        return;
      }
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Tenta pegar o tipo do user_metadata (mais rápido)
      let type = user.user_metadata?.user_type;

      // 2. Se não encontrar, busca no banco de dados (fonte da verdade)
      if (!type) {
        console.warn('Tipo de usuário não encontrado nos metadados. Buscando no banco de dados como fallback.');
        try {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('user_type')
            .eq('id', user.id)
            .single();
          
          type = profile?.user_type;

          // 3. Se ainda não encontrar, força um refresh da sessão para pegar o JWT mais recente
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
    // O AuthGuard já deve ter redirecionado, mas isso é uma segurança extra.
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
      // Fallback para tipo de usuário desconhecido ou durante o onboarding
      // O AuthGuard já deve ter redirecionado, mas isso é uma segurança extra.
      // Renderiza apenas o conteúdo da página (ex: onboarding)
      return <Outlet />;
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        {/* Oculta o header apenas no modo de foco */}
        {!isFocusedMode && <MobileHeader />}
        <main className={`p-4 ${isFocusedMode ? 'pt-6' : 'pt-24 pb-16'}`}>
          <Outlet />
        </main>
        {/* Oculta o BottomNav apenas no modo de foco */}
        {!isFocusedMode && <BottomNav />} 
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* No desktop, a sidebar com o logo já é exibida. */}
      {!isFocusedMode && <Sidebar />}
      <main className={`flex-1 p-6 ${!isFocusedMode ? 'pl-72' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedRoutes;
