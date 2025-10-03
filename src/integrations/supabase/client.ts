import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { toast } from 'sonner';

// É uma boa prática carregar essas variáveis de um arquivo .env para não expor as chaves no código.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Interceptador global de fetch para tratar erros de autenticação (401).
 * Qualquer chamada feita pelo cliente Supabase passará por aqui.
 */
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const response = await fetch(input, init);

  // Se o token for inválido (401) OU o usuário não tiver permissão (403)
  if (response.status === 401 || response.status === 403) {
    // Apenas executa a lógica de logout se não estivermos já em uma página pública
    if (typeof window !== 'undefined' && !['/login', '/cadastro'].some(path => window.location.pathname.startsWith(path))) {
      console.warn('[Supabase Client] Erro 401 detectado. Deslogando usuário.');
      toast.error('Sessão expirada', {
        description: 'Sua sessão expirou. Por favor, faça o login novamente.',
        duration: 5000,
      });

      // Importante: Usamos a instância original para evitar um loop infinito no signOut
      if (supabaseInstance) {
        // Não esperamos o signOut, pois ele pode falhar (como visto no erro 403).
        // A ação mais importante é redirecionar o usuário para o login.
        supabaseInstance.auth.signOut();
        window.location.href = '/login';
      }
    }
  }

  return response;
};

supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Essencial para PWAs e fluxos de OAuth/reset de senha
  },
  global: {
    fetch: customFetch,
  },
});

export const supabase = supabaseInstance;