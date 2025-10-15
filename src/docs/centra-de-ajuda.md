# 🤖 Central de Ajuda com IA (Planejamento)

Este documento descreve a arquitetura e a estratégia para a criação de uma Central de Ajuda inteligente para o Titans Fitness.

---

## 1. Visão Geral

O objetivo é criar um sistema de suporte escalável que combine uma base de conhecimento (Knowledge Base - KB) com um chatbot de Inteligência Artificial. A IA será treinada para responder dúvidas dos usuários com base exclusivamente no conteúdo que nós criarmos.

## 2. Componentes da Solução

### 2.1. Base de Conhecimento (Knowledge Base - KB)

-   **Fonte da Verdade:** O arquivo `src/docs/base-de-conhecimento.md` será a única fonte de conteúdo para a IA.
-   **Conteúdo (V1):** Foco total em **texto**. Não incluiremos imagens ou GIFs nesta primeira versão para agilizar o desenvolvimento e evitar retrabalho, já que a interface ainda pode mudar.

### 2.2. Chatbot com IA (RAG)

-   **Tecnologia:** A IA utilizará a técnica de **Geração Aumentada por Recuperação (RAG)**.
-   **Fluxo de Resposta:**
    1.  O usuário faz uma pergunta no chat.
    2.  O sistema **busca (recupera)** na nossa Base de Conhecimento os artigos mais relevantes para a pergunta.
    3.  Uma LLM **gera** uma resposta em linguagem natural, utilizando *apenas* as informações encontradas nos artigos.
-   **Vantagem:** Isso garante que as respostas sejam sempre precisas e baseadas na nossa documentação, evitando que a IA "alucine" ou dê informações incorretas.

## 3. Ciclo de Melhoria Contínua (Human-in-the-loop)

### 2.3. Geração de Embeddings (Vetores)

-   **Ferramenta:** O script `scripts/generate-embeddings.ts` é o responsável por "ensinar" a IA.
-   **Processo:**
    1.  **Leitura:** O script lê o conteúdo do arquivo `base-de-conhecimento.md`.
    2.  **Fragmentação (Chunking):** Ele quebra os artigos longos em pedaços menores e mais focados.
    3.  **Vetorização:** Para cada pedaço, ele usa um modelo de IA local para gerar um "embedding" (vetor numérico).
    4.  **Armazenamento:** Salva cada pedaço de texto e seu respectivo vetor na tabela `knowledge_base` do Supabase.

> Este script deve ser executado sempre que a base de conhecimento for atualizada.

---

## 3. Ciclo de Melhoria Contínua (Human-in-the-loop)

Este é o pilar para a evolução do sistema.

### 3.1. Tratamento de "Pontos Cegos"

Quando a IA não encontra uma resposta na KB:

1.  **Não Inventa:** A IA não tentará adivinhar.
2.  **Informa o Usuário:** Ela responderá que não encontrou a informação, mas que a equipe de suporte já foi notificada e entrará em contato.
3.  **Notifica a Equipe:** O sistema automaticamente cria um "ticket" para nós (registrando em uma tabela como `unanswered_questions`) e nos notifica ativamente.
    -   **Mecanismo de Notificação:** A Edge Function do chat invocará nossa própria Edge Function `enviar-notificacao`, enviando uma mensagem para o chat do administrador (`contato@titans.fitness`).

### 3.2. Retroalimentação da Base de Conhecimento

1.  Ao receber a notificação, nossa equipe pesquisa a resposta correta.
2.  Respondemos ao usuário manualmente (ex: por e-mail ou chat).
3.  **Crucial:** Usamos essa mesma resposta para **criar um novo artigo** na Base de Conhecimento.

**Resultado:** Da próxima vez que a mesma pergunta for feita, a IA saberá a resposta. O sistema se torna mais inteligente a cada dúvida real do usuário.

## 4. Proteção Contra Abuso

-   Perguntas fora de tópico (ex: "Qual o campeão do Brasileirão?") serão identificadas pela baixa relevância na busca da KB.
-   Nesses casos, o sistema dará uma resposta padrão ("Só consigo responder sobre o Titans Fitness...") e **não** criará um ticket para a equipe, evitando ruído e perda de tempo.

---

## 5. Fase 2: Implementação da IA (Usuários Logados)

### 5.1. Backend (Supabase Edge Function)

1.  **Receber a Pergunta:** A função receberá a pergunta do usuário.
2.  **Buscar na Base de Conhecimento (RAG):**
    -   Converterá a pergunta em um "vetor".
    -   Buscará por similaridade em uma base de vetores gerada a partir do `base-de-conhecimento.md`.
    -   Retornará os trechos de texto mais relevantes.
3.  **Gerar a Resposta (LLM):**
    -   Enviará os trechos para uma LLM com a instrução: "Responda usando apenas este texto".
4.  **Devolver a Resposta:** Enviará a resposta gerada de volta para o chat.

### 5.2. Modelo de LLM Escolhido (V1)

