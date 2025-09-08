// src/scripts/update-media-paths.ts
// npm run db:update-paths

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config({ path: '.env' });

// --- CONFIGURAÇÃO ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = 'exercicios-padrao';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas no arquivo .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Função para extrair o caminho relativo da URL completa do Supabase
function extractRelativePath(url: string | null): string | null {
  if (!url || !url.includes(`/storage/v1/object/public/${SUPABASE_BUCKET}/`)) {
    // Se não for uma URL do Supabase Storage ou for nula, retorna como está.
    // Isso torna o script seguro para ser executado múltiplas vezes.
    return url;
  }
  
  const urlPrefix = `/storage/v1/object/public/${SUPABASE_BUCKET}/`;
  const startIndex = url.indexOf(urlPrefix) + urlPrefix.length;
  let path = url.substring(startIndex);

  // Remove quaisquer parâmetros de query, como o '?' no final
  const queryIndex = path.indexOf('?');
  if (queryIndex !== -1) {
    path = path.substring(0, queryIndex);
  }

  return path;
}

async function updateExerciseMediaPaths() {
  console.log('🚀 Iniciando atualização dos caminhos de mídia na tabela "exercicios"...');

  try {
    // 1. Buscar todos os exercícios padrão
    const { data: exercicios, error: fetchError } = await supabase
      .from('exercicios')
      .select('id, imagem_1_url, imagem_2_url, video_url')
      .eq('tipo', 'padrao');

    if (fetchError) throw fetchError;
    if (!exercicios || exercicios.length === 0) {
      console.log('⚠️ Nenhum exercício do tipo "padrão" encontrado. Nada a fazer.');
      return;
    }

    console.log(`📄 Encontrados ${exercicios.length} exercícios padrão para verificar.`);

    const updates = exercicios.map(exercicio => ({
      id: exercicio.id,
      imagem_1_url: extractRelativePath(exercicio.imagem_1_url),
      imagem_2_url: extractRelativePath(exercicio.imagem_2_url),
      video_url: extractRelativePath(exercicio.video_url),
    })).filter((exercicio, index) => 
        exercicio.imagem_1_url !== exercicios[index].imagem_1_url ||
        exercicio.imagem_2_url !== exercicios[index].imagem_2_url ||
        exercicio.video_url !== exercicios[index].video_url
    );

    if (updates.length === 0) {
      console.log('✅ Todos os caminhos de mídia já estão no formato correto. Nenhuma atualização necessária.');
      return;
    }

    console.log(`⏳ Realizando ${updates.length} atualizações no banco de dados...`);

    // 2. O método `upsert` não é ideal para atualizações parciais em massa, pois pode
    // zerar colunas não fornecidas, mesmo com `defaultToNull: false`, se a coluna
    // não tiver um valor DEFAULT no banco de dados.
    // Em vez disso, iteramos e executamos `update` para cada registro.
    // Usamos `Promise.allSettled` para executar as atualizações em paralelo e capturar todas as falhas.
    const updatePromises = updates.map(exercicio =>
      supabase
        .from('exercicios')
        .update({
          imagem_1_url: exercicio.imagem_1_url,
          imagem_2_url: exercicio.imagem_2_url,
          video_url: exercicio.video_url,
        })
        .eq('id', exercicio.id)
    );

    const results = await Promise.allSettled(updatePromises);
    const failedUpdates = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    if (failedUpdates.length > 0) {
      console.error('🔥 Algumas atualizações falharam:');
      failedUpdates.forEach((failure) => {
        console.error(`- Erro:`, failure.reason?.message || failure.reason);
      });
      throw new Error(`${failedUpdates.length} de ${updates.length} atualizações falharam.`);
    }

    console.log(`🎉 Sucesso! ${updates.length} registros de exercícios foram atualizados com os novos caminhos de mídia.`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    console.error('🔥 Erro fatal durante a atualização dos caminhos:', errorMessage);
  }
}

void updateExerciseMediaPaths();