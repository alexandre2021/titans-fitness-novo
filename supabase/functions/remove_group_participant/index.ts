import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization')!
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { conversa_id, participant_id } = await req.json()

    if (!conversa_id || !participant_id) {
      return new Response(JSON.stringify({ error: 'conversa_id e participant_id são obrigatórios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Verifica se o usuário é o criador do grupo
    const { data: conversa, error: conversaError } = await supabaseAdmin
      .from('conversas')
      .select('creator_id, is_grupo')
      .eq('id', conversa_id)
      .single()

    if (conversaError || !conversa) {
      return new Response(JSON.stringify({ error: 'Conversa não encontrada' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (!conversa.is_grupo) {
      return new Response(JSON.stringify({ error: 'Esta não é uma conversa em grupo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (conversa.creator_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Apenas o criador pode remover participantes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Impede que o criador remova a si mesmo
    if (participant_id === user.id) {
      return new Response(JSON.stringify({ error: 'O criador não pode se remover do grupo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Remove o participante
    const { error: deleteError } = await supabaseAdmin
      .from('participantes_conversa')
      .delete()
      .eq('conversa_id', conversa_id)
      .eq('user_id', participant_id)

    if (deleteError) {
      console.error('Erro ao remover participante:', deleteError)
      throw new Error('Não foi possível remover o participante.')
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Erro inesperado na Edge Function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})