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

    // Desregistra o Service Worker para garantir estado limpo
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
      console.log('🔄 Service Worker desregistrado');
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

  // Auto-renovação de token antes de expirar
  useEffect(() => {
    if (!session?.expires_at) return;

    const expiresAt = session.expires_at * 1000; // Converter para ms
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Renova 5 minutos antes de expirar
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);

    // Se já passou do tempo de renovação, renova imediatamente
    if (refreshTime <= 0) {
      console.log('⏰ Token expirando em breve, renovando agora...');
      supabase.auth.refreshSession();
      return;
    }

    console.log(`🔄 Token será renovado automaticamente em ${Math.round(refreshTime / 1000 / 60)} minutos`);

    const refreshTimer = setTimeout(async () => {
      console.log('⏰ Renovando token automaticamente...');
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('❌ Erro ao renovar token:', error);
      } else {
        console.log('✅ Token renovado com sucesso');
      }
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [session?.expires_at]);

  const signOut = async () => {
    try {
      console.log('🚪 Iniciando processo de logout...');

      // Limpa o estado local primeiro
      setUser(null);
      setSession(null);

      // Remove o ID do último usuário
      localStorage.removeItem('last_user_id');

      // Limpa a sessão do Supabase
      await supabase.auth.signOut();

      // Limpa React Query cache
      queryClient.clear();

      // Limpa TUDO do localStorage (incluindo token do Supabase)
      localStorage.clear();

      // Limpa sessionStorage
      sessionStorage.clear();

      // Limpa cache do Service Worker se disponível
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Desregistra o Service Worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      console.log('✅ Logout completo, redirecionando...');

      // Usa replace para evitar histórico e redireciona
      window.location.replace('/login');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      // Mesmo com erro, limpa tudo e redireciona
      localStorage.clear();
      sessionStorage.clear();
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