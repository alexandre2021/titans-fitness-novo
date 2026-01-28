import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configurações - Cloudflare Workers AI
const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID')!;
const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const CF_API_URL = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CF_MODEL}`;

interface AskRequest {
  question: string;
  userType: 'professor' | 'aluno';
}

function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function extractNumber(text: string): number {
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : -1;
}


/**
 * Chama o Cloudflare Workers AI (Llama 3.1 8B)
 */
async function callCloudflareAI(prompt: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(CF_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'Você é um classificador de artigos de ajuda. Responda APENAS com um número inteiro, nada mais.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 10,
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.result?.response?.trim() || '';
        console.log(`[Cloudflare AI] Resposta: "${text}"`);
        return text;
      }

      const errorText = await response.text();
      console.error(`[Cloudflare AI ERRO ${response.status}] Tentativa ${attempt}:`, errorText);

      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        console.log(`[Retry ${attempt}/${retries}] Aguardando ${attempt}s...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      return '-1';
    } catch (e) {
      console.error(`[Cloudflare AI EXCEPTION] Tentativa ${attempt}:`, e);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      return '-1';
    }
  }

  return '-1';
}

/**
 * Edge Function para buscar artigos relevantes na Central de Ajuda
 */
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { question, userType }: AskRequest = await req.json();

    if (!question || !userType) {
      return new Response(
        JSON.stringify({ error: 'Pergunta e tipo de usuário são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedQuestion = normalizeQuestion(question);

    console.log(`[Busca] "${question}" (${userType}) → normalized: "${normalizedQuestion}"`);

    // 1. Verificar cache
    const { data: cacheResults } = await supabase
      .from('help_search_cache')
      .select('id, article_id')
      .eq('question_normalized', normalizedQuestion)
      .eq('user_type', userType)
      .not('helpful', 'eq', false)
      .order('created_at', { ascending: false })
      .limit(1);

    const cacheHit = cacheResults?.[0];

    if (cacheHit?.article_id) {
      const { data: cachedArticle } = await supabase
        .from('knowledge_base_articles')
        .select('id, title, content, category')
        .eq('id', cacheHit.article_id)
        .single();

      if (cachedArticle) {
        console.log(`[Cache HIT] "${cachedArticle.title}"`);
        return new Response(
          JSON.stringify({
            found: true,
            fromCache: true,
            cacheId: cacheHit.id,
            article: cachedArticle,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Buscar todos os artigos
    const { data: articles, error: dbError } = await supabase
      .from('knowledge_base_articles')
      .select('id, title, content, category, user_type, description')
      .or(`user_type.eq.ambos,user_type.eq.${userType}`)
      .order('category_order')
      .order('article_order');

    if (dbError) {
      console.error('Erro ao buscar artigos:', dbError);
      throw new Error('Falha ao buscar artigos');
    }

    if (!articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ found: false, message: 'Nenhum artigo disponível.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. ETAPA ÚNICA: Selecionar artigo diretamente
    const articleListPrompt = articles.map((a, index) =>
      `${index + 1}. [${a.category}] ${a.title}${a.description ? ` | ${a.description.substring(0, 80)}` : ''}`
    ).join('\n');

    const prompt = `Qual artigo responde melhor à pergunta do usuário?

ARTIGOS:
${articleListPrompt}

PERGUNTA: "${question}"

Responda APENAS com o número do artigo (ex: "14"):`;

    console.log(`[Busca] Total de artigos: ${articles.length}`);
    const answer = await callCloudflareAI(prompt);
    console.log(`[Busca] Resposta da IA: "${answer}"`);

    const articleNumber = extractNumber(answer);
    console.log(`[Busca] Artigo selecionado: ${articleNumber} (${articles[articleNumber - 1]?.title || 'N/A'})`);

    if (articleNumber <= 0 || articleNumber > articles.length) {
      return new Response(
        JSON.stringify({
          found: false,
          message: 'Não encontrei um artigo relevante. Tente reformular ou navegue pelas categorias.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Salvar no cache
    const foundArticle = articles[articleNumber - 1];

    const { data: newCache } = await supabase
      .from('help_search_cache')
      .insert({
        question: question,
        question_normalized: normalizedQuestion,
        user_type: userType,
        article_id: foundArticle.id,
      })
      .select('id')
      .single();

    console.log(`[Cache SAVE] "${foundArticle.title}" para "${normalizedQuestion}"`);

    return new Response(
      JSON.stringify({
        found: true,
        fromCache: false,
        cacheId: newCache?.id,
        article: {
          id: foundArticle.id,
          title: foundArticle.title,
          content: foundArticle.content,
          category: foundArticle.category,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função ask-help-center:', error);
    return new Response(
      JSON.stringify({
        found: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
