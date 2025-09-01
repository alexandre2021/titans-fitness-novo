// supabase/functions/cancel-account/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
console.log('🚀 Edge Function cancel-account iniciada');
serve(async (req)=>{
  console.log(`🚀 [Cancel Account] Iniciando processamento...`);
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
    // Get authorization header
    const authorization = req.headers.get('authorization');
    if (!authorization) {
      console.error('❌ [Cancel Account] Authorization header missing');
      return new Response(JSON.stringify({
        error: 'Authorization required'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    // Client for regular operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Client for auth operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    // Get user from authorization token
    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('❌ [Cancel Account] Invalid user token:', userError);
      return new Response(JSON.stringify({
        error: 'Invalid user token'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`👤 [Cancel Account] Processing cancellation for user: ${user.email} (${user.id})`);
    // Parse request body
    const { user_type } = await req.json();
    if (!user_type || ![
      'aluno',
      'personal_trainer'
    ].includes(user_type)) {
      console.error('❌ [Cancel Account] Invalid user_type:', user_type);
      return new Response(JSON.stringify({
        error: 'Invalid user_type'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let filesDeleted = 0;
    if (user_type === 'personal_trainer') {
      console.log('🏋️ [Cancel Account] Processing Personal Trainer cancellation...');
      // 1. Get PT files (avatar + exercise media)
      const ptFiles = await getPTFiles(user.id, supabase);
      // 2. Delete files from Cloudflare R2
      for (const file of ptFiles){
        try {
          await deleteFile(file.file_url, file.bucket_type, user.id, supabase);
          filesDeleted++;
        } catch (error) {
          console.error(`⚠️ [Cancel Account] Failed to delete file ${file.file_url}:`, error);
        // Continue with other files even if one fails
        }
      }
      // 3. Unlink all students
      console.log('🔗 [Cancel Account] Unlinking students...');
      const { error: unlinkError } = await supabase.from('alunos').update({
        personal_trainer_id: null
      }).eq('personal_trainer_id', user.id);
      if (unlinkError) {
        console.error('❌ [Cancel Account] Failed to unlink students:', unlinkError);
      } else {
        console.log('✅ [Cancel Account] Students unlinked successfully');
      }
    } else if (user_type === 'aluno') {
      console.log('🎓 [Cancel Account] Processing Aluno cancellation...');
      // Get aluno files (avatar + evaluations + routines)
      const alunoFiles = await getAlunoFiles(user.id, supabase);
      // Delete files from Cloudflare R2
      for (const file of alunoFiles){
        try {
          await deleteFile(file.file_url, file.bucket_type, user.id, supabase);
          filesDeleted++;
        } catch (error) {
          console.error(`⚠️ [Cancel Account] Failed to delete file ${file.file_url}:`, error);
        // Continue with other files even if one fails
        }
      }
    }
    // 4. Delete user from auth (cascades to related tables)
    console.log('🗑️ [Cancel Account] Deleting user from auth...');
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('❌ [Cancel Account] Failed to delete user:', deleteError);
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }
    console.log('✅ [Cancel Account] Account cancelled successfully');
    console.log(`📊 [Cancel Account] Files deleted: ${filesDeleted}`);
    return new Response(JSON.stringify({
      success: true,
      message: 'Account cancelled successfully',
      filesDeleted
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('💥 [Cancel Account] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
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
// Helper function to get PT files
async function getPTFiles(userId, supabase) {
  const filesToProcess = [];
  // 1. Get PT avatar
  const { data: ptData } = await supabase.from('personal_trainers').select('avatar_type, avatar_image_url').eq('id', userId).single();
  if (ptData?.avatar_type === 'image' && ptData.avatar_image_url) {
    console.log(`📷 [Cancel Account] Found PT avatar: ${ptData.avatar_image_url}`);
    filesToProcess.push({
      file_url: ptData.avatar_image_url,
      bucket_type: 'avatars'
    });
  }
  // 2. Get exercise media
  const { data: exercicios } = await supabase.from('exercicios').select('imagem_1_url, imagem_2_url, video_url').eq('pt_id', userId);
  if (exercicios) {
    for (const ex of exercicios){
      if (ex.imagem_1_url) {
        filesToProcess.push({
          file_url: ex.imagem_1_url,
          bucket_type: 'exercicios'
        });
      }
      if (ex.imagem_2_url) {
        filesToProcess.push({
          file_url: ex.imagem_2_url,
          bucket_type: 'exercicios'
        });
      }
      if (ex.video_url) {
        filesToProcess.push({
          file_url: ex.video_url,
          bucket_type: 'exercicios'
        });
      }
    }
  }
  console.log(`📁 [Cancel Account] Found ${filesToProcess.length} files for PT ${userId}`);
  return filesToProcess;
}
// Helper function to get Aluno files
async function getAlunoFiles(userId, supabase) {
  const filesToProcess = [];
  // 1. Get aluno avatar
  const { data: alunoData } = await supabase.from('alunos').select('avatar_type, avatar_image_url').eq('id', userId).single();
  if (alunoData?.avatar_type === 'image' && alunoData.avatar_image_url) {
    console.log(`📷 [Cancel Account] Found aluno avatar: ${alunoData.avatar_image_url}`);
    filesToProcess.push({
      file_url: alunoData.avatar_image_url,
      bucket_type: 'avatars'
    });
  }
  // 2. Get evaluation photos
  const { data: avaliacoes } = await supabase.from('avaliacoes_fisicas').select('foto_frente_url, foto_lado_url, foto_costas_url').eq('aluno_id', userId);
  if (avaliacoes) {
    for (const av of avaliacoes){
      if (av.foto_frente_url) {
        filesToProcess.push({
          file_url: av.foto_frente_url,
          bucket_type: 'avaliacoes'
        });
      }
      if (av.foto_lado_url) {
        filesToProcess.push({
          file_url: av.foto_lado_url,
          bucket_type: 'avaliacoes'
        });
      }
      if (av.foto_costas_url) {
        filesToProcess.push({
          file_url: av.foto_costas_url,
          bucket_type: 'avaliacoes'
        });
      }
    }
  }
  // 3. Get routine PDFs
  const { data: rotinas } = await supabase.from('rotinas_arquivadas').select('pdf_url').eq('aluno_id', userId);
  if (rotinas) {
    for (const rot of rotinas){
      if (rot.pdf_url) {
        filesToProcess.push({
          file_url: rot.pdf_url,
          bucket_type: 'rotinas'
        });
      }
    }
  }
  console.log(`📁 [Cancel Account] Found ${filesToProcess.length} files for aluno ${userId}`);
  return filesToProcess;
}
// Helper function to delete file using delete-image edge function
async function deleteFile(fileUrl, bucketType, userId, supabase) {
  const filename = fileUrl.split('?')[0].split('/').pop();
  if (!filename) {
    console.warn(`⚠️ [Cancel Account] Invalid file URL: ${fileUrl} for user ${userId}`);
    return;
  }
  console.log(`🗑️ [Cancel Account] Deleting ${filename} from ${bucketType} for user ${userId}`);
  const { error } = await supabase.functions.invoke('delete-image', {
    body: {
      filename,
      bucket_type: bucketType
    }
  });
  if (error) {
    console.error(`❌ [Cancel Account] Failed to delete ${filename}:`, error);
    throw error;
  } else {
    console.log(`✅ [Cancel Account] Deleted ${filename} successfully`);
  }
}
