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
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // Passo 1: Buscar todos os usuários da autenticação
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw new Error(`Failed to fetch users from auth: ${usersError.message}`);

    const alunosToWarn = [];
    const alunosToDelete = [];
    const ptsToWarn = [];
    const ptsToDelete = [];

    // Passo 2: Iterar sobre os usuários, identificar tipo e separar em listas
    for (const user of authUsers.users) {
      if (PROTECTED_EMAILS.includes(user.email ?? '')) continue;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', user.id)
        .single();

      if (!profile) {
        console.warn(`Skipping user ${user.email ?? 'unknown'} (ID: ${user.id}) as they have no user_profile.`);
        continue;
      }

      const referenceDate = new Date(user.last_sign_in_at ?? user.created_at);

      if (profile.user_type === 'aluno') {
        const { data: aluno } = await supabase.from('alunos').select('last_warning_email_sent_at').eq('id', user.id).single();
        if (referenceDate <= ninetyDaysAgo) {
          alunosToDelete.push({ ...user, ...aluno });
        } else if (referenceDate <= sixtyDaysAgo && !aluno?.last_warning_email_sent_at) {
          alunosToWarn.push({ ...user, ...aluno });
        }
      } else if (profile.user_type === 'personal_trainer') {
        const { data: pt } = await supabase.from('personal_trainers').select('last_warning_email_sent_at').eq('id', user.id).single();
        if (referenceDate <= ninetyDaysAgo) {
          ptsToDelete.push({ ...user, ...pt });
        } else if (referenceDate <= sixtyDaysAgo && !pt?.last_warning_email_sent_at) {
          ptsToWarn.push({ ...user, ...pt });
        }
      }
    }

    console.log(`Found ${alunosToWarn.length} ALUNOS to warn.`);
    console.log(`Found ${alunosToDelete.length} ALUNOS to delete.`);
    console.log(`Found ${ptsToWarn.length} PERSONAL TRAINERS to warn.`);
    console.log(`Found ${ptsToDelete.length} PERSONAL TRAINERS to delete.`);

    // --- AVISO PARA ALUNOS ---
    for (const user of alunosToWarn) {
      if (user.email) {
        await sendWarningEmail(user.email);
        await supabase.from('alunos').update({ last_warning_email_sent_at: new Date().toISOString() }).eq('id', user.id);
      }
    }

    // --- AVISO PARA PERSONAL TRAINERS ---
    for (const user of ptsToWarn) {
      if (user.email) {
        await sendWarningEmail(user.email);
        await supabase.from('personal_trainers').update({ last_warning_email_sent_at: new Date().toISOString() }).eq('id', user.id);
      }
    }

    let totalFilesDeleted = 0;

    // --- EXCLUSÃO DE ALUNOS ---
    for (const user of alunosToDelete) {
        if (user.email) {
            console.log(`--- Processing ALUNO deletion for: ${user.email} (ID: ${user.id}) ---`);
            const files = await getAlunoFiles(user.id);
            for (const file of files) {
                await deleteFile(file.file_url, file.bucket_type_edge_function, user.id);
                totalFilesDeleted++;
            }
            await deleteUser(user.id, user.email);
        }
    }

    // --- EXCLUSÃO DE PERSONAL TRAINERS ---
    for (const user of ptsToDelete) {
        if (user.email) {
            console.log(`--- Processing PT deletion for: ${user.email} (ID: ${user.id}) ---`);
            
            // 1. Deletar mídias de exercícios
            const { data: exercicios } = await supabase.from('exercicios').select('imagem_1_url, imagem_2_url, video_url').eq('pt_id', user.id);
            if (exercicios) {
                for (const ex of exercicios) {
                    if (ex.imagem_1_url) { await deleteFile(ex.imagem_1_url, 'exerciciospt', user.id); totalFilesDeleted++; }
                    if (ex.imagem_2_url) { await deleteFile(ex.imagem_2_url, 'exerciciospt', user.id); totalFilesDeleted++; }
                    if (ex.video_url) { await deleteFile(ex.video_url, 'exerciciospt', user.id); totalFilesDeleted++; }
                }
            }

            // 2. Desvincular alunos
            console.log(`Unlinking students from PT ${user.id}...`);
            const { error: unlinkError } = await supabase.from('alunos').update({ personal_trainer_id: null }).eq('personal_trainer_id', user.id);
            if (unlinkError) console.error(`Failed to unlink students for PT ${user.id}:`, unlinkError);
            else console.log(`Successfully unlinked students for PT ${user.id}.`);

            // 3. Deletar usuário (cascata cuidará de user_profiles e personal_trainers)
            await deleteUser(user.id, user.email);
        }
    }

    console.log(`--- Cron Job: Inactive User Processing Finished ---`);
    return res.status(200).json({
      success: true,
      message: "Inactive user processing completed.",
      usersWarned: alunosToWarn.length + ptsToWarn.length,
      usersDeleted: alunosToDelete.length + ptsToDelete.length,
      filesDeleted: totalFilesDeleted,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error during cron job execution:", errorMessage);
    return res.status(500).json({ success: false, error: errorMessage });
  }
}

