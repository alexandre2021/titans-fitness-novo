import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Cabeçalho de autorização ausente.');
    }

    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    // 1. Extrai 'avatar_path' em vez de 'avatar_grupo'
    const { nome_grupo, participantes_ids, avatar_path } = await req.json();

    if (!nome_grupo || !participantes_ids || participantes_ids.length < 2) {
      return new Response(JSON.stringify({ error: 'Nome do grupo e pelo menos 2 participantes são necessários' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    if (!participantes_ids.includes(user.id)) {
      participantes_ids.push(user.id);
    }

    // 2. Cria a conversa SEM o avatar primeiro, para obter o ID
    const { data: conversaData, error: conversaError } = await supabaseAdmin
      .from('conversas')
      .insert({
        nome_grupo: nome_grupo,
        is_grupo: true,
        creator_id: user.id
      })
      .select()
      .single();

    if (conversaError || !conversaData) {
      console.error('Erro ao criar o registro da conversa:', conversaError);
      throw new Error('Não foi possível criar o registro da conversa.');
    }

    const conversaId = conversaData.id;
    let finalAvatarUrl: string | null = null;

    // 3. Lógica para mover o avatar para o local permanente
    if (avatar_path) {
      const oldPath = avatar_path;
      const newPath = `${conversaId}/avatar.${oldPath.split('.').pop()}`;

      // Move o arquivo
      const { error: moveError } = await supabaseAdmin.storage
        .from('group-avatars')
        .move(oldPath, newPath);

      if (moveError) {
        console.error(`Erro ao mover avatar de ${oldPath} para ${newPath}:`, moveError);
        // Não lança erro, o grupo pode ser criado sem avatar
      } else {
        // Obtém a URL pública do novo local
        const { data: urlData } = supabaseAdmin.storage.from('group-avatars').getPublicUrl(newPath);
        finalAvatarUrl = urlData.publicUrl;

        // Atualiza a conversa com a URL final
        const { error: updateError } = await supabaseAdmin
          .from('conversas')
          .update({ avatar_grupo: finalAvatarUrl })
          .eq('id', conversaId);
        
        if (updateError) {
          console.error(`Erro ao atualizar a conversa ${conversaId} com a URL do avatar:`, updateError);
          // Não lança erro, continua mesmo se a atualização falhar
        }
      }
    }

    // 4. Adiciona os participantes
    const participantesParaInserir = participantes_ids.map((userId) => ({
      conversa_id: conversaId,
      user_id: userId
    }));

    const { error: participantesError } = await supabaseAdmin.from('participantes_conversa').insert(participantesParaInserir);

    if (participantesError) {
      console.error('Erro ao adicionar participantes:', participantesError);
      await supabaseAdmin.from('conversas').delete().eq('id', conversaId);
      throw new Error('Não foi possível adicionar os participantes à conversa.');
    }

    // 5. Retorna o ID da conversa E a URL final do avatar
    return new Response(JSON.stringify({
      conversa_id: conversaId,
      avatar_url: finalAvatarUrl // Envia a URL de volta para o frontend
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Erro inesperado na Edge Function:', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
