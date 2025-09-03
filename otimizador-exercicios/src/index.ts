interface Env {
  EXERCICIOS_PT_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  SUPABASE_CALLBACK_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/process-upload' && request.method === 'POST') {
      try {
        const { objectKey } = await request.json() as { objectKey: string };
        await optimizeImage(objectKey, env);
        return new Response(JSON.stringify({ success: true }));
      } catch (error) {
        return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
      }
    }
    
    return new Response('Otimizador Canvas ativo!');
  }
};

async function optimizeImage(objectKey: string, env: Env): Promise<void> {
  if (!objectKey.startsWith('originais/')) return;
  
  try {
    // 1. Baixar imagem original
    const originalObject = await env.EXERCICIOS_PT_BUCKET.get(objectKey);
    if (!originalObject) throw new Error('Arquivo não encontrado');

    const originalBuffer = await originalObject.arrayBuffer();
    const originalSize = originalBuffer.byteLength;
    const fileName = objectKey.split('/').pop() || 'image';
    
    // 2. Processar com Canvas API
    const blob = new Blob([originalBuffer]);
    const bitmap = await createImageBitmap(blob);
    
    // Redimensionar para 360p (640x360)
    const canvas = new OffscreenCanvas(640, 360);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, 640, 360);
    
    // Converter para WebP com 80% qualidade
    const webpBlob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: 0.8
    });
    
    const optimizedBuffer = await webpBlob.arrayBuffer();
    const optimizedSize = optimizedBuffer.byteLength;
    
    // 3. Salvar imagem otimizada
    const newFileName = fileName.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
    const newKey = `tratadas/${newFileName}`;
    
    await env.EXERCICIOS_PT_BUCKET.put(newKey, optimizedBuffer, {
      httpMetadata: { contentType: 'image/webp' }
    });

    // 4. Callback
    await fetch(env.SUPABASE_CALLBACK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalKey: objectKey,
        optimizedKey: newKey,
        publicUrl: `${env.R2_PUBLIC_URL}/${newKey}`,
        originalSize: originalSize,
        optimizedSize: optimizedSize,
        compressionRatio: `${(((originalSize - optimizedSize) / originalSize) * 100).toFixed(1)}%`
      })
    });

    // 5. Deletar original
    await env.EXERCICIOS_PT_BUCKET.delete(objectKey);
    
  } catch (error) {
    console.error('Erro:', error);
    throw error;
  }
}