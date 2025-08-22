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
    console.log("Cron job started: Processing file deletions.");

    // Busca de 'avaliacoes_fisicas', incluindo aluno_id e todas as URLs de imagem
    const { data: avaliacoes, error: avaliacoesError } = await supabase
      .from('avaliacoes_fisicas')
      .select('aluno_id, foto_frente_url, foto_lado_url, foto_costas_url');
    if (avaliacoesError) throw new Error(JSON.stringify(avaliacoesError));

    // Busca de 'rotinas_arquivadas', incluindo aluno_id e pdf_url
    const { data: rotinas, error: rotinasError } = await supabase
      .from('rotinas_arquivadas')
      .select('aluno_id, pdf_url');
    if (rotinasError) throw new Error(JSON.stringify(rotinasError));

    const filesToProcess = [];

    if (avaliacoes) {
      for (const item of avaliacoes) {
        const userId = item.aluno_id;
        if (!userId) continue; // Pula se não houver ID de aluno

        if (item.foto_frente_url) {
          filesToProcess.push({ user_id: userId, file_url: item.foto_frente_url, bucket_type_edge_function: 'avaliacoes' });
        }
        if (item.foto_lado_url) {
          filesToProcess.push({ user_id: userId, file_url: item.foto_lado_url, bucket_type_edge_function: 'avaliacoes' });
        }
        if (item.foto_costas_url) {
          filesToProcess.push({ user_id: userId, file_url: item.foto_costas_url, bucket_type_edge_function: 'avaliacoes' });
        }
      }
    }

    if (rotinas) {
      for (const item of rotinas) {
        const userId = item.aluno_id;
        if (!userId) continue; // Pula se não houver ID de aluno

        if (item.pdf_url) {
          // IMPORTANTE: O bucket_type para a Edge Function é 'rotinas'
          filesToProcess.push({ user_id: userId, file_url: item.pdf_url, bucket_type_edge_function: 'rotinas' });
        }
      }
    }

    const deletedLogEntries = [];
    let successfulDeletions = 0;

    if (filesToProcess.length > 0) {
      for (const file of filesToProcess) {
        const filename = file.file_url.split('?')[0].split('/').pop();
        if (!filename) {
          console.warn(`Skipping file with invalid URL: ${file.file_url}`);
          continue;
        }

        console.log(`Attempting to delete ${filename} from bucket ${file.bucket_type_edge_function}...`);

        try {
          // Chama a Edge Function 'delete-image'
          const { data: edgeFunctionResponse, error: edgeFunctionError } = await supabase.functions.invoke('delete-image', {
            body: {
              filename: filename,
              bucket_type: file.bucket_type_edge_function
            }
          });

          if (edgeFunctionError) {
            console.error(`Error calling delete-image Edge Function for ${filename}:`, edgeFunctionError);
            // Loga a falha mas continua
          } else if (edgeFunctionResponse && edgeFunctionResponse.success) {
            console.log(`Successfully deleted ${filename}.`);
            successfulDeletions++;
            deletedLogEntries.push({
              user_id: file.user_id,
              file_url: file.file_url,
              bucket_type: file.bucket_type_edge_function // Usa o tipo de bucket da Edge Function para o log
            });
          } else {
            console.error(`Edge Function reported failure for ${filename}:`, edgeFunctionResponse);
            // Loga a falha mas continua
          }
        } catch (edgeCallError) {
          console.error(`Unexpected error during Edge Function call for ${filename}:`, edgeCallError);
          // Loga a falha mas continua
        }
      }

      if (deletedLogEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('deleted_user_files_log')
          .insert(deletedLogEntries);

        if (insertError) throw new Error(JSON.stringify(insertError));

        const successMessage = `Successfully processed ${filesToProcess.length} files. Deleted and logged ${deletedLogEntries.length} file URLs.`;
        console.log(successMessage);
        return res.status(200).json({ success: true, message: successMessage });
      } else {
        const noDeletionsMessage = "No files were successfully deleted or logged.";
        console.log(noDeletionsMessage);
        return res.status(200).json({ success: true, message: noDeletionsMessage });
      }

    } else {
      const noFilesMessage = "No file URLs found to process for deletion.";
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
