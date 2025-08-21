## ⏳ Processo de Exclusão por Inatividade

Este processo automatizado garante a conformidade com a REGRA 5.1 das Regras de Negócio, que determina a exclusão de contas de alunos inativos após 90 dias.

### 1. Identificação de Alunos Inativos

-   **Mecanismo:** Um processo agendado (cron job) será executado periodicamente (ex: diariamente ou semanalmente) para identificar alunos que não acessam a plataforma há um determinado período.
-   **Fonte de Dados:** A data do último acesso (`last_sign_in_at`) na tabela `auth.users` do Supabase será utilizada como principal métrica de inatividade.
-   **Cálculo:** A inatividade é calculada comparando `last_sign_in_at` com a data atual.

### 2. Notificação de Alerta (60 dias de inatividade)

-   **Gatilho:** Quando um aluno atingir 60 dias de inatividade (ou seja, 30 dias antes da exclusão final).
-   **Ação:** Um e-mail de alerta será enviado ao aluno, informando sobre a iminente exclusão de sua conta devido à inatividade e instruindo-o sobre como reativá-la (ex: fazendo login novamente).
-   **Objetivo:** Dar ao aluno uma última chance de manter sua conta e dados, evitando exclusões indesejadas.
-   **Tecnologia:** Uma Edge Function do Supabase pode ser utilizada para consultar os alunos inativos e disparar o envio de e-mails via Brevo (ou serviço similar).

### 3. Execução da Exclusão (90 dias de inatividade)

-   **Gatilho:** Quando um aluno atingir 90 dias de inatividade.
-   **Ação:** Uma Edge Function do Supabase será acionada para executar a exclusão da conta do aluno.
-   **Processo de Exclusão:**
    1.  A Edge Function identificará os `user_id` dos alunos que completaram 90 dias de inatividade.
    2.  Para cada `user_id` identificado, a função chamará a API de Administração do Supabase para deletar o usuário da tabela `auth.users`.
    3.  Graças à configuração `ON DELETE CASCADE` nas chaves estrangeiras (conforme detalhado na seção "Corrente de Exclusão" acima), a exclusão do registro em `auth.users` propagará automaticamente a remoção dos dados do aluno em `user_profiles`, `alunos`, `rotinas`, `rotinas_arquivadas` e `avaliacoes_fisicas`.
-   **Tecnologia:** Uma Edge Function agendada via `pg_cron` (ou outro serviço de cron job externo) é a solução ideal para automatizar essa tarefa.

### 4. Considerações Adicionais

-   **Logs:** É crucial implementar logs detalhados para o processo de identificação, alerta e exclusão, permitindo auditoria e depuração.
-   **Tratamento de Erros:** Mecanismos robustos de tratamento de erros e retentativas devem ser considerados para o envio de e-mails e para a execução da exclusão.
-   **Notificação ao PT:** O Personal Trainer do aluno excluído (se houver) pode ser notificado sobre a exclusão da conta do seu ex-aluno.