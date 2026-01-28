// Edge Function: register-student
// Arquivo: supabase/functions/register-student/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Criar cliente Supabase com service role (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse do body da requisição
    const { 
      nome_completo, 
      email, 
      password, 
      convite_id, 
      token_convite, 
      professor_id, 
      avatar_letter, 
      avatar_color 
    } = await req.json();

    console.log('=== INICIANDO REGISTRO DE ALUNO ===');
    console.log('Dados recebidos:', {
      nome_completo,
      email,
      convite_id,
      professor_id
    });

    // 1. Validar o convite primeiro
    console.log('1. Validando convite...');
    const { data: convite, error: conviteError } = await supabaseAdmin
      .from('convites')
      .select('*')
      .eq('id', convite_id)
      .eq('token_convite', token_convite)
      .eq('status', 'pendente')
      .gt('expires_at', new Date().toISOString())
      .single();

    if (conviteError || !convite) {
      console.error('Convite inválido:', conviteError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid invite token or expired invite'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    console.log('Convite válido encontrado:', convite.id);

    // 2. Criar usuário no Supabase Auth
    console.log('2. Criando usuário no Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nome_completo: nome_completo,
        user_type: 'aluno'
      }
    });

    if (authError || !authData.user) {
      console.error('Erro ao criar usuário:', authError);
      let errorMessage = 'Failed to create user account';
      if (authError?.message?.includes('already registered')) {
        errorMessage = 'User already registered';
      }
      return new Response(JSON.stringify({
        success: false,
        error: errorMessage
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }

    const userId = authData.user.id;
    console.log('Usuário criado com ID:', userId);

    // 3. Criar perfil genérico
    console.log('3. Criando user_profiles...');
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        user_type: 'aluno'
      });

    if (profileError) {
      console.error('Erro ao criar user_profiles:', profileError);
      // Se falhar, deletar o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create user profile'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    console.log('User profile criado com sucesso');

    // 4. Criar registro do aluno (SEM professor_id - não há mais vínculo direto no cadastro)
    console.log('4. Criando registro de aluno...');
    const { error: alunoError } = await supabaseAdmin
      .from('alunos')
      .insert({
        id: userId,
        nome_completo: nome_completo,
        email: email,
        telefone: null,
        avatar_type: 'letter',
        avatar_letter: avatar_letter,
        avatar_color: avatar_color,
        onboarding_completo: false,
        status: 'ativo'
        // NOTA: Não definimos professor_id aqui - o campo é para rotina ativa apenas
      });

    if (alunoError) {
      console.error('Erro ao criar aluno:', alunoError);
      // Rollback: deletar user_profiles e usuário
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create student record'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    console.log('Registro de aluno criado com sucesso');

    // 5. CRIAR RELACIONAMENTO N:N - Aluno automaticamente "segue" o professor do convite
    console.log('5. Criando relacionamento de seguir...');
    const { error: relacionamentoError } = await supabaseAdmin
      .from('alunos_professores')
      .insert({
        aluno_id: userId,
        professor_id: convite.professor_id,
        data_seguindo: new Date().toISOString()
      });

    if (relacionamentoError) {
      console.error('Erro ao criar relacionamento:', relacionamentoError);
      // Rollback: deletar aluno, user_profiles e usuário
      await supabaseAdmin.from('alunos').delete().eq('id', userId);
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create follow relationship'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }

    console.log('Relacionamento de seguir criado com sucesso');

    // 6. Invalidar o convite usando a Edge Function existente
    console.log('6. Invalidando convite via Edge Function...');
    try {
      const invalidateResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/invalidate-invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conviteId: convite_id,
          token: token_convite
        })
      });

      const invalidateResult = await invalidateResponse.json();
      console.log('Resultado da invalidação:', invalidateResult);
    } catch (invalidateError) {
      console.error('Erro ao invalidar convite:', invalidateError);
      // Não é crítico, continue
    }

    console.log('=== CADASTRO CONCLUÍDO COM SUCESSO ===');
    return new Response(JSON.stringify({
      success: true,
      data: {
        user_id: userId,
        message: 'Student registered successfully and now following professor'
      }
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });

  } catch (error) {
    console.error('Erro inesperado na Edge Function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});