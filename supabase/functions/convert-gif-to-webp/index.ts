// supabase/functions/convert-gif-to-webp/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

console.log('🚀 Edge Function convert-gif-to-webp iniciada');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Valida se é GIF
    if (!file.type.includes('gif')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Apenas arquivos GIF são aceitos'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📥 Recebido GIF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Converte File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    console.log(`⚙️ Importando Sharp...`);

    // Tenta importar Sharp - se falhar, retorna erro explicativo
    let sharp;
    try {
      sharp = (await import('https://esm.sh/sharp@0.33.5')).default;
      console.log(`✅ Sharp importado com sucesso`);
    } catch (importError) {
      console.error('❌ Erro ao importar Sharp:', importError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro ao carregar biblioteca de processamento de imagens',
        details: importError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`⚙️ Convertendo GIF para WebP animado...`);

    try {
      // Processa o GIF: redimensiona e converte para WebP animado
      const processedBuffer = await sharp(uint8Array, { animated: true })
        .resize({ width: 640, height: 640, fit: 'cover' })
        .webp({ quality: 75, effort: 6 })
        .toBuffer();

      const sizeReduction = ((1 - processedBuffer.length / arrayBuffer.byteLength) * 100).toFixed(1);
      console.log(`✅ Conversão concluída: ${(processedBuffer.length / 1024 / 1024).toFixed(2)}MB (redução de ${sizeReduction}%)`);

      // Retorna o WebP animado
      return new Response(processedBuffer, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'image/webp',
          'Content-Length': processedBuffer.length.toString()
        }
      });
    } catch (sharpError) {
      console.error('❌ Erro no Sharp:', sharpError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro ao processar GIF',
        details: sharpError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('💥 Erro geral:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro ao converter GIF para WebP',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
