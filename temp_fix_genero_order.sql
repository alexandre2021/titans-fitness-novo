-- PASSO 1: Atualizar valores existentes ANTES de adicionar constraints

-- Atualizar modelos_rotina
UPDATE modelos_rotina 
SET genero = 'Ambos' 
WHERE genero = 'ambos' OR genero IS NULL OR LOWER(genero) != genero;

-- Atualizar rotinas
UPDATE rotinas 
SET genero = 'Ambos' 
WHERE genero = 'ambos' OR genero IS NULL OR LOWER(genero) != genero;

-- PASSO 2: Remover constraints antigas (se existirem)
ALTER TABLE modelos_rotina DROP CONSTRAINT IF EXISTS modelos_rotina_genero_check;
ALTER TABLE rotinas DROP CONSTRAINT IF EXISTS rotinas_genero_check;

-- PASSO 3: Adicionar constraints corretos
ALTER TABLE modelos_rotina 
  ADD CONSTRAINT modelos_rotina_genero_check 
  CHECK (genero IN ('Feminino', 'Masculino', 'Ambos'));

ALTER TABLE rotinas 
  ADD CONSTRAINT rotinas_genero_check 
  CHECK (genero IN ('Feminino', 'Masculino', 'Ambos'));

-- PASSO 4: Corrigir defaults
ALTER TABLE modelos_rotina 
  ALTER COLUMN genero SET DEFAULT 'Ambos';

ALTER TABLE rotinas 
  ALTER COLUMN genero SET DEFAULT 'Ambos';
