import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// 5 chaves Groq em round-robin
const GROQ_API_KEYS = [
  Deno.env.get('GROQ_API_KEY_01')!,
  Deno.env.get('GROQ_API_KEY_02')!,
  Deno.env.get('GROQ_API_KEY_03')!,
  Deno.env.get('GROQ_API_KEY_04')!,
  Deno.env.get('GROQ_API_KEY_05')!,
].filter(Boolean);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Contador para round-robin (persiste entre requests na mesma instância)
let keyIndex = 0;

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  user_type: 'professor' | 'aluno' | 'ambos';
  description: string | null;
}

interface AskRequest {
  question: string;
  userType: 'professor' | 'aluno';
}

/**
 * Normaliza pergunta para busca no cache
 */
function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '')     // Remove pontuação
    .trim();
}

/**
 * Obtém próxima chave API em round-robin
 */
function getNextApiKey(): string {
  if (GROQ_API_KEYS.length === 0) {
    throw new Error('Nenhuma chave Groq configurada');
  }
  const key = GROQ_API_KEYS[keyIndex];
  keyIndex = (keyIndex + 1) % GROQ_API_KEYS.length;
  return key;
}

/**
 * Chama a API do Groq
 */
async function callGroq(prompt: string, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const apiKey = getNextApiKey();

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content?.trim() || '';
    }

    // Retry em caso de rate limit ou erro temporário
    if ((response.status === 429 || response.status >= 500) && attempt < retries) {
      console.log(`[Retry ${attempt}/${retries}] Status ${response.status}, tentando próxima chave...`);
      continue;
    }

    const errorText = await response.text();
    console.error('Erro Groq:', errorText);
    throw new Error('Falha ao consultar LLM');
  }

  throw new Error('Falha após todas as tentativas');
}

/**
 * Agrupa artigos por categoria
 */
function groupByCategory(articles: Article[]): Map<string, Article[]> {
  const grouped = new Map<string, Article[]>();
  for (const article of articles) {
    const list = grouped.get(article.category) || [];
    list.push(article);
    grouped.set(article.category, list);
  }
  return grouped;
}

/**
 * Edge Function para buscar artigos relevantes na Central de Ajuda
 *
 * Fluxo:
 * 1. Verifica cache
 * 2. Se não tiver, usa LLM em 2 etapas (categoria → artigo)
 * 3. Salva resultado no cache
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
    const { data: cacheHit } = await supabase
      .from('help_search_cache')
      .select('id, article_id')
      .eq('question_normalized', normalizedQuestion)
      .eq('user_type', userType)
      .not('helpful', 'eq', false) // Ignorar respostas marcadas como não úteis
      .single();

    if (cacheHit?.article_id) {
      // Buscar artigo do cache
      const { data: cachedArticle } = await supabase
        .from('knowledge_base_articles')
        .select('id, title, content, category')
        .eq('id', cacheHit.article_id)
        .single();

      if (cachedArticle) {
        // Incrementar hit_count
        await supabase
          .from('help_search_cache')
          .update({ hit_count: supabase.rpc('increment_hit_count', { row_id: cacheHit.id }), updated_at: new Date().toISOString() })
          .eq('id', cacheHit.id);

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

    // 3. ETAPA 1: Identificar categoria
    const categoriesMap = groupByCategory(articles);
    const categoryNames = Array.from(categoriesMap.keys());

    let categoryListPrompt = '';
    categoryNames.forEach((catName, catIndex) => {
      const catArticles = categoriesMap.get(catName) || [];
      categoryListPrompt += `\n${catIndex + 1}. CATEGORIA: ${catName}\n`;
      catArticles.forEach(a => {
        categoryListPrompt += `   - ${a.title}${a.description ? ` → ${a.description}` : ''}\n`;
      });
    });

    const step1Prompt = `Você identifica categorias de ajuda em um app de personal trainers.

TAREFA: Qual categoria contém a resposta para a pergunta do usuário?

REGRAS:
1. Responda APENAS com o número da categoria (ex: "3")
2. Se nenhuma categoria for relevante, responda "0"
3. Sinônimos: treino=rotina=sessão, cadastrar=adicionar=vincular, criar=fazer=montar

CATEGORIAS E SEUS ARTIGOS:
${categoryListPrompt}

Pergunta: "${question}"

Número:`;

    const step1Answer = await callGroq(step1Prompt);
    const categoryNumber = parseInt(step1Answer.replace(/\D/g, ''), 10);

    console.log(`[Etapa 1] Categoria: ${categoryNumber} (${categoryNames[categoryNumber - 1] || 'N/A'})`);

    if (categoryNumber <= 0 || categoryNumber > categoryNames.length) {
      return new Response(
        JSON.stringify({
          found: false,
          message: 'Não encontrei uma categoria relevante. Tente reformular ou navegue pelas categorias.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. ETAPA 2: Selecionar artigo
    const selectedCategory = categoryNames[categoryNumber - 1];
    const categoryArticles = categoriesMap.get(selectedCategory) || [];

    const articleListPrompt = categoryArticles.map((a, index) =>
      `${index + 1}. ${a.title}\n   Descrição: ${a.description || 'Sem descrição'}`
    ).join('\n\n');

    const step2Prompt = `Você seleciona artigos de ajuda.

CATEGORIA: ${selectedCategory}

TAREFA: Qual artigo responde melhor à pergunta do usuário?

REGRAS:
1. Responda APENAS com o número do artigo (ex: "2")
2. Artigos marcados como "ARTIGO GERAL" são preferidos para perguntas genéricas

ARTIGOS:
${articleListPrompt}

Pergunta: "${question}"

Número:`;

    const step2Answer = await callGroq(step2Prompt);
    const articleNumber = parseInt(step2Answer.replace(/\D/g, ''), 10);

    console.log(`[Etapa 2] Artigo: ${articleNumber} (${categoryArticles[articleNumber - 1]?.title || 'N/A'})`);

    if (articleNumber <= 0 || articleNumber > categoryArticles.length) {
      return new Response(
        JSON.stringify({
          found: false,
          message: 'Não encontrei um artigo específico. Tente reformular ou navegue pelas categorias.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Salvar no cache
    const foundArticle = categoryArticles[articleNumber - 1];

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
