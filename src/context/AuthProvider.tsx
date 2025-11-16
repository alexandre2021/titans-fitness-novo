import React, { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext, AuthContextType } from '@/context/AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        // Timeout de 10 segundos para evitar travamento infinito
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session: sessionData }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('Error getting session:', error);
        }
        if (mounted) {
          setSession(sessionData);
          setUser(sessionData?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, sessionData) => {
        if (mounted) {
          setSession(sessionData);
          setUser(sessionData?.user ?? null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Limpa o estado local primeiro
      setUser(null);
      setSession(null);

      // Limpa o cache do React Query
      queryClient.clear();

      // Limpa a sessão do Supabase
      await supabase.auth.signOut();

      // Aguarda um momento para garantir que a sessão foi limpa
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redireciona para a página de login
      window.location.replace('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, tenta redirecionar
      window.location.replace('/login');
    }
  };

  const value = { user, session, loading, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}