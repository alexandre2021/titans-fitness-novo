-- Corrigir default e CHECK constraint para usar valores com primeira letra maiúscula

-- Corrigir modelos_rotina
ALTER TABLE modelos_rotina 
  ALTER COLUMN genero SET DEFAULT 'Ambos';

-- Corrigir rotinas
ALTER TABLE rotinas 
  ALTER COLUMN genero SET DEFAULT 'Ambos';

-- Remover constraint antiga (se existir)
ALTER TABLE modelos_rotina DROP CONSTRAINT IF EXISTS modelos_rotina_genero_check;
ALTER TABLE rotinas DROP CONSTRAINT IF EXISTS rotinas_genero_check;

-- Adicionar constraint com valores corretos (primeira letra maiúscula)
ALTER TABLE modelos_rotina 
  ADD CONSTRAINT modelos_rotina_genero_check 
  CHECK (genero IN ('Feminino', 'Masculino', 'Ambos'));

ALTER TABLE rotinas 
  ADD CONSTRAINT rotinas_genero_check 
  CHECK (genero IN ('Feminino', 'Masculino', 'Ambos'));

-- Atualizar valores existentes (se houver algum com minúscula)
UPDATE modelos_rotina SET genero = 'Ambos' WHERE genero = 'ambos' OR genero IS NULL;
UPDATE rotinas SET genero = 'Ambos' WHERE genero = 'ambos' OR genero IS NULL;
