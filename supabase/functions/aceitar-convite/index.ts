import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// URL base da aplicação web
const APP_URL = 'https://titans.fitness';

const handler = async (req) => {
  // Trata a requisição CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Extrai o token dos parâmetros da URL
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return Response.redirect(`${APP_URL}/convite-invalido?error=token_ausente`, 302);
    }

    // 1. Busca o convite na tabela 'convites'
    const { data: convite, error: errorConvite } = await supabase
      .from('convites')
      .select('id, professor_id, email_convidado, status, expires_at')
      .eq('token_convite', token)
      .single();

    if (errorConvite || !convite) {
      return Response.redirect(`${APP_URL}/convite-invalido?error=nao_encontrado`, 302);
    }

    if (convite.status !== 'pendente') {
      return Response.redirect(`${APP_URL}/convite-invalido?error=ja_utilizado`, 302);
    }

    // Verifica se o convite não expirou
    if (new Date(convite.expires_at) < new Date()) {
      return Response.redirect(`${APP_URL}/convite-invalido?error=expirado`, 302);
    }

    // 2. Busca o perfil do aluno pelo email
    const { data: aluno, error: errorAluno } = await supabase
      .from('alunos')
      .select('id')
      .eq('email', convite.email_convidado)
      .single();

    if (errorAluno || !aluno) {
      return Response.redirect(`${APP_URL}/convite-invalido?error=aluno_nao_encontrado`, 302);
    }

    // 3. Verifica se o aluno já segue este professor
    const { data: jaSegue, error: segueError } = await supabase
      .from('alunos_professores')
      .select('aluno_id')
      .eq('aluno_id', aluno.id)
      .eq('professor_id', convite.professor_id)
      .maybeSingle();

    if (segueError && segueError.code !== 'PGRST116') {
      console.error('Erro ao verificar relacionamento:', segueError);
      return Response.redirect(`${APP_URL}/convite-invalido?error=falha_ao_verificar`, 302);
    }

    if (jaSegue) {
      // Aluno já segue este professor, apenas atualiza o status do convite
      await supabase
        .from('convites')
        .update({ status: 'aceito', aceito_em: new Date().toISOString() })
        .eq('id', convite.id);
        
      return Response.redirect(`${APP_URL}/login?message=ja_seguindo`, 302);
    }

    // 4. CRIA o relacionamento de "seguir" na tabela alunos_professores
    const { error: relacionamentoError } = await supabase
      .from('alunos_professores')
      .insert({
        aluno_id: aluno.id,
        professor_id: convite.professor_id,
        data_seguindo: new Date().toISOString()
      });

    if (relacionamentoError) {
      console.error('Erro ao criar relacionamento:', relacionamentoError);
      return Response.redirect(`${APP_URL}/convite-invalido?error=falha_ao_seguir`, 302);
    }

    // 5. Atualiza o status do convite para 'aceito'
    await supabase
      .from('convites')
      .update({ 
        status: 'aceito',
        aceito_em: new Date().toISOString()
      })
      .eq('id', convite.id);

    // 6. SUCESSO: Redireciona para a tela de login com mensagem de sucesso
    return Response.redirect(`${APP_URL}/login?message=seguir_sucesso`, 302);

  } catch (error) {
    console.error('Erro inesperado na Edge Function aceitar-convite:', error);
    return Response.redirect(`${APP_URL}/convite-invalido?error=erro_interno`, 302);
  }
};

serve(handler);