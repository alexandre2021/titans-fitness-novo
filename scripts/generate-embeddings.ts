import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import { pipeline, env } from '@xenova/transformers';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// --- Interfaces (reutilizadas da CentralDeAjuda.tsx) ---
interface Article {
  title: string;
  content: string;
  tags: string[];
}

// --- Configuração do Modelo Local ---
env.allowLocalModels = true;
env.cacheDir = './.cache'; // Armazena o modelo localmente para não baixar toda vez

// --- Configuração ---
const privateKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!privateKey) throw new Error(`Variável de ambiente SUPABASE_SERVICE_ROLE_KEY não encontrada.`);

const url = process.env.VITE_SUPABASE_URL;
if (!url) throw new Error(`Variável de ambiente VITE_SUPABASE_URL não encontrada.`);

const supabase = createClient(url, privateKey);

// --- Lógica de Análise do Markdown ---
const parseKnowledgeBase = (content: string): Article[] => {
  const articles: Article[] = [];
  // Usa uma expressão regular para encontrar todos os blocos de artigo,
  // sejam eles no formato antigo (### Título) ou novo (--- title).
  const articleBlocks = content.match(/(### Título:[\s\S]*?)(?=\n### Título:|\n---|$)|(---[\s\S]*?---[\s\S]*?)(?=\n### Título:|\n---|$)/g);

  if (!articleBlocks) return [];

  for (const block of articleBlocks) {
    const titleMatch = block.match(/^(?:### Título:|title:)\s*(.*)/m);
    const tagsMatch = block.match(/^(?:\*\s{3}\*\*Tags:\*\*|tags:)\s*(.*)/m);
    const contentMatchOld = block.match(/^\*\s{3}\*\*Conteúdo:\*\*\s*([\s\S]*?)(?=\n\*\s{3}\*\*Tags:\*\*|\n## Categoria:|$)/m);
    const contentMatchNew = block.match(/---\n([\s\S]*)/m);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const tags = tagsMatch ? tagsMatch[1].split(',').map(tag => tag.trim()) : [];
    let content = '';

    if (contentMatchOld) {
      content = contentMatchOld[1].trim();
    } else if (contentMatchNew) {
      content = contentMatchNew[1].trim();
    }

    const article: Article = { title, tags, content };

    if (article.title && article.content) {
      articles.push(article as Article);
    }
  }
  return articles;
};
// ✅ NOVA FUNÇÃO: Divide um artigo em fragmentos menores (chunks)
const splitArticleIntoChunks = async (article: Article): Promise<string[]> => {
  const formattedContent = `Título: ${article.title}\nConteúdo: ${article.content}\nTags: ${article.tags.join(', ')}`;
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 50,
  });
  return await splitter.splitText(formattedContent);
}

async function generateEmbeddings() {
  try {
    console.log('Carregando o modelo de embedding localmente (pode levar um tempo na primeira vez)...');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    console.log('Lendo a base de conhecimento...');
    const markdownContent = fs.readFileSync(path.join(process.cwd(), 'src', 'docs', 'base-de-conhecimento.md'), 'utf-8');
    
    const articles = parseKnowledgeBase(markdownContent);
    console.log(`Encontrados ${articles.length} artigos para processar.`);

    if (articles.length === 0) {
      console.warn('⚠️ Nenhum artigo foi encontrado. Verifique o formato do seu arquivo `base-de-conhecimento.md`.');
      return;
    }

    console.log('Limpando a tabela knowledge_base existente...');
    const { error: deleteError } = await supabase.from('knowledge_base').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) throw deleteError;

    console.log('Gerando embeddings e salvando no Supabase...');
    let totalChunks = 0;
    for (const article of articles) {
      // ✅ ALTERAÇÃO: Gera chunks e embeddings para cada chunk
      const chunks = await splitArticleIntoChunks(article);
      totalChunks += chunks.length;

      for (const chunk of chunks) {
        const output = await extractor(chunk, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data as Float32Array);

        if (embedding.length !== 384) {
          throw new Error(`Embedding com dimensão inesperada: ${embedding.length}`);
        }
        const { error } = await supabase.from('knowledge_base').insert({
          content: chunk,
          embedding: embedding,
        });

        if (error) {
          console.error(`Erro ao inserir chunk do artigo "${article.title}":`, error);
        }
      }
    }

    console.log(`✅ Processo concluído! ${totalChunks} fragmentos gerados e salvos.`);
  } catch (error) {
    console.error('❌ Falha no processo de geração de embeddings:', error);
  }
}

generateEmbeddings();