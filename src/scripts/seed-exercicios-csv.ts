// src/scripts/seed-exercicios-csv.ts
// npx ts-node src/scripts/seed-exercicios-csv.ts

import fetch from 'node-fetch';

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mime from 'mime-types';
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
 * Faz o upload de uma imagem para o Cloudflare R2 usando uma URL pré-assinada.
 * @param imageFilename - O nome do arquivo da imagem na pasta de imagens.
 * @returns A URL pública da imagem no storage ou null se o upload falhar.
 */
async function uploadImage(imageFilename: string | null): Promise<string | null> {
  if (!imageFilename) return null;

  const imagePath = path.join(IMAGES_FOLDER_PATH, imageFilename);

  if (!fs.existsSync(imagePath)) {
    console.warn(`⚠️  Aviso: Imagem "${imageFilename}" não encontrada. Pulando upload.`);
    return null;
  }

  // 1. Ler e processar a imagem com Sharp
  const fileBuffer = fs.readFileSync(imagePath);
  console.log(`  - ⚙️  Processando e comprimindo "${imageFilename}"...`);
  const processedBuffer = await sharp(fileBuffer)
    .resize({ width: 640, withoutEnlargement: true }) // Redimensiona para largura máxima de 640px
    .jpeg({ quality: 85 }) // Converte para JPEG com 85% de qualidade
    .toBuffer();

  // 2. Definir metadados para o novo arquivo processado
  const contentType = 'image/jpeg'; // O arquivo agora é sempre JPEG
  const baseName = path.parse(imageFilename).name;
  const uniqueFilename = `padrao_${Date.now()}_${baseName.replace(/\s/g, '_')}.jpg`;

  try {
    console.log(`  - 📤 Solicitando URL de upload para: ${uniqueFilename}`);

    // 3. Chamar a Edge Function para obter a URL pré-assinada
    const { data: presignedData, error: presignedError } = await supabase.functions.invoke('upload-media', {
      body: {
        action: 'generate_upload_url',
        filename: uniqueFilename,
        contentType: contentType,
        bucket_type: 'exercicios-padrao' // Bucket para exercícios padrão
      }
    });

    if (presignedError || !presignedData?.signedUrl) {
      throw new Error(presignedError?.message || 'Não foi possível obter a URL de upload.');
    }

    // 4. Fazer o upload direto para o Cloudflare R2
    const uploadResponse = await fetch(presignedData.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: processedBuffer, // Envia o buffer processado
    });

    if (!uploadResponse.ok) {
      const errorBody = await uploadResponse.text();
      throw new Error(`Falha no upload para o R2: ${uploadResponse.status} - ${errorBody}`);
    }

    console.log(`  - ✅ Upload de "${uniqueFilename}" concluído.`);
    return presignedData.path; // Retorna o caminho do arquivo no bucket

  } catch (error) {
    console.error(`  - 🔥 Erro no upload de "${imageFilename}":`, error);
    return null;
  }
}

/**
 * Encontra o arquivo de imagem para um exercício, testando várias extensões.
 * @param baseFilename - O nome do exercício formatado (ex: 'agachamento-livre').
 * @returns O nome completo do arquivo com extensão, ou null se não encontrado.
 */
const findImageFile = (baseFilename: string): string | null => {
  const extensions = ['.webp', '.jpg', '.jpeg', '.png', '.gif'];
  for (const ext of extensions) {
    const filename = `${baseFilename}${ext}`;
    const imagePath = path.join(IMAGES_FOLDER_PATH, filename);
    if (fs.existsSync(imagePath)) {
      return filename;
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
    .pipe(csv({ headers: false })) // CSV sem cabeçalho
    .on('data', (data: string[]) => results.push(data))
    .on('end', async () => {
      console.log(`📄 Encontrados ${results.length} exercícios no CSV para processar.`);

      for (const row of results) {
        const nome = row[0];
        if (!nome || !nome.trim()) {
          console.warn('⚠️  Linha vazia ou sem nome no CSV, pulando.');
          continue;
        }
        console.log(`\n💪 Processando exercício: ${nome}`);

        // 1. Encontrar e fazer upload da imagem
        const baseFilenameForImage = nome.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const imagem_filename = findImageFile(baseFilenameForImage);

        if (!imagem_filename) {
          console.warn(`  - ⚠️  Aviso: Nenhuma imagem encontrada para "${nome}". Pulando upload.`);
        }
        const imagem_url = await uploadImage(imagem_filename);

        // 2. Preparar os dados para inserção
        const exercicioParaInserir = {
          nome: nome,
          grupo_muscular: row[1] || null,
          grupo_muscular_primario: row[2] || null,
          // Converte string separada por vírgula em array de strings
          grupos_musculares_secundarios: row[3]
            ? row[3].split(';').map((s: string) => s.trim())
            : null,
          equipamento: row[4] || null,
          descricao: row[5] || null,
          instrucoes: row[6] || null,
          dificuldade: row[7] || 'Média',
          imagem_1_url: imagem_url,
          imagem_2_url: null,
          video_url: null,
          youtube_url: null,
          tipo: 'padrao', // Todos os exercícios do CSV são 'padrao'
          is_ativo: true,
        };

        // 3. Inserir ou atualizar (upsert) no Supabase
        console.log(`  - 💾 Inserindo/atualizando "${exercicioParaInserir.nome}" no banco de dados...`);
        const { error } = await supabase
          .from('exercicios')
          .upsert(exercicioParaInserir, { onConflict: 'nome' });

        if (error) {
          console.error(`  - 🔥 Erro ao salvar o exercício "${nome}":`, error.message);
        } else {
          console.log(`  - ✅ Exercício "${nome}" salvo com sucesso!`);
        }
      }

      console.log('\n🎉 Script de seeding concluído!');
    });
}

// Executar a função
void seedExerciciosFromCsv();