/* eslint-disable */
// ou se quiser ser mais específico:
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */


import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

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
    'malhonegabriel@gmail.com'
];

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

    // Buscar todos os usuários da autenticação
    const { data: authUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
        console.error("Error fetching users from auth:", JSON.stringify(usersError));
        throw new Error("Failed to fetch users from auth.");
    }

    const alunosToWarn = [];
    const alunosToDelete = [];
    const ptsToWarn = [];
    const ptsToDelete = [];

    // Processar usuários
    for (const user of authUsers.users) {
        if (PROTECTED_EMAILS.includes(user.email)) {
            continue;
        }

        const referenceDate = new Date(user.created_at);

        // Verificar se é aluno
        const { data: aluno, error: alunoError } = await supabase
            .from('alunos')
            .select('id, email, last_warning_email_sent_at')
            .eq('id', user.id)
            .single();

        if (!alunoError && aluno) {
            if (referenceDate <= ninetyDaysAgo) {
                alunosToDelete.push({ ...user, ...aluno });
            } else if (referenceDate <= sixtyDaysAgo && !aluno.last_warning_email_sent_at) {
                alunosToWarn.push({ ...user, ...aluno });
            }
            continue; // Pula verificação de PT se é aluno
        }

        // Verificar se é Personal Trainer
        const { data: pt, error: ptError } = await supabase
            .from('personal_trainers')
            .select('id, email, last_warning_email_sent_at, nome_completo')
            .eq('id', user.id)
            .single();

        if (!ptError && pt) {
            if (referenceDate <= ninetyDaysAgo) {
                ptsToDelete.push({ ...user, ...pt });
            } else if (referenceDate <= sixtyDaysAgo && !pt.last_warning_email_sent_at) {
                ptsToWarn.push({ ...user, ...pt });
            }
        }
    }

    console.log(`Found ${alunosToWarn.length} ALUNOS and ${ptsToWarn.length} PTS to warn.`);
    console.log(`Found ${alunosToDelete.length} ALUNOS and ${ptsToDelete.length} PTS to delete.`);

    // --- Processar Avisos (60 dias) ---
    if (brevoApiKey) {
      const allUsersToWarn = [...alunosToWarn, ...ptsToWarn];
      
      for (const user of allUsersToWarn) {
        const userType = alunosToWarn.includes(user) ? 'aluno' : 'personal_trainer';
        
        try {
          await axios.post(brevoApiUrl, {
            sender: { email: brevoSenderEmail, name: brevoSenderName },
            to: [{ email: user.email }],
            subject: 'Aviso: Sua conta Titans Fitness pode ser desativada por inatividade',
            htmlContent: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Sua conta Titans Fitness</h2>
                <p>Olá,</p>
                <p>Notamos que você não acessa sua conta há mais de 60 dias. Sua conta será desativada em 30 dias se não houver acesso.</p>
                <p><a href="https://titans.fitness/login" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar Conta</a></p>
                <p>Atenciosamente,<br>Equipe Titans Fitness</p>
              </div>
            `
          }, {
            headers: {
              'api-key': brevoApiKey,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });

          // Atualizar flag de email enviado
          const tableName = userType === 'aluno' ? 'alunos' : 'personal_trainers';
          await supabase
            .from(tableName)
            .update({ last_warning_email_sent_at: new Date().toISOString() })
            .eq('id', user.id);

          console.log(`Warning email sent to ${userType}: ${user.email}`);
        } catch (emailError) {
          console.error(`Failed to send warning email to ${user.email}:`, (emailError as any).response?.data || (emailError as any).message);
        }
      }
    }

    // --- Processar Exclusões (90 dias) ---
    let totalFilesDeleted = 0;

    // EXCLUSÃO DE ALUNOS
    for (const user of alunosToDelete) {
      console.log(`--- Processing ALUNO deletion: ${user.email} (ID: ${user.id}) ---`);

      // Coletar arquivos do aluno
      const userFiles = [];

      // Avatar do aluno (Supabase Storage)
      const { data: alunoData } = await supabase
        .from('alunos')
        .select('avatar_type, avatar_image_url')
        .eq('id', user.id)
        .single();

      if (alunoData?.avatar_type === 'image' && alunoData.avatar_image_url) {
        const filename = alunoData.avatar_image_url.split('/').pop();
        const filePath = `${user.id}/${filename}`;
        
        const { error } = await supabase.storage
          .from('avatars')
          .remove([filePath]);

        if (error) {
          console.error(`Failed to delete avatar for aluno ${user.id}:`, error);
        } else {
          console.log(`Successfully deleted avatar: ${filePath}`);
          totalFilesDeleted++;
        }
      }

      // Fotos de avaliações (Cloudflare via Edge Function)
      const { data: avaliacoesData } = await supabase
        .from('avaliacoes_fisicas')
        .select('foto_frente_url, foto_lado_url, foto_costas_url')
        .eq('aluno_id', user.id);

      if (avaliacoesData) {
        for (const item of avaliacoesData) {
          const urls = [item.foto_frente_url, item.foto_lado_url, item.foto_costas_url].filter(Boolean);
          for (const url of urls) {
            userFiles.push({ file_url: url, bucket_type: 'avaliacoes' });
          }
        }
      }

      // PDFs de rotinas (Cloudflare via Edge Function)
      const { data: rotinasData } = await supabase
        .from('rotinas_arquivadas')
        .select('pdf_url')
        .eq('aluno_id', user.id);

      if (rotinasData) {
        for (const item of rotinasData) {
          if (item.pdf_url) {
            userFiles.push({ file_url: item.pdf_url, bucket_type: 'rotinas' });
          }
        }
      }

      // Deletar arquivos via Edge Function
      for (const file of userFiles) {
        const filename = file.file_url.split('?')[0].split('/').pop();
        if (!filename) continue;

        try {
          const { data: response, error } = await supabase.functions.invoke('delete-image', {
            body: { filename, bucket_type: file.bucket_type }
          });

          if (!error && response?.success) {
            totalFilesDeleted++;
            console.log(`Successfully deleted ${filename} for aluno ${user.id}`);
          } else {
            console.error(`Failed to delete ${filename} for aluno ${user.id}:`, error || response);
          }
        } catch (edgeError) {
          console.error(`Edge Function error for ${filename}:`, (edgeError as any).message);
        }
      }

      // Deletar usuário (cascata remove dados)
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (deleteUserError) {
        console.error(`Failed to delete aluno ${user.email}:`, deleteUserError);
      } else {
        console.log(`Successfully deleted aluno ${user.email}`);
      }
    }

    // EXCLUSÃO DE PERSONAL TRAINERS
    for (const user of ptsToDelete) {
      console.log(`--- Processing PT deletion: ${user.email} (ID: ${user.id}) ---`);

      const hoje = new Date().toISOString().split('T')[0];

      // 1. FINALIZAR SESSÕES PENDENTES
      // Primeiro buscar IDs das rotinas do PT
      const { data: rotinasData } = await supabase
        .from('rotinas')
        .select('id')
        .eq('personal_trainer_id', user.id);

      const rotinaIds = rotinasData?.map(r => r.id) || [];

      let sessaoError = null;
      if (rotinaIds.length > 0) {
        const { error } = await supabase
          .from('execucoes_sessao')
          .update({
            status: 'concluida',
            observacoes: `Sessão finalizada automaticamente em ${hoje} devido à inatividade do Personal Trainer (90+ dias sem acesso).`
          })
          .in('rotina_id', rotinaIds)
          .neq('status', 'concluida');
        
        sessaoError = error;
      }

      if (sessaoError) {
        console.error(`Error finalizing sessions for PT ${user.id}:`, sessaoError);
      } else {
        console.log(`Sessions finalized for PT ${user.id}`);
      }

      // 2. MARCAR ROTINAS PAUSADAS COMO CONCLUÍDAS
      const { error: rotinaError } = await supabase
        .from('rotinas')
        .update({
          status: 'Concluida',
          observacoes: `Rotina finalizada automaticamente em ${hoje} devido à inatividade do Personal Trainer ${user.nome_completo || user.email} (90+ dias sem acesso à plataforma).`
        })
        .eq('personal_trainer_id', user.id)
        .eq('status', 'Pausada');

      if (rotinaError) {
        console.error(`Error updating paused routines for PT ${user.id}:`, rotinaError);
      } else {
        console.log(`Paused routines updated for PT ${user.id}`);
      }

      // 3. REMOVER AVATAR DO PT (Supabase Storage)
      const { data: ptData } = await supabase
        .from('personal_trainers')
        .select('avatar_type, avatar_image_url')
        .eq('id', user.id)
        .single();

      if (ptData?.avatar_type === 'image' && ptData.avatar_image_url) {
        const filename = ptData.avatar_image_url.split('/').pop();
        const filePath = `${user.id}/${filename}`;
        
        const { error } = await supabase.storage
          .from('avatars')
          .remove([filePath]);

        if (error) {
          console.error(`Failed to delete PT avatar ${user.id}:`, error);
        } else {
          console.log(`Successfully deleted PT avatar: ${filePath}`);
          totalFilesDeleted++;
        }
      }

      // 4. REMOVER MÍDIAS DE EXERCÍCIOS (Cloudflare via Edge Function)
      const { data: exerciciosData } = await supabase
        .from('exercicios')
        .select('imagem_1_url, imagem_2_url, video_url')
        .eq('pt_id', user.id);

      if (exerciciosData) {
        for (const exercicio of exerciciosData) {
          const urls = [exercicio.imagem_1_url, exercicio.imagem_2_url, exercicio.video_url].filter(Boolean);
          
          for (const url of urls) {
            const filename = url.split('?')[0].split('/').pop();
            if (!filename) continue;

            try {
              const { data: response, error } = await supabase.functions.invoke('delete-image', {
                body: { filename, bucket_type: 'exercicios' }
              });

              if (!error && response?.success) {
                totalFilesDeleted++;
                console.log(`Successfully deleted exercise media ${filename} for PT ${user.id}`);
              } else {
                console.error(`Failed to delete exercise media ${filename}:`, error || response);
              }
            } catch (edgeError: any) {
              console.error(`Edge Function error for exercise media ${filename}:`, edgeError.message);
            }
          }
        }
      }

      // 5. DESVINCULAR ALUNOS
      const { error: desvinculaError } = await supabase
        .from('alunos')
        .update({ personal_trainer_id: null })
        .eq('personal_trainer_id', user.id);

      if (desvinculaError) {
        console.error(`Error unlinking students from PT ${user.id}:`, desvinculaError);
      } else {
        console.log(`Students unlinked from PT ${user.id}`);
      }

      // 6. DELETAR USUÁRIO (cascata remove dados restantes)
      const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (deleteUserError) {
        console.error(`Failed to delete PT ${user.email}:`, deleteUserError);
      } else {
        console.log(`Successfully deleted PT ${user.email}`);
      }
    }

    console.log(`--- Cron Job: Inactive User Processing Finished ---`);
    console.log(`Alunos warned: ${alunosToWarn.length}, deleted: ${alunosToDelete.length}`);
    console.log(`PTs warned: ${ptsToWarn.length}, deleted: ${ptsToDelete.length}`);
    console.log(`Total files deleted: ${totalFilesDeleted}`);

    return res.status(200).json({
      success: true,
      message: "Inactive user processing completed.",
      usersWarned: alunosToWarn.length + ptsToWarn.length,
      usersDeleted: alunosToDelete.length + ptsToDelete.length,
      alunosWarned: alunosToWarn.length,
      alunosDeleted: alunosToDelete.length,
      ptsWarned: ptsToWarn.length,
      ptsDeleted: ptsToDelete.length,
      filesDeleted: totalFilesDeleted,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error("Error during cron job execution:", errorMessage);
    return res.status(500).json({ success: false, error: errorMessage });
  }
}