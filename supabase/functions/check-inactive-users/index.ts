/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const APP_URL = 'https://titans.fitness'; // URL base da sua aplicação para links em emails
const handler = async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    // A SERVICE_ROLE_KEY é passada via cabeçalho pelo pg_cron
    const serviceRoleKey = req.headers.get('x-supabase-api-key');
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({
        error: 'Service Role Key missing in headers'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) {
      return new Response(JSON.stringify({
        error: 'Brevo API Key not configured as a secret'
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    const today = new Date();
    // Ajusta as datas para o início do dia para evitar problemas de fuso horário/horas
    today.setHours(0, 0, 0, 0);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    // 1. Consultar usuários do auth.users e perfis de alunos
    const { data: usersAuth, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw new Error('Error listing users from auth: ' + authError.message);
    const { data: profiles, error: profilesError } = await supabase.from('alunos').select('id, email, nome_completo, personal_trainer_id'); // Pega dados do perfil do aluno
    if (profilesError) throw new Error('Error fetching profiles from public.alunos: ' + profilesError.message);
    const processedCount: { alertsSent: number; usersDeleted: number; errors: string[] } = {
      alertsSent: 0,
      usersDeleted: 0,
      errors: []
    };
    for (const user of usersAuth.users){
      // Ignorar usuários sem last_sign_in_at (nunca logaram ou são de serviço)
      if (!user.last_sign_in_at) continue;
      const lastSignInDate = new Date(user.last_sign_in_at);
      lastSignInDate.setHours(0, 0, 0, 0); // Zera horas para comparação de dias
      const userProfile = profiles.find((p)=>p.id === user.id);
      const userEmail = userProfile?.email || user.email; // Preferir email do perfil, senão do auth
      const userName = userProfile?.nome_completo || userEmail;
      // Lógica para 60 dias de inatividade (entre 60 e 89 dias)
      if (lastSignInDate <= sixtyDaysAgo && lastSignInDate > ninetyDaysAgo) {
        try {
          const subject = 'Aviso: Sua conta Titans Fitness será excluída em 30 dias!';
          const htmlContent = createInactivityEmail(userName, 'alert', APP_URL);
          await sendEmail(userEmail, subject, htmlContent, brevoApiKey);
          processedCount.alertsSent++;
          console.log(`Alert sent to ${userEmail} (60 days inactive).`);
        } catch (e) {
          console.error(`Failed to send alert email to ${userEmail}: ${e.message}`);
          processedCount.errors.push(`Alert email to ${userEmail} failed: ${e.message}`);
        }
      } else if (lastSignInDate <= ninetyDaysAgo) {
        try {
          // Excluir usuário (isso acionará a cascata no DB)
          const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
          if (deleteError) {
            console.error(`Failed to delete user ${user.id} (${userEmail}): ${deleteError.message}`);
            processedCount.errors.push(`Deletion of ${userEmail} failed: ${deleteError.message}`);
          } else {
            console.log(`User ${user.id} (${userEmail}) deleted due to inactivity.`);
            processedCount.usersDeleted++;
            // Opcional: Enviar email de confirmação de exclusão
            const subject = 'Sua conta Titans Fitness foi excluída por inatividade.';
            const htmlContent = createInactivityEmail(userName, 'deletion', APP_URL);
            await sendEmail(userEmail, subject, htmlContent, brevoApiKey);
          }
        } catch (e) {
          console.error(`Error during deletion process for ${userEmail}: ${e.message}`);
          processedCount.errors.push(`Deletion process for ${userEmail} failed: ${e.message}`);
        }
      }
    }
    return new Response(JSON.stringify({
      success: true,
      processed: processedCount
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error('Error in check-inactive-users Edge Function:', error.message);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
};
// Helper para enviar email via Brevo
async function sendEmail(toEmail, subject, htmlContent, brevoApiKey) {
  const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
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
      to: [
        {
          email: toEmail
        }
      ],
      subject,
      htmlContent
    })
  });
  if (!brevoResponse.ok) {
    const errorText = await brevoResponse.text();
    throw new Error(`Brevo API Error (${brevoResponse.status}): ${errorText}`);
  }
  return brevoResponse.json();
}
// Helper para criar o conteúdo HTML do email
function createInactivityEmail(userName, type, appUrl) {
  if (type === 'alert') {
    return createAlertEmail(userName, appUrl);
  } else {
    return createDeletionEmail(userName, appUrl);
  }
}
// Template para email de alerta (60 dias)
function createAlertEmail(userName, appUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aviso: Sua conta Titans Fitness será excluída em 30 dias!</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset básico para emails */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
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
        
        .logo-image {
            display: block;
            margin: 0 auto;
            max-width: 100%;
            height: auto;
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
        
        .warning-highlight {
            background: linear-gradient(135deg, #fff3e0 0%, #ffe8cc 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
            border-left: 4px solid #ff9800;
        }
        
        .warning-highlight h3 {
            color: #f57c00;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .warning-highlight p {
            color: #666;
            font-size: 14px;
        }
        
        .cta-container {
            text-align: center;
            margin: 40px 0;
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
            letter-spacing: 0.5px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            box-shadow: 0 4px 12px rgba(161, 30, 10, 0.3);
            transition: transform 0.2s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(161, 30, 10, 0.4);
            background: #8B1808;
        }
        
        .alternative-link {
            margin-top: 24px;
            padding: 20px;
            background: linear-gradient(135deg, #fff8f5 0%, #ffeee6 100%);
            border-radius: 12px;
            border-left: 4px solid #A11E0A;
        }
        
        .alternative-link p {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .alternative-link a {
            color: #A11E0A;
            text-decoration: none;
            word-break: break-all;
            font-size: 13px;
        }
        
        .security-info {
            background-color: #f8f9fa;
            border-radius: 16px;
            padding: 24px;
            margin: 32px 0;
            text-align: center;
        }
        
        .security-info h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 12px;
        }
        
        .security-info p {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .email-footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-content {
            font-size: 14px;
            color: #666666;
            line-height: 1.5;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #A11E0A;
            text-decoration: none;
            font-size: 14px;
        }
        
        /* Responsivo */
        @media only screen and (max-width: 600px) {
            .email-content {
                padding: 30px 20px;
            }
            
            .greeting {
                font-size: 20px;
            }
            
            .message {
                font-size: 15px;
            }
            
            .cta-button {
                padding: 14px 24px;
                font-size: 15px;
            }
            
            .logo-image {
                width: 200px;
                height: 133px;
            }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .email-wrapper {
                background-color: #1a1a1a;
            }
            
            .email-content {
                background-color: #1a1a1a;
            }
            
            .greeting {
                color: #ffffff;
            }
            
            .message {
                color: #cccccc;
            }
            
            .alternative-link {
                background: #2a2a2a;
            }
            
            .alternative-link p {
                color: #cccccc;
            }
            
            .warning-highlight {
                background: #2a2a2a;
            }
            
            .warning-highlight p {
                color: #cccccc;
            }
            
            .security-info {
                background-color: #2a2a2a;
            }
            
            .security-info h3 {
                color: #ffffff;
            }
            
            .security-info p {
                color: #cccccc;
            }
            
            .email-footer {
                background-color: #0f0f0f;
                border-top-color: #333333;
            }
            
            .footer-content {
                color: #999999;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <!-- Header com Logo Titans Fitness -->
        <div class="email-header">
            <img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitansFitnessLogo-grande.png" 
                 width="240" 
                 height="160" 
                 alt="Titans Fitness Logo" 
                 class="logo-image">
        </div>
        
        <!-- Conteúdo Principal -->
        <div class="email-content">
            <h1 class="greeting">⚠️ Ação necessária em sua conta!</h1>
            
            <div class="message">
                <p>Olá <strong>${userName}</strong>,</p>
                
                <p>Percebemos que você não acessa sua conta <strong style="color: #A11E0A;">Titans Fitness</strong> há 60 dias.</p>
                
                <p>Para manter sua conta ativa e preservar todos os seus dados, você precisa fazer login novamente.</p>
            </div>

            <!-- Destaque do aviso -->
            <div class="warning-highlight">
                <h3>⏰ Prazo importante</h3>
                <p>Sua conta será excluída permanentemente em 30 dias se não houver novo acesso!</p>
            </div>
            
            <div class="message">
                <p>Não perca seus treinos, histórico e conexões. Acesse agora mesmo!</p>
            </div>
            
            <!-- Call to Action -->
            <div class="cta-container">
                <a href="${appUrl}" class="cta-button">
                    🔓 Acessar minha conta
                </a>
            </div>
            
            <!-- Link alternativo -->
            <div class="alternative-link">
                <p><strong>Não consegue clicar no botão?</strong></p>
                <p>Copie e cole este link no seu navegador:</p>
                <a href="${appUrl}">${appUrl}</a>
            </div>
            
            <!-- Informações de segurança -->
            <div class="security-info">
                <h3>📋 Informações importantes:</h3>
                <p><strong>Esta é uma política de segurança</strong> para manter nossa plataforma atualizada.</p>
                <p>Após acessar, sua conta ficará ativa novamente.</p>
                <p>Se não desejar mais usar o Titans Fitness, pode ignorar este email.</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="email-footer">
            <div class="footer-content">
                <p><strong>Titans Fitness</strong> - Conectando Personal Trainers e Alunos</p>
                
                <div class="social-links">
                    <a href="https://titans.fitness">Site</a>
                </div>
                
                <p style="font-size: 12px; color: #999; margin-top: 16px;">
                    Este email foi enviado automaticamente. Por favor, não responda.<br>
                    Se precisar de ajuda, entre em contato pelo email: <a href="mailto:contato@titans.fitness" style="color: #A11E0A;">contato@titans.fitness</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}
// Template para email de exclusão (90 dias)
function createDeletionEmail(userName, appUrl) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sua conta Titans Fitness foi excluída por inatividade</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        /* Reset básico para emails */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
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
        
        .logo-image {
            display: block;
            margin: 0 auto;
            max-width: 100%;
            height: auto;
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
        
        .deletion-highlight {
            background: linear-gradient(135deg, #ffeaea 0%, #ffcccc 100%);
            border-radius: 16px;
            padding: 24px;
            margin: 24px 0;
            text-align: center;
            border-left: 4px solid #d32f2f;
        }
        
        .deletion-highlight h3 {
            color: #c62828;
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 8px;
        }
        
        .deletion-highlight p {
            color: #666;
            font-size: 14px;
        }
        
        .cta-container {
            text-align: center;
            margin: 40px 0;
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
            letter-spacing: 0.5px;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            box-shadow: 0 4px 12px rgba(161, 30, 10, 0.3);
            transition: transform 0.2s ease;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(161, 30, 10, 0.4);
            background: #8B1808;
        }
        
        .alternative-link {
            margin-top: 24px;
            padding: 20px;
            background: linear-gradient(135deg, #fff8f5 0%, #ffeee6 100%);
            border-radius: 12px;
            border-left: 4px solid #A11E0A;
        }
        
        .alternative-link p {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .alternative-link a {
            color: #A11E0A;
            text-decoration: none;
            word-break: break-all;
            font-size: 13px;
        }
        
        .security-info {
            background-color: #f8f9fa;
            border-radius: 16px;
            padding: 24px;
            margin: 32px 0;
            text-align: center;
        }
        
        .security-info h3 {
            font-size: 18px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 12px;
        }
        
        .security-info p {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        
        .email-footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer-content {
            font-size: 14px;
            color: #666666;
            line-height: 1.5;
        }
        
        .social-links {
            margin: 20px 0;
        }
        
        .social-links a {
            display: inline-block;
            margin: 0 8px;
            color: #A11E0A;
            text-decoration: none;
            font-size: 14px;
        }
        
        /* Responsivo */
        @media only screen and (max-width: 600px) {
            .email-content {
                padding: 30px 20px;
            }
            
            .greeting {
                font-size: 20px;
            }
            
            .message {
                font-size: 15px;
            }
            
            .cta-button {
                padding: 14px 24px;
                font-size: 15px;
            }
            
            .logo-image {
                width: 200px;
                height: 133px;
            }
        }
        
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
            .email-wrapper {
                background-color: #1a1a1a;
            }
            
            .email-content {
                background-color: #1a1a1a;
            }
            
            .greeting {
                color: #ffffff;
            }
            
            .message {
                color: #cccccc;
            }
            
            .alternative-link {
                background: #2a2a2a;
            }
            
            .alternative-link p {
                color: #cccccc;
            }
            
            .deletion-highlight {
                background: #2a2a2a;
            }
            
            .deletion-highlight p {
                color: #cccccc;
            }
            
            .security-info {
                background-color: #2a2a2a;
            }
            
            .security-info h3 {
                color: #ffffff;
            }
            
            .security-info p {
                color: #cccccc;
            }
            
            .email-footer {
                background-color: #0f0f0f;
                border-top-color: #333333;
            }
            
            .footer-content {
                color: #999999;
            }
        }
    </style>
</head>
<body>
    <div class="email-wrapper">
        <!-- Header com Logo Titans Fitness -->
        <div class="email-header">
            <img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitansFitnessLogo-grande.png" 
                 width="240" 
                 height="160" 
                 alt="Titans Fitness Logo" 
                 class="logo-image">
        </div>
        
        <!-- Conteúdo Principal -->
        <div class="email-content">
            <h1 class="greeting">📋 Informativo sobre sua conta</h1>
            
            <div class="message">
                <p>Olá <strong>${userName}</strong>,</p>
                
                <p>Sua conta <strong style="color: #A11E0A;">Titans Fitness</strong> foi excluída permanentemente devido à inatividade.</p>
                
                <p>Como não houve acesso por mais de 90 dias, removemos todos os seus dados conforme nossa política de privacidade.</p>
            </div>

            <!-- Destaque da exclusão -->
            <div class="deletion-highlight">
                <h3>🗑️ Conta excluída</h3>
                <p>Todos os dados foram removidos permanentemente da nossa plataforma.</p>
            </div>
            
            <div class="message">
                <p>Se desejar continuar usando nossos serviços, será necessário criar uma nova conta.</p>
                
                <p>Ficaremos felizes em tê-lo de volta!</p>
            </div>
            
            <!-- Call to Action -->
            <div class="cta-container">
                <a href="${appUrl}" class="cta-button">
                    🚀 Criar nova conta
                </a>
            </div>
            
            <!-- Link alternativo -->
            <div class="alternative-link">
                <p><strong>Não consegue clicar no botão?</strong></p>
                <p>Copie e cole este link no seu navegador:</p>
                <a href="${appUrl}">${appUrl}</a>
            </div>
            
            <!-- Informações de segurança -->
            <div class="security-info">
                <h3>🔒 Informações importantes:</h3>
                <p><strong>Esta é uma política de segurança</strong> para proteger dados de usuários inativos.</p>
                <p>Nenhum dado pessoal foi compartilhado ou mantido.</p>
                <p>Uma nova conta será completamente independente da anterior.</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="email-footer">
            <div class="footer-content">
                <p><strong>Titans Fitness</strong> - Conectando Personal Trainers e Alunos</p>
                
                <div class="social-links">
                    <a href="https://titans.fitness">Site</a>
                </div>
                
                <p style="font-size: 12px; color: #999; margin-top: 16px;">
                    Este email foi enviado automaticamente. Por favor, não responda.<br>
                    Se precisar de ajuda, entre em contato pelo email: <a href="mailto:contato@titans.fitness" style="color: #A11E0A;">contato@titans.fitness</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}
serve(handler);
