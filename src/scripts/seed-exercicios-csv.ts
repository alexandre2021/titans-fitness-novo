// src/scripts/seed-exercicios-csv.ts
// não incluir cabeçalho no .csv, deve se chamar 'exercicios.csv', deve estar na pasta 'data'
// só serve para as animações que podem ser .gif ou .webp, elas precisam ser 1:1, devem estar na pasta 'data\imagens_exercicios'
// para rodar: npx tsx src/scripts/seed-exercicios-csv.ts

import fetch from 'node-fetch';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import sharp from 'sharp';

// Carrega as variáveis de ambiente
dotenv.config({ path: '.env' });

// --- CONFIGURAÇÃO ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Caminhos para os arquivos de dados
const CSV_FILE_PATH = path.join(process.cwd(), 'data', 'exercicios.csv');
const IMAGES_FOLDER_PATH = path.join(process.cwd(), 'data', 'imagens_exercicios');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variáveis de ambiente do Supabase não configuradas no arquivo .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Limpa e padroniza um nome de arquivo para ser seguro para URLs e nomes de objeto na nuvem.
 */
function sanitizeForCloud(name: string | null): string {
  if (!name) return 'geral';
  return name
    .toLowerCase()
    .normalize('NFD') // Separa acentos
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais, mantendo apenas letras, números e espaços
    .trim()
    .replace(/\s+/g, '_'); // Troca espaços por underscores
}

/**
 * Faz o upload de uma imagem para o Cloudflare R2.
 */
async function uploadImage(imageFilename: string | null, grupoMuscular: string): Promise<string | null> {
  if (!imageFilename) return null;

  const imagePath = path.join(IMAGES_FOLDER_PATH, imageFilename);

  if (!fs.existsSync(imagePath)) {
    console.warn(`  - ⚠️  Aviso: Imagem "${imageFilename}" não encontrada. Pulando upload.`);
    return null;
  }

  const fileBuffer = fs.readFileSync(imagePath);
  const fileExtension = path.extname(imageFilename).toLowerCase();

  let processedBuffer: Buffer;
  let contentType: string;
  let uniqueFilename: string;
  const baseName = path.parse(imageFilename).name;
  const sanitizedGrupoMuscular = sanitizeForCloud(grupoMuscular);
  const sanitizedBaseName = sanitizeForCloud(baseName);

  const isAnimation = ['.gif', '.webp'].includes(fileExtension);

  if (isAnimation) {
    console.log(`  - ⚙️  Processando animação para WebP: "${imageFilename}"...`);
    processedBuffer = await sharp(fileBuffer, { animated: true })
      .resize({ width: 360, height: 360, fit: 'cover' })
      .webp({ quality: 75, effort: 6 }) // Ajustado para maior compressão
      .toBuffer();
    contentType = 'image/webp';
    uniqueFilename = `${sanitizedGrupoMuscular}/${sanitizedBaseName}.webp`;
  } else {
    // Fallback para imagens estáticas, caso existam no futuro
    console.log(`  - ⚙️  Processando imagem estática: "${imageFilename}"...`);
    processedBuffer = await sharp(fileBuffer)
      .resize({ width: 360, height: 360, fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer();
    contentType = 'image/jpeg';
    uniqueFilename = `${sanitizedGrupoMuscular}/${sanitizedBaseName}.jpg`;
  }

  try {
    console.log(`  - 📤 Solicitando URL de upload para: ${uniqueFilename}`);

    const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
      body: {
        action: 'generate_upload_url',
        filename: uniqueFilename,
        contentType: contentType,
        bucket_type: 'exercicios-padrao'
      }
    });

    if (presignedError || !presignedData?.signedUrl) {
      throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
    }

    const uploadResponse = await fetch(presignedData.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: processedBuffer,
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      throw new Error(`Falha no upload para o R2: ${uploadResponse.status} - ${errorBody}`);
    }

    console.log(`  - ✅ Upload de "${uniqueFilename}" concluído.`);
    return presignedData.path;

  } catch (error) {
    console.error(`  - 🔥 Erro no upload de "${imageFilename}":`, error);
    return null;
  }
}

/**
 * Encontra o arquivo de imagem para um exercício, testando várias extensões.
 * É tolerante a múltiplos espaços no nome do arquivo.
 */
const findImageFile = (baseFilename: string): string | null => {
  const extensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif'];

  // 1. Tenta encontrar com o nome exato primeiro
  for (const ext of extensions) {
    const filename = `${baseFilename}${ext}`;
    const imagePath = path.join(IMAGES_FOLDER_PATH, filename);
    if (fs.existsSync(imagePath)) {
      return filename;
    }
  }

  // 2. Se não encontrar, tenta com os espaços normalizados (múltiplos espaços viram um só)
  const normalizedBaseFilename = baseFilename.replace(/\s+/g, ' ').trim();
  if (normalizedBaseFilename !== baseFilename) {
    for (const ext of extensions) {
      const filename = `${normalizedBaseFilename}${ext}`;
      const imagePath = path.join(IMAGES_FOLDER_PATH, filename);
      if (fs.existsSync(imagePath)) {
        console.log(`  - ℹ️  Nota: Imagem encontrada para "${baseFilename}" usando nome normalizado: "${normalizedBaseFilename}"`);
        return filename;
      }
    }
  }

  return null;
};

/**
 * Função principal para ler o CSV e popular o banco de dados.
 */
