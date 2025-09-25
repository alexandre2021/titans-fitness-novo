// src/components/AuthGuard.tsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      if (loading) return;

      // Páginas que não precisam de autenticação
      const publicRoutes = [
        '/', '/cadastro', '/cadastro/professor', '/cadastro/aluno', 
        '/login', '/termos', '/privacidade', '/confirmacao-email'
      ];

      if (publicRoutes.includes(location.pathname)) {
        // Se usuário está logado e está na página de login, redirecionar
        if (user && location.pathname === '/login') {
          // Verificar tipo de usuário para redirecionar corretamente
          try {
            const { data: userProfile } = await supabase
              .from('user_profiles')
              .select('user_type')
              .eq('id', user.id)
              .single();

            if (userProfile?.user_type === 'professor') {
              navigate('/index-pt');
            } else if (userProfile?.user_type === 'aluno') {
              navigate('/index-aluno');
            } else {
              navigate('/');
            }
            return;
          } catch (error) {
            console.error('Erro ao verificar tipo de usuário:', error);
            navigate('/');
            return;
          }
        }
        
        return;
      }

      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      try {
        // Verificar o tipo de usuário e status do onboarding
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (!userProfile) {
          navigate('/login', { replace: true });
          return;
        }

        const userType = userProfile.user_type;

        // Verificar se é PT e precisa fazer onboarding
        if (userType === 'professor') {
          const { data: ptData } = await supabase
            .from('professores')
            .select('onboarding_completo')
            .eq('id', user.id)
            .single();

          if (!ptData?.onboarding_completo) {
            // Se não completou onboarding e não está nas páginas de onboarding, redirecionar
            const onboardingRoutes = [
              '/onboarding-pt/informacoes-basicas',
              '/onboarding-pt/experiencia-profissional',
              '/onboarding-pt/redes-sociais'
            ];

            if (!onboardingRoutes.includes(location.pathname)) {
              navigate('/onboarding-pt/informacoes-basicas');
              return;
            }
          } else {
            // Onboarding completo, verificar se está tentando acessar onboarding
            const onboardingRoutes = [
              '/onboarding-pt/informacoes-basicas',
              '/onboarding-pt/experiencia-profissional',
              '/onboarding-pt/redes-sociais'
            ];

            if (onboardingRoutes.includes(location.pathname)) {
              navigate('/index-pt');
              return;
            }
          }
        }

        // Verificar se é aluno e precisa fazer onboarding
        if (userType === 'aluno') {
          const { data: alunoData } = await supabase
            .from('alunos')
            .select('onboarding_completo')
            .eq('id', user.id)
            .single();

          if (!alunoData?.onboarding_completo) {
            // Se não completou onboarding e não está nas páginas de onboarding, redirecionar
            const onboardingRoutes = [
              '/onboarding-aluno/dados-basicos',
              '/onboarding-aluno/descricao-saude'
            ];

            if (!onboardingRoutes.includes(location.pathname)) {
              navigate('/onboarding-aluno/dados-basicos');
              return;
            }
          } else {
            // Onboarding completo, verificar se está tentando acessar onboarding
            const onboardingRoutes = [
              '/onboarding-aluno/dados-basicos',
              '/onboarding-aluno/descricao-saude'
            ];

            if (onboardingRoutes.includes(location.pathname)) {
              navigate('/index-aluno');
              return;
            }
          }
        }

      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        navigate('/login', { replace: true });
      }
    };

    checkAuthAndRedirect();
  }, [user, loading, location.pathname, navigate]);

  // Mostra o loader apenas enquanto a sessão do usuário está sendo carregada.
  // A lógica de redirecionamento dentro do useEffect cuida do resto.
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Carregando...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGuard;