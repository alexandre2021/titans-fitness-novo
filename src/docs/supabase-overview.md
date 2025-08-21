# Supabase

Este projeto utiliza o Supabase como backend para autenticação, banco de dados, funções edge e armazenamento de arquivos.

## Configuração

O cliente Supabase é configurado em `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://...supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "chave_publica";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

Para usar, basta importar:
```typescript
import { supabase } from "@/integrations/supabase/client";
```

---

## Exemplos de Uso

### Autenticação

**Cadastro de usuário:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: "usuario@email.com",
  password: "senha123",
  options: { emailRedirectTo: `${window.location.origin}/` }
});
```

**Login:**
```typescript
const { error } = await supabase.auth.signInWithPassword({
  email: "usuario@email.com",
  password: "senha123"
});
```

**Logout:**
```typescript
await supabase.auth.signOut();
```

---

### Consultas e Mutação de Dados

**Buscar dados:**
```typescript
const { data, error } = await supabase
  .from('alunos')
  .select('*')
  .eq('id', alunoId)
  .single();
```

**Inserir dados:**
```typescript
const { error } = await supabase
  .from('alunos')
  .insert({ id, nome_completo, ... });
```

**Atualizar dados:**
```typescript
const { error } = await supabase
  .from('alunos')
  .update({ nome_completo: "Novo Nome" })
  .eq('id', alunoId);
```

**Deletar dados:**
```typescript
const { error } = await supabase
  .from('alunos')
  .delete()
  .eq('id', alunoId);
```

---

### Funções Edge

**Chamar função edge (ex: convite de aluno):**
```typescript
const { data, error } = await supabase.functions.invoke('enviar-convite', {
  body: {
    nome_aluno: "Fulano",
    email_aluno: "fulano@email.com",
    nome_personal: "Personal",
    codigo_pt: "ABC123"
  }
});
```

---

### Storage e Upload de Arquivos

**Upload de imagem via função edge:**
```typescript
const response = await fetch(UPLOAD_IMAGE_ENDPOINT, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` },
  body: JSON.stringify({ filename, image_base64, aluno_id, tipo, bucket_type: 'avaliacoes' })
});
```

---

## Observações

- Sempre trate erros retornados por Supabase (`error`).
- Use os tipos definidos em `src/integrations/supabase/types.ts` para maior segurança.
- Sessão e autenticação são persistidas automaticamente.

---

Esses exemplos servem como referência para integração e uso do Supabase em todo o projeto.