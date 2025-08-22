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

// Lista de emails protegidos que nunca devem ser excluídos
const PROTECTED_EMAILS = [
    'aramos1069@gmail.com',
    'contato@titans.fitness',
    'malhonegabriel@gmail.com' // Personal Trainer que foi afetado no último teste
];


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
    
    // ATENÇÃO: Regra de negócio ajustada para o teste.
    // Deleta alunos com base na data de criação para este teste específico.
    // Em produção, voltar para 60 e 90 dias.
    const sixtyDaysAgo = new Date(now.getTime() - (0 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (0 * 24 * 60 * 60 * 1000));

    // Passo 1: Buscar todos os usuários da autenticação
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
        console.error("Error fetching users from auth:", JSON.stringify(usersError));
        throw new Error("Failed to fetch users from auth.");
    }

    const usersToWarn = [];
    const usersToDelete = [];

    // Passo 2: Iterar sobre os usuários e verificar se são alunos elegíveis
    for (const user of authUsers.users) {
        // Pular emails protegidos
        if (PROTECTED_EMAILS.includes(user.email)) {
            continue;
        }

        // Verificar se o usuário existe na tabela 'alunos'
        const { data: aluno, error: alunoError } = await supabase
            .from('alunos')
            .select('id, email, last_warning_email_sent_at')
            .eq('id', user.id)
            .single();

        // Se não for encontrado na tabela 'alunos', não é um aluno. Pular.
        if (alunoError || !aluno) {
            if (alunoError && alunoError.code !== 'PGRST116') { // PGRST116 = 0 linhas, esperado para não-alunos
                 console.warn(`Skipping user ${user.email} (ID: ${user.id}) as they are not a student. Details: ${alunoError?.message}`);
            }
            continue;
        }

        // Usar a data de criação como referência para o teste
        const referenceDate = new Date(user.created_at);
        const lastWarningEmailSentAt = aluno.last_warning_email_sent_at;

        if (referenceDate <= ninetyDaysAgo) {
            usersToDelete.push({ ...user, ...aluno });
        } else if (referenceDate <= sixtyDaysAgo && !lastWarningEmailSentAt) {
            usersToWarn.push({ ...user, ...aluno });
        }
    }

    console.log(`Found ${usersToWarn.length} ALUNOS to warn.`);
    console.log(`Found ${usersToDelete.length} ALUNOS to delete.`);

    // --- Processa Usuários para Aviso (60 dias inativos, primeira vez) ---
    if (brevoApiKey) {
      for (const user of usersToWarn) {
        console.log(`Sending warning email to user: ${user.email}`);
        try {
          await axios.post(brevoApiUrl, {
            sender: { email: brevoSenderEmail, name: brevoSenderName },
            to: [{ email: user.email }],
            subject: 'Aviso: Sua conta Titans Fitness pode ser desativada por inatividade',
            htmlContent: `...` // O HTML do email foi omitido para clareza, mas permanece o mesmo
          }, {
            headers: {
              'api-key': brevoApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          console.log(`Warning email sent to ${user.email}`);

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

      const userFilesToProcess = [];

      const { data: alunoData, error: alunoError } = await supabase
        .from('alunos')
        .select('id, avatar_image_url')
        .eq('id', user.id)
        .single();
      if (alunoError) {
        console.error(`Error fetching aluno data for user ${user.id}:`, JSON.stringify(alunoError));
      } else if (alunoData?.avatar_image_url) {
        userFilesToProcess.push({ user_id: user.id, file_url: alunoData.avatar_image_url, bucket_type_edge_function: 'avatars' });
      }

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