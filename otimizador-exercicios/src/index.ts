// /otimizador-exercicios/src/index.ts
// Usando a biblioteca mais leve e recomendada: @jsquash/webp
import { encode } from "@jsquash/webp";

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
  const objectKey = `originais/${filename}`;
  const originalObject = await env.EXERCICIOS_PT_BUCKET.get(objectKey);

  if (!originalObject) {
    console.log('⚠️ Arquivo não encontrado no R2. Pulando otimização.');
    return;
  }

  try {
    // 1. Baixar imagem original do bucket R2
    const originalBuffer = await originalObject.arrayBuffer();
    const originalSize = originalBuffer.byteLength;

    // 2. Processar a imagem com a biblioteca @jsquash/webp
    // A função `encode` aceita um Uint8Array
    const optimizedBuffer = await encode(new Uint8Array(originalBuffer), {
      quality: 75,
    });
    const optimizedSize = optimizedBuffer.byteLength;
    const newFileName = filename.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
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