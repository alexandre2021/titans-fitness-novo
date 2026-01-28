import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Lista de emails protegidos - DEVE SER IGUAL AO CRON JOB
const PROTECTED_EMAILS = [
  'aramos1069@gmail.com',
  'contato@titans.fitness',
  'malhonegabriel@gmail.com'
];

console.log('🚀 Edge Function cancel-account iniciada');

serve(async (req) => {
  console.log(`🚀 [Cancel Account] Iniciando processamento...`);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      console.error('❌ [Cancel Account] Authorization header missing');
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ [Cancel Account] Invalid user token:', userError);
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`👤 [Cancel Account] Processing cancellation for user: ${user.email} (${user.id})`);

    if (PROTECTED_EMAILS.includes(user.email)) {
      console.warn(`⚠️ [Cancel Account] Blocked attempt to delete protected email: ${user.email}`);
      return new Response(JSON.stringify({ error: 'Esta conta está protegida e não pode ser cancelada' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_type } = await req.json();

    // ✅ CORREÇÃO: Alterado de 'personal_trainer' para 'professor'
    if (!user_type || !['aluno', 'professor'].includes(user_type)) {
      console.error('❌ [Cancel Account] Invalid user_type:', user_type);
      return new Response(JSON.stringify({ error: `Invalid user_type: ${user_type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let filesDeleted = 0;
    // ✅ CORREÇÃO: Alterado de 'personal_trainer' para 'professor'
    if (user_type === 'professor') {
      filesDeleted = await processPTCancellation(user.id, user.email, supabase);
    } else if (user_type === 'aluno') {
      filesDeleted = await processAlunoCancellation(user.id, user.email, supabase);
    }

    console.log('🗑️ [Cancel Account] Deleting user from auth...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error('❌ [Cancel Account] Failed to delete user:', deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    console.log('✅ [Cancel Account] Account cancelled successfully');
    console.log(`📊 [Cancel Account] Files deleted: ${filesDeleted}`);

    return new Response(JSON.stringify({ success: true, message: 'Account cancelled successfully', filesDeleted }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 [Cancel Account] Error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processPTCancellation(userId, userEmail, supabase) {
  console.log(`--- Processing PT cancellation: ${userEmail} (ID: ${userId}) ---`);
  let filesDeletedCount = 0;
  const hoje = new Date().toISOString().split('T')[0];

  // 1. CANCELAR ROTINAS ATIVAS/BLOQUEADAS
  const { error: rotinaError } = await supabase
    .from('rotinas')
    .update({
      status: 'Cancelada',
      observacoes_rotina: `Rotina interrompida e cancelada automaticamente em ${hoje} devido ao cancelamento da conta do Personal Trainer.`
    })
    .eq('professor_id', userId)
    .in('status', ['Ativa', 'Bloqueada']);
  if (rotinaError) console.error(`Error updating routines for PT ${userId}:`, rotinaError);

  // 2. REMOVER AVATAR DO SUPABASE STORAGE
  // ✅ CORREÇÃO: Alterado de 'personal_trainers' para 'professores'
  const { data: ptData } = await supabase.from('professores').select('avatar_type, avatar_image_url, nome_completo').eq('id', userId).single();
  if (ptData?.avatar_type === 'image' && ptData.avatar_image_url) {
    const filePath = getStoragePathFromUrl(ptData.avatar_image_url, 'avatars');
    if (filePath) {
      const { error } = await supabase.storage.from('avatars').remove([filePath]);
      if (error) console.error(`Falha ao deletar avatar do PT ${userId}:`, error);
      else {
        console.log(`Avatar do PT ${userId} deletado.`);
        filesDeletedCount++;
      }
    }
  }

  // 3. REMOVER MÍDIAS DE EXERCÍCIOS DO CLOUDFLARE
  const fileDeletionPromises = [];
  // ✅ CORREÇÃO: Alterado de 'pt_id' para 'professor_id'
  const { data: exerciciosData } = await supabase.from('exercicios').select('imagem_1_url, imagem_2_url, video_url').eq('professor_id', userId);
  if (exerciciosData) {
    exerciciosData.forEach((ex) => {
      [ex.imagem_1_url, ex.imagem_2_url, ex.video_url]
        .filter(Boolean)
        .forEach((url) => fileDeletionPromises.push(deleteCloudflareFile(url.split('/').pop(), 'exercicios', supabase)));
    });
  }

  const results = await Promise.allSettled(fileDeletionPromises);
  filesDeletedCount += results.filter((r) => r.status === 'fulfilled' && r.value).length;

  // 4. NOTIFICAR E DESVINCULAR ALUNOS
  const { data: alunosVinculados, error: selectAlunosError } = await supabase.from('alunos_professores').select('aluno_id').eq('professor_id', userId);
  if (selectAlunosError) {
    console.error(`[PT Cancellation] Erro ao buscar alunos para notificar:`, selectAlunosError);
  } else if (alunosVinculados && alunosVinculados.length > 0) {
    console.log(`[PT Cancellation] Notificando ${alunosVinculados.length} aluno(s) sobre o cancelamento...`);
    const notificationPromises = alunosVinculados.map((vinculo) =>
      supabase.functions.invoke('enviar-notificacao', {
        body: {
          destinatario_id: vinculo.aluno_id,
          conteudo: `O professor ${ptData?.nome_completo || 'seu personal trainer'} cancelou a conta na plataforma. Suas rotinas com ele foram encerradas.`
        }
      })
    );
    await Promise.allSettled(notificationPromises);
  }

  const { error: desvinculaError } = await supabase.from('alunos_professores').delete().eq('professor_id', userId);
  if (desvinculaError) console.error(`[PT Cancellation] Erro ao desvincular alunos do PT ${userId}:`, desvinculaError);
  else console.log(`[PT Cancellation] Alunos desvinculados do PT ${userId}.`);

  return filesDeletedCount;
}

async function processAlunoCancellation(userId, userEmail, supabase) {
  console.log(`--- Processing ALUNO cancellation: ${userEmail} (ID: ${userId}) ---`);
  let filesDeletedCount = 0;

  // 1. DELETAR AVATAR DO SUPABASE STORAGE
  const { data: alunoData } = await supabase.from('alunos').select('avatar_type, avatar_image_url, nome_completo').eq('id', userId).single();
  if (alunoData?.avatar_type === 'image' && alunoData.avatar_image_url) {
    const filePath = getStoragePathFromUrl(alunoData.avatar_image_url, 'avatars');
    if (filePath) {
      const { error } = await supabase.storage.from('avatars').remove([filePath]);
      if (error) console.error(`Falha ao deletar avatar do aluno ${userId}:`, error);
      else {
        console.log(`Avatar do aluno ${userId} deletado.`);
        filesDeletedCount++;
      }
    }
  }

  // 2. DELETAR ARQUIVOS DO CLOUDFLARE
  const fileDeletionPromises = [];
  const { data: avaliacoesData } = await supabase.from('avaliacoes_fisicas').select('foto_frente_url, foto_lado_url, foto_costas_url').eq('aluno_id', userId);
  if (avaliacoesData) {
    for (const item of avaliacoesData) {
      [item.foto_frente_url, item.foto_lado_url, item.foto_costas_url]
        .filter(Boolean)
        .forEach((url) => fileDeletionPromises.push(deleteCloudflareFile(url.split('/').pop(), 'avaliacoes', supabase)));
    }
  }

  const { data: rotinasData } = await supabase.from('rotinas_arquivadas').select('pdf_url').eq('aluno_id', userId);
  if (rotinasData) {
    for (const item of rotinasData) {
      if (item.pdf_url) {
        fileDeletionPromises.push(deleteCloudflareFile(item.pdf_url.split('/').pop(), 'rotinas', supabase));
      }
    }
  }

  const results = await Promise.allSettled(fileDeletionPromises);
  filesDeletedCount += results.filter((r) => r.status === 'fulfilled' && r.value).length;

  // 3. NOTIFICAR PROFESSORES E DESVINCULAR
  const { data: professoresVinculados, error: selectProfessoresError } = await supabase.from('alunos_professores').select('professor_id').eq('aluno_id', userId);
  if (selectProfessoresError) {
    console.error(`[Aluno Cancellation] Erro ao buscar professores para notificar:`, selectProfessoresError);
  } else if (professoresVinculados && professoresVinculados.length > 0) {
    console.log(`[Aluno Cancellation] Notificando ${professoresVinculados.length} professor(es) sobre o cancelamento...`);
    const notificationPromises = professoresVinculados.map((vinculo) =>
      supabase.functions.invoke('enviar-notificacao', {
        body: {
          destinatario_id: vinculo.professor_id,
          conteudo: `O aluno ${alunoData?.nome_completo || 'um de seus alunos'} cancelou a conta na plataforma.`
        }
      })
    );
    await Promise.allSettled(notificationPromises);
  }

  const { error: desvinculaError } = await supabase.from('alunos_professores').delete().eq('aluno_id', userId);
  if (desvinculaError) console.error(`[Aluno Cancellation] Erro ao desvincular aluno ${userId}:`, desvinculaError);
  else console.log(`[Aluno Cancellation] Aluno ${userId} desvinculado de todos os professores.`);

  return filesDeletedCount;
}

// HELPER FUNCTIONS
function getStoragePathFromUrl(url, bucketName) {
  try {
    const urlObject = new URL(url);
    const pathSegments = urlObject.pathname.split('/');
    const bucketIndex = pathSegments.indexOf(bucketName);
    if (bucketIndex !== -1 && bucketIndex < pathSegments.length - 1) {
      return pathSegments.slice(bucketIndex + 1).join('/');
    }
    return null;
  } catch (e) {
    console.error(`URL de avatar inválida: ${url}`, e);
    return null;
  }
}

async function deleteCloudflareFile(filename, bucket_type, supabase) {
  try {
    // ✅ CORREÇÃO: Alterado de 'delete-image' para 'delete-media'
    const { data: response, error } = await supabase.functions.invoke('delete-media', {
      body: { filename, bucket_type }
    });

    if (error || !response?.success) {
      console.error(`Falha ao deletar ${filename} do bucket ${bucket_type}:`, error ?? response);
      return false;
    }
    console.log(`Arquivo ${filename} deletado com sucesso do bucket ${bucket_type}.`);
    return true;
  } catch (edgeError) {
    const message = edgeError instanceof Error ? edgeError.message : String(edgeError);
    console.error(`Erro na Edge Function para ${filename}:`, message);
    return false;
  }
}
