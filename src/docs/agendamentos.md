# 🗓️ Sistema de Agendamentos

Este documento descreve a arquitetura e o fluxo da funcionalidade de Agendamentos, uma ferramenta essencial para a organização de sessões de treino e avaliações físicas entre professores e alunos.

---

## 1. Visão Geral

O sistema de agendamentos permite que professores proponham horários para sessões de treino ou avaliações físicas. O aluno, por sua vez, recebe o convite e pode confirmar ou recusar. A funcionalidade é integrada a um calendário visual que centraliza todos os compromissos de ambos os usuários.

---

## 2. Arquitetura de Arquivos

A funcionalidade é distribuída entre páginas principais e componentes de UI, com a lógica de negócio contida diretamente nelas.

```
src/
├── pages/
│   ├── Calendario.tsx             # 📅 Tela principal da agenda, com visões e modais de gerenciamento.
│   ├── IndexAluno.tsx             # 🏃 Dashboard do aluno, com um widget de próximos agendamentos.
│   └── IndexProfessor.tsx         # 👨‍🏫 Dashboard do professor, com um widget de agendamentos pendentes.
│
├── hooks/
│   └── useAuth.ts                 # Utilizado para obter o ID e o tipo do usuário logado.
│
└── supabase/functions/
    └── enviar-notificacao/
        └── index.ts               # (Planejado) Função para enviar notificações sobre status dos agendamentos.
```

---

## 3. Modelo de Dados (Tabela `agendamentos`)

A funcionalidade é sustentada pela tabela `public.agendamentos` no Supabase.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `uuid` | Identificador único do agendamento. |
| `professor_id` | `uuid` | ID do professor que criou o agendamento. |
| `aluno_id` | `uuid` | ID do aluno para quem o agendamento foi criado. |
| `tipo` | `tipo_agendamento` | O tipo de evento: `sessao_treino` ou `avaliacao_fisica`. |
| `status` | `status_agendamento` | O estado atual do agendamento: `pendente`, `confirmado`, `recusado`, `concluido`. |
| `data_hora_inicio` | `timestamptz` | Data e hora de início do evento. |
| `data_hora_fim` | `timestamptz` | Data e hora de término do evento (atualmente calculado como início + 1h). |
| `notas_professor` | `text` | Observações adicionadas pelo professor no momento da criação. |
| `notas_aluno` | `text` | Motivo informado pelo aluno ao recusar um agendamento. |

---

## 4. Fluxo do Professor

### 4.1. Criação de Agendamento
-   **Ponto de Entrada:** O professor utiliza o botão flutuante (+) na página `Calendario.tsx`.
-   **Processo:**
    1.  Um modal (`Dialog`) é aberto, contendo um formulário (`react-hook-form` com `zod`).
    2.  O professor seleciona um de seus alunos seguidores, o tipo de evento (treino ou avaliação), data, hora e notas opcionais.
    3.  Ao submeter, um novo registro é criado na tabela `agendamentos` com o status `'pendente'`.
    4.  Uma notificação é enviada ao aluno (melhoria planejada).

### 4.2. Visualização e Gerenciamento
-   **Visão Geral:** A página `Calendario.tsx` oferece visões semanal e mensal (desktop) ou diária e semanal (mobile).
-   **Interação:** O professor pode clicar em um dia para ver os detalhes dos agendamentos em um modal.
-   **Ações:** Dentro do modal de detalhes, o professor pode:
    -   **Reagendar:** Alterar a data/hora de um agendamento.
    -   **Excluir:** Remover um agendamento permanentemente. A exclusão é permitida para qualquer status.

---

## 5. Fluxo do Aluno

### 5.1. Recebimento e Ações Rápidas
-   **Ponto de Entrada:** O dashboard do aluno (`IndexAluno.tsx`) exibe um card com os próximos agendamentos.
-   **Ações:** Para agendamentos com status `'pendente'`, o aluno tem as opções de "Confirmar" ou "Recusar" diretamente no dashboard.
    -   Ao **Confirmar**, o status do agendamento é atualizado para `'confirmado'`.
    -   Ao **Recusar**, um modal é aberto para que o aluno informe o motivo, que é salvo em `notas_aluno`. O status é atualizado para `'recusado'`.

### 5.2. Visualização da Agenda
-   O aluno pode acessar a página `Calendario.tsx` para ter uma visão completa de todos os seus compromissos.
-   A interface é a mesma do professor, mas as ações são limitadas à sua perspectiva (confirmar/recusar).

---

## 6. Lógica de Status e Cores

O status de um agendamento determina sua cor na interface, fornecendo um feedback visual rápido.

-   🟡 **Laranja (`pendente`):** Aguardando a resposta do aluno.
-   🟢 **Verde (`confirmado`):** Agendamento aceito por ambos.
-   🔴 **Vermelho (`recusado`):** O aluno não pôde aceitar o convite.
-   🔵 **Azul (`concluido`):** O horário do agendamento já passou. O status é atualizado automaticamente pelo sistema na primeira vez que a agenda é carregada após o evento.

---

## 7. Segurança (RLS - Row Level Security)

Políticas de segurança no nível da linha do banco de dados são cruciais para garantir a privacidade dos dados.

-   **Leitura (`SELECT`):** Um usuário (aluno ou professor) só pode ver agendamentos em que seu `id` corresponda ao `aluno_id` ou `professor_id`.
-   **Criação (`INSERT`):** Apenas usuários do tipo `professor` podem criar agendamentos.
-   **Atualização (`UPDATE`):**
    -   O professor pode alterar qualquer campo.
    -   O aluno só pode alterar o `status` para `'confirmado'` ou `'recusado'` e preencher o campo `notas_aluno`.
-   **Exclusão (`DELETE`):** Apenas o professor que criou o agendamento pode excluí-lo.

---

## 8. Melhorias Planejadas

Conforme documentado em `melhorias.md`:

-   **Notificações em Tempo Real:** Enviar mensagens via chat para o aluno/professor quando um agendamento é criado, confirmado, recusado ou alterado.
-   **Validação de Horário:** Impedir que professores criem agendamentos em horários que já passaram.
-   **Otimização de Performance:** Carregar agendamentos sob demanda, de acordo com o período visível no calendário, em vez de buscar o mês inteiro sempre.

