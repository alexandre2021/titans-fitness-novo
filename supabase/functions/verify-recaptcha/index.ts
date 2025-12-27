import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RECAPTCHA_SECRET_V3 = Deno.env.get('RECAPTCHA_SECRET_V3')!;
const RECAPTCHA_SECRET_V2 = Deno.env.get('RECAPTCHA_SECRET_V2')!;
const RECAPTCHA_THRESHOLD = Number(Deno.env.get('RECAPTCHA_THRESHOLD') || '0.5');

interface RecaptchaRequest {
  token: string;
  version: 'v2' | 'v3';
  action?: string; // Apenas para v3
}

interface RecaptchaV3Response {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  score: number;
  action: string;
  'error-codes'?: string[];
}

interface RecaptchaV2Response {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  'error-codes'?: string[];
}

/**
 * Edge Function para verificar tokens reCAPTCHA v2 e v3
 *
 * Esta função implementa a estratégia híbrida de CAPTCHA:
 * - reCAPTCHA v3: Retorna score (0.0 a 1.0) para análise de risco
 * - reCAPTCHA v2: Valida desafio visual (checkbox)
 *
 * Uso:
 * POST /verify-recaptcha
 * Body: { token: string, version: 'v2' | 'v3', action?: string }
 *
 * Response v3: { success: true, score: 0.8, needsVisualChallenge: false }
 * Response v2: { success: true, verified: true }
 */
serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token, version, action }: RecaptchaRequest = await req.json();

    // Validar entrada
    if (!token || !version) {
      return new Response(
        JSON.stringify({ error: 'Token e versão são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (version === 'v3' && !action) {
      return new Response(
        JSON.stringify({ error: 'Action é obrigatória para reCAPTCHA v3' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const secret = version === 'v3' ? RECAPTCHA_SECRET_V3 : RECAPTCHA_SECRET_V2;

    if (!secret) {
      console.error(`reCAPTCHA ${version} secret não configurada`);
      return new Response(
        JSON.stringify({ error: 'Configuração de CAPTCHA inválida' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar token com Google
    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });

    if (!verifyResponse.ok) {
      throw new Error('Falha ao verificar com Google reCAPTCHA');
    }

    if (version === 'v3') {
      const data: RecaptchaV3Response = await verifyResponse.json();

      console.log(`reCAPTCHA v3 - Action: ${action}, Score: ${data.score}, Success: ${data.success}`);

      if (!data.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Verificação reCAPTCHA falhou',
            errorCodes: data['error-codes'],
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se o action corresponde (segurança adicional)
      if (data.action !== action) {
        console.warn(`Action mismatch: esperado ${action}, recebido ${data.action}`);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Action inválida',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Retornar resultado com indicação se precisa desafio visual
      return new Response(
        JSON.stringify({
          success: true,
          score: data.score,
          needsVisualChallenge: data.score < RECAPTCHA_THRESHOLD,
          threshold: RECAPTCHA_THRESHOLD,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // reCAPTCHA v2
      const data: RecaptchaV2Response = await verifyResponse.json();

      console.log(`reCAPTCHA v2 - Success: ${data.success}`);

      if (!data.success) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Verificação reCAPTCHA v2 falhou',
            errorCodes: data['error-codes'],
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          verified: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Erro ao verificar reCAPTCHA:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
