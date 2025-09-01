# 🛡️ Guia de Qualidade de Código com ESLint

Este documento explica a importância das regras mais rigorosas do ESLint que foram recentemente adicionadas (e temporariamente desativadas) no projeto.

## Por que devemos rever isso? (A Analogia do "Check-up")

Pense na nova configuração do ESLint como um "check-up" completo e detalhado para o nosso código. Antes, tínhamos um check-up básico que olhava apenas a "aparência" do código (sintaxe). Agora, temos um que faz um "exame de sangue" completo, usando as informações de tipo do TypeScript para encontrar problemas ocultos e potenciais riscos de bugs.

Ignorar esses avisos é como ignorar um alerta do médico. A aplicação pode parecer saudável e funcionar bem nos testes, mas existem riscos silenciosos que podem causar problemas sérios e difíceis de depurar no futuro.

Corrigir esses pontos é um **investimento em qualidade e tranquilidade**.

---

## O que foi feito no `eslint.config.js`?

A principal mudança foi a tentativa de ativar um conjunto de regras mais inteligente e rigoroso. No arquivo `eslint.config.js`, a linha que faz essa "mágica" foi comentada para permitir que o desenvolvimento continuasse sem interrupções:

```javascript
// eslint.config.js

  // ...
  {
    files: ["src/**/*.{ts,tsx}", "*.{ts,tsx}"],
    // A linha abaixo foi comentada. É ela que ativa a verificação rigorosa.
    // extends: [...tseslint.configs.recommendedTypeChecked], 
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        // ...
      },
    },
    // ...
  },
// ...
```

A configuração `recommendedTypeChecked` é especial porque ela **usa o compilador do TypeScript para entender os tipos das suas variáveis e funções**. Isso permite que o ESLint encontre uma classe de erros muito mais sofisticada, que uma análise puramente sintática jamais encontraria.

Ao comentar a linha `extends`, nós efetivamente "desligamos" esse check-up avançado, voltando para um modo menos rigoroso.

---

## Tipos de Erros que Estamos Mascarando

Ao desativar as regras, estamos ignorando principalmente dois tipos de alertas críticos:

### 1. Promises "Flutuantes" (`no-floating-promises`)

**O Risco:** Ocorre quando chamamos uma função assíncrona (que retorna uma `Promise`) e não esperamos por ela com `await` nem tratamos um possível erro com `.catch()`. Se essa função falhar, o erro será "engolido" silenciosamente, podendo quebrar a aplicação sem deixar rastros.

**Exemplo que estamos ignorando:**
```typescript
useEffect(() => {
  // RISCO: Se fetchDados() falhar, o erro não é capturado aqui.
  fetchDados(); 
}, []);
```

**A Correção Simples (quando tiver tempo):**
```typescript
useEffect(() => {
  // CORRETO: Informa ao ESLint que a Promise está sendo tratada intencionalmente.
  void fetchDados(); 
}, []);
```

### 2. Atribuições Inseguras (`no-unsafe-assignment`)

**O Risco:** Acontece quando atribuímos um valor do tipo `any` (que pode ser qualquer coisa) a uma variável que espera um tipo específico. Isso desliga a segurança do TypeScript e pode levar a erros em tempo de execução se, por exemplo, uma API retornar um formato de dado inesperado.

**Exemplo que estamos ignorando:**
```typescript
// RISCO: A função .json() retorna 'any'. Se a API mudar, o app pode quebrar.
const { data } = await supabase.from('tabela').select().single();
const meuDado: MeuTipoEspecifico = data; // <-- Erro de atribuição insegura
```

**A Correção Simples (quando tiver tempo):**
```typescript
// CORRETO: Dizemos ao TypeScript para confiar que 'data' tem o nosso tipo.
const { data } = await supabase.from('tabela').select().single();
const meuDado = data as MeuTipoEspecifico;
```

---

Quando tiver mais tempo, reativar essas regras e corrigir os pontos um a um vai elevar muito a robustez e a manutenibilidade do projeto.