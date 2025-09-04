import encodeWebp, { init as initWebpEncoder } from "@jsquash/webp/encode.js";
import decodeJpeg, { init as initJpegDecoder } from "@jsquash/jpeg/decode.js";
import decodePng, { init as initPngDecoder } from "@jsquash/png/decode.js";

// --- Importar os módulos WASM diretamente ---
// A Cloudflare Workers consegue resolver estes caminhos durante o deploy,
// mesmo que o TypeScript no editor mostre um erro "Cannot find module".
import jpegDecWasm from './wasm/mozjpeg_dec.wasm';
import pngDecWasm from './wasm/squoosh_png_bg.wasm';
import webpEncWasm from './wasm/webp_enc.wasm';

export interface Env {
  EXERCICIOS_PT_BUCKET: R2Bucket;
  R2_PUBLIC_URL: string;
  SUPABASE_CALLBACK_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

let wasmInitialized = false;
async function initializeWasm() {
  if (wasmInitialized) return;
  // O `Promise.all` executa as inicializações em paralelo para mais velocidade
  await Promise.all([
    initJpegDecoder(jpegDecWasm),
    initPngDecoder(pngDecWasm),
    initWebpEncoder(webpEncWasm),
  ]);
  wasmInitialized = true;
  console.log('🚀 Módulos WASM inicializados com sucesso.');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // --- MODIFICAÇÃO 3: Garantir que o WASM está pronto antes de continuar ---
    await initializeWasm();

    console.log('--- 🚀 Worker Invocado ---');
    if (request.method !== 'POST') {
      return new Response('Método não permitido. Use POST.', { status: 405 });
    }

    try {
      console.log('1. Tentando extrair JSON do corpo da requisição...');
      const body = await request.json() as { filename?: string };
      console.log('✅ JSON extraído com sucesso:', body);

      const { filename } = body;
      if (!filename) {
        console.error('❌ Erro: "filename" não encontrado no corpo da requisição.');
        return new Response(JSON.stringify({ error: 'O campo "filename" é obrigatório.' }), { status: 400 });
      }
      console.log(`2. Nome do arquivo recebido: ${filename}`);

      console.log('3. Verificando variáveis de ambiente (env)...');
      const envKeys = {
        hasBucket: !!env.EXERCICIOS_PT_BUCKET,
        hasPublicUrl: !!env.R2_PUBLIC_URL,
        hasCallbackUrl: !!env.SUPABASE_CALLBACK_URL,
        hasServiceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
      };
      console.log('✅ Verificação de env:', envKeys);

      if (!envKeys.hasBucket || !envKeys.hasPublicUrl || !envKeys.hasCallbackUrl || !envKeys.hasServiceKey) {
        const missing = Object.entries(envKeys).filter(([, value]) => !value).map(([key]) => key).join(', ');
        console.error(`❌ Erro: Variáveis de ambiente faltando: ${missing}`);
        throw new Error(`Configuração do Worker incompleta. Faltando: ${missing}`);
      }

      console.log('4. Chamando a função optimizeImage...');
      await optimizeImage(filename, env);
      console.log('✅ Função optimizeImage concluída com sucesso.');

      return new Response(JSON.stringify({ success: true, message: 'Otimização concluída.' }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('💥 Erro CRÍTICO no Worker:', errorMessage);
      console.error('Stack Trace:', (error as Error).stack);
      return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
    }
  }
};

async function optimizeImage(filename: string, env: Env): Promise<void> {
  console.log('--- 🔄 Iniciando optimizeImage ---');
  const objectKey = filename;
  console.log(`5. Chave do objeto no R2: ${objectKey}`);

  const baseFilename = filename.split('/').pop();

  if (!baseFilename) {
    console.error(`❌ Não foi possível extrair o nome do arquivo de: ${filename}`);
    throw new Error(`Could not extract base filename from ${filename}`);
  }
  console.log(`6. Nome base do arquivo: ${baseFilename}`);

  console.log('7. Buscando objeto no R2...');
  const originalObject = await env.EXERCICIOS_PT_BUCKET.get(objectKey);

  if (!originalObject) {
    console.error(`⚠️ Arquivo não encontrado no R2 com a chave: ${objectKey}. Pulando otimização.`);
    return;
  }
  console.log('✅ Objeto encontrado no R2. Content-Type:', originalObject.httpMetadata?.contentType);

  try {
    console.log('8. Lendo buffer do arquivo...');
    const originalBuffer = await originalObject.arrayBuffer();
    const contentType = originalObject.httpMetadata?.contentType;
    console.log(`✅ Buffer lido. Tamanho: ${originalBuffer.byteLength} bytes. Tipo: ${contentType}`);

    let imageData;
    console.log('9. Decodificando imagem...');

    if (contentType === 'image/jpeg' || contentType === 'image/jpg') {
      imageData = await decodeJpeg(originalBuffer);
    } else if (contentType === 'image/png') {
      imageData = await decodePng(originalBuffer);
    } else {
      throw new Error(`Unsupported content type for optimization: ${contentType}`);
    }
    console.log('✅ Imagem decodificada.');

    console.log('10. Codificando para WebP...');
    const optimizedBuffer = await encodeWebp(imageData, { quality: 75 });
    console.log(`✅ Imagem codificada para WebP. Novo tamanho: ${optimizedBuffer.byteLength} bytes.`);

    const newFileName = baseFilename.replace(/\.(jpg|jpeg|png|webp)$/i, '.webp');
    const newKey = `tratadas/${newFileName}`;
    console.log(`11. Novo caminho do arquivo otimizado: ${newKey}`);

    console.log('12. Salvando imagem otimizada no R2...');
    await env.EXERCICIOS_PT_BUCKET.put(newKey, optimizedBuffer, {
      httpMetadata: { contentType: 'image/webp' }
    });
    console.log('✅ Imagem otimizada salva.');

    console.log('13. Deletando imagem original do R2...');
    await env.EXERCICIOS_PT_BUCKET.delete(objectKey);
    console.log(`✅ Original deletado: ${objectKey}`);

    console.log('14. Enviando callback para o Supabase...');
    const publicUrl = `${env.R2_PUBLIC_URL}/${newKey}`;
    
    const callbackResponse = await fetch(env.SUPABASE_CALLBACK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        originalKey: objectKey,
        optimizedKey: newKey,
        publicUrl,
        originalSize: originalBuffer.byteLength,
        optimizedSize: optimizedBuffer.byteLength,
      })
    });

    if (!callbackResponse.ok) {
        const errorBody = await callbackResponse.text();
        console.error(`❌ Falha no callback para Supabase. Status: ${callbackResponse.status}. Body: ${errorBody}`);
        throw new Error(`Falha no callback para Supabase: ${callbackResponse.status}`);
    }
    
    console.log('✅ Callback enviado com sucesso.');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Erro no processo de otimização:', errorMessage);
    console.error('Stack Trace:', (error as Error).stack);
    throw error;
  }
}