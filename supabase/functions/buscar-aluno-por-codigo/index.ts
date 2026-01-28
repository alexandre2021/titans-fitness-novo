// supabase/functions/buscar-aluno-por-codigo/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Headers de CORS definidos diretamente na função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Trata a requisição preflight de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { codigo_busca } = await req.json();

    if (!codigo_busca || typeof codigo_busca !== 'string') {
      return new Response(JSON.stringify({ error: '`codigo_busca` é obrigatório e deve ser uma string.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Cria um cliente Supabase com a chave de serviço para ignorar a RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Busca o aluno pelo código de vínculo
    const { data: aluno, error } = await supabaseAdmin
      .from('alunos')
      .select('id, nome_completo, email, avatar_type, avatar_image_url, avatar_letter, avatar_color, codigo_vinculo')
      .eq('codigo_vinculo', codigo_busca.toUpperCase())
      .single();

    if (error) {
      // O código 'PGRST116' significa "No rows found", que tratamos como um 404.
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Aluno não encontrado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      // Para outros erros de banco, lançamos para o catch principal.
      throw error;
    }

    // Retorna os dados do aluno encontrado
    return new Response(JSON.stringify(aluno), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error('Erro na Edge Function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
