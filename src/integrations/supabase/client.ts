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

  if (response.status === 401) {
    // Apenas executa a lógica de logout se não estivermos já em uma página pública
    if (typeof window !== 'undefined' && !['/login', '/cadastro'].some(path => window.location.pathname.startsWith(path))) {
      console.warn('[Supabase Client] Erro 401 detectado. Deslogando usuário.');
      toast.error('Sessão expirada', {
        description: 'Sua sessão expirou. Por favor, faça o login novamente.',
        duration: 5000,
      });

      // Importante: Usamos a instância original para evitar um loop infinito no signOut
      if (supabaseInstance) {
        // SOLUÇÃO DEFINITIVA E ROBUSTA:
        // 1. Esperamos (await) o signOut() para que o Supabase tente limpar a sessão.
        await supabaseInstance.auth.signOut();
        
        // 2. Forçamos a limpeza do localStorage para garantir que nenhum dado de sessão "fantasma" permaneça.
        // Esta é a etapa crucial para quebrar o loop de redirecionamento.
        localStorage.clear();

        // 3. Usamos window.location.replace para limpar o histórico e evitar que o botão "voltar" cause problemas.
        window.location.replace('/login');
      }
    }
  } else if (response.status === 403) {
    // Para erros 403 (Forbidden), apenas logamos o erro sem deslogar o usuário.
    // Isso evita loops de logout indevidos causados por falhas de RLS (Row Level Security).
    console.warn('[Supabase Client] Erro 403 (Forbidden) detectado. Verifique as permissões e políticas de RLS.');
    // O erro será tratado pela lógica que fez a chamada (ex: um `try/catch` em um `useEffect`).
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