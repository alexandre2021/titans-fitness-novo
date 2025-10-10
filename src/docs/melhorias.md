# 🚀 Melhorias e Funcionalidades Planejadas

Este documento centraliza as melhorias e novas funcionalidades planejadas para a plataforma. Ele é dividido em duas seções principais:

-   **I. Melhorias Imediatas:** Funcionalidades que já foram documentadas na Base de Conhecimento como existentes e precisam ser implementadas para o lançamento.
-   **II. Melhorias Futuras:** Otimizações e novas funcionalidades a serem desenvolvidas após o lançamento inicial.

---

## I. Melhorias Imediatas (Pré-Lançamento)

### 1. Funcionalidade: Página Pública de Busca de Professores

-   **Objetivo:** Criar um marketplace onde alunos (mesmo não logados) possam pesquisar e encontrar professores cadastrados na plataforma.
-   **Status:** Planejado.
-   **Referência na KB:** Artigo "[Professor] Por que devo preencher minhas informações profissionais?".

#### Requisitos Técnicos:

1.  **Página Pública (`/professores`):**
    -   Criar uma nova rota e página que não exija autenticação.
    -   A página deve conter uma barra de busca e filtros (ex: por especialização, nome).
    -   Exibir os resultados em formato de cards.

2.  **Perfil Público do Professor:**
    -   Criar uma versão pública do perfil do professor, acessível via uma URL amigável (ex: `/p/nome-do-professor`).
    -   Esta página exibirá apenas as informações que o professor marcou como públicas.

3.  **Configuração de Privacidade do Professor:**
    -   **Local:** Adicionar a nova opção na aba "Conta" da página de perfil do professor (`PerfilTabs.tsx`).
    -   **Componente:** Utilizar o componente `<Switch />` de `shadcn/ui` para um controle de ligar/desligar intuitivo.
    -   **Lógica:**
        -   O estado do `Switch` deve ser controlado pelo valor da nova coluna `perfil_publico` no perfil do professor.
        -   Ao alterar o `Switch`, uma função deve ser chamada para atualizar o valor no banco de dados (`supabase.from('professores').update({ perfil_publico: novoValor })`).
        -   Exibir um `toast` de confirmação ("Perfil público ativado/desativado").

4.  **Backend (Supabase):**
    -   **Tabela `professores`:** Adicionar uma nova coluna `perfil_publico` do tipo `boolean`, com valor padrão `false`.
    -   **RLS (Row Level Security):**
        -   **Política de Leitura Pública:** Criar uma nova política `SELECT` na tabela `professores` que permita a leitura por usuários anônimos (`anon`) **apenas** se a coluna `perfil_publico` for `true`.
        -   **Política de Leitura Autenticada:** Garantir que a política existente para usuários autenticados (`authenticated`) continue permitindo que o professor leia seu próprio perfil, independentemente do status de `perfil_publico`.
    -   **RPC para Busca:** Criar uma nova função RPC (ex: `get_public_professores`) que será chamada pela página de busca. Esta função deve:
        -   Ser executável pela role `anon`.
        -   Selecionar apenas professores com `perfil_publico = true`.
        -   Retornar um conjunto limitado de dados públicos (ex: nome, avatar, especializações, cidade).

### 2. Funcionalidade: Central de Ajuda com IA

-   **Objetivo:** Implementar o chatbot com IA e o ciclo de melhoria contínua, conforme documentado em `central-de-ajuda.md`.
-   **Status:** Planejado.
-   **Referência na KB:** Toda a Base de Conhecimento está sendo criada para alimentar esta funcionalidade.

#### Requisitos Técnicos:

1.  **Tabela `knowledge_base_articles`:** Criar a tabela no Supabase para armazenar os artigos.
2.  **Tabela `unanswered_questions`:** Criar a tabela para registrar as perguntas não respondidas.
3.  **Edge Function do Chat (RAG):** Criar a função que recebe a pergunta do usuário, busca na KB e gera a resposta.
4.  **Integração com `enviar-notificacao`:** Implementar a lógica que, em caso de "ponto cego", registra a pergunta e nos notifica via chat interno.
5.  **UI do Chat:** Desenvolver o componente de chat da Central de Ajuda no frontend.

