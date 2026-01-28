import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Headers de CORS para permitir requisições do seu frontend
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
    const { codigo_busca, aluno_id } = await req.json();

    // Validação dos parâmetros de entrada
    if (!codigo_busca || typeof codigo_busca !== 'string') {
      return new Response(JSON.stringify({ error: '`codigo_busca` é obrigatório e deve ser uma string.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    if (!aluno_id || typeof aluno_id !== 'string') {
      return new Response(JSON.stringify({ error: '`aluno_id` é obrigatório e deve ser uma string.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Cria um cliente Supabase com a chave de serviço para ignorar a RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Busca o professor pelo código de vínculo
    const { data: professor, error: professorError } = await supabaseAdmin
      .from('professores')
      .select('id, nome_completo, email, avatar_type, avatar_image_url, avatar_letter, avatar_color, codigo_vinculo')
      .eq('codigo_vinculo', codigo_busca.toUpperCase())
      .single();

    if (professorError) {
      // O código 'PGRST116' significa "No rows found", que tratamos como um 404.
      if (professorError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Professor não encontrado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }
      // Para outros erros de banco, lançamos para o catch principal.
      throw professorError;
    }

    // 2. Verifica se o aluno já segue este professor
    const { data: vinculoExistente, error: vinculoError } = await supabaseAdmin
      .from('alunos_professores')
      .select('aluno_id')
      .eq('aluno_id', aluno_id)
      .eq('professor_id', professor.id)
      .single();

    // Ignora o erro 'PGRST116' que é esperado quando o vínculo não existe
    if (vinculoError && vinculoError.code !== 'PGRST116') {
      throw vinculoError;
    }

    if (vinculoExistente) {
      // Retorna um erro específico para o cliente tratar
      return new Response(JSON.stringify({ error: 'ALREADY_FOLLOWS' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // 409 Conflict é um bom status para este caso
      });
    }

    // 3. Retorna os dados do professor encontrado
    return new Response(JSON.stringify(professor), {
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
