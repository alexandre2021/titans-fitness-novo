/**
 * Script para atualizar imagens de exercícios padrão em lote
 *
 * COMO USAR:
 * 1. Coloque os GIFs/imagens na pasta: data/atualizar_imagens/
 * 2. Nome dos arquivos deve ser EXATAMENTE o nome do exercício
 *    Exemplo: "Supino reto com barra.gif" ou "Agachamento livre.gif"
 * 3. Execute: npx tsx src/scripts/atualizar-imagens-exercicios.ts
 *
 * O script irá:
 * - Converter GIF para WebP animado (otimizado)
 * - Fazer upload para o bucket exercicios-padrao
 * - Atualizar o registro do exercício no banco
 * - Remover a imagem antiga do bucket
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as dotenv from 'dotenv';

// Carrega variáveis de ambiente
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Pasta onde estão os arquivos para atualizar
const IMAGES_FOLDER = path.join(process.cwd(), 'data', 'atualizar_imagens');

interface UpdateResult {
  exercicio: string;
  status: 'success' | 'error' | 'not_found';
  message: string;
}

/**
 * Converte GIF animado para WebP animado otimizado
 */
async function convertGifToAnimatedWebP(inputPath: string): Promise<Buffer> {
  console.log(`  📝 Convertendo GIF para WebP animado...`);

  try {
    const webpBuffer = await sharp(inputPath, { animated: true })
      .webp({
        quality: 75,
        lossless: false,
        effort: 4,
      })
      .toBuffer();

    const originalSize = fs.statSync(inputPath).size;
    const newSize = webpBuffer.length;
    const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);

    console.log(`  ✅ Convertido: ${(originalSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB (redução de ${reduction}%)`);

    return webpBuffer;
  } catch (error) {
    console.error(`  ❌ Erro na conversão:`, error);
    throw error;
  }
}

/**
 * Processa imagem estática (JPG, PNG, WebP)
 */
async function processStaticImage(inputPath: string): Promise<Buffer> {
  console.log(`  📝 Otimizando imagem estática...`);

  try {
    const imageBuffer = await sharp(inputPath)
      .resize(640, null, {
        withoutEnlargement: true,
        fit: 'inside'
      })
      .webp({ quality: 85 })
      .toBuffer();

    const originalSize = fs.statSync(inputPath).size;
    const newSize = imageBuffer.length;

    console.log(`  ✅ Otimizado: ${(originalSize / 1024).toFixed(1)}KB → ${(newSize / 1024).toFixed(1)}KB`);

    return imageBuffer;
  } catch (error) {
    console.error(`  ❌ Erro na otimização:`, error);
    throw error;
  }
}

/**
 * Faz upload do arquivo para o bucket via Edge Function
 */
async function uploadToBucket(fileBuffer: Buffer, filename: string): Promise<string> {
  const uploadFilename = `padrao_${Date.now()}_${filename}`;

  console.log(`  📤 Fazendo upload: ${uploadFilename}`);

  // 1. Solicitar URL de upload via Edge Function
  const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
    body: {
      action: 'generate_upload_url',
      filename: uploadFilename,
      contentType: 'image/webp',
      bucket_type: 'exercicios-padrao'
    }
  });

  if (presignedError || !presignedData?.signedUrl) {
    throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
  }

  // 2. Fazer upload direto para o R2
  const uploadResponse = await fetch(presignedData.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/webp' },
    body: fileBuffer,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text();
    throw new Error(`Falha no upload para o R2: ${uploadResponse.status} - ${errorBody}`);
  }

  console.log(`  ✅ Upload concluído`);
  return presignedData.path;
}

/**
 * Remove arquivo antigo do bucket via Edge Function
 */
async function deleteOldFile(oldUrl: string | null): Promise<void> {
  if (!oldUrl) return;

  // Ignorar URLs antigas do Google Storage
  if (oldUrl.includes('storage.googleapis.com')) {
    console.log(`  ⏭️  URL antiga (Google Storage) - ignorando exclusão`);
    return;
  }

  try {
    const filename = oldUrl.split('/').pop()?.split('?')[0];
    if (!filename) return;

    console.log(`  🗑️  Removendo arquivo antigo: ${filename}`);

    const { error } = await supabase.functions.invoke('delete-media', {
      body: {
        filename,
        bucket_type: 'exercicios-padrao'
      }
    });

    if (error) {
      console.warn(`  ⚠️  Erro ao remover arquivo antigo:`, error.message);
    } else {
      console.log(`  ✅ Arquivo antigo removido`);
    }
  } catch (error) {
    console.warn(`  ⚠️  Erro ao remover arquivo antigo:`, error);
  }
}

/**
 * Atualiza exercício no banco de dados
 */
async function updateExercicio(exercicioNome: string, newImagePath: string): Promise<UpdateResult> {
  console.log(`\n🔄 Processando: ${exercicioNome}`);

  try {
    // 1. Buscar exercício pelo nome exato
    const { data: exercicio, error: fetchError } = await supabase
      .from('exercicios')
      .select('id, nome, imagem_1_url')
      .eq('tipo', 'padrao')
      .ilike('nome', exercicioNome)
      .single();

    if (fetchError || !exercicio) {
      console.log(`  ❌ Exercício não encontrado: "${exercicioNome}"`);
      return {
        exercicio: exercicioNome,
        status: 'not_found',
        message: 'Exercício não encontrado no banco'
      };
    }

    console.log(`  ✅ Exercício encontrado: ${exercicio.nome} (ID: ${exercicio.id})`);

    // 2. Processar imagem (converter se for GIF)
    const ext = path.extname(newImagePath).toLowerCase();
    let processedBuffer: Buffer;

    if (ext === '.gif') {
      processedBuffer = await convertGifToAnimatedWebP(newImagePath);
    } else {
      processedBuffer = await processStaticImage(newImagePath);
    }

    // 3. Upload da nova imagem
    const sanitizedName = path.basename(newImagePath, ext)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_');

    const uploadedPath = await uploadToBucket(processedBuffer, `${sanitizedName}.webp`);

    // 4. Atualizar banco de dados
    console.log(`  💾 Atualizando banco de dados...`);

    const { error: updateError } = await supabase
      .from('exercicios')
      .update({ imagem_1_url: uploadedPath })
      .eq('id', exercicio.id);

    if (updateError) {
      throw new Error(`Erro ao atualizar banco: ${updateError.message}`);
    }

    console.log(`  ✅ Banco atualizado`);

    // 5. Remover imagem antiga
    await deleteOldFile(exercicio.imagem_1_url);

    console.log(`  ✅ Processamento concluído com sucesso!`);

    return {
      exercicio: exercicioNome,
      status: 'success',
      message: 'Imagem atualizada com sucesso'
    };

  } catch (error) {
    console.error(`  ❌ Erro:`, error);
    return {
      exercicio: exercicioNome,
      status: 'error',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🚀 Script de Atualização de Imagens de Exercícios\n');
  console.log(`📁 Pasta de origem: ${IMAGES_FOLDER}\n`);

  // Verificar se a pasta existe
  if (!fs.existsSync(IMAGES_FOLDER)) {
    console.error(`❌ Pasta não encontrada: ${IMAGES_FOLDER}`);
    console.log(`\n💡 Crie a pasta e adicione os arquivos antes de executar o script.`);
    process.exit(1);
  }

  // Listar arquivos
  const files = fs.readdirSync(IMAGES_FOLDER)
    .filter(file => /\.(gif|jpg|jpeg|png|webp)$/i.test(file));

  if (files.length === 0) {
    console.error(`❌ Nenhum arquivo de imagem encontrado na pasta`);
    process.exit(1);
  }

  console.log(`📋 Encontrados ${files.length} arquivo(s) para processar:\n`);
  files.forEach(file => console.log(`   - ${file}`));
  console.log('');

  // Processar cada arquivo
  const results: UpdateResult[] = [];

  for (const file of files) {
    const exercicioNome = path.basename(file, path.extname(file));
    const filePath = path.join(IMAGES_FOLDER, file);

    const result = await updateExercicio(exercicioNome, filePath);
    results.push(result);

    // Aguardar 500ms entre requisições para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Resumo final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMO DA ATUALIZAÇÃO\n');

  const success = results.filter(r => r.status === 'success').length;
  const notFound = results.filter(r => r.status === 'not_found').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log(`✅ Sucesso: ${success}`);
  console.log(`❓ Não encontrados: ${notFound}`);
  console.log(`❌ Erros: ${errors}`);
  console.log('');

  if (notFound > 0) {
    console.log('Exercícios não encontrados:');
    results
      .filter(r => r.status === 'not_found')
      .forEach(r => console.log(`  - ${r.exercicio}`));
    console.log('');
  }

  if (errors > 0) {
    console.log('Erros:');
    results
      .filter(r => r.status === 'error')
      .forEach(r => console.log(`  - ${r.exercicio}: ${r.message}`));
  }

  console.log('='.repeat(60));
}

// Executar script
main().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
