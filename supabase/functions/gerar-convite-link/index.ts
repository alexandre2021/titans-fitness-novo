import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'), 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );
    
    const { professor_id } = await req.json();

    if (!professor_id) {
      return new Response(JSON.stringify({
        error: 'professor_id é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Criar um convite sem e-mail, tipo 'cadastro' para QR Code
    const { data: convite, error } = await supabase
      .from('convites')
      .insert({
        professor_id,
        tipo_convite: 'cadastro'
      })
      .select('token_convite')
      .single();

    if (error) {
      throw new Error(`Erro ao criar convite: ${error.message}`);
    }

    if (!convite) {
      throw new Error('Falha ao recuperar token do convite após criação.');
    }

    const cadastroUrl = `https://titans.fitness/cadastro/aluno?token=${convite.token_convite}`;

    return new Response(JSON.stringify({
      success: true,
      url: cadastroUrl,
      token: convite.token_convite
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('💥 Erro na Edge Function gerar-convite-link:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});