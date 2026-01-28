import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// --- NOVA FUNÇÃO PARA GERAR QR CODE ---
async function processarGeracaoQrCode(supabase, professor_id, nome_professor) {
  const { data: convite, error } = await supabase.from('convites').insert({
    professor_id,
    email_convidado: null, // Sem email para QR Code
    tipo_convite: 'cadastro'
  }).select('token_convite').maybeSingle();

  if (error) throw new Error('Erro ao criar token de convite: ' + error.message);
  if (!convite) throw new Error('Falha ao recuperar token após criação.');

  return new Response(JSON.stringify({
    success: true,
    token: convite.token_convite,
    cenario: 'qrcode'
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// --- FUNÇÕES DE PROCESSAMENTO ---
async function processarConviteCadastro(supabase, email_aluno, professor_id, nome_professor) {
  const { data: convite, error } = await supabase.from('convites').insert({
    professor_id,
    email_convidado: email_aluno,
    tipo_convite: 'cadastro'
  }).select('token_convite').maybeSingle();

  if (error) throw new Error('Erro ao criar convite de cadastro: ' + error.message);
  if (!convite) throw new Error('Falha ao recuperar convite após criação.');

  const cadastroUrl = `https://titans.fitness/cadastro/aluno?token=${convite.token_convite}`;
  const htmlEmail = criarEmailCadastro(nome_professor, cadastroUrl);

  await enviarEmail(email_aluno, nome_professor, htmlEmail, 'cadastro');

  return new Response(JSON.stringify({
    success: true,
    cenario: 'email_novo'
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

async function processarConviteVinculo(supabase, email_aluno, professor_id, nome_professor, supabaseUrl) {
  const { data: convite, error } = await supabase.from('convites').insert({
    professor_id,
    email_convidado: email_aluno,
    tipo_convite: 'vinculo'
  }).select('token_convite').maybeSingle();

  if (error) throw new Error('Erro ao criar convite de vínculo: ' + error.message);
  if (!convite) throw new Error('Falha ao recuperar convite de vínculo após criação.');

  const aceitarUrl = `${supabaseUrl}/functions/v1/aceitar-convite?token=${convite.token_convite}`;
  const htmlEmail = criarEmailVinculo(nome_professor, aceitarUrl);

  await enviarEmail(email_aluno, nome_professor, htmlEmail, 'vinculo');

  return new Response(JSON.stringify({
    success: true,
    cenario: 'aluno_existente'
  }), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

// --- FUNÇÃO PRINCIPAL (HANDLER) ---
const handler = async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { email_aluno, professor_id, nome_professor, no_email } = await req.json();

    // Validação diferente para QR Code
    if (no_email === true) {
      // Modo QR Code - só precisa de professor_id e nome_professor
      if (!professor_id || !nome_professor) {
        return new Response(JSON.stringify({
          success: false,
          error_type: 'DADOS_INVALIDOS',
          message: 'professor_id e nome_professor são obrigatórios'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Gera apenas o token para QR Code
      return await processarGeracaoQrCode(supabase, professor_id, nome_professor);
    }

    // Modo normal (com email)
    if (!email_aluno || !professor_id || !nome_professor) {
      return new Response(JSON.stringify({
        success: false,
        error_type: 'DADOS_INVALIDOS',
        message: 'Dados obrigatórios faltando'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verifica se já existe convite pendente DESTE professor para ESTE aluno
    const { data: convitePendente, error: errorConvitePendente } = await supabase
      .from('convites')
      .select('id')
      .eq('email_convidado', email_aluno)
      .eq('professor_id', professor_id)
      .eq('status', 'pendente')
      .maybeSingle();

    if (errorConvitePendente) {
      throw new Error('Erro ao verificar convites pendentes: ' + errorConvitePendente.message);
    }

    if (convitePendente) {
      return new Response(JSON.stringify({
        success: false,
        error_type: 'CONVITE_JA_ENVIADO',
        message: 'Já existe um convite pendente deste professor para este aluno.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verifica se o usuário existe
    const { data: { users }, error: listUsersError } = await supabase.auth.admin.listUsers();

    if (listUsersError) {
      throw new Error('Erro ao listar usuários: ' + listUsersError.message);
    }

    const usuarioExistente = users.find((user) => user.email === email_aluno);

    if (usuarioExistente) {
      // Usuário existe - verificar se já segue este professor
      const { data: jaSegue, error: segueError } = await supabase
        .from('alunos_professores')
        .select('aluno_id')
        .eq('aluno_id', usuarioExistente.id)
        .eq('professor_id', professor_id)
        .maybeSingle();

      if (segueError && segueError.code !== 'PGRST116') {
        throw new Error('Erro ao verificar relacionamento: ' + segueError.message);
      }

      if (jaSegue) {
        return new Response(JSON.stringify({
          success: false,
          error_type: 'ALUNO_JA_SEGUE',
          message: 'Este aluno já segue você.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Aluno existe mas não segue este professor - enviar convite de vínculo
      return await processarConviteVinculo(supabase, email_aluno, professor_id, nome_professor, supabaseUrl);
    } else {
      // Usuário não existe - enviar convite de cadastro
      return await processarConviteCadastro(supabase, email_aluno, professor_id, nome_professor);
    }
  } catch (error) {
    console.error('💥 Erro inesperado na Edge Function:', error);
    return new Response(JSON.stringify({
      success: false,
      error_type: 'ERRO_INTERNO',
      message: error.message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

// --- FUNÇÕES AUXILIARES E TEMPLATES ---
async function enviarEmail(email_aluno, nome_professor, htmlContent, tipoConvite) {
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  if (!brevoApiKey) throw new Error('BREVO_API_KEY não configurada');

  const subject = tipoConvite === 'cadastro'
    ? `${nome_professor} te convidou para o Titans Fitness 🎯`
    : `${nome_professor} quer que você o siga no Titans Fitness 🤝`;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': brevoApiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: {
        name: 'Titans Fitness',
        email: 'contato@titans.fitness'
      },
      to: [{ email: email_aluno }],
      subject,
      htmlContent
    })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Falha no envio de email: ${errorBody}`);
  }
}

function criarEmailCadastro(nome_professor, cadastroUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${nome_professor} te convidou para o Titans Fitness</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f5f5f5;
        }
        .email-wrapper {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background: #f8f9fa;
            padding: 30px 20px;
            text-align: center;
        }
        .email-content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
            text-align: center;
        }
        .message {
            font-size: 16px;
            color: #666666;
            margin-bottom: 32px;
            line-height: 1.7;
            text-align: center;
        }
        .professor-highlight {
            background: linear-gradient(135deg, #fff8f5 0%, #ffeee6 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
            border-left: 4px solid #A11E0A;
        }
        .professor-highlight h3 {
            color: #A11E0A;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .professor-highlight p {
            color: #666;
            font-size: 14px;
        }
        .cta-button {
            display: inline-block;
            background: #A11E0A;
            color: white !important;
            text-decoration: none;
            padding: 18px 36px;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 700;
            text-align: center;
            margin: 20px 0;
        }
        .cta-container {
            text-align: center;
            margin: 40px 0;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-header">
            <img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitansFitnessLogo-grande.png" 
                 width="240" 
                 height="160" 
                 alt="Titans Fitness Logo">
        </div>
        
        <div class="email-content">
            <h1 class="greeting">🎯 Você foi convidado!</h1>
            
            <div class="message">
                <p>Você recebeu um convite especial para se juntar ao <strong style="color: #A11E0A;">Titans Fitness</strong>!</p>
                <p>Uma plataforma que conecta Professores e alunos de forma moderna e eficiente.</p>
            </div>

            <div class="professor-highlight">
                <h3>💪 ${nome_professor}</h3>
                <p>te convidou para fazer parte da nossa comunidade fitness!</p>
            </div>
            
            <div class="message">
                <p>Crie sua conta gratuita e comece sua jornada fitness seguindo este professor.</p>
            </div>
            
            <div class="cta-container">
                <a href="${cadastroUrl}" class="cta-button">
                    🚀 Criar minha conta
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

function criarEmailVinculo(nome_professor, aceitarUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${nome_professor} quer que você o siga</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f5f5f5;
        }
        .email-wrapper {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
        }
        .email-header {
            background: #f8f9fa;
            padding: 30px 20px;
            text-align: center;
        }
        .email-content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 16px;
            text-align: center;
        }
        .message {
            font-size: 16px;
            color: #666666;
            margin-bottom: 32px;
            line-height: 1.7;
            text-align: center;
        }
        .professor-highlight {
            background: linear-gradient(135deg, #fff8f5 0%, #ffeee6 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
            border-left: 4px solid #A11E0A;
        }
        .professor-highlight h3 {
            color: #A11E0A;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        .professor-highlight p {
            color: #666;
            font-size: 14px;
        }
        .cta-button {
            display: inline-block;
            background: #A11E0A;
            color: white !important;
            text-decoration: none;
            padding: 18px 36px;
            border-radius: 12px;
            font-size: 17px;
            font-weight: 700;
            text-align: center;
            margin: 20px 0;
        }
        .cta-container {
            text-align: center;
            margin: 40px 0;
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <div class="email-header">
            <img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitansFitnessLogo-grande.png" 
                 width="240" 
                 height="160" 
                 alt="Titans Fitness Logo">
        </div>
        
        <div class="email-content">
            <h1 class="greeting">🤝 Nova solicitação!</h1>
            
            <div class="message">
                <p>Você tem uma nova solicitação no <strong style="color: #A11E0A;">Titans Fitness</strong>!</p>
                <p>Um Professor gostaria de se conectar com você.</p>
            </div>

            <div class="professor-highlight">
                <h3>💪 ${nome_professor}</h3>
                <p>quer se conectar com você na plataforma!</p>
            </div>
            
            <div class="message">
                <p>Se você conhece este profissional e deseja seguí-lo, basta clicar no botão abaixo.</p>
            </div>
            
            <div class="cta-container">
                <a href="${aceitarUrl}" class="cta-button">
                    ✅ Começar a seguir
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;
}

serve(handler);