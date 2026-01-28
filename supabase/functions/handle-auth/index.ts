// supabase/functions/handle-auth/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // CORS preflight
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
    console.log('🚀 [handle-auth] Edge Function evoluída iniciada');
    
    const body = await req.json();
    
    // ✅ NOVO: Modo "create" para criar usuário aluno sem email
    if (body.mode === 'create_aluno') {
      return await createAlunoUser(body);
    }
    
    // ✅ MANTIDO: Modo original para confirmar usuários existentes
    if (body.userId && body.userType) {
      return await confirmExistingUser(body);
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Parâmetros inválidos. Use mode=create_aluno ou forneça userId+userType'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 [handle-auth] Erro geral:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno da Edge Function',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// 🆕 NOVA FUNÇÃO: Criar usuário aluno sem enviar email
async function createAlunoUser(body: any) {
  console.log('👨‍🎓 [handle-auth] Modo create_aluno ativado');
  
  const { email, password, nomeCompleto, personalTrainerId } = body;
  
  // Validar dados obrigatórios
  if (!email || !password || !nomeCompleto || !personalTrainerId) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Dados obrigatórios: email, password, nomeCompleto, personalTrainerId'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log('👤 [handle-auth] Criando usuário:', email);

  // Conectar como service role (admin)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // ✅ CRIAR USUÁRIO JÁ CONFIRMADO VIA ADMIN API (SEM ENVIAR EMAIL)
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirmed_at: new Date().toISOString(), // ✅ JÁ CONFIRMADO!
      user_metadata: {
        user_type: 'aluno',
        nome_completo: nomeCompleto
      }
    });

    if (userError) {
      console.error('❌ [handle-auth] Erro ao criar usuário:', userError);
      
      if (userError.message?.includes('already registered') || 
          userError.message?.includes('already exists')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Este email já possui uma conta cadastrada.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      throw userError;
    }

    if (!userData.user) {
      throw new Error('Falha ao criar usuário');
    }

    console.log('✅ [handle-auth] Usuário criado e confirmado:', userData.user.id);

    const userId = userData.user.id;

    // Gerar avatar letter
    const generateAvatarLetter = (nome: string, email: string): string => {
      const nomeClean = nome?.trim();
      
      if (!nomeClean) {
        return email?.charAt(0)?.toUpperCase() || 'A';
      }
      
      const palavras = nomeClean.split(' ').filter(p => p.length > 0);
      const primeiraLetra = palavras[0].charAt(0).toUpperCase();
      
      if (palavras.length >= 2) {
        const ultimaLetra = palavras[palavras.length - 1].charAt(0).toUpperCase();
        return primeiraLetra + ultimaLetra;
      } else {
        const nomeUnico = palavras[0];
        const segundaLetra = nomeUnico.length > 1 
          ? nomeUnico.charAt(1).toUpperCase() 
          : 'L';
        return primeiraLetra + segundaLetra;
      }
    };

    const avatarLetter = generateAvatarLetter(nomeCompleto, email);
    console.log('🎨 [handle-auth] Avatar gerado:', avatarLetter);

    // Criar user_profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        user_type: 'aluno'
      });

    if (profileError) {
      console.error('❌ [handle-auth] Erro ao criar user_profile:', profileError);
      
      // Rollback: deletar usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    console.log('✅ [handle-auth] user_profile criado');

    // Criar perfil do aluno
    const { error: alunoError } = await supabaseAdmin
      .from('alunos')
      .insert({
        id: userId,
        nome_completo: nomeCompleto.trim(),
        email: email.toLowerCase().trim(),
        personal_trainer_id: personalTrainerId,
        onboarding_completo: false,
        avatar_letter: avatarLetter,
        avatar_color: '#3B82F6',
        avatar_type: 'letter',
        avatar_image_url: null,
      });

    if (alunoError) {
      console.error('❌ [handle-auth] Erro ao criar aluno:', alunoError);
      
      // Rollback: deletar usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw alunoError;
    }

    console.log('✅ [handle-auth] Aluno criado com sucesso');

    return new Response(JSON.stringify({
      success: true,
      message: 'Aluno criado e confirmado automaticamente',
      mode: 'create_aluno',
      userId: userId,
      avatarLetter: avatarLetter,
      email: email.toLowerCase().trim()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('💥 [handle-auth] Erro no create_aluno:', error);
    throw error;
  }
}

// ✅ MANTIDA: Função original para confirmar usuários existentes
async function confirmExistingUser(body: any) {
  console.log('🔄 [handle-auth] Modo confirmação de usuário existente');
  
  const { userId, userType } = body;
  
  console.log('👤 [handle-auth] Processando usuário:', userId, 'tipo:', userType);
  
  // Conectar como service role (admin)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  // Se for PERSONAL TRAINER, não fazer nada (deve verificar email manualmente)
  if (userType === 'personal_trainer') {
    console.log('👨‍💼 [handle-auth] Personal Trainer detectado - mantendo verificação manual');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Personal Trainer - verificação manual mantida',
      userType: 'personal_trainer',
      action: 'no_action'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Se for ALUNO, auto-confirmar email
  if (userType === 'aluno') {
    console.log('👨‍🎓 [handle-auth] Aluno detectado - iniciando auto-confirmação');
    
    try {
      // Auto-confirmar email usando Admin API
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirmed_at: new Date().toISOString()
      });

      if (updateError) {
        console.error('❌ [handle-auth] Erro na auto-confirmação:', updateError);
        
        // Rollback: Deletar usuário se auto-confirmação falhar
        console.log('🗑️ [handle-auth] Iniciando rollback - deletando usuário');
        try {
          await supabaseAdmin.auth.admin.deleteUser(userId);
          console.log('✅ [handle-auth] Rollback concluído - usuário deletado');
        } catch (rollbackError) {
          console.error('💥 [handle-auth] Erro no rollback:', rollbackError);
        }

        return new Response(JSON.stringify({
          success: false,
          error: 'Falha na auto-confirmação - conta removida',
          details: updateError.message,
          rollback: true
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('✅ [handle-auth] Email auto-confirmado com sucesso!');

      return new Response(JSON.stringify({
        success: true,
        message: 'Email auto-confirmado para aluno',
        userType: 'aluno',
        action: 'auto_confirmed',
        userId: userId,
        confirmedAt: updateData.user?.email_confirmed_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (confirmError: any) {
      console.error('💥 [handle-auth] Erro inesperado na confirmação:', confirmError);
      
      // Rollback: Deletar usuário em caso de erro inesperado
      console.log('🗑️ [handle-auth] Iniciando rollback por erro inesperado');
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        console.log('✅ [handle-auth] Rollback concluído - usuário deletado');
      } catch (rollbackError) {
        console.error('💥 [handle-auth] Erro no rollback:', rollbackError);
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Erro inesperado na auto-confirmação - conta removida',
        details: confirmError.message,
        rollback: true
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Tipo de usuário desconhecido
  console.log('❓ [handle-auth] Tipo de usuário desconhecido:', userType);
  
  return new Response(JSON.stringify({
    success: false,
    error: 'Tipo de usuário não reconhecido',
    userType: userType
  }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}