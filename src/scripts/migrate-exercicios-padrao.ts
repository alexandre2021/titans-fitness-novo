// src/scripts/migrate-exercicios-padrao.ts
// npm run db:migrate-media

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env na raiz do projeto
dotenv.config({ path: '.env' });

// --- CONFIGURAÇÃO ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

const SUPABASE_BUCKET = 'exercicios-padrao';
const R2_BUCKET = 'exercicios-padrao';

// Validação das variáveis de ambiente
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  throw new Error('Variáveis de ambiente do Supabase ou Cloudflare R2 não configuradas no arquivo .env');
}

// --- INICIALIZAÇÃO DOS CLIENTES ---

// Cliente Supabase (com chave de serviço para acesso total)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Cliente S3 para o Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

console.log('✅ Clientes Supabase e R2 inicializados.');

// --- FUNÇÃO AUXILIAR PARA LISTAGEM RECURSIVA ---
// A API `list()` do Supabase não tem uma opção recursiva, então precisamos
// navegar pelas pastas manualmente para encontrar todos os arquivos.
async function listAllFiles(bucket: string, path = ''): Promise<{ name: string }[]> {
  const { data, error } = await supabase.storage.from(bucket).list(path, {
    limit: 1000, // O limite padrão é 100, aumentamos para evitar muitas chamadas.
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error(`Erro ao listar o caminho '${path}':`, error);
    throw error;
  }

  let allFiles: { name: string }[] = [];
  for (const file of data) {
    const currentPath = path ? `${path}/${file.name}` : file.name;
    if (file.id === null) { // Um 'id' nulo indica uma pasta.
      const nestedFiles = await listAllFiles(bucket, currentPath);
      allFiles = allFiles.concat(nestedFiles);
    } else {
      // É um arquivo, adicionamos à lista com o caminho completo.
      allFiles.push({ name: currentPath });
    }
  }
  return allFiles;
}

// --- FUNÇÃO PRINCIPAL DE MIGRAÇÃO ---
async function migrateMedia() {
  console.log(`🚀 Iniciando migração do bucket '${SUPABASE_BUCKET}' para o R2...`);

  try {
    // 1. Listar todos os arquivos no bucket do Supabase de forma recursiva
    console.log(`🔎 Listando arquivos no bucket '${SUPABASE_BUCKET}' do Supabase...`);
    const files = await listAllFiles(SUPABASE_BUCKET);
    const filesToMigrate = files.filter(file => !file.name.endsWith('.emptyFolderPlaceholder'));

    if (filesToMigrate.length === 0) {
      console.log('⚠️ Nenhum arquivo encontrado no bucket de origem. Nada a fazer.');
      return;
    }

    console.log(`📄 Encontrados ${filesToMigrate.length} arquivos para migrar.`);

    // 2. Processar migração em lotes paralelos para eficiência
    const BATCH_SIZE = 10;
    let migratedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < filesToMigrate.length; i += BATCH_SIZE) {
      const batch = filesToMigrate.slice(i, i + BATCH_SIZE);
      console.log(`\n🔄 Processando lote ${i / BATCH_SIZE + 1} de ${Math.ceil(filesToMigrate.length / BATCH_SIZE)} (arquivos ${i + 1} a ${i + batch.length})...`);

      const promises = batch.map(async (file, index) => {
        const fileLogPrefix = `[${i + index + 1}/${filesToMigrate.length}] ${file.name}`;
        try {
          // Baixar o arquivo do Supabase
          const { data: blob, error: downloadError } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .download(file.name);

          if (downloadError) throw downloadError;
          if (!blob) {
            throw new Error(`Download do arquivo ${file.name} retornou um blob nulo.`);
          }

          // Fazer upload para o R2
          await s3Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: file.name, // Mantém o mesmo caminho/nome do arquivo
            Body: Buffer.from(await blob.arrayBuffer()),
            ContentType: blob.type,
          }));
          console.log(`  ✅ ${fileLogPrefix} migrado com sucesso.`);
        } catch (error) {
          // Garante que a mensagem de erro seja exibida e relança o erro
          // para que o Promise.allSettled o capture como 'rejected'.
          const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
          console.error(`  ❌ ${fileLogPrefix} falhou:`, errorMessage);
          throw error;
        }
      });

      const results = await Promise.allSettled(promises);
      migratedCount += results.filter(r => r.status === 'fulfilled').length;
      failedCount += results.filter(r => r.status === 'rejected').length;
    }

    console.log(`\n🎉 Migração concluída!`);
    console.log(`   - Sucesso: ${migratedCount} arquivos`);
    console.log(`   - Falhas: ${failedCount} arquivos`);
  } catch (error) {
    console.error('🔥 Erro fatal durante a migração:', error);
  }
}

void migrateMedia();
