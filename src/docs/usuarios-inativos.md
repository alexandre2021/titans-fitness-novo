# Documentação do Processo de Exclusão de Usuários Inativos

Este documento descreve o fluxo automatizado para identificar, notificar e, finalmente, excluir usuários inativos da plataforma Titans Fitness.

## Visão Geral

O processo é projetado para gerenciar os recursos da plataforma de forma eficiente, removendo contas que não estão mais em uso. Ele é dividido em duas fases principais: um aviso de inatividade e a exclusão definitiva.

- **Limite para Aviso:** 60 dias de inatividade.
- **Limite para Exclusão:** 90 dias de inatividade.

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
        - **Importante:** Usuários com e-mails na lista de `PROTECTED_EMAILS` (contas de sistema, personal trainers, etc.) são **ignorados** para evitar exclusões acidentais.
        - Para cada usuário restante, verifica-se sua existência e tipo na tabela `public.alunos`. Apenas usuários identificados como `aluno` são processados.
    3.  **Análise de Inatividade:** Para cada **aluno** elegível, a função verifica a data do `last_sign_in_at` (último login) ou `created_at` (se nunca logou).
        - Se o último login/criação foi entre 60 e 89 dias atrás, o aluno é adicionado a uma lista de "aviso".
        - Se o último login/criação foi há 90 dias ou mais, o aluno é adicionado a uma lista de "exclusão".

### 3. Envio de Email de Alerta (60 dias)

- **O que faz:** Notifica o usuário sobre a inatividade da conta.
- **Como funciona:**
    - Para cada usuário na lista de "aviso", a função `check-inactive-users` utiliza a API do **Brevo (antigo Sendinblue)** para enviar um email.
    - O email informa ao usuário que sua conta será excluída em 30 dias se ele não fizer login.
    - O template do email segue a identidade visual da Titans Fitness para garantir consistência.

### 4. Processo de Exclusão (90 dias)

Este é um processo de duas etapas para garantir que todos os dados do usuário sejam removidos.

#### Etapa 1: Exclusão de Arquivos no Cloudflare R2

- **O que faz:** Remove todos os arquivos pessoais do usuário (imagens e PDFs) que estão armazenados no Cloudflare R2.
- **Como funciona:**
    1.  A função `check-inactive-users` primeiro coleta as URLs de todos os arquivos associados ao usuário a ser excluído, buscando em tabelas como:
        - `alunos` (avatar_image_url)
        - `avaliacoes_fisicas` (fotos da avaliação)
        - `rotinas_arquivadas` (PDFs de rotinas)
    2.  Para cada arquivo encontrado, a função invoca uma **Edge Function** do Supabase (`delete-image`).
    3.  A Edge Function `delete-image` recebe o nome do arquivo e o bucket, e executa a exclusão diretamente no Cloudflare R2.

#### Etapa 2: Exclusão do Usuário no Supabase

- **O que faz:** Remove o registro do usuário do sistema de autenticação e, por consequência, todos os seus dados relacionados no banco de dados.
- **Como funciona:**
    - Após a tentativa de exclusão dos arquivos, a função `check-inactive-users` utiliza o `supabaseAdmin.auth.admin.deleteUser(user.id)` para deletar o usuário do `auth.users`.
    - Graças às políticas de `ON DELETE CASCADE` configuradas no banco de dados, a exclusão do usuário em `auth.users` aciona um efeito cascata, removendo todos os registros vinculados a ele em outras tabelas (perfis, avaliações, rotinas, etc.).

## Resumo do Fluxo

1.  **GitHub Actions (diariamente)**: `POST` para `api/cron/check-inactive-users`.
2.  **Vercel Function**:
    - Valida a requisição.
    - Busca usuários no Supabase.
    - Identifica usuários inativos por 60+ e 90+ dias.
3.  **Para usuários com 60-89 dias de inatividade**:
    - Envia email de alerta via Brevo.
4.  **Para usuários com 90+ dias de inatividade**:
    - **Passo 1**: Chama a Edge Function `delete-image` para remover arquivos do Cloudflare R2.
    - **Passo 2**: Deleta o usuário do `auth.users`, que aciona a exclusão em cascata dos dados restantes.
5.  **Fim do processo**.