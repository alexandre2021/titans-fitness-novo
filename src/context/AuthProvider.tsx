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

  // Função para limpar todo o storage e cache quando detectar mudança de usuário
  const clearAllCacheAndStorage = async () => {
    console.log('🧹 Limpando cache e storage devido a mudança de usuário...');

    // Limpa React Query cache
    queryClient.clear();

    // Limpa localStorage (exceto a chave do último usuário que vamos atualizar)
    const keysToKeep = ['sb-prvfvlyzfyprjliqniki-auth-token'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
        localStorage.removeItem(key);
      }
    });

    // Limpa sessionStorage
    sessionStorage.clear();

    // Limpa cache do Service Worker se disponível
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    console.log('✅ Cache e storage limpos com sucesso');
  };

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
          // Detecta mudança de usuário
          const lastUserId = localStorage.getItem('last_user_id');
          const currentUserId = sessionData?.user?.id;

          if (currentUserId && lastUserId && lastUserId !== currentUserId) {
            console.log('🔄 Detectada mudança de usuário. Limpando cache...');
            await clearAllCacheAndStorage();
          }

          // Atualiza o ID do último usuário
          if (currentUserId) {
            localStorage.setItem('last_user_id', currentUserId);
          } else {
            localStorage.removeItem('last_user_id');
          }

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
          // Detecta mudança de usuário no onChange também
          const lastUserId = localStorage.getItem('last_user_id');
          const currentUserId = sessionData?.user?.id;

          if (currentUserId && lastUserId && lastUserId !== currentUserId) {
            console.log('🔄 Detectada mudança de usuário. Limpando cache...');
            await clearAllCacheAndStorage();
          }

          // Atualiza o ID do último usuário
          if (currentUserId) {
            localStorage.setItem('last_user_id', currentUserId);
          } else if (_event === 'SIGNED_OUT') {
            localStorage.removeItem('last_user_id');
          }

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
  }, [queryClient]);

  const signOut = async () => {
    try {
      // Limpa o estado local primeiro
      setUser(null);
      setSession(null);

      // Remove o ID do último usuário
      localStorage.removeItem('last_user_id');

      // Limpa todo o cache e storage
      await clearAllCacheAndStorage();

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