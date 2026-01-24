/**
 * Script para gerar embeddings dos artigos usando Google Gemini API
 *
 * Uso: GEMINI_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/generate-embeddings.js
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ynGames.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY é obrigatório');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY é obrigatório');
  process.exit(1);
}

const EMBEDDING_MODEL = 'text-embedding-004';
const EMBEDDING_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

async function getEmbedding(text) {
  const response = await fetch(`${EMBEDDING_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao gerar embedding: ${error}`);
  }

  const data = await response.json();
  return data.embedding.values;
}

async function updateArticleEmbedding(id, embedding) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_base_articles?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ embedding: JSON.stringify(embedding) })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro ao atualizar artigo ${id}: ${error}`);
  }
}

async function getArticles() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_base_articles?select=id,title,description&order=id`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar artigos');
  }

  return response.json();
}

async function main() {
  console.log('Buscando artigos...');
  const articles = await getArticles();
  console.log(`Encontrados ${articles.length} artigos\n`);

  let success = 0;
  let failed = 0;

  for (const article of articles) {
    const text = `${article.title}. ${article.description || ''}`.trim();

    try {
      process.stdout.write(`[${success + failed + 1}/${articles.length}] ${article.title.substring(0, 40)}... `);

      const embedding = await getEmbedding(text);
      await updateArticleEmbedding(article.id, embedding);

      console.log('OK');
      success++;

      // Rate limiting - pequena pausa entre requests
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.log(`ERRO: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Concluído: ${success} sucesso, ${failed} falhas`);
}

main().catch(console.error);
