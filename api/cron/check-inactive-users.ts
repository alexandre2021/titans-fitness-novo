import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// As variáveis de ambiente são injetadas pela Vercel
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Supabase environment variables are not set.");
  throw new Error("Application is not configured correctly.");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    console.log("Cron job started: Fetching file URLs to log.");

    // Busca de 'avaliacoes_fisicas', incluindo aluno_id
    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from('avaliacoes_fisicas')
      .select('aluno_id, foto_frente_url, foto_lado_url, foto_costas_url');

    if (avaliacoesError) throw new Error(JSON.stringify(avaliacoesError));

    // Busca de 'rotinas_arquivadas', incluindo aluno_id
    const { data: rotinas, error: rotinasError } = await supabase
      .from('rotinas_arquivadas')
      .select('aluno_id, pdf_url');

    if (rotinasError) throw new Error(JSON.stringify(rotinasError));

    const filesToLog = [];

    if (avaliacoes) {
      for (const item of avaliacoes) {
        if (!item.aluno_id) continue; // Pula se não houver ID de aluno

        if (item.foto_frente_url) {
          filesToLog.push({ user_id: item.aluno_id, file_url: item.foto_frente_url, bucket_type: 'avaliacoes' });
        }
        if (item.foto_lado_url) {
          filesToLog.push({ user_id: item.aluno_id, file_url: item.foto_lado_url, bucket_type: 'avaliacoes' });
        }
        if (item.foto_costas_url) {
          filesToLog.push({ user_id: item.aluno_id, file_url: item.foto_costas_url, bucket_type: 'avaliacoes' });
        }
      }
    }

    if (rotinas) {
      for (const item of rotinas) {
        if (!item.aluno_id) continue; // Pula se não houver ID de aluno

        if (item.pdf_url) {
          filesToLog.push({ user_id: item.aluno_id, file_url: item.pdf_url, bucket_type: 'rotinas-concluidas' });
        }
      }
    }

    if (filesToLog.length > 0) {
      const { error: insertError } = await supabase
        .from('deleted_user_files_log')
        .insert(filesToLog);

      if (insertError) throw new Error(JSON.stringify(insertError));

      const successMessage = `Successfully logged ${filesToLog.length} file URLs.`;
      console.log(successMessage);
      return res.status(200).json({ success: true, message: successMessage });
    } else {
      const noFilesMessage = "No new file URLs found to log.";
      console.log(noFilesMessage);
      return res.status(200).json({ success: true, message: noFilesMessage });
    }

  } catch (error: unknown) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error("Error during cron job execution:", errorMessage);
    return res.status(500).json({ success: false, error: errorMessage });
  }
}