// --- Funções Auxiliares Refatoradas ---

async function sendWarningEmail(email: string) {
  if (!brevoApiKey) {
    console.warn("Brevo API Key not set. Skipping sending warning emails.");
    return;
  }
  console.log(`Sending warning email to user: ${email}`);
  try {
    await axios.post(brevoApiUrl, {
      sender: { email: brevoSenderEmail, name: brevoSenderName },
      to: [{ email }],
      subject: 'Aviso: Sua conta Titans Fitness pode ser desativada por inatividade',
      htmlContent: `<!DOCTYPE html><html><head><title>Aviso de Inatividade</title></head><body><p>Olá,</p><p>Sua conta na Titans Fitness não registra atividade há mais de 60 dias. Para evitar a exclusão automática, por favor, faça login nos próximos 30 dias.</p><p>Atenciosamente,</p><p>Equipe Titans Fitness</p></body></html>`
    }, {
      headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });
    console.log(`Warning email sent to ${email}`);
  } catch (error: unknown) {
    console.error(`Failed to send warning email to ${email}.`);
    if (axios.isAxiosError(error)) {
        // Log detalhado para erros do Axios
        console.error('Axios Error:', { 
            message: error.message, 
            data: error.response?.data,
            status: error.response?.status
        });
    } else if (error instanceof Error) {
        // Log para erros genéricos
        console.error('Generic Error:', error.message);
    } else {
        // Log para outros tipos de erro
        console.error('Unknown Error:', error);
    }
  }
}

async function getAlunoFiles(userId: string) {
    const filesToProcess: { file_url: string, bucket_type_edge_function: string }[] = [];

    // Busca apenas os arquivos de avaliações físicas no Cloudflare R2
    const { data: avaliacoesData } = await supabase.from('avaliacoes_fisicas').select('foto_frente_url, foto_lado_url, foto_costas_url').eq('aluno_id', userId);
    if (avaliacoesData) {
        for (const item of avaliacoesData) {
            if (item.foto_frente_url) filesToProcess.push({ file_url: item.foto_frente_url, bucket_type_edge_function: 'avaliacoes' });
            if (item.foto_lado_url) filesToProcess.push({ file_url: item.foto_lado_url, bucket_type_edge_function: 'avaliacoes' });
            if (item.foto_costas_url) filesToProcess.push({ file_url: item.foto_costas_url, bucket_type_edge_function: 'avaliacoes' });
        }
    }

    // Busca apenas os PDFs de rotinas no Cloudflare R2
    const { data: rotinasData } = await supabase.from('rotinas_arquivadas').select('pdf_url').eq('aluno_id', userId);
    if (rotinasData) {
        for (const item of rotinasData) {
            if (item.pdf_url) filesToProcess.push({ file_url: item.pdf_url, bucket_type_edge_function: 'rotinas' });
        }
    }
    return filesToProcess;
}

async function deleteFile(fileUrl: string, bucket: string, userId: string) {
    const filename = fileUrl.split('?')[0].split('/').pop();
    if (!filename) {
        console.warn(`Skipping file with invalid URL: ${fileUrl} for user ${userId}`);
        return;
    }
    try {
        const { error } = await supabase.functions.invoke('delete-image', {
            body: { filename: filename, bucket_type: bucket }
        });
        if (error) {
            console.error(`Edge Function error for ${filename} (user ${userId}):`, error);
        } else {
            console.log(`Successfully deleted ${filename} for user ${userId}.`);
        }
    } catch (e: unknown) {
        if (e instanceof Error) {
            console.error(`Unexpected error during Edge Function call for ${filename} (user ${userId}):`, e.message);
        } else {
            console.error(`Unexpected error during Edge Function call for ${filename} (user ${userId}):`, e);
        }
    }
}

async function deleteUser(userId: string, email: string) {
    console.log(`Attempting to delete user ${email} (ID: ${userId}) from auth.users...`);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
        console.error(`Failed to delete user ${email} (ID: ${userId}):`, error.message);
    } else {
        console.log(`Successfully deleted user ${email} (ID: ${userId}).`);
    }
}