// supabase/functions/validate-invite/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Get Supabase client with Service Role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Buscar convite com token
    const { data: conviteData, error: conviteError } = await supabaseAdmin
      .from('convites')
      .select(`
        id,
        token_convite,
        email_convidado,
        status,
        expires_at,
        tipo_convite,
        professor_id,
        created_at
      `)
      .eq('token_convite', token)
      .eq('tipo_convite', 'cadastro')
      .single();

    if (conviteError || !conviteData) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token de convite inválido ou não encontrado'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Verificar se convite expirou
    if (new Date(conviteData.expires_at) < new Date()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Este convite expirou. Solicite um novo convite ao seu Personal Trainer'
      }), {
        status: 410, // Gone
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Verificar status do convite
    if (conviteData.status !== 'pendente') {
      let errorMessage = 'Este convite não está mais disponível';
      if (conviteData.status === 'aceito') {
        errorMessage = 'Este convite já foi aceito. Se você já concluiu seu cadastro, por favor, faça o login';
      } else if (conviteData.status === 'cancelado') {
        errorMessage = 'Este convite foi cancelado pelo Personal Trainer';
      }
      return new Response(JSON.stringify({
        success: false,
        error: errorMessage
      }), {
        status: 409, // Conflict
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Buscar dados do Personal Trainer
    const { data: ptData, error: ptError } = await supabaseAdmin
      .from('professores')
      .select('nome_completo')
      .eq('id', conviteData.professor_id)
      .single();

    if (ptError) {
      console.error('Erro ao buscar dados do PT:', ptError);
    }

    // Retornar dados do convite válido
    return new Response(JSON.stringify({
      success: true,
      convite: {
        id: conviteData.id,
        token_convite: conviteData.token_convite,
        email_convidado: conviteData.email_convidado,
        status: conviteData.status,
        expires_at: conviteData.expires_at,
        professor_id: conviteData.professor_id,
        pt_nome: ptData?.nome_completo || 'Personal Trainer'
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Erro na validação do convite:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno do servidor'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
