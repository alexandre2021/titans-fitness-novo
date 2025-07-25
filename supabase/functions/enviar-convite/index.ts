import { serve, type ServeHandler } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler: ServeHandler = async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { nome_aluno, email_aluno, codigo_pt, nome_personal } = await req.json();

    // Validar dados obrigatórios
    if (!nome_aluno || !email_aluno || !codigo_pt || !nome_personal) {
      return new Response(JSON.stringify({ success: false, error: 'Dados obrigatórios faltando' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      console.error('❌ BREVO_API_KEY não configurada nos Secrets da função.');
      return new Response(JSON.stringify({ success: false, error: 'Configuração de email do servidor não encontrada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Template HTML completo para o e-mail de convite
    const htmlEmail = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${nome_personal} te convidou para o Titans Fitness</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background: #f8f9fa; padding: 30px 20px; text-align: center;">
          <img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitansFitnessLogo.png" 
               width="240" height="160" alt="Titans Fitness Logo" 
               style="display: block; margin: 0 auto; max-width: 100%; height: auto;">
        </div>
        <div style="padding: 40px 30px;">
          <h1 style="font-size: 24px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px; text-align: center;">🎉 Você foi convidado!</h1>
          <div style="font-size: 16px; color: #666666; margin-bottom: 24px; line-height: 1.7; text-align: center;">
            <p><strong style="color: #A11E0A; font-weight: 700;">${nome_personal}</strong> te convidou para fazer parte do <strong>Titans Fitness</strong>!</p>
            <p>Uma plataforma completa que vai revolucionar seus treinos e acompanhamento fitness.</p>
          </div>
          <div style="background: linear-gradient(135deg, #fff8f5 0%, #ffeee6 100%); border: 2px solid #A11E0A; border-radius: 16px; padding: 24px; text-align: center; margin: 32px 0;">
            <div style="font-size: 14px; color: #666; margin-bottom: 8px; font-weight: 500;">Código do seu Personal Trainer:</div>
            <div style="font-size: 32px; font-weight: 800; color: #A11E0A; letter-spacing: 4px; font-family: monospace;">${codigo_pt}</div>
            <div style="font-size: 12px; color: #666; margin-top: 8px;">Use este código no seu cadastro</div>
          </div>
          <div style="margin-top: 32px; font-size: 14px; color: #888; text-align: center;">
            <p><strong>Dúvidas?</strong> Entre em contato com seu Personal Trainer.</p>
          </div>
        </div>
        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="font-size: 14px; color: #666; margin: 0;"><strong>Titans Fitness</strong> - Conectando Personal Trainers e Alunos</p>
          <p style="font-size: 12px; color: #999; margin-top: 16px;">
            Este convite foi enviado por <strong>${nome_personal}</strong><br>
            Se precisar de ajuda: <a href="mailto:suporte@titans.fitness" style="color: #A11E0A;">contato@titans.fitness</a>
          </p>
        </div>
      </div>
    </body>
    </html>`;

    // Enviar email via Brevo API
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Titans Fitness',
          email: 'contato@titans.fitness',
        },
        to: [{ email: email_aluno }],
        subject: `${nome_personal} te convidou para o Titans Fitness - Código: ${codigo_pt}`,
        htmlContent: htmlEmail,
      }),
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      console.error('❌ Erro da API Brevo:', errorText);
      return new Response(JSON.stringify({ success: false, error: 'Falha no serviço de envio de email', details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const brevoResult = await brevoResponse.json();
    console.log('✅ Email de convite enviado via Brevo:', brevoResult);

    return new Response(JSON.stringify({ success: true, brevo_response: brevoResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Erro inesperado na Edge Function:', error);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

serve(handler);