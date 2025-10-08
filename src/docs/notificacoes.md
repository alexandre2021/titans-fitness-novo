# 📢 Sistema de Notificações do Sistema

Este documento descreve a arquitetura do sistema de notificações automáticas, que são enviadas como mensagens diretas de um usuário "Administrador" para Alunos e Professores.

---

## 1. Visão Geral

O objetivo é notificar os usuários sobre eventos importantes que ocorrem na plataforma, como desvinculação de contas ou exclusão de rotinas. Em vez de um sistema de notificações complexo e separado, a solução utiliza a própria estrutura de chat existente.

Todas as notificações são enviadas por um usuário de sistema, o **Administrador** (`contato@titans.fitness`), garantindo que a origem da mensagem seja clara e centralizada.

---

## 2. Arquitetura

### 2.1. Usuário Administrador

-   **ID:** O UUID do usuário `contato@titans.fitness` é armazenado como uma variável de ambiente no Supabase (`ADMIN_USER_ID`).
-   **Função:** Atua como o remetente de todas as notificações automáticas do sistema.

### 2.2. Edge Function: `enviar-notificacao`

-   **Responsabilidade:** Centralizar o envio de todas as notificações do sistema.
-   **Localização:** `supabase/functions/enviar-notificacao/index.ts`
-   **Parâmetros:**
    -   `destinatario_id`: O UUID do usuário que receberá a notificação.
    -   `conteudo`: O texto da mensagem de notificação.

    Os gatilhos para esse edge function estão em:

    C:\Users\alexa\titans-fitness-novo\src\hooks\useAlunos.
    C:\Users\alexa\titans-fitness-novo\src\hooks\useProfessores.ts
    C:\Users\alexa\titans-fitness-novo\src\pages\PaginaRotinas.
    
    4 situações:
    Informa aluno que o professor removeu o vinculo;
    Informa aluno que porfessor excluiu a sua rotina;
    Informa o professor que o aluno rmoveu o vinculo;
    Informa o professor que o aluno escluiu a sua rotina.

    Para cancelamento da conta incluímos os gatilhos na edge function 'cancel-account'

    mais 2 situações:

    Informa aluno(s) que professor cancelou a conta;
    Informa professor(es) que o aluno cancelou a conta.

---



### 2.3. Fluxo de Envio

1.  **Chamada no Frontend:** Em um evento específico (ex: um aluno deixa de seguir um professor), o frontend invoca a Edge Function `enviar-notificacao`.
2.  **Processamento no Backend:**
    -   A Edge Function recebe o `destinatario_id` e o `conteudo`.
    -   Ela busca ou cria uma conversa 1-para-1 entre o `ADMIN_USER_ID` e o `destinatario_id`.
    -   Insere uma nova mensagem na tabela `mensagens` dentro dessa conversa, com o `ADMIN_USER_ID` como remetente.
3.  **Recebimento no Frontend:**
    -   O usuário destinatário recebe a mensagem em tempo real na sua caixa de entrada, como se fosse uma mensagem de chat normal.
    -   A interface de mensagens (`MessageDrawer.tsx`) exibe um card fixo no topo para a conversa com o "Administrador", garantindo que as notificações do sistema sejam sempre visíveis.

---

## 3. Notificações Implementadas

Atualmente, o sistema envia notificações para os seguintes eventos:

1.  **Aluno deixa de seguir Professor:**
    -   **Gatilho:** Aluno clica em "Deixar de Seguir" no perfil do professor.
    -   **Destinatário:** O Professor.
    -   **Mensagem:** `O aluno [Nome do Aluno] deixou de te seguir.`

2.  **Professor remove Aluno:**
    -   **Gatilho:** Professor remove um aluno de sua lista.
    -   **Destinatário:** O Aluno.
    -   **Mensagem:** `O professor [Nome do Professor] removeu você da rede de contatos dele.`

3.  **Aluno cancela uma Rotina:**
    -   **Gatilho:** Aluno cancela uma rotina ativa.
    -   **Destinatário:** O Professor que criou a rotina.
    -   **Mensagem:** `O aluno [Nome do Aluno] cancelou a rotina de treino "[Nome da Rotina]".`

4.  **Professor exclui uma Rotina:**
    -   **Gatilho:** Professor exclui uma rotina (rascunho ou ativa).
    -   **Destinatário:** O Aluno associado à rotina.
    -   **Mensagem:** `O professor [Nome do Professor] excluiu sua rotina de treino "[Nome da Rotina]".`