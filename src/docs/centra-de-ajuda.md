# Central de Ajuda

Sistema de busca inteligente que usa IA para encontrar artigos relevantes na base de conhecimento.

---

## Arquitetura

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│   HelpDrawer    │────▶│  ask-help-center     │────▶│  Groq API   │
│   (Frontend)    │◀────│  (Edge Function)     │◀────│  (LLM)      │
└─────────────────┘     └──────────────────────┘     └─────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │    Supabase      │
                        │  - articles      │
                        │  - cache         │
                        └──────────────────┘
```

---

## Componentes

### 1. HelpDrawer (Frontend)

**Arquivo:** `src/components/help/HelpDrawer.tsx`

Drawer lateral que permite ao usuário:
- Digitar uma pergunta em linguagem natural
- Receber o artigo mais relevante via IA
- Navegar manualmente pelas categorias
- Dar feedback (útil/não útil)

**Fluxo:**
1. Usuário digita pergunta e pressiona Enter (ou clica no botão)
2. Chama a Edge Function `ask-help-center`
3. Exibe o artigo encontrado ou mensagem de "não encontrado"
4. Mostra botões de feedback

### 2. Edge Function (Backend)

**Arquivo:** `supabase/functions/ask-help-center/index.ts`

Busca artigos usando LLM em 2 etapas:

**Etapa 1 - Identificar Categoria:**
- Envia lista de categorias + títulos dos artigos
- LLM responde com o número da categoria mais relevante

**Etapa 2 - Selecionar Artigo:**
- Envia artigos da categoria selecionada
- LLM responde com o número do artigo mais relevante

**Características:**
- 5 chaves Groq em round-robin (distribui carga)
- Sistema de retry automático em caso de rate limit
- Cache de perguntas já respondidas

### 3. Sistema de Cache

**Tabela:** `help_search_cache`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| question | text | Pergunta original |
| question_normalized | text | Pergunta normalizada (sem acentos, lowercase) |
| user_type | text | "professor" ou "aluno" |
| article_id | UUID | Referência ao artigo encontrado |
| helpful | boolean | Feedback do usuário (null = sem feedback) |
| hit_count | integer | Quantas vezes foi reutilizado |
| created_at | timestamp | Data de criação |

**Comportamento:**
- Pergunta nova → LLM processa → salva no cache
- Pergunta repetida → retorna do cache (rápido)
- Feedback positivo → mantém no cache
- Feedback negativo → **deleta** do cache (LLM tentará novamente)

---

## Configuração

### Secrets do Supabase

5 chaves Groq configuradas para round-robin:
- `GROQ_API_KEY_01`
- `GROQ_API_KEY_02`
- `GROQ_API_KEY_03`
- `GROQ_API_KEY_04`
- `GROQ_API_KEY_05`

### Deploy

```bash
supabase functions deploy ask-help-center
```

---

## Base de Conhecimento

### Tabela: `knowledge_base_articles`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Identificador único |
| title | text | Título do artigo |
| content | text | Conteúdo HTML |
| description | text | Descrição curta (usada pelo LLM) |
| category | text | Nome da categoria |
| user_type | text | "professor", "aluno" ou "ambos" |
| category_order | integer | Ordem da categoria |
| article_order | integer | Ordem do artigo na categoria |

### Categorias (ordem atual)

| Ordem | Categoria |
|-------|-----------|
| 0 | Acesso e Cadastro |
| 1 | Configuração Inicial |
| 2 | Funcionalidades do Aplicativo |
| 3 | Mensagens e Notificações |
| 4 | Meu Perfil |
| 5 | Painel Inicial |
| 6 | Alunos |
| 7 | Exercícios |
| 8 | Rotinas de Treino (Criação) |
| 9 | Rotinas de Treino (Execução) |
| 10 | Pontos e Conquistas |
| 11 | Avaliações Físicas |
| 12 | Termos e Privacidade |

---

## Fluxo Completo

```
1. Usuário abre Central de Ajuda
2. Digita: "como cadastro um aluno?"
3. Frontend chama Edge Function
4. Edge Function:
   a. Normaliza pergunta → "como cadastro um aluno"
   b. Busca no cache → não encontrou
   c. LLM Etapa 1 → categoria "Alunos" (6)
   d. LLM Etapa 2 → artigo "Como adiciono um novo aluno?" (1)
   e. Salva no cache
   f. Retorna artigo
5. Frontend exibe artigo + botões de feedback
6. Usuário clica "Sim" → marca helpful=true no cache
7. Próxima vez: mesma pergunta → retorna do cache instantaneamente
```

---

## Modelo de IA

- **Provedor:** Groq
- **Modelo:** `llama-3.1-8b-instant`
- **Características:**
  - Baixa latência (~200ms)
  - Plano gratuito generoso (500k tokens/dia)
  - Bom em seguir instruções (ideal para classificação)

---

## Ciclo de Melhoria Contínua

Quando um usuário clica em **"Não"** (resposta não foi útil):

1. **Admin recebe notificação** via sistema de mensagens com:
   - Nome do usuário
   - Pergunta feita
   - Artigo sugerido (incorreto)

2. **Admin analisa e age:**
   - Identifica qual seria o artigo correto
   - Melhora a `description` do artigo correto (adiciona palavras-chave)
   - Responde o usuário diretamente pelo sistema de mensagens

3. **Resultado:**
   - Próxima vez que alguém fizer pergunta similar → IA acerta
   - Usuário original recebe resposta personalizada → satisfeito

```
Usuário → Pergunta → IA erra → Feedback "Não"
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
           Admin melhora artigo            Admin responde usuário
           (IA aprende)                    (atendimento humano)
```

Este ciclo permite que o sistema melhore organicamente com uso real.