---

## II. Melhorias Futuras (Pós-Lançamento)

### 1. Otimizações no Sistema de Mensagens

-   **Performance:** Otimizar a função SQL `get_conversas_e_contatos` com a criação de índices apropriados nas colunas de `JOIN` e `WHERE` (ex: `participantes_conversa.user_id`, `mensagens.conversa_id`).
-   **Testabilidade:** Criar testes unitários para a função SQL `get_conversas_e_contatos` para garantir a consistência dos resultados em diferentes cenários.
-   **Robustez (Notificações):** Implementar um mecanismo de retry ou fila para a atualização da tabela `conversas` na Edge Function `enviar-notificacao`.
-   **Segurança:** Adicionar validação e sanitização no conteúdo das mensagens na Edge Function `enviar-notificacao` para prevenir ataques de XSS (Cross-Site Scripting).
-   **UX (Criação de Grupo):** Resolver a "race condition" na criação de grupos, onde um grupo recém-criado pode desaparecer brevemente da lista.

### 2. Novas Funcionalidades para o Chat

-   **Indicador de "Digitando...":** Implementar um evento em tempo real para mostrar quando o outro usuário está digitando.
-   **Upload de Mídia:** Permitir o envio de imagens e, futuramente, pequenos vídeos ou arquivos no chat.
-   **Edição e Exclusão de Mensagens:** Dar ao usuário a possibilidade de editar ou apagar uma mensagem enviada dentro de um determinado período.

### 4. Melhorias no Dashboard do Professor

-   **Stats mais Inteligentes:** Adicionar cards com informações mais acionáveis no painel inicial do professor, como:
    -   "Alunos com treinos atrasados".
    -   "Agendamentos pendentes de confirmação".
    -   "Rotinas que estão próximas de terminar".

### 3. Melhorias no Sistema de Agendamentos

-   **Notificações em Tempo Real:** Enviar notificações via chat (usando a `enviar-notificacao` Edge Function) para os seguintes eventos:
    -   Quando um professor cria um novo agendamento para um aluno.
    -   Quando um aluno confirma ou recusa um agendamento.
    -   Quando um professor reagenda ou exclui um agendamento.
-   **Validação de Horário:** No modal de criação/reagendamento, adicionar uma validação para impedir que professores criem agendamentos em horários que já passaram.
-   **Performance:** Na página `Calendario.tsx`, otimizar a busca de agendamentos para carregar apenas os dados do período visível (semanal ou mensal), em vez de sempre buscar o mês inteiro.

### 5. Refatoração e Qualidade de Código

-   **Unificação de Modais:** Refatorar componentes que ainda utilizam a biblioteca `react-modal` (como em `ExerciciosPT.tsx` e `PasswordChangeSection.tsx`) para usar os componentes `<Dialog>` e `<AlertDialog>` do `shadcn/ui`.
    -   **Benefício:** Garante consistência visual em toda a plataforma, melhora a acessibilidade e simplifica a base de código, removendo uma dependência externa.

-   **Centralização de Lógica:** Refatorar componentes que possuem lógica de negócio duplicada (como em `AlunosAvaliacaoDetalhes.tsx` e `AvaliacoesAluno.tsx`) para usar hooks ou funções de utilitário compartilhadas.
    -   **Benefício:** Segue o princípio DRY (Don't Repeat Yourself), facilitando a manutenção e garantindo que as regras de negócio sejam consistentes em todo o aplicativo.

-   **Unificação de Modais (Alunos):** Refatorar o componente `AlunoCard.tsx` para substituir a biblioteca `react-modal` pelo componente `<AlertDialog>` do `shadcn/ui` para a confirmação de desvinculação de aluno.
    -   **Benefício:** Padroniza a experiência do usuário e a base de código, mantendo a consistência visual com o restante da plataforma.

-   **Centralização de Filtros (Alunos):** Refatorar a página `AlunosPT.tsx` para utilizar o componente `FiltrosAlunos.tsx`, que já existe.
    -   **Benefício:** Centraliza a lógica de filtragem da lista de alunos em um único componente, limpando o código da página principal e facilitando a manutenção.