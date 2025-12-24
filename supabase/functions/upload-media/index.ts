import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHash, createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';

console.log('🚀 Edge Function upload-media iniciada');

// Headers CORS obrigatórios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const BUCKET_CONFIG = {
  'avaliacoes': {
    bucket: 'avaliacoes',
    contentType: 'image/jpeg'
  },
  'exercicios': {
    bucket: 'exerciciospt',
    contentType: 'image/webp'
  },
  'exercicios-padrao': {
    bucket: 'exercicios-padrao',
    contentType: 'image/webp'
  },
  'rotinas': {
    bucket: 'rotinas-concluidas',
    contentType: 'application/pdf'
  },
  'avatars': {
    bucket: 'avatars',
    contentType: 'image/jpeg'
  },
  'posts': {
    bucket: 'posts',
    contentType: 'image/jpeg'
  }
};

// ✅ NOVA FUNÇÃO: Normaliza o nome do arquivo removendo acentos e caracteres especiais
function normalizeFilename(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
  const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';

  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // Substitui não-alfanuméricos por _
    .replace(/^_+|_+$/g, '') // Remove _ do início e fim
    .replace(/_+/g, '_'); // Remove _ duplicados

  return normalizedName + extension;
}

// Função para determinar content-type baseado na extensão do arquivo
function getContentType(filename: string, bucketType: string) {
  const config = BUCKET_CONFIG[bucketType];
  if (bucketType === 'avatars' || bucketType === 'exercicios' || bucketType === 'exercicios-padrao' || bucketType === 'posts') {
    const extension = filename.toLowerCase().split('.').pop();
    switch(extension){
      case 'png':
        return 'image/png';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'webp':
        return 'image/webp';
      case 'webm':
        return 'video/webm';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      default:
        return config.contentType;
    }
  }
  return config.contentType;
}

// Função para gerar URL pré-assinada de UPLOAD
async function generatePresignedUrl(bucketName: string, filename: string, contentType: string, expiresIn = 3600) {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Credenciais R2 não configuradas nas variáveis de ambiente');
  }

  // ✅ CORREÇÃO: Normaliza o filename ANTES de usar na URL
  const normalizedFilename = normalizeFilename(filename);
  console.log(`📝 Filename original: ${filename}`);
  console.log(`📝 Filename normalizado: ${normalizedFilename}`);

  const region = 'auto';
  const service = 's3';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substr(0, 8);

  function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
    const kDate = createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(regionName).digest();
    const kService = createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  }

  const method = 'PUT';
  // ✅ USA O FILENAME NORMALIZADO
  const canonicalUri = `/${bucketName}/${normalizedFilename}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host'
  });

  const canonicalQuerystring = queryParams.toString();
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const signedUrl = `${endpoint}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;
  // ✅ RETORNA O FILENAME NORMALIZADO
  const path = `${normalizedFilename}`;

  return {
    signedUrl,
    path
  };
}

// Função para gerar URL pré-assinada de LEITURA (GET)
async function generateReadUrl(bucketName: string, filename: string, expiresIn = 86400) {
  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Credenciais R2 não configuradas nas variáveis de ambiente');
  }

  const normalizedFilename = normalizeFilename(filename);
  const region = 'auto';
  const service = 's3';
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substr(0, 8);

  function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
    const kDate = createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(regionName).digest();
    const kService = createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
  }

  const method = 'GET';
  const canonicalUri = `/${bucketName}/${normalizedFilename}`;
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host'
  });

  const canonicalQuerystring = queryParams.toString();
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';
  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const algorithm = 'AWS4-HMAC-SHA256';
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const signedUrl = `${endpoint}${canonicalUri}?${canonicalQuerystring}&X-Amz-Signature=${signature}`;

  return signedUrl;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const { action, filename, contentType, bucket_type = 'exercicios' } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Parâmetro "action" é obrigatório'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

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

    const config = BUCKET_CONFIG[bucket_type];
    const bucketName = config.bucket;

    if (action === 'generate_upload_url') {
      if (!filename) {
        return new Response(JSON.stringify({
          success: false,
          error: 'filename é obrigatório para generate_upload_url'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      const finalContentType = contentType || getContentType(filename, bucket_type);

      console.log('📝 Gerando URL pré-assinada:', {
        bucket: bucketName,
        filename,
        contentType: finalContentType
      });

      const { signedUrl, path } = await generatePresignedUrl(
        bucketName,
        filename,
        finalContentType,
        3600
      );

      return new Response(JSON.stringify({
        success: true,
        signedUrl,
path,
        filename,
        bucket_type,
        content_type: finalContentType,
        expires_in: 3600
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (action === 'generate_read_url') {
      if (!filename) {
        return new Response(JSON.stringify({
          success: false,
          error: 'filename é obrigatório para generate_read_url'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      console.log('📖 Gerando URL de leitura:', {
        bucket: bucketName,
        filename
      });

      const readUrl = await generateReadUrl(bucketName, filename, 86400); // 24 horas

      return new Response(JSON.stringify({
        success: true,
        url: readUrl,
        filename,
        bucket_type,
        expires_in: 86400
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({
      success: false,
      error: `Ação '${action}' não reconhecida`
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('💥 Erro inesperado na Edge Function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