-   **Provedor:** Groq (Plano Gratuito)
-   **Modelo:** `llama-3.1-8b-instant`
-   **Justificativa:**
    -   **Latência:** Otimizado para respostas rápidas, ideal para chat.
    -   **Custo:** Limites generosos no plano gratuito (500.000 tokens/dia).
    -   **Capacidade:** Com base em uma estimativa de 300-900 tokens por interação, o plano gratuito suporta entre **600 a 1.600 respostas por dia**, o que é mais do que suficiente para o lançamento e validação.
    -   **Fidelidade:** É um modelo do tipo `instruct`, treinado para seguir o contexto fornecido, o que é perfeito para RAG.

### 5.3. Mecanismo de Aprendizado (Human-in-the-loop)

1.  **Detectar "Ponto Cego":** Se a busca não encontrar trechos relevantes.
2.  **Registrar Pergunta:** Salvará a pergunta em uma nova tabela `perguntas_nao_respondidas`.
3.  **Notificar a Equipe:** Chamará a função `enviar-notificacao` para nos avisar no chat de administrador.
4.  **Responder ao Usuário:** A IA informará que a equipe foi notificada.

---

## 6. Status Atual e Desafios (Feature Pausada)

Apesar da arquitetura bem definida, a implementação prática do assistente de IA enfrentou desafios significativos que levaram à decisão de pausar seu desenvolvimento. O objetivo desta seção é documentar o que foi construído e os obstáculos encontrados.

### 6.1. O que foi Implementado

A arquitetura RAG foi totalmente implementada, incluindo:

-   **Frontend (`HelpChat.tsx`):** O componente React responsável pela interface do chat. Ele gerencia o estado da conversa, captura a pergunta do usuário e, crucialmente, utiliza a biblioteca `@xenova/transformers` para gerar o vetor (embedding) da pergunta diretamente no navegador do cliente. Em seguida, ele envia a pergunta e o embedding para a Edge Function.
-   **Edge Function (`ask-ai-help-center`):** Orquestra todo o fluxo: recebe a pergunta e o embedding, consulta o banco de vetores e chama a LLM.
-   **Busca Vetorial (Supabase `pgvector`):** A função `match_knowledge_base` foi criada e utilizada para encontrar os trechos de texto mais relevantes.
-   **Geração de Resposta (Groq):** A integração com a API da Groq para o modelo `llama-3.1-8b-instant` foi concluída e funcionava conforme o esperado quando recebia o contexto correto.

### 6.2. O Ponto Fraco: Qualidade da Busca

O principal problema foi a **baixa eficiência do assistente em encontrar as respostas corretas**, mesmo quando a informação existia claramente na base de conhecimento. A IA frequentemente respondia que "não sabia" para perguntas básicas.

A investigação revelou que a causa raiz não era a LLM, mas sim a **qualidade da busca por similaridade**, que era impactada por dois fatores:

1.  **Ajuste de Limiar (`match_threshold`):** Tentamos ajustar o limiar de relevância na busca vetorial. Embora tenha trazido melhorias marginais, não resolveu o problema central, indicando que a questão era mais profunda.

2.  **Qualidade dos Embeddings (A Causa Principal):** Identificamos que o problema real estava na forma como "ensinávamos" a IA. Nossos artigos na `base-de-conhecimento.md` eram longos e misturavam vários assuntos. Isso gerava embeddings "generalistas", que não eram específicos o suficiente para corresponder com alta precisão a uma pergunta focada do usuário.

### 6.3. A Tentativa de Solução: "Chunking"

Para resolver o problema da qualidade dos embeddings, implementamos a técnica de **"chunking" (fragmentação)**. O script `scripts/generate-embeddings.ts` foi modificado para quebrar os artigos grandes em pedaços menores e mais focados, gerando um embedding para cada "chunk".

### 6.4. O Obstáculo Final e a Decisão de Pausar

A implementação do "chunking" nos levou ao obstáculo final: a complexidade de criar um "parser" robusto para o nosso arquivo `base-de-conhecimento.md`. O arquivo evoluiu e passou a ter múltiplos formatos de artigo, e a função `parseKnowledgeBase` no script `generate-embeddings.ts` falhava consistentemente em ler todos os artigos, resultando em uma base de vetores vazia ou incompleta.

Devido à dificuldade em garantir uma pipeline de dados confiável (do `.md` para os vetores no Supabase) e o consequente mau desempenho do chatbot, **decidimos pausar o desenvolvimento desta funcionalidade**.

**Ponto de Partida Futuro:** A arquitetura principal (Frontend -> Edge Function -> LLM) está validada. O foco para retomar o projeto deve ser a criação de um sistema de gerenciamento de conteúdo (CMS) ou um processo de ETL (Extração, Transformação e Carga) muito mais robusto e testável para popular a base de conhecimento, garantindo a qualidade e a integridade dos vetores.

### 5.4. Interface do Chat (Frontend)

1.  **Localização:** Um ícone de "?" flutuante no canto da tela para usuários logados.
2.  **Funcionalidades:**
    -   Janela de conversa.
    -   Campo de texto para a pergunta.
    -   Indicador de "digitando...".
    -   A interface se comunicará com a nova Edge Function.