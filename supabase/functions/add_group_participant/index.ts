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

    const { conversa_id, participant_ids } = await req.json()

    if (!conversa_id || !participant_ids || !Array.isArray(participant_ids) || participant_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'conversa_id e participant_ids (array) são obrigatórios' }), {
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
      return new Response(JSON.stringify({ error: 'Apenas o criador pode adicionar participantes' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Adiciona os participantes
    const participantesParaInserir = participant_ids.map(userId => ({
      conversa_id: conversa_id,
      user_id: userId,
    }))

    const { error: insertError } = await supabaseAdmin
      .from('participantes_conversa')
      .insert(participantesParaInserir)

    if (insertError) {
      console.error('Erro ao adicionar participantes:', insertError)
      // Se o erro for de duplicação (participante já existe), não considera erro fatal
      if (insertError.code !== '23505') {
        throw new Error('Não foi possível adicionar os participantes.')
      }
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