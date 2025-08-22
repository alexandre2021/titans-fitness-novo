import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios'; // For Brevo API

// Supabase Client (for regular queries and Edge Function calls)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase environment variables are not set.");
  throw new Error("Application is not configured correctly.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Supabase Admin Client (for auth.users operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Brevo API Configuration
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@titansfitness.com'; // Default sender
const brevoSenderName = 'Titans Fitness'; // Default sender name
const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

if (!brevoApiKey) {
  console.warn("Brevo API Key is not set. Email warnings will be skipped.");
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 1. Proteger a rota da API
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // 2. Garantir que é uma requisição POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    console.log("--- Cron Job: Inactive User Processing Started ---");

    const now = new Date();
    // TEMPORARY TEST LOGIC START: Make users who signed in today appear inactive
    const sixtyDaysAgo = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000)).toISOString(); // Tomorrow
    const ninetyDaysAgo = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000)).toISOString(); // Tomorrow
    // TEMPORARY TEST LOGIC END

    // Busca todos os usuários de auth.users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw new Error(JSON.stringify(usersError));

    // Fetch last_warning_email_sent_at from the 'alunos' table
    const { data: alunosData, error: alunosError } = await supabase
      .from('alunos')
      .select('id, last_warning_email_sent_at');
    if (alunosError) throw new Error(JSON.stringify(alunosError));

    const alunoWarningMap = new Map(alunosData.map(aluno => [aluno.id, aluno.last_warning_email_sent_at]));

    const usersToWarn = [];
    const usersToDelete = [];

    for (const user of users.users) {
      const lastSignInAt = user.last_sign_in_at;
      if (!lastSignInAt) {
        // Usuário nunca logou, pode ser um convite pendente ou conta nova. Ignorar por enquanto.
        continue;
      }

      const lastSignInDate = new Date(lastSignInAt);
      const lastWarningEmailSentAt = alunoWarningMap.get(user.id);

      // Verifica se o usuário está inativo há 90 dias ou mais
      if (lastSignInDate < new Date(ninetyDaysAgo)) {
        usersToDelete.push(user);
      }
      // Verifica se o usuário está inativo há 60 dias (TEMPORARY TEST: bypass lastWarningEmailSentAt check)
      else if (lastSignInDate < new Date(sixtyDaysAgo)) {
        usersToWarn.push(user);
      }
    }

    console.log(`Found ${usersToWarn.length} users to warn (60 days inactive, first time).`);
    console.log(`Found ${usersToDelete.length} users to delete (90+ days inactive).`);

    // --- Processa Usuários para Aviso (60 dias inativos, primeira vez) ---
    if (brevoApiKey) {
      for (const user of usersToWarn) {
        console.log(`Sending warning email to user: ${user.email}`);
        try {
          await axios.post(brevoApiUrl, {
            sender: { email: brevoSenderEmail, name: brevoSenderName },
            to: [{ email: user.email }],
            subject: 'Aviso: Sua conta Titans Fitness pode ser desativada por inatividade',
            htmlContent: `
              <!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Aviso de Inatividade - Titans Fitness</title>
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
            <h1 class="greeting">⚠️ Sua conta precisa de atenção!</h1>
            
            <div class="message">
                <p>Olá,</p>
                <p>Notamos que faz algum tempo que você não acessa sua conta na <strong style="color: #A11E0A;">Titans Fitness</strong>. Já se passaram 60 dias desde seu último login.</p>
                <p>Para garantir a segurança e a gestão de nossos recursos, contas inativas por <strong>90 dias</strong> são programadas para exclusão permanente.</p>
                <p>Não queremos que você perca seu progresso! Para manter sua conta ativa, basta fazer login nos próximos 30 dias.</p>
            </div>
            
            <!-- Call to Action -->
            <div class="cta-container">
                <a href="https://app.titans.fitness/login" class="cta-button">
                    💪 Manter minha conta ativa
                </a>
            </div>
            
            <!-- Link alternativo -->
            <div class="alternative-link">
                <p><strong>O botão não funciona?</strong></p>
                <p>Copie e cole o seguinte link no seu navegador:</p>
                <a href="https://app.titans.fitness/login">https://app.titans.fitness/login</a>
            </div>
            
            <!-- Informações de segurança -->
            <div class="security-info">
                <h3>🔒 Informações importantes:</h3>
                <p>Se você não fizer login nos próximos <strong>30 dias</strong>, sua conta e todos os dados associados (rotinas, avaliações, etc.) serão <strong>permanentemente excluídos</strong>.</p>
                <p>Caso tenha feito login recentemente, por favor, desconsidere este aviso.</p>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="email-footer">
            <div class="footer-content">
                <p><strong>Titans Fitness</strong> - Conectando Personal Trainers e Alunos</p>
                
                <div class="social-links">
                    <a href="#">App Store</a>
                    <a href="#">Google Play</a>
                    <a href="https://titans.fitness">Site</a>
                </div>
                
                <p style="font-size: 12px; color: #999; margin-top: 16px;">
                    Este email foi enviado automaticamente. Por favor, não responda.<br>
                    Se precisar de ajuda, entre em contato pelo email: <a href="mailto:suporte@titans.fitness" style="color: #A11E0A;">contato@titans.fitness</a>
                </p>
            </div>
        </div>
    </div>
</body>
</html>
            `,
          }, {
            headers: {
              'api-key': brevoApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          console.log(`Warning email sent to ${user.email}`);

          // Update last_warning_email_sent_at in the alunos table
          const { error: updateError } = await supabase
            .from('alunos')
            .update({ last_warning_email_sent_at: new Date().toISOString() })
            .eq('id', user.id);

          if (updateError) {
            console.error(`Failed to update last_warning_email_sent_at for user ${user.id}:`, JSON.stringify(updateError));
          }
        } catch (emailError: any) {
          console.error(`Failed to send warning email to ${user.email}:`, emailError.response?.data || emailError.message);
        }
      }
    } else {
      console.warn("Brevo API Key not set. Skipping sending warning emails.");
    }

    // --- Processa Usuários para Exclusão (90+ dias inativos) ---
    let totalFilesDeleted = 0;

    for (const user of usersToDelete) {
      console.log(`--- Processing deletion for user: ${user.email} (ID: ${user.id}) ---`);

      // 1. Coleta todas as URLs de arquivos para este usuário
      const userFilesToProcess = [];

      // a. Da tabela alunos (avatar_image_url)
      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('id, avatar_image_url')
        .eq('id', user.id)
        .single();
      if (alunoError) {
        console.error(`Error fetching aluno data for user ${user.id}:`, JSON.stringify(alunoError));
      } else if (alunoData?.avatar_image_url) {
        userFilesToProcess.push({ user_id: user.id, file_url: alunoData.avatar_image_url, bucket_type_edge_function: 'avatars' }); // Assumindo 'avatars' bucket
      }

      // b. Da tabela avaliacoes_fisicas
      const { data: avaliacoesData, error: avaliacoesError } = await supabase
        .from('avaliacoes_fisicas')
        .select('foto_frente_url, foto_lado_url, foto_costas_url')
        .eq('aluno_id', user.id);
      if (avaliacoesError) {
        console.error(`Error fetching avaliacoes_fisicas for user ${user.id}:`, JSON.stringify(avaliacoesError));
      } else if (avaliacoesData) {
        for (const item of avaliacoesData) {
          if (item.foto_frente_url) userFilesToProcess.push({ user_id: user.id, file_url: item.foto_frente_url, bucket_type_edge_function: 'avaliacoes' });
          if (item.foto_lado_url) userFilesToProcess.push({ user_id: user.id, file_url: item.foto_lado_url, bucket_type_edge_function: 'avaliacoes' });
          if (item.foto_costas_url) userFilesToProcess.push({ user_id: user.id, file_url: item.foto_costas_url, bucket_type_edge_function: 'avaliacoes' });
        }
      }

      // c. Da tabela rotinas_arquivadas
      const { data: rotinasData, error: rotinasError } = await supabase
        .from('rotinas_arquivadas')
        .select('pdf_url')
        .eq('aluno_id', user.id);
      if (rotinasError) {
        console.error(`Error fetching rotinas_arquivadas for user ${user.id}:`, JSON.stringify(rotinasError));
      } else if (rotinasData) {
        for (const item of rotinasData) {
          if (item.pdf_url) userFilesToProcess.push({ user_id: user.id, file_url: item.pdf_url, bucket_type_edge_function: 'rotinas' });
        }
      }

      console.log(`User ${user.email} has ${userFilesToProcess.length} files to attempt deletion.`);

      // 2. Deleta arquivos do Cloudflare via Edge Function
      for (const file of userFilesToProcess) {
        const filename = file.file_url.split('?')[0].split('/').pop();
        if (!filename) {
          console.warn(`Skipping file with invalid URL: ${file.file_url} for user ${user.id}`);
          continue;
        }

        try {
          const { data: edgeFunctionResponse, error: edgeFunctionError } = await supabase.functions.invoke('delete-image', {
            body: {
              filename: filename,
              bucket_type: file.bucket_type_edge_function
            }
          });

          if (edgeFunctionError) {
            console.error(`Edge Function error for ${filename} (user ${user.id}):`, edgeFunctionError);
          } else if (edgeFunctionResponse && edgeFunctionResponse.success) {
            console.log(`Successfully deleted ${filename} for user ${user.id}.`);
            totalFilesDeleted++;
          } else {
            console.error(`Edge Function reported failure for ${filename} (user ${user.id}):`, edgeFunctionResponse);
          }
        } catch (edgeCallError: any) {
          console.error(`Unexpected error during Edge Function call for ${filename} (user ${user.id}):`, edgeCallError.message);
        }
      }

      // 3. Deleta usuário de auth.users (aciona cascata)
      console.log(`Attempting to delete user ${user.email} (ID: ${user.id}) from auth.users...`);
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

      if (deleteUserError) {
        console.error(`Failed to delete user ${user.email} (ID: ${user.id}):`, JSON.stringify(deleteUserError));
      } else {
        console.log(`Successfully deleted user ${user.email} (ID: ${user.id}).`);
      }
    }

    console.log(`--- Cron Job: Inactive User Processing Finished ---`);
    console.log(`Total users warned: ${usersToWarn.length}`);
    console.log(`Total users processed for deletion: ${usersToDelete.length}`);
    console.log(`Total files deleted: ${totalFilesDeleted}`);

    return res.status(200).json({
      success: true,
      message: "Inactive user processing completed.",
      usersWarned: usersToWarn.length,
      usersDeleted: usersToDelete.length,
      filesDeleted: totalFilesDeleted,
    });

  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error during cron job execution:", errorMessage);
    return res.status(500).json({ success: false, error: errorMessage });
  }
}
