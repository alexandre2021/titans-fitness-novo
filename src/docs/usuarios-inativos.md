# Documentação do Processo de Exclusão de Usuários Inativos


Este documento descreve o fluxo automatizado para identificar, notificar e, finalmente, excluir usuários inativos da plataforma Titans Fitness.


## Visão Geral


O processo é projetado para gerenciar os recursos da plataforma de forma eficiente, removendo contas que não estão mais em uso. Ele é dividido em duas fases principais: um aviso de inatividade e a exclusão definitiva.


- **Limite para Aviso:** 60 dias de inatividade.
- **Limite para Exclusão:** 90 dias de inatividade.


## Tipos de Usuários Processados


O sistema processa dois tipos de usuários:
- **Alunos:** Contas de usuários finais da plataforma
- **Professores:** Contas de profissionais que atendem alunos


## Fluxo do Processo


O fluxo é orquestrado por um conjunto de ferramentas que garantem a execução periódica e segura das operações.


### 1. Agendamento (Cron Job no GitHub Actions)


- **O que faz:** Inicia todo o processo de verificação.
- **Como funciona:** Um arquivo de workflow do GitHub Actions (`.github/workflows/cron-check-users.yml`) é configurado para rodar em um cronograma pré-definido (diariamente).
- **Ação:** Ele envia uma requisição `POST` segura para um endpoint da Vercel. A segurança é garantida pelo envio de um `CRON_SECRET` no cabeçalho de autorização.


### 2. Endpoint da Vercel (Serverless Function)


- **O que faz:** Contém a lógica principal para verificar e processar os usuários.
- **Localização:** `api/cron/check-inactive-users.ts`
- **Como funciona:**
    1.  **Autenticação:** A função primeiro valida o `CRON_SECRET` recebido para garantir que a chamada foi originada pelo GitHub Actions.
    2.  **Busca e Filtragem de Usuários:**
        - Ela se conecta ao Supabase e busca todos os usuários registrados na tabela `auth.users`.
        - **Importante:** Usuários com e-mails na lista de `PROTECTED_EMAILS` são **ignorados** para evitar exclusões acidentais.
        - Para cada usuário, verifica-se sua existência e tipo na tabela `user_profiles` (aluno ou professor).
    3.  **Análise de Inatividade:** Para cada usuário elegível, a função verifica a data do `last_sign_in_at` (último login) ou `created_at` (se nunca logou).
        - Se o último login/criação foi entre 60 e 89 dias atrás, o usuário é adicionado a uma lista de "aviso".
        - Se o último login/criação foi há 90 dias ou mais, o usuário é adicionado a uma lista de "exclusão".


### 3. Envio de Email de Alerta (60 dias)


- **O que faz:** Notifica o usuário sobre a inatividade da conta.
- **Como funciona:**
    - Para cada usuário na lista de "aviso", a função `check-inactive-users` utiliza a API do **Brevo (antigo Sendinblue)** para enviar um email.
    - O email informa ao usuário que sua conta será excluída em 30 dias se ele não fizer login.
    - O template do email segue a identidade visual da Titans Fitness para garantir consistência.
    - Após o envio, o campo `last_warning_email_sent_at` é atualizado na tabela correspondente (`alunos` ou `professores`) para evitar spam de avisos.


### 4. Processo de Exclusão (90 dias)


Este é um processo de múltiplas etapas para garantir que todos os dados do usuário sejam removidos. O processo varia conforme o tipo de usuário.


#### Para Alunos

##### Etapa 1: Exclusão de Arquivos

A função coleta e remove todos os arquivos pessoais do aluno dos seus respectivos armazenamentos:

1.  **Avatar do aluno** (bucket: `avatars` no Supabase Storage)
    -   Busca na tabela `alunos` os campos `avatar_type` e `avatar_image_url`.
    -   Se `avatar_type = 'image'`, o arquivo é removido do Supabase Storage.

2.  **Fotos de avaliações físicas** (bucket: `avaliacoes` no Cloudflare R2)
    -   Busca na tabela `avaliacoes_fisicas`: `foto_frente_url`, `foto_lado_url`, `foto_costas_url`.

3.  **PDFs de rotinas** (bucket: `rotinas` no Cloudflare R2)
    -   Busca na tabela `rotinas_arquivadas`: `pdf_url`.

