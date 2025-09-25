import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// É uma boa prática carregar essas variáveis de um arquivo .env para não expor as chaves no código.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  // Garante que o cliente use as URLs corretas para todos os serviços,
  // evitando tentativas de conexão com um ambiente de desenvolvimento local.
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // Essencial para PWAs e fluxos de OAuth/reset de senha
  },
});