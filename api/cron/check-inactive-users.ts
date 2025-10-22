import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Tipagem para o objeto de usuário do Supabase Auth
interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string; // O campo chave para inatividade
}

interface UserProfile {
  id: string;
  email: string;
  last_warning_email_sent_at: string | null;
  avatar_type: string | null;
  avatar_image_url: string | null;
  nome_completo?: string | null; // Opcional, pois só existe para PTs
}

// Interface simplificada para a rotina, contendo os campos necessários para o arquivamento
interface Rotina {
  id: string;
  aluno_id: string;
  nome: string;
  objetivo: string;
  treinos_por_semana: number;
  duracao_semanas: number;
  data_inicio: string;
  // Adicione outros campos se forem necessários para o PDF ou arquivamento
}

interface DeleteImageResponse {
  success: boolean;
  message?: string;
}

// Supabase Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase environment variables are not set.");
  throw new Error("Application is not configured correctly.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Brevo API Configuration
const brevoApiKey = process.env.BREVO_API_KEY;
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@titansfitness.com';
const brevoSenderName = 'Titans Fitness';
const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

// Lista de emails protegidos
const PROTECTED_EMAILS = [
    'aramos1069@gmail.com',
    'contato@titans.fitness',
    'administrador@titans.fitness'
];

// --- Helper Functions ---

/**
 * Extrai o caminho do arquivo de uma URL do Supabase Storage.
 * @param url A URL completa do arquivo.
 * @param bucketName O nome do bucket (ex: 'avatars').
 * @returns O caminho do arquivo dentro do bucket ou null se inválido.
 */
function getStoragePathFromUrl(url: string, bucketName: string): string | null {
  try {
    const urlObject = new URL(url);
    const pathSegments = urlObject.pathname.split('/');
    const bucketIndex = pathSegments.indexOf(bucketName);
    
    if (bucketIndex !== -1 && bucketIndex < pathSegments.length - 1) {
      return pathSegments.slice(bucketIndex + 1).join('/');
    }
    return null;
  } catch (e) {
    console.error(`URL de avatar inválida: ${url}`, e);
    return null;
  }
}

/**
 * Invoca a Edge Function para deletar um arquivo do Cloudflare.
 * @param filename O nome do arquivo a ser deletado.
 * @param bucket_type O tipo do bucket ('avaliacoes', 'rotinas', 'exercicios').
 */
async function deleteCloudflareFile(filename: string, bucket_type: 'avaliacoes' | 'rotinas' | 'exercicios'): Promise<boolean> {
  try {
    const { data: response, error } = await supabase.functions.invoke<DeleteImageResponse>('delete-media', {
      body: { filename, bucket_type }
    });

    if (error || !response?.success) {
      console.error(`Falha ao deletar ${filename} do bucket ${bucket_type}:`, error ?? response);
      return false;
    }
    console.log(`Arquivo ${filename} deletado com sucesso do bucket ${bucket_type}.`);
    return true;
  } catch (edgeError) {
    const message = edgeError instanceof Error ? edgeError.message : String(edgeError);
    console.error(`Erro na Edge Function para ${filename}:`, message);
    return false;
  }
}

/**
 * Envia um e-mail de aviso de inatividade.
 * @param user O objeto do usuário a ser avisado.
 */
async function sendWarningEmail(user: UserProfile): Promise<void> {
  if (!brevoApiKey) return;
  
  try {
    await axios.post(brevoApiUrl, {
      sender: { email: brevoSenderEmail, name: brevoSenderName },
      to: [{ email: user.email }],
      subject: 'Aviso: Sua conta Titans Fitness pode ser desativada por inatividade',
      htmlContent: `<p>Olá,</p><p>Notamos que você não acessa sua conta há mais de 60 dias. Para evitar a exclusão, por favor, acesse sua conta nos próximos 30 dias.</p><p><a href="https://titans.fitness/login">Acessar Conta</a></p><p>Atenciosamente,<br>Equipe Titans Fitness</p>`
    }, {
      headers: { 'api-key': brevoApiKey, 'Content-Type': 'application/json' }
    });
  } catch (emailError) {
    let errorMessage = 'An unknown error occurred while sending email.';
    if (axios.isAxiosError(emailError) && emailError.response) {
      errorMessage = `API Error: ${JSON.stringify(emailError.response.data)}`;
    } else if (emailError instanceof Error) {
      errorMessage = emailError.message;
    }
    console.error(`Falha ao enviar e-mail de aviso para ${user.email}:`, errorMessage);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Proteger a rota da API
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    console.log("--- Cron Job: Inactive User Processing Started ---");

    const now = new Date();
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

    // --- Otimização de Performance: Buscar dados em lote ---
    const { data: authData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) throw new Error("Falha ao buscar usuários da autenticação.");
    const authUsers = authData.users as AuthUser[];

    const { data: alunosData, error: alunosError } = await supabase.from('alunos').select('id, email, last_warning_email_sent_at, avatar_type, avatar_image_url');
    if (alunosError) throw new Error("Falha ao buscar perfis de alunos.");

    const { data: ptsData, error: ptsError } = await supabase.from('professores').select('id, email, last_warning_email_sent_at, nome_completo, avatar_type, avatar_image_url');
    if (ptsError) throw new Error("Falha ao buscar perfis de PTs.");

    const alunosMap = new Map(alunosData.map(a => [a.id, a]));
    const ptsMap = new Map(ptsData.map(p => [p.id, p]));

    // --- Categorizar Usuários ---
    const alunosToWarn: UserProfile[] = [];
    const alunosToDelete: UserProfile[] = [];
    const ptsToWarn: UserProfile[] = [];
    const ptsToDelete: UserProfile[] = [];

    for (const user of authUsers) {
      if (PROTECTED_EMAILS.includes(user.email)) continue;

      const referenceDate = new Date(user.last_sign_in_at || user.created_at);
      if (isNaN(referenceDate.getTime())) continue;

      const profile = alunosMap.get(user.id) || ptsMap.get(user.id);
      if (!profile) continue;

      if (referenceDate <= ninetyDaysAgo) {
        if (alunosMap.has(user.id)) alunosToDelete.push(profile);
        else if (ptsMap.has(user.id)) ptsToDelete.push(profile);
      } else if (referenceDate <= sixtyDaysAgo && !profile.last_warning_email_sent_at) {
        if (alunosMap.has(user.id)) alunosToWarn.push(profile);
        else if (ptsMap.has(user.id)) ptsToWarn.push(profile);
      }
    }

    console.log(`Found ${alunosToWarn.length} ALUNOS and ${ptsToWarn.length} PTS to warn.`);
    console.log(`Found ${alunosToDelete.length} ALUNOS and ${ptsToDelete.length} PTS to delete.`);

    // --- Processar Avisos (60 dias) ---
    for (const user of alunosToWarn) {
      await sendWarningEmail(user);
      await supabase.from('alunos').update({ last_warning_email_sent_at: new Date().toISOString() }).eq('id', user.id);
      console.log(`Warning email sent to aluno: ${user.email}`);
    }
    for (const user of ptsToWarn) {
      await sendWarningEmail(user);
      await supabase.from('professores').update({ last_warning_email_sent_at: new Date().toISOString() }).eq('id', user.id);
      console.log(`Warning email sent to PT: ${user.email}`);
    }

    // --- Processar Exclusões (90 dias) ---
    let totalFilesDeleted = 0;

    for (const user of alunosToDelete) {
      const deletedCount = await processAlunoDeletion(user);
      totalFilesDeleted += deletedCount;
    }

    for (const user of ptsToDelete) {
      const deletedCount = await processPTDeletion(user);
      totalFilesDeleted += deletedCount;
    }

    console.log(`--- Cron Job: Inactive User Processing Finished ---`);
    console.log(`Alunos warned: ${alunosToWarn.length}, deleted: ${alunosToDelete.length}`);
    console.log(`PTs warned: ${ptsToWarn.length}, deleted: ${ptsToDelete.length}`);
    console.log(`Total files deleted: ${totalFilesDeleted}`);

    // ✅ Log de sucesso no Supabase
    await supabase.from('cron_job_logs').insert({
      job_name: 'check-inactive-users',
      status: 'success',
      details: {
        usersWarned: alunosToWarn.length + ptsToWarn.length,
        usersDeleted: alunosToDelete.length + ptsToDelete.length,
        filesDeleted: totalFilesDeleted,
      }
    });

    return res.status(200).json({
      success: true,
      message: "Inactive user processing completed.",
      usersWarned: alunosToWarn.length + ptsToWarn.length,
      usersDeleted: alunosToDelete.length + ptsToDelete.length,
      filesDeleted: totalFilesDeleted,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error during cron job execution:", errorMessage);

    // ✅ Log de erro no Supabase
    await supabase.from('cron_job_logs').insert({
      job_name: 'check-inactive-users',
      status: 'error',
      error_message: errorMessage,
    });

    return res.status(500).json({ success: false, error: errorMessage });
  }
}

async function processAlunoDeletion(user: UserProfile): Promise<number> {
  console.log(`--- Processing ALUNO deletion: ${user.email} (ID: ${user.id}) ---`);
  let filesDeletedCount = 0;

  // 1. Deletar Avatar (Supabase Storage)
  if (user.avatar_type === 'image' && user.avatar_image_url) {
    const filePath = getStoragePathFromUrl(user.avatar_image_url, 'avatars');
    if (filePath) {
      const { error } = await supabase.storage.from('avatars').remove([filePath]);
      if (error) console.error(`Falha ao deletar avatar do aluno ${user.id}:`, error);
      else {
        console.log(`Avatar do aluno ${user.id} deletado.`);
        filesDeletedCount++;
      }
    }
  }

  // 2. Deletar Arquivos do Cloudflare
  const fileDeletionPromises: Promise<boolean>[] = [];

  // Fotos de avaliações
      const { data: avaliacoesData } = await supabase
        .from('avaliacoes_fisicas')
        .select('foto_frente_url, foto_lado_url, foto_costas_url')
        .eq('aluno_id', user.id);

      if (avaliacoesData) {
        for (const item of avaliacoesData) {
          [item.foto_frente_url, item.foto_lado_url, item.foto_costas_url]
            .filter(Boolean).forEach(url => fileDeletionPromises.push(deleteCloudflareFile(url!.split('/').pop()!, 'avaliacoes')));
        }
      }

  // PDFs de rotinas
      const { data: rotinasData } = await supabase
        .from('rotinas_arquivadas')
        .select('pdf_url')
        .eq('aluno_id', user.id);

      if (rotinasData) {
        for (const item of rotinasData) {
          if (item.pdf_url) fileDeletionPromises.push(deleteCloudflareFile(item.pdf_url.split('/').pop()!, 'rotinas'));
        }
      }

  const results = await Promise.allSettled(fileDeletionPromises);
  filesDeletedCount += results.filter(r => r.status === 'fulfilled' && r.value).length;

  // 3. Deletar usuário (cascata remove dados)
  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteUserError) console.error(`Falha ao deletar aluno ${user.email}:`, deleteUserError);
  else console.log(`Aluno ${user.email} deletado com sucesso.`);

  return filesDeletedCount;
}

async function processPTDeletion(user: UserProfile): Promise<number> {
  console.log(`--- Processing PT deletion: ${user.email} (ID: ${user.id}) ---`);
  let filesDeletedCount = 0;
  const hoje = new Date().toISOString().split('T')[0];

  // 1. Cancelar Rotinas Ativas/Bloqueadas
  const { data: rotinasAtualizadas, error: updateError } = await supabase
    .from('rotinas')
    .update({ status: 'Cancelada' })
    .eq('professor_id', user.id)
    .in('status', ['Ativa', 'Bloqueada'])
    .select('id');

  if (updateError) {
    console.error(`[PT Deletion] Erro ao cancelar rotinas do PT ${user.id}:`, updateError);
  } else if (rotinasAtualizadas && rotinasAtualizadas.length > 0) {
    console.log(`[PT Deletion] ${rotinasAtualizadas.length} rotinas foram canceladas para o PT ${user.id}`);
  }

  // 2. Remover Avatar do PT (Supabase Storage)
  if (user.avatar_type === 'image' && user.avatar_image_url) {
    const filePath = getStoragePathFromUrl(user.avatar_image_url, 'avatars');
    if (filePath) {
      const { error } = await supabase.storage.from('avatars').remove([filePath]);
      if (error) console.error(`Falha ao deletar avatar do PT ${user.id}:`, error);
      else {
        console.log(`Avatar do PT ${user.id} deletado.`);
        filesDeletedCount++;
      }
    }
  }

  // 3. Remover Mídias de Exercícios (Cloudflare)
  const fileDeletionPromises: Promise<boolean>[] = [];
  const { data: exerciciosData } = await supabase
        .from('exercicios')
        .select('imagem_1_url, imagem_2_url, video_url')
        .eq('professor_id', user.id);

      if (exerciciosData) {
        exerciciosData.forEach(ex => {
          [ex.imagem_1_url, ex.imagem_2_url, ex.video_url]
            .filter(Boolean).forEach(url => fileDeletionPromises.push(deleteCloudflareFile(url!.split('/').pop()!, 'exercicios')));
        });
      }
  const results = await Promise.allSettled(fileDeletionPromises);
  filesDeletedCount += results.filter(r => r.status === 'fulfilled' && r.value).length;

  // 4. Deletar Usuário
  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
  if (deleteUserError) console.error(`Falha ao deletar PT ${user.email}:`, deleteUserError);
  else console.log(`PT ${user.email} deletado com sucesso.`);

  return filesDeletedCount;
}