##### Etapa 2: Exclusão do Usuário
- Remove o registro do usuário do `auth.users`
- As políticas `ON DELETE CASCADE` removem automaticamente todos os dados relacionados

#### Para Professores

##### Etapa 1: Exclusão de Arquivos

1.  **Avatar do Professor** (bucket: `avatars` no Supabase Storage)
    -   Busca na tabela `professores` os campos `avatar_type` e `avatar_image_url`.
    -   Se `avatar_type = 'image'`, o arquivo é removido do Supabase Storage.

2.  **Mídias de exercícios** (bucket: `exercicios` no Cloudflare R2)
    -   Busca na tabela `exercicios`: `imagem_1_url`, `imagem_2_url`, `video_url`.
    -   Remove todas as mídias associadas aos exercícios criados pelo PT.

##### Etapa 2: Desvinculação de Alunos
- Remove todos os registros da tabela `alunos_professores` onde o `professor_id` corresponde ao do PT que está sendo excluído.
- Isso preserva os dados dos alunos, removendo apenas a relação de "seguir".


##### Etapa 3: Exclusão do Usuário
- Remove o registro do usuário do `auth.users`
- As políticas `ON DELETE CASCADE` removem automaticamente os dados do PT (como `professores` e `user_profiles`).
- **Importante**: Rotinas associadas ao PT não são excluídas; o campo `professor_id` na tabela `rotinas` é definido como `NULL` (`ON DELETE SET NULL`).
- **Importante**: Exercícios que usam exercícios do PT como base (`exercicio_padrao_id`) terão essa referência definida como `NULL` (`ON DELETE SET NULL`).

#### Processo de Exclusão de Arquivos

O processo varia conforme o local de armazenamento:

-   **Para arquivos no Cloudflare R2 (`avaliacoes`, `rotinas`, `exercicios`):**
    1.  A função `check-inactive-users` extrai o nome do arquivo da URL completa.
    2.  Invoca a **Edge Function** do Supabase (`delete-media`) passando o `filename` e o `bucket_type`.
    3.  A Edge Function `delete-media` executa a exclusão diretamente no Cloudflare R2.

-   **Para avatares no Supabase Storage (`avatars`):**
    1.  A função `check-inactive-users` extrai o nome do arquivo da URL.
    2.  A exclusão é feita diretamente através da API do Supabase Storage (`supabase.storage.from('avatars').remove(...)`).

## Estrutura de Armazenamento de Mídia

O sistema utiliza diferentes serviços de armazenamento para otimizar custos e performance.

### Supabase Storage

-   **`avatars`**: Imagens de perfil de alunos e Professores. Este bucket é usado para permitir a atualização dinâmica de avatares na interface através de URLs assinadas.

### Cloudflare R2

-   **`avaliacoes`**: Fotos de avaliações físicas dos alunos.
-   **`rotinas`**: PDFs de rotinas de treino arquivadas.
-   **`exercicios`**: Imagens e vídeos de exercícios criados por Professores.


## Proteções e Segurança


### Emails Protegidos
Lista hardcoded de emails que nunca são processados:
- Contas administrativas
- Contas de sistema
- Professores críticos


### Autenticação
- Todas as operações requerem `CRON_SECRET` válido
- Utiliza Service Role Key para operações administrativas no Supabase
- Edge Functions herdam a autenticação da função principal


### Logs e Monitoramento
- Logs detalhados de cada etapa do processo
- Contadores de usuários processados e arquivos removidos
- Logs específicos para falhas na exclusão de arquivos


## Resumo do Fluxo Completo


1. **GitHub Actions (diariamente)**: `POST` para `api/cron/check-inactive-users`
2. **Vercel Function**:
   - Valida a requisição
   - Busca usuários no Supabase por tipo
   - Identifica usuários inativos por 60+ e 90+ dias
3. **Para usuários com 60-89 dias de inatividade**:
   - Envia email de alerta via Brevo
   - Atualiza `last_warning_email_sent_at`
4. **Para usuários com 90+ dias de inatividade**:
   - **Alunos**: Remove avatars, fotos de avaliação e PDFs de rotina
   - **Professores**: Remove avatars, mídias de exercícios e desvincula alunos
   - **Para ambos**: Deleta usuário do `auth.users` (cascata remove dados restantes)
5. **Retorna estatísticas**: Usuários avisados, excluídos e arquivos removidos
