// supabase/functions/invalidate-invite/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

console.log('🚀 Edge Function invalidate-invite iniciada');

serve(async (req) => {
  console.log(`🚀 [Invalidate Invite] Iniciando processamento...`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  // Validate method
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Initialize Supabase client with Service Role Key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    const { conviteId, token } = await req.json();
    console.log(`📝 [Invalidate Invite] Dados recebidos:`, {
      conviteId,
      token: token ? '***' : null
    });

    if (!conviteId) {
      console.error('❌ [Invalidate Invite] conviteId é obrigatório');
      return new Response(JSON.stringify({
        success: false,
        error: 'conviteId é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Optional: Validate token if provided for extra security
    if (token) {
      const { data: conviteData } = await supabase.from('convites').select('token_convite, status').eq('id', conviteId).single();

      if (!conviteData || conviteData.token_convite !== token) {
        console.error('❌ [Invalidate Invite] Token inválido para este convite');
        return new Response(JSON.stringify({
          success: false,
          error: 'Token inválido para este convite'
        }), {
          status: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      if (conviteData.status !== 'pendente') {
        console.log(`⚠️ [Invalidate Invite] Convite já processado com status: ${conviteData.status}`);
        return new Response(JSON.stringify({
          success: true,
          message: 'Convite já foi processado anteriormente',
          status: conviteData.status
        }), {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Update the invite status to 'aceito' instead of deleting
    const { error: updateError } = await supabase
      .from('convites')
      .update({ status: 'aceito', aceito_em: new Date().toISOString() })
      .eq('id', conviteId);

    if (updateError) {
      console.error('❌ [Invalidate Invite] Erro ao atualizar status do convite:', updateError);
      throw new Error(`Falha ao invalidar convite: ${updateError.message}`);
    }

    console.log(`✅ [Invalidate Invite] Convite ${conviteId} invalidado com sucesso`);
    return new Response(JSON.stringify({
      success: true,
      message: 'Convite invalidado com sucesso',
      conviteId
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('💥 [Invalidate Invite] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
