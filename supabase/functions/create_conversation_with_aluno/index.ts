import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Esta função lida com a criação ou busca de uma conversa entre dois usuários.
Deno.serve(async (req) => {
  // Necessário para invocar a função a partir de um navegador.
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { p_aluno_id } = await req.json();
    
    if (!p_aluno_id) {
      throw new Error('ID do aluno é obrigatório.');
    }

    // Cria um cliente Supabase com o papel de administrador para bypassar RLS.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Obtém o usuário autenticado que está fazendo a chamada.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Usuário não autenticado.');
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (!user) {
      throw new Error('Usuário inválido.');
    }

    const personal_id = user.id;

    // 1. Verifica se já existe uma conversa entre os dois.
    // Busca todas as conversas onde um dos dois participa.
    const { data: existingConversations, error: findError } = await supabaseAdmin
      .from('participantes_conversa')
      .select('conversa_id')
      .in('user_id', [personal_id, p_aluno_id]);

    if (findError) throw findError;

    // Conta as ocorrências de cada 'conversa_id'. Uma conversa com ambos aparecerá duas vezes.
    const conversationCounts = existingConversations.reduce((acc, curr) => {
      acc[curr.conversa_id] = (acc[curr.conversa_id] || 0) + 1;
      return acc;
    }, {});

    const existingConversationId = Object.keys(conversationCounts).find(
      (id) => conversationCounts[id] === 2
    );

    // ✅ CORREÇÃO: Se a conversa já existe, retorna um OBJETO com conversa_id
    if (existingConversationId) {
      return new Response(
        JSON.stringify({ conversa_id: existingConversationId }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        }
      );
    }

    // 2. Se não existe, cria uma nova conversa.
    const { data: newConversation, error: createConvError } = await supabaseAdmin
      .from('conversas')
      .insert({})
      .select('id')
      .single();

    if (createConvError || !newConversation) throw createConvError;

    const conversationId = newConversation.id;

    // 3. Adiciona os dois participantes à nova conversa.
    const { error: insertParticipantsError } = await supabaseAdmin
      .from('participantes_conversa')
      .insert([
        {
          conversa_id: conversationId,
          user_id: personal_id
        },
        {
          conversa_id: conversationId,
          user_id: p_aluno_id
        }
      ]);

    if (insertParticipantsError) throw insertParticipantsError;

    // ✅ CORREÇÃO: Retorna um OBJETO com conversa_id
    return new Response(
      JSON.stringify({ conversa_id: conversationId }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      }
    );
  }
});