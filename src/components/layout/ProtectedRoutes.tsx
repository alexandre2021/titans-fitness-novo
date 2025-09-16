// src/components/layout/ProtectedRoutes.tsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AlunoLayout from './AlunoLayout';
import PTLayout from './PTLayout';
import { supabase } from '@/integrations/supabase/client';

const ProtectedRoutes = () => {
  const { user, loading: authLoading } = useAuth();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

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

  const isFocusedMode = location.pathname.startsWith('/rotinas-criar/') || location.pathname.startsWith('/execucao-rotina/executar-treino/');

  if (userType === 'aluno') {
    // Passa o modo focado para o layout do aluno
    return <AlunoLayout isFocusedMode={isFocusedMode} />;
  }

  if (userType === 'personal_trainer') {
    // Passa o modo focado para o layout do PT
    return <PTLayout isFocusedMode={isFocusedMode} />;
  }

  // Fallback caso o tipo de usuário não seja reconhecido
  return <div>Tipo de usuário desconhecido.</div>;
};

export default ProtectedRoutes;
