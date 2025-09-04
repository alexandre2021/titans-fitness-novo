// /otimizador-exercicios/src/index.ts
// Usando a biblioteca mais leve e recomendada: @jsquash/webp
import { encode as encodeWebp } from "@jsquash/webp";
import { decode as decodeJpeg } from "@jsquash/jpeg";
import { decode as decodePng } from "@jsquash/png";

export interface Env {
  EXERCICIOS_PT_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  SUPABASE_CALLBACK_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Otimizar a imagem no upload
    if (request.method === 'POST') {
      try {
        const { filename } = await request.json() as { filename: string };
        await optimizeImage(filename, env);
        return new Response(JSON.stringify({ success: true, message: 'Otimização iniciada.' }));
      } catch (error) {
        console.error('💥 Erro no Worker:', error);
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
      }
    }

    // Retorno padrão para outras requisições
    return new Response('Otimizador de imagens de exercícios ativo!');
  }
};

async function optimizeImage(filename: string, env: Env): Promise<void> {
  // CORREÇÃO 1: O filename recebido já é o caminho completo (ex: 'originais/nome.jpg')
  // Não precisamos adicionar o prefixo 'originais/' novamente.
  const objectKey = filename;
  // Extrai apenas o nome do arquivo do caminho completo (ex: 'nome.jpg')
  const baseFilename = filename.split('/').pop();

  // Adiciona uma verificação para garantir que baseFilename não é undefined.
  if (!baseFilename) {
    console.error(`❌ Não foi possível extrair o nome do arquivo de: ${filename}`);
    throw new Error(`Could not extract base filename from ${filename}`);
  }

  const originalObject = await env.EXERCICIOS_PT_BUCKET.get(objectKey);

  if (!originalObject) {
    console.log('⚠️ Arquivo não encontrado no R2. Pulando otimização.');
    return;
  }

  try {
    // 1. Baixar imagem original do bucket R2
    const originalBuffer = await originalObject.arrayBuffer();
    const originalSize = originalBuffer.byteLength;
    const contentType = originalObject.httpMetadata?.contentType;

    let imageData;

    // NOVO: Decodificar a imagem para o formato ImageData antes de otimizar
    if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
      imageData = await decodeJpeg(originalBuffer);
    } else if (contentType === 'image/png') {
      imageData = await decodePng(originalBuffer);
    } else {
      // Se o tipo não for suportado, lança um erro para evitar processamento incorreto.
      throw new Error(`Unsupported content type for optimization: ${contentType}`);
    }

    // 2. Processar a imagem com a biblioteca @jsquash/webp
    // A função `encode` do @jsquash/webp espera um objeto ImageData
    const optimizedBuffer = await encodeWebp(imageData, {
      quality: 75,
    });
    const optimizedSize = optimizedBuffer.byteLength;

    // CORREÇÃO 2: Usar o nome base do arquivo para criar o novo nome, não o caminho completo.
    const newFileName = baseFilename.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
    const newKey = `tratadas/${newFileName}`;

    // 3. Salvar imagem otimizada na pasta 'tratadas/'
    await env.EXERCICIOS_PT_BUCKET.put(newKey, optimizedBuffer, {
      httpMetadata: { contentType: 'image/webp' }
    });

    // 4. Deletar imagem original da pasta 'originais/'
    await env.EXERCICIOS_PT_BUCKET.delete(objectKey);
    console.log(`🗑️ Original deletado: ${objectKey}`);

    // 5. Enviar callback para a Edge Function de retorno
    const publicUrl = `${env.R2_PUBLIC_URL}/${newKey}`;
    const compressionRatio = `${(((originalSize - optimizedSize) / originalSize) * 100).toFixed(1)}%`;

    await fetch(env.SUPABASE_CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalKey: objectKey,
        optimizedKey: newKey,
        publicUrl,
        originalSize,
        optimizedSize,
        compressionRatio
      })
    });
    console.log('✅ Callback enviado com sucesso.');

  } catch (error) {
    console.error('❌ Erro no processo de otimização:', error);
    throw error;
  }
}