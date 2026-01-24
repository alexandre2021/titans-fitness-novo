-- Habilitar extensão de vetores
CREATE EXTENSION IF NOT EXISTS vector;

-- Adicionar coluna de embedding (384 dimensões para gte-small / Google embedding)
ALTER TABLE knowledge_base_articles
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Criar índice para busca por similaridade
CREATE INDEX IF NOT EXISTS knowledge_base_articles_embedding_idx
ON knowledge_base_articles
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- Função para buscar artigos similares
CREATE OR REPLACE FUNCTION match_articles(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_user_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.title,
    a.content,
    a.category,
    a.description,
    1 - (a.embedding <=> query_embedding) as similarity
  FROM knowledge_base_articles a
  WHERE
    a.embedding IS NOT NULL
    AND (filter_user_type IS NULL OR a.user_type = filter_user_type OR a.user_type = 'ambos')
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