async function seedExerciciosFromCsv() {
  console.log('🚀 Iniciando script de seeding de exercícios a partir do CSV...');

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`🔥 Erro: Arquivo CSV não encontrado em: ${CSV_FILE_PATH}`);
    return;
  }

  const results: string[][] = [];
  fs.createReadStream(CSV_FILE_PATH)
    .pipe(csv({ headers: false }))
    .on('data', (data: string[]) => results.push(data))
    .on('end', async () => {
      console.log(`📄 Encontrados ${results.length} exercícios no CSV para processar.`);

      let processedCount = 0;
      let insertedCount = 0;
      let skippedCount = 0;
      const uploadFailures: { nome: string; grupo_muscular: string | null; imagem_filename: string }[] = [];
      const notFoundImages: string[] = [];

      for (const row of results) {
        processedCount++;
        const nome = row[0];
        if (!nome || !nome.trim()) {
          console.warn('⚠️  Linha vazia ou sem nome no CSV, pulando.');
          continue;
        }
        console.log(`\n💪 Processando exercício: ${nome}`);

        const grupoMuscular = row[1] || 'geral';

        // 1. Encontrar e fazer upload da imagem
        const baseFilenameForImage = nome;
        const imagem_filename = findImageFile(baseFilenameForImage);
        let imagem_url: string | null = null;

        if (!imagem_filename) {
          console.warn(`  - ⚠️  Aviso: Nenhuma imagem encontrada para "${nome}" (buscando por "${baseFilenameForImage}.[extensao]").`);
          notFoundImages.push(nome);
        } else {
          imagem_url = await uploadImage(imagem_filename, grupoMuscular);
          if (!imagem_url) {
            uploadFailures.push({ nome, grupo_muscular: grupoMuscular, imagem_filename });
          }
        }

        // 2. Preparar os dados para inserção
        const exercicioParaInserir = {
          nome: nome,
          grupo_muscular: row[1] || null,
          grupo_muscular_primario: row[2] || null,
          grupos_musculares_secundarios: row[3] || null,
          equipamento: row[4] || null,
          descricao: row[5] || null,
          instrucoes: row[6] || null,
          dificuldade: row[7] || 'Média',
          imagem_1_url: imagem_url,
          tipo: 'padrao',
          is_ativo: true,
        };

        // 3. Checar e inserir no banco
        const { grupo_muscular } = exercicioParaInserir;
        console.log(`  - 🔎 Verificando se "${nome}" (${grupo_muscular}) já existe...`);
        const { data: existing, error: selectError } = await supabase
          .from('exercicios')
          .select('id')
          .eq('nome', nome)
          .eq('grupo_muscular', grupo_muscular)
          .maybeSingle();

        if (selectError) {
          console.error(`  - 🔥 Erro ao verificar o exercício "${nome}":`, selectError.message);
          continue;
        }

        if (existing) {
          console.log(`  - ⏩ Exercício "${nome}" (${grupo_muscular}) já existe. Pulando.`);
          skippedCount++;
        } else {
          console.log(`  - 💾 Inserindo novo exercício "${nome}" (${grupo_muscular})...`);
          const { error: insertError } = await supabase.from('exercicios').insert(exercicioParaInserir);

          if (insertError) {
            console.error(`  - 🔥 Erro ao salvar o exercício "${nome}":`, insertError.message);
          } else {
            console.log(`  - ✅ Exercício "${nome}" salvo com sucesso!`);
            insertedCount++;
          }
        }
      }

      // --- Retentativa de Upload ---
      const finalFailures: string[] = [];
      if (uploadFailures.length > 0) {
        console.log(`\n🔁 Tentando novamente ${uploadFailures.length} uploads de imagem que falharam...`);
        for (const failure of uploadFailures) {
          console.log(`  - Retentando upload para "${failure.nome}"...`);
          const imagem_url_retry = await uploadImage(failure.imagem_filename, failure.grupo_muscular || 'geral');

          if (imagem_url_retry) {
            console.log(`  - ✅ Sucesso na nova tentativa! Atualizando exercício no banco...`);
            await supabase
              .from('exercicios')
              .update({ imagem_1_url: imagem_url_retry })
              .eq('nome', failure.nome)
              .eq('grupo_muscular', failure.grupo_muscular);
          } else {
            console.error(`  - 🔥 Falha na nova tentativa para "${failure.nome}".`);
            finalFailures.push(failure.nome);
          }
        }
      }

      // --- Resumo Final ---
      console.log('\n\n---');
      console.log('🎉 Script de seeding concluído!');
      console.log('📊 RESUMO DA EXECUÇÃO:');
      console.log(`  - ${processedCount} exercícios lidos do CSV.`);
      console.log(`  - ${insertedCount} novos exercícios inseridos no banco.`);
      console.log(`  - ${skippedCount} exercícios existentes foram ignorados.`);
      
      if (notFoundImages.length > 0) {
        console.log('\n⚠️ IMAGENS NÃO ENCONTRADAS:');
        notFoundImages.forEach(nome => console.log(`  - Para o exercício: "${nome}"`));
        console.log('  (Verifique se os nomes dos arquivos correspondem exatamente aos nomes no CSV, incluindo erros de digitação)');
      }

      if (finalFailures.length > 0) {
        console.log('\n🔥 UPLOADS DE IMAGEM FALHARAM (mesmo após retentativa):');
        finalFailures.forEach(nome => console.log(`  - Para o exercício: "${nome}"`));
      }

      if (notFoundImages.length === 0 && finalFailures.length === 0) {
        console.log('\n✅ Todos os exercícios e imagens foram processados com sucesso!');
      }
      console.log('---\n');
    });
}

// Executar a função
void seedExerciciosFromCsv();
