# 🤖 Central de Ajuda com IA

Este documento descreve a arquitetura e a estratégia para a criação de uma Central de Ajuda inteligente para o Titans Fitness.

---

## 1. Visão Geral

O objetivo é criar um sistema de suporte escalável que combine uma base de conhecimento (Knowledge Base - KB) com um chatbot de Inteligência Artificial. A IA será treinada para responder dúvidas dos usuários com base exclusivamente no conteúdo que nós criarmos.

## 2. Componentes da Solução

### 2.1. Base de Conhecimento (Knowledge Base - KB)

-   **Conteúdo:** Será criada a partir da análise de cada tela e funcionalidade do aplicativo. Em vez de grandes manuais, o foco será em artigos curtos que respondam a uma pergunta específica do usuário (ex: "Como convido um novo aluno?").
-   **Uso de Mídia:** Os artigos devem combinar texto claro com **prints de tela (screenshots)** anotados para guiar visualmente o usuário, sempre que aplicável.
-   **Armazenamento:** O conteúdo ficará em uma tabela dedicada no Supabase (ex: `knowledge_base_articles`), e não no código do frontend. Isso permite gerenciamento dinâmico, correções rápidas e escalabilidade.

### 2.2. Chatbot com IA (RAG)

-   **Tecnologia:** A IA utilizará a técnica de **Geração Aumentada por Recuperação (RAG)**.
-   **Fluxo de Resposta:**
    1.  O usuário faz uma pergunta no chat.
    2.  O sistema **busca (recupera)** na nossa Base de Conhecimento os artigos mais relevantes para a pergunta.
    3.  A IA **gera** uma resposta em linguagem natural, utilizando *apenas* as informações encontradas nos artigos.
-   **Vantagem:** Isso garante que as respostas sejam sempre precisas e baseadas na nossa documentação, evitando que a IA "alucine" ou dê informações incorretas.

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