import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

console.log('🚀 Edge Function get-image-url iniciada');

const BUCKET_CONFIG = {
  'avaliacoes': {
    bucket: 'avaliacoes'
  },
  'exercicios': {
    bucket: 'exerciciospt'
  },
  'exercicios-padrao': {
    bucket: 'exercicios-padrao'
  },
  'rotinas': {
    bucket: 'rotinas-concluidas'
  },
  'avatars': {
    bucket: 'avatars'
  },
  'posts': { // Adicionado o novo bucket para posts
    bucket: 'posts'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    const { filename, bucket_type = 'avaliacoes' } = await req.json();

    if (!filename) {
      return new Response(JSON.stringify({
        success: false,
        error: 'filename é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // ✅ CORREÇÃO: A validação agora inclui 'posts'.
    if (!BUCKET_CONFIG[bucket_type]) {
      return new Response(JSON.stringify({
        success: false,
        error: 'bucket_type inválido'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const R2_BUCKET_NAME = BUCKET_CONFIG[bucket_type].bucket;
    const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const R2_ACCESS_KEY_ID = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const R2_SECRET_ACCESS_KEY = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

    if (!CLOUDFLARE_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('Credenciais R2 não configuradas nas variáveis de ambiente');
    }

    console.log(`📸 Gerando URL para: ${filename} no bucket ${R2_BUCKET_NAME}`);

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

    const canonicalUri = `/${R2_BUCKET_NAME}/${filename}`;
    const canonicalQueryString = params.toString();
    const canonicalHeaders = `host:${host}\n`;
    const signedHeaders = 'host';

    const canonicalRequest = [
      'GET',
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      'UNSIGNED-PAYLOAD'
    ].join('\n');

    const stringToSign = [
      algorithm,
      amzDate,
      `${dateStamp}/${region}/${service}/aws4_request`,
      await sha256(canonicalRequest)
    ].join('\n');

    const signingKey = await getSigningKey(R2_SECRET_ACCESS_KEY, dateStamp, region, service);
    const signature = await hmacSha256(signingKey, stringToSign);

    params.append('X-Amz-Signature', signature);

    const signedUrl = `https://${host}${canonicalUri}?${params.toString()}`;

    return new Response(JSON.stringify({
      success: true,
      url: signedUrl,
      expires_in: 3600,
      filename: filename,
      bucket_type,
      bucket_name: R2_BUCKET_NAME
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('💥 [Edge Function] Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

// Funções auxiliares para assinatura AWS
async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  let key = encoder.encode(`AWS4${secretKey}`);

  key = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(dateStamp)
  ));

  key = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(region)
  ));

  key = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode(service)
  ));

  key = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    encoder.encode('aws4_request')
  ));

  return key;
}
