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

// Lazy load message components for better performance
const MessagesDrawer = lazy(() => import('@/components/messages/MessageDrawer'));
const MessagesButton = lazy(() => import('@/components/messages/MessageButton'));
// A funcionalidade do assistente de IA foi pausada, então o componente não é mais renderizado.
// import HelpChat from "@/pages/HelpChat";

const PTLayout = lazy(() => import('./PTLayout'));
const AlunoLayout = lazy(() => import('./AlunoLayout'));

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

  switch (userType) {
    case 'aluno':
      return (
        <Suspense fallback={<div>Carregando layout do aluno...</div>}>
          <AlunoLayout />
        </Suspense>
      );
    case 'professor':
      return (
        <Suspense fallback={<div>Carregando layout do professor...</div>}>
          <PTLayout />
        </Suspense>
      );
    default:
      // Se não for aluno nem professor, ou para rotas que não precisam de layout,
      // apenas renderiza o Outlet para que as rotas filhas possam ser exibidas.
      return <Outlet />;
  }
};

export default ProtectedRoutes;