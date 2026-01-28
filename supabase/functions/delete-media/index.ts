/**
 * 🗑️ EDGE FUNCTION - delete-media
 * 
 * Deleta arquivos do Cloudflare R2 usando AWS Signature V4
 * Suporta múltiplos buckets: avaliacoes, exercicios, rotinas, avatars, posts
 * 
 * @param {string} filename - Nome do arquivo a ser deletado
 * @param {string} bucket_type - Tipo do bucket
 * @returns {object} { success: boolean, message: string, error?: string }
 */ 
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createHash, createHmac } from 'https://deno.land/std@0.168.0/node/crypto.ts';
console.log('🚀 Edge Function delete-media iniciada');
// ✅ ATUALIZADO: Configuração de buckets incluindo 'exercicios-padrao' e 'posts'
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
  'posts': {
    bucket: 'posts'
  }
};
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
serve(async (req)=>{
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  if (req.method !== 'POST') {
    console.log('❌ Método não permitido:', req.method);
    return new Response(JSON.stringify({
      success: false,
      error: 'Método não permitido. Use POST.'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    console.log('🗑️ =================== INÍCIO DELETE MEDIA ===================');
    console.log('🗑️ Processando requisição de deleção...');
    // Parse request body
    const { filename, bucket_type = 'avaliacoes' } = await req.json();
    console.log('📋 Dados recebidos:', {
      filename,
      bucket_type
    });
    if (!filename || typeof filename !== 'string' || filename.trim() === '') {
      console.log('❌ Filename obrigatório ausente ou inválido');
      return new Response(JSON.stringify({
        success: false,
        error: 'filename é obrigatório e deve ser uma string válida'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // ✅ ATUALIZADO: Validar bucket_type incluindo 'posts'
    if (!BUCKET_CONFIG[bucket_type]) {
      console.log('❌ Bucket type inválido:', bucket_type);
      return new Response(JSON.stringify({
        success: false,
        error: 'bucket_type inválido. Valores permitidos: "avaliacoes", "exercicios", "exercicios-padrao", "rotinas", "avatars", "posts"'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Limpar filename
    const cleanFilename = filename.trim();
    console.log('📄 Filename limpo:', cleanFilename);
    // ✅ CORRIGIDO: Determinar bucket usando configuração atualizada
    const bucketName = BUCKET_CONFIG[bucket_type].bucket;
    // Verificar variáveis de ambiente
    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = Deno.env.get('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    console.log('🔑 Verificando credenciais R2:', {
      accountId: accountId ? 'OK' : 'MISSING',
      accessKeyId: accessKeyId ? 'OK' : 'MISSING',
      secretAccessKey: secretAccessKey ? 'OK' : 'MISSING',
      bucketName: bucketName || 'MISSING',
      bucket_type
    });
    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      console.log('❌ Credenciais R2 não configuradas');
      return new Response(JSON.stringify({
        success: false,
        error: 'Credenciais R2 não configuradas nas variáveis de ambiente',
        missing: {
          accountId: !accountId,
          accessKeyId: !accessKeyId,
          secretAccessKey: !secretAccessKey,
          bucketName: !bucketName
        }
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Configurações R2
    const region = 'auto';
    const service = 's3';
    const host = `${accountId}.r2.cloudflarestorage.com`;
    const endpoint = `https://${host}`;
    console.log('🗑️ Preparando deleção no Cloudflare R2...');
    console.log('🌐 Host:', host);
    console.log('📁 Bucket:', bucketName);
    console.log('📄 Arquivo:', cleanFilename);
    // Timestamp AWS
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substr(0, 8);
    console.log('⏰ Timestamps AWS:', {
      amzDate,
      dateStamp
    });
    // Função para criar assinatura AWS V4
    function getSignatureKey(key, dateStamp, regionName, serviceName) {
      const kDate = createHmac('sha256', 'AWS4' + key).update(dateStamp).digest();
      const kRegion = createHmac('sha256', kDate).update(regionName).digest();
      const kService = createHmac('sha256', kRegion).update(serviceName).digest();
      const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
      return kSigning;
    }
    // Criar canonical request para DELETE
    const method = 'DELETE';
    const canonicalUri = `/${bucketName}/${cleanFilename}`;
    const canonicalQuerystring = '';
    // Para DELETE, o payload é vazio mas ainda precisa do hash
    const payloadHash = createHash('sha256').update('').digest('hex');
    // Headers canônicos
    const canonicalHeaders = [
      `host:${host}`,
      `x-amz-content-sha256:${payloadHash}`,
      `x-amz-date:${amzDate}`
    ].join('\n') + '\n';
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    // Montar canonical request completo
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');
    console.log('📝 Canonical Request criado para DELETE');
    // Criar string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n');
    console.log('🔏 String to Sign criada');
    // Calcular assinatura
    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    console.log('✏️ Assinatura AWS V4 calculada');
    // Criar authorization header
    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    // Headers para a requisição DELETE
    const deleteHeaders = {
      'Host': host,
      'X-Amz-Date': amzDate,
      'X-Amz-Content-Sha256': payloadHash,
      'Authorization': authorizationHeader
    };
    console.log('🗑️ Fazendo DELETE request com headers AWS corretos...');
    // Executar DELETE request
    const deleteResponse = await fetch(`${endpoint}${canonicalUri}`, {
      method: 'DELETE',
      headers: deleteHeaders
    });
    console.log('📊 Status da resposta DELETE:', deleteResponse.status);
    const responseText = await deleteResponse.text();
    console.log('📊 Body da resposta:', responseText || '(vazio)');
    // Tratar diferentes status codes da resposta
    if (deleteResponse.status === 204) {
      // 204 No Content = deleção bem-sucedida
      console.log('✅ SUCESSO: Arquivo deletado do R2!');
      console.log('🗑️ =================== DELETE CONCLUÍDO ===================');
      return new Response(JSON.stringify({
        success: true,
        message: `Arquivo ${cleanFilename} deletado com sucesso do Cloudflare R2`,
        filename: cleanFilename,
        bucket_type,
        bucket_name: bucketName,
        status: deleteResponse.status,
        method: 'R2_DELETE_SUCCESS'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else if (deleteResponse.status === 404) {
      // 404 Not Found = arquivo não existe (consideramos sucesso)
      console.log('ℹ️ SUCESSO: Arquivo não encontrado (já estava deletado)');
      console.log('🗑️ =================== DELETE CONCLUÍDO ===================');
      return new Response(JSON.stringify({
        success: true,
        message: `Arquivo ${cleanFilename} não encontrado no R2 (já estava deletado)`,
        filename: cleanFilename,
        bucket_type,
        bucket_name: bucketName,
        status: deleteResponse.status,
        method: 'R2_DELETE_NOT_FOUND'
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Outros status codes = erro real
      console.log('❌ FALHA na deleção do R2:', {
        status: deleteResponse.status,
        statusText: deleteResponse.statusText,
        body: responseText,
        filename: cleanFilename
      });
      return new Response(JSON.stringify({
        success: false,
        error: `Falha na deleção do arquivo no Cloudflare R2`,
        details: {
          status: deleteResponse.status,
          statusText: deleteResponse.statusText,
          response: responseText,
          filename: cleanFilename,
          bucket_type,
          bucket_name: bucketName,
          url: `${endpoint}${canonicalUri}`
        }
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  } catch (error) {
    console.error('💥 ERRO INESPERADO na Edge Function delete-media:', error);
    console.error('💥 Stack trace:', error.stack);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno do servidor na deleção de arquivo',
      details: error.message,
      type: 'INTERNAL_SERVER_ERROR'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
