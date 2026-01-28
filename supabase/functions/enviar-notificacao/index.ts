import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Função para encontrar ou criar uma conversa individual
async function getOrCreateConversation(supabaseAdmin: SupabaseClient, userId1: string, userId2: string): Promise<string> {
  // Busca uma conversa 1-para-1 existente
  const { data: existing, error: findError } = await supabaseAdmin.rpc('get_individual_conversation_id', {
    user_id_1: userId1,
    user_id_2: userId2
  });

  if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows found
    throw new Error(`Erro ao buscar conversa: ${findError.message}`);
  }

  if (existing) {
    console.log(`[LOG] Conversa existente encontrada: ${existing}`);
    return existing;
  }

  // Se não existe, cria uma nova conversa e adiciona os participantes
  console.log("[LOG] Conversa não encontrada. Criando uma nova...");
  const { data: newConversation, error: createError } = await supabaseAdmin
    .from('conversas')
    .insert({ is_grupo: false })
    .select('id')
    .single();

  if (createError || !newConversation) {
    throw new Error(`Erro ao criar conversa: ${createError?.message || 'ID da conversa não retornado'}`);
  }

  const conversaId = newConversation.id;
  console.log(`[LOG] Nova conversa criada com ID: ${conversaId}`);

  const { error: participantsError } = await supabaseAdmin
    .from('participantes_conversa')
    .insert([
      { conversa_id: conversaId, user_id: userId1 },
      { conversa_id: conversaId, user_id: userId2 },
    ]);

  if (participantsError) {
    // Tenta limpar a conversa criada se a inserção de participantes falhar
    await supabaseAdmin.from('conversas').delete().eq('id', conversaId);
    throw new Error(`Erro ao adicionar participantes: ${participantsError.message}`);
  }
  
  console.log("[LOG] Participantes adicionados à nova conversa.");
  return conversaId;
}

Deno.serve(async (req: Request) => {
  console.log(`--- Edge Function 'enviar-notificacao' INVOCADA --- Method: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log("[LOG] Requisição POST recebida. Iniciando processamento...");

  try {
    const { destinatario_id, conteudo } = await req.json();
    
    console.log("[LOG] Payload recebido:", { destinatario_id, conteudo });

    const ADMIN_USER_ID = Deno.env.get('ADMIN_USER_ID');

    if (!destinatario_id || !conteudo || !ADMIN_USER_ID) {
      console.error("Erro: Parâmetros obrigatórios ausentes.");
      return new Response(JSON.stringify({
        error: '`destinatario_id`, `conteudo` e `ADMIN_USER_ID` são obrigatórios.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
    if (destinatario_id === ADMIN_USER_ID) {
      console.log("[LOG] Aviso: Notificação para o próprio admin ignorada.");
      return new Response(JSON.stringify({
        message: 'Notificação para o próprio admin ignorada.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    console.log(`[LOG] Iniciando busca/criação de conversa para destinatário: ${destinatario_id}`);
    const conversaId = await getOrCreateConversation(supabaseAdmin, ADMIN_USER_ID, destinatario_id);
    console.log(`[LOG] Usando conversa ID: ${conversaId}. Inserindo mensagem...`);

    const { data: novaMensagem, error: messageError } = await supabaseAdmin
      .from('mensagens')
      .insert({
        conversa_id: conversaId,
        remetente_id: ADMIN_USER_ID,
        conteudo: conteudo,
      })
      .select('id')
      .single();

    if (messageError) {
      throw new Error(`Erro ao enviar mensagem: ${messageError.message}`);
    }

    // ✅ CORREÇÃO: Atualiza a conversa com o ID da última mensagem.
    if (novaMensagem) {
      const { error: updateError } = await supabaseAdmin
        .from('conversas')
        .update({ last_message_id: novaMensagem.id, updated_at: new Date().toISOString() })
        .eq('id', conversaId);
      
      if (updateError) {
        // Loga o erro mas não interrompe o fluxo, pois a mensagem já foi enviada.
        console.error(`[LOG] Erro ao atualizar last_message_id: ${updateError.message}`);
      } else {
        console.log(`[LOG] Tabela 'conversas' atualizada com last_message_id: ${novaMensagem.id}`);
      }
    }

    console.log("✅ Sucesso! Notificação enviada.");
    return new Response(JSON.stringify({
      success: true,
      message: 'Notificação enviada.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (err) {
    console.error("❌ ERRO NA EDGE FUNCTION:", err.message);
    return new Response(JSON.stringify({
      error: err.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
