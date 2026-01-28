// /supabase/functions/copy-media/index.ts

// --- Explicação da Lógica: Cópia Segura Server-to-Server ---
//
// Esta função realiza uma cópia de arquivo entre dois buckets R2 privados.
// A operação é totalmente segura e ocorre entre servidores, sem expor chaves ou buckets.
//
// 1.  **Gerar URL de Leitura Pré-Assinada (Download):**
//     Para LER o arquivo do bucket de origem (ex: 'exercicios-padrao'), a função usa as
//     credenciais de API do Cloudflare R2 para gerar uma URL de download segura e temporária.
//     Isso permite que a função baixe o arquivo sem que o bucket precise ser público.
//
// 2.  **Fazer o Fetch do Conteúdo:**
//     Com a URL de leitura segura em mãos, a função faz um `fetch` para obter o conteúdo
//     (blob) do arquivo, que fica temporariamente na memória do servidor da Edge Function.
//
// 3.  **Gerar URL de Escrita Pré-Assinada (Upload):**
//     Para ESCREVER o arquivo no bucket de destino (ex: 'exerciciospt'), a função invoca
//     a Edge Function 'upload-media', que por sua vez gera outra URL segura e temporária,
//     mas desta vez com permissão de escrita (PUT).
//
// 4.  **Fazer o Upload do Conteúdo:**
//     Finalmente, a função 'copy-media' usa a URL de upload para enviar o blob do arquivo
//     para o novo local no bucket de destino.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.log('🚀 Edge Function copy-media (versão segura) iniciada');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// ✅ Mapeia um tipo de bucket para o nome real do bucket no R2.
const BUCKET_MAPPING = {
  'exercicios-padrao': 'exercicios-padrao',
  'exercicios': 'exerciciospt'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    // 1. Autenticar usuário
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Obter parâmetros
    const { sourcePath, source_bucket_type = 'exercicios-padrao' } = await req.json();
    if (!sourcePath) {
      return new Response(JSON.stringify({ error: 'sourcePath é obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!BUCKET_MAPPING[source_bucket_type as keyof typeof BUCKET_MAPPING]) {
      return new Response(JSON.stringify({ error: 'source_bucket_type inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    console.log(`🔄 Iniciando cópia de: ${sourcePath} do bucket ${source_bucket_type}`);

    // 3. ✅ Gerar URL de LEITURA pré-assinada para o arquivo de origem
    const sourceBucketName = BUCKET_MAPPING[source_bucket_type as keyof typeof BUCKET_MAPPING];
    const signedSourceUrl = await createSignedUrl(sourcePath, sourceBucketName, 'GET');
    
    console.log(`📥 Tentando baixar de URL segura: ${sourceBucketName}/${sourcePath}`);
    const downloadResponse = await fetch(signedSourceUrl);
    if (!downloadResponse.ok) {
      throw new Error(`Erro ao baixar arquivo: ${downloadResponse.status} - ${await downloadResponse.text()}`);
    }
    const fileBlob = await downloadResponse.blob();
    console.log(`✅ Arquivo baixado, tamanho: ${fileBlob.size} bytes`);

    // 4. Gerar nome único para o destino
    const originalFilename = sourcePath.split('/').pop() || 'media.jpg';
    const destinationPath = `pt_${user.id}_${Date.now()}_copia_${originalFilename}`;

    // 5. Obter URL de ESCRITA pré-assinada para o destino
    console.log(`📤 Solicitando URL de upload para: ${destinationPath}`);
    const { data: presignedData, error: presignedError } = await supabaseClient.functions.invoke('upload-media', {
      body: {
        action: 'generate_upload_url',
        filename: destinationPath,
        contentType: fileBlob.type,
        bucket_type: 'exercicios' // Bucket de destino
      }
    });
    if (presignedError || !presignedData.signedUrl) {
      throw new Error(presignedError?.message || 'Não foi possível obter URL de upload');
    }

    // 6. Fazer upload para o destino
    const uploadResponse = await fetch(presignedData.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': fileBlob.type },
      body: fileBlob
    });
    if (!uploadResponse.ok) {
      throw new Error(`Erro no upload: ${uploadResponse.status} - ${await uploadResponse.text()}`);
    }
    console.log(`✅ Cópia bem-sucedida: ${destinationPath}`);

    // 7. Retornar o novo caminho
    return new Response(JSON.stringify({ success: true, path: presignedData.path }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('💥 Erro na função copy-media:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// --- Funções Auxiliares para Assinatura AWS v4 ---

async function createSignedUrl(filename: string, bucket: string, method: 'GET' | 'PUT'): Promise<string> {
  const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

  if (!CLOUDFLARE_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('Credenciais R2 não configuradas nas variáveis de ambiente');
  }

  const region = 'auto';
  const service = 's3';
  const host = `${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:\-]/g, '').split('.')[0] + 'Z';
  
  const credential = `${R2_ACCESS_KEY_ID}/${dateStamp}/${region}/${service}/aws4_request`;
  const algorithm = 'AWS4-HMAC-SHA256';
  const expires = '3600'; // 1 hora

  const params = new URLSearchParams({
    'X-Amz-Algorithm': algorithm,
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expires,
    'X-Amz-SignedHeaders': 'host'
  });

  const canonicalUri = `/${bucket}/${filename}`;
  const canonicalQueryString = params.toString();
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = method === 'GET' ? 'UNSIGNED-PAYLOAD' : 'STREAMING-AWS4-HMAC-SHA256-PAYLOAD';
  
  const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  
  const stringToSign = [algorithm, amzDate, `${dateStamp}/${region}/${service}/aws4_request`, await sha256(canonicalRequest)].join('\n');
  
  const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
  const signature = await hmacSha256(signingKey, stringToSign);
  
  params.append('X-Amz-Signature', signature);
  return `https://${host}${canonicalUri}?${params.toString()}`;
}

async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  let key = encoder.encode(`AWS4${secretKey}`);
  key = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(dateStamp)));
  key = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(region)));
  key = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode(service)));
  key = new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), encoder.encode('aws4_request')));
  return key;
}
