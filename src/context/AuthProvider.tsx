import React, { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/context/AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    // Get initial session first
    const getInitialSession = async () => {
      try {
        const { data: { session: sessionData }, error } = await supabase.auth.getSession();
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

    // Set up auth state listener
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
    await supabase.auth.signOut();
    queryClient.clear();
    window.location.replace('/login');
  };

  const value = { user, session, loading, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

