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

    const { conversa_id, nome_grupo, avatar_grupo } = await req.json()

    if (!conversa_id) {
      return new Response(JSON.stringify({ error: 'conversa_id é obrigatório' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!nome_grupo && !avatar_grupo) {
      return new Response(JSON.stringify({ error: 'Pelo menos um campo (nome_grupo ou avatar_grupo) deve ser fornecido' }), {
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
      return new Response(JSON.stringify({ error: 'Apenas o criador pode editar as informações do grupo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    // Monta o objeto de atualização com apenas os campos fornecidos
    const updateData: { nome_grupo?: string; avatar_grupo?: string; updated_at: string } = {
      updated_at: new Date().toISOString()
    }

    if (nome_grupo !== undefined) {
      updateData.nome_grupo = nome_grupo
    }

    if (avatar_grupo !== undefined) {
      updateData.avatar_grupo = avatar_grupo
    }

    // Atualiza a conversa
    const { error: updateError } = await supabaseAdmin
      .from('conversas')
      .update(updateData)
      .eq('id', conversa_id)

    if (updateError) {
      console.error('Erro ao atualizar grupo:', updateError)
      throw new Error('Não foi possível atualizar as informações do grupo.')
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