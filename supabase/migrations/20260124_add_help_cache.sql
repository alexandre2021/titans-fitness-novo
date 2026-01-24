-- Habilitar extensão unaccent primeiro
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Tabela de cache para perguntas da Central de Ajuda
CREATE TABLE IF NOT EXISTS help_search_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  question_normalized text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('professor', 'aluno')),
  article_id uuid REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  helpful boolean DEFAULT NULL,
  hit_count integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índice para busca rápida por pergunta normalizada
CREATE INDEX IF NOT EXISTS help_search_cache_question_idx
ON help_search_cache (question_normalized, user_type);

-- Índice para encontrar respostas não úteis
CREATE INDEX IF NOT EXISTS help_search_cache_helpful_idx
ON help_search_cache (helpful) WHERE helpful = false;

-- Função para normalizar pergunta (lowercase, sem acentos, sem pontuação extra)
CREATE OR REPLACE FUNCTION normalize_question(q text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT lower(
    regexp_replace(
      unaccent(trim(q)),
      '[^a-z0-9\s]', '', 'g'
    )
  );
$fn$;
