# Supabase

Este projeto utiliza o Supabase como backend para autenticação, banco de dados, funções edge e armazenamento de arquivos. A nossa instância do cliente Supabase é aprimorada com um **interceptador global** que trata erros de autenticação (`401 Unauthorized`) automaticamente.

## Configuração

O cliente Supabase é configurado em `src/integrations/supabase/client.ts`. Ele inclui uma função `fetch` customizada que monitora todas as requisições para o backend.

```typescript
// src/integrations/supabase/client.ts

const customFetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status === 401) {
    // Lógica para deslogar o usuário e redirecionar para /login
    // ...
  }
  return response;
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: customFetch }
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

### Funções Edge (Nova Prática Recomendada)

Para chamar Funções Edge, **devemos utilizar o wrapper global `invokeEdgeFunction`** localizado em `src/lib/apiClient.ts`. Este wrapper centraliza a lógica de autenticação e tratamento de erros, tornando o código mais seguro e limpo.

**Vantagens de usar o `invokeEdgeFunction`:**
- **Tratamento de Erro Centralizado:** Automaticamente trata erros de rede e de autenticação.
- **Logout Automático:** Se a API retornar um erro `401 Unauthorized` (causado por um token JWT inválido ou expirado), o wrapper irá deslogar o usuário e exibir uma mensagem amigável. Isso previne loops infinitos e comportamentos inesperados na aplicação.
- **Código Mais Limpo:** Simplifica a chamada de funções nos componentes, eliminando a necessidade de obter a sessão e configurar cabeçalhos manualmente.

**Exemplo de uso:**
```typescript
import { invokeEdgeFunction } from "@/lib/apiClient";

// ...

try {
  const resultado = await invokeEdgeFunction<{ success: boolean, data: any }>(
    'minha-funcao-edge', 
    { parametro: 'valor' }
  );
  console.log(resultado);
} catch (error) {
  // O erro 401 já foi tratado (logout).
  // Aqui tratamos outros erros específicos da função, se necessário.
  if (!(error instanceof Error && error.message.includes('Sessão inválida'))) {
    console.error("Erro específico da função:", error);
  }
}
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