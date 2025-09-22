# Regras de Negócio - Titans Fitness

Este documento centraliza as regras de negócio e os modelos de relacionamento da plataforma Titans Fitness.

## Índice

- [Parte I: Atores e Relacionamentos Fundamentais](#parte-i-atores-e-relacionamentos-fundamentais)
  - [1. Modelo de Relacionamento Direto (Personal Trainer e Aluno)](#1-modelo-de-relacionamento-direto-personal-trainer-e-aluno)
  - [2. Modelo de Academia (Visão Futura)](#2-modelo-de-academia-visão-futura)
    - [2.1. Distinção de Papéis](#21-distinção-de-papéis)
    - [2.2. Estrutura de Relacionamentos da Academia](#22-estrutura-de-relacionamentos-da-academia)
    - [2.3. Implicações no Modelo de Dados](#23-implicações-no-modelo-de-dados)
  - [3. Coexistência dos Modelos](#3-coexistência-dos-modelos)
    - [3.2. Cenários de Relacionamento](#32-cenários-de-relacionamento)
- [Parte II: Módulos e Funcionalidades](#parte-ii-módulos-e-funcionalidades)
  - [4. Gestão de Rotinas de Treino](#4-gestão-de-rotinas-de-treino)
  - [5. Gestão de Contas de Usuário](#5-gestão-de-contas-de-usuário)
  - [6. Gestão de Avaliações](#6-gestão-de-avaliações)
- [Parte III: Padrões de Interface de Usuário (UI)](#parte-iii-padrões-de-interface-de-usuário-ui)
  - [7. Modais de Confirmação e Alerta](#7-modais-de-confirmação-e-alerta)

---

# Parte I: Atores e Relacionamentos Fundamentais

## 1. Modelo de Relacionamento Direto (Personal Trainer e Aluno)

Este é o modelo principal atualmente em produção, focado no profissional autônomo.

- **REGRA 1.1:** Um Personal Trainer pode ter múltiplos Alunos.
- **REGRA 1.2:** Um Aluno está associado a apenas um Personal Trainer por vez.
- **Implementação:** A relação é de 1-para-N, controlada pela chave estrangeira `personal_trainer_id` na tabela `public.alunos`, que aponta para o registro do personal trainer.

## 2. Modelo de Academia (Visão Futura)

Este modelo será adicionado para suportar o funcionamento de academias, que possuem uma estrutura de relacionamento diferente.

### 2.1. Distinção de Papéis

- **Personal Trainer:** Refere-se ao profissional que tem uma relação direta e dedicada com um aluno, conforme o Modelo 1.
- **Professor:** Refere-se ao profissional que atua em uma academia. Ele não tem uma relação dedicada, mas atende ao conjunto de alunos matriculados na academia.
- **Observação:** Um mesmo indivíduo (um único registro na tabela `public.personal_trainers`) pode exercer ambos os papéis. O contexto da relação (direta ou via academia) define se ele atua como "Personal Trainer" ou "Professor".

### 2.2. Estrutura de Relacionamentos da Academia

- **REGRA 2.2.1:** Uma Academia pode ter múltiplos Professores, e um Professor pode lecionar em múltiplas Academias.
    - **Implementação:** Relação N-para-N, gerenciada por uma tabela de associação `academia_professores` (ou `academia_personais`).

- **REGRA 2.2.2:** Uma Academia pode ter múltiplos Alunos, e um Aluno pode ser membro de múltiplas Academias.
    - **Implementação:** Relação N-para-N, gerenciada por uma tabela de associação `academia_alunos`.n
- **REGRA 2.2.3:** O acesso de um Aluno aos Professores de uma academia é concedido através de sua matrícula na respectiva academia.

### 2.3. Implicações no Modelo de Dados

Para suportar o Modelo de Academia, as seguintes tabelas serão criadas e adaptações serão feitas nas tabelas existentes:

#### Novas Tabelas

- **Tabela: `public.academias`**
  *Esta tabela armazenará as informações cadastrais de cada academia.*

  | Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
  |---|---|---|---|---|---|---|---|
  | `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `academias_pkey` | |
  | `nome` | 2 | `character varying` | False | | | | |
  | `cnpj` | 3 | `character varying` | True | | `UNIQUE` | `academias_cnpj_key` | |
  | `endereco` | 4 | `text` | True | | | | |
  | `telefone_contato` | 5 | `text` | True | | | | |
  | `email_contato` | 6 | `character varying` | True | | | | |
  | `created_at` | 7 | `timestamp with time zone` | True | `now()` | | | |
  | `updated_at` | 8 | `timestamp with time zone` | True | `now()` | | | |

- **Tabela: `public.academia_professores`**
  *Tabela de associação para criar a relação N:N entre academias e profissionais que atuam como professores.*

  | Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
  |---|---|---|---|---|---|---|---|
  | `academia_id` | 1 | `uuid` | False | | `PRIMARY KEY, FOREIGN KEY` | `academia_professores_pkey` | `public.academias(id)` |
  | `professor_id` | 2 | `uuid` | False | | `PRIMARY KEY, FOREIGN KEY` | `academia_professores_pkey` | `public.personal_trainers(id)` |
  | `created_at` | 3 | `timestamp with time zone` | True | `now()` | | | |

- **Tabela: `public.academia_alunos`**
  *Tabela de associação para criar a relação N:N entre academias e alunos.*

  | Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
  |---|---|---|---|---|---|---|---|
  | `academia_id` | 1 | `uuid` | False | | `PRIMARY KEY, FOREIGN KEY` | `academia_alunos_pkey` | `public.academias(id)` |
  | `aluno_id` | 2 | `uuid` | False | | `PRIMARY KEY, FOREIGN KEY` | `academia_alunos_pkey` | `public.alunos(id)` |
  | `data_matricula` | 3 | `date` | False | `now()` | | | |
  | `status_matricula` | 4 | `character varying` | False | `'ativa'::character varying` | | | |
  | `created_at` | 5 | `timestamp with time zone` | True | `now()` | | | |

#### Adaptações em Tabelas Existentes

Para que o modelo de academia conviva com o modelo de personal trainers, as seguintes adaptações e entendimentos são necessários nas tabelas existentes:

- **Tabela `public.alunos`:**
    - A coluna `personal_trainer_id` continuará existindo para representar o vínculo direto e dedicado do aluno com um personal trainer. Para alunos que são membros de uma academia e não possuem um personal trainer dedicado, esta coluna poderá ser `NULL`.

- **Tabela `public.personal_trainers`:**
    - Esta tabela passará a ser entendida como o cadastro de **todos os profissionais** que atuam na plataforma. Um profissional registrado aqui pode atuar como "Personal Trainer" (com vínculo direto a alunos) ou como "Professor" (com vínculo a academias via `academia_professores`), ou ambos.

## 3. Coexistência dos Modelos

Os dois modelos (Direto e de Academia) são projetados para coexistir sem conflitos.

- **REGRA 3.1:** Um Aluno pode, simultaneamente, ter um Personal Trainer dedicado (relação direta) e ser membro de uma ou mais Academias.
- **Implementação:** A coluna `alunos.personal_trainer_id` gerencia a relação direta. Para alunos que são apenas membros de academias, este campo pode ser nulo. As matrículas em academias são gerenciadas pelas tabelas de associação.

### 3.2. Cenários de Relacionamento

A seguir, alguns exemplos práticos de como os relacionamentos entre Alunos, Personal Trainers e Academias se manifestam na aplicação:

-   **Cenário 1: Aluno com Personal Trainer Dedicado (Ciclo de Rotinas)**
    -   Um Aluno (`aluno_A`) se vincula a um Personal Trainer (`pt_X`).
    -   `pt_X` cria a primeira rotina para `aluno_A`. Esta rotina é marcada como "ativa".
    -   Ao final da rotina, `aluno_A` solicita uma nova rotina a `pt_X`. A rotina anterior é marcada como "concluída" e `pt_X` cria uma nova rotina "ativa" para `aluno_A".
    -   `pt_X` tem acesso ao histórico completo de rotinas e avaliações de `aluno_A` enquanto o vínculo estiver ativo.

-   **Cenário 2: Aluno Troca de Personal Trainer**
    -   `aluno_A` está vinculado a `pt_X` e possui uma rotina "ativa".
    -   `aluno_A` decide se desvincular de `pt_X` e se vincular a um novo Personal Trainer (`pt_Y`).
    -   A rotina "ativa" de `aluno_A` com `pt_X` é marcada como "concluída".
    -   `pt_X` perde o acesso aos dados de `aluno_A`.
    -   `pt_Y` cria uma nova rotina "ativa" para `aluno_A`. `pt_Y` tem acesso ao histórico completo de `aluno_A` (incluindo rotinas criadas por `pt_X`).

-   **Cenário 3: Personal Trainer Desvincula-se do Aluno**
    -   `aluno_A` está vinculado a `pt_X`.
    -   `pt_X` decide desvincular-se de `aluno_A` (por exemplo, por inatividade do aluno ou término de contrato).
    -   A rotina "ativa" de `aluno_A` com `pt_X` é marcada como "concluída".
    -   `pt_X` perde o acesso aos dados de `aluno_A`. `aluno_A` não possui mais um Personal Trainer dedicado.

-   **Cenário 4: Aluno Membro de Academia (Futuro)**
    -   `aluno_B` é membro da `academia_Z` (vinculado via `academia_alunos`).
    -   `aluno_B` pode ter um Personal Trainer dedicado (`pt_P`) ou não.
    -   Um Professor (`prof_Q`) da `academia_Z` (que é um profissional na tabela `personal_trainers` e vinculado à `academia_Z` via `academia_professores`) cria uma rotina para `aluno_B`. Esta rotina é marcada como "ativa".
    -   `prof_Q` tem acesso ao histórico de `aluno_B` enquanto `aluno_B` for membro da `academia_Z` e `prof_Q` for professor ativo na `academia_Z`.
    -   Se `aluno_B` tiver um `pt_P` dedicado, ele terá uma rotina "ativa" criada por `pt_P`. A rotina criada por `prof_Q` seria "inativa" ou "concluída" se `aluno_B` já tiver uma rotina ativa. (Reforça a REGRA 4.4: apenas uma rotina ativa por vez).

---

# Parte II: Módulos e Funcionalidades

## 4. Gestão de Rotinas de Treino

Esta seção detalha as regras de negócio relacionadas à criação, posse e ciclo de vida das rotinas de treino.

- **REGRA 4.1 (Domínio):** O foco exclusivo do aplicativo são treinos de musculação.

- **REGRA 4.2 (Posse):** O Aluno é o proprietário de todo o seu histórico de rotinas e avaliações físicas.
    - **Implementação:** Os registros nas tabelas `rotinas` e `avaliacoes_fisicas` são vinculados diretamente ao `aluno_id`.

- **REGRA 4.3 (Acesso pelo Profissional):** O profissional (Personal Trainer ou Professor de Academia) com um vínculo ativo com o aluno tem permissão para visualizar o histórico e para criar ou gerenciar a rotina ativa do aluno. Ao final do vínculo, esse acesso é revogado.
    - **Implementação:** O controle de acesso deve ser implementado via políticas de segurança (Row Level Security), verificando o vínculo atual entre o profissional e o aluno.

- **REGRA 4.4 (Rotina Ativa):** Um aluno pode ter apenas uma única rotina de treino com o status "ativa" por vez.
    - **Implementação:** O sistema já impõe esta regra. Para iniciar uma nova rotina, a rotina anterior deve ser primeiro encerrada ou arquivada. A coluna `status` na tabela `rotinas` controla este ciclo de vida.

- **REGRA 4.5 (Limite de Rotinas Arquivadas):** Para otimizar o armazenamento e manter o histórico do aluno focado, um aluno pode ter no máximo 4 rotinas arquivadas. A lógica de controle é implementada na aplicação e funciona no modelo FIFO (First-In, First-Out). Ao concluir uma nova rotina, o sistema verifica se o limite foi atingido. Se sim, a rotina arquivada mais antiga é removida, incluindo seu PDF correspondente no bucket de armazenamento, antes da nova rotina ser arquivada.

### 4.6. Ciclo de Vida da Criação de Rotina

Esta seção detalha as regras que governam o processo de criação de uma nova rotina de treino.

-   **REGRA 4.6.1 (Origem da Criação):** Uma nova rotina pode ser iniciada de duas formas: "Do Zero" (em branco) ou a partir de um "Modelo de Rotina" pré-existente criado pelo Personal Trainer.

-   **REGRA 4.6.2 (Processo em Etapas):** A criação segue um assistente de 3 etapas: **1. Configuração** (dados gerais da rotina), **2. Treinos** (definição dos treinos da semana, ex: A, B, C) e **3. Exercícios** (adição de exercícios a cada treino). O progresso é salvo localmente no `sessionStorage` do navegador para evitar a perda de dados em caso de fechamento acidental da aba.

-   **REGRA 4.6.3 (Rascunho):** A qualquer momento, a rotina em criação pode ser salva com o status "Rascunho". Um aluno pode ter múltiplos rascunhos, permitindo que o PT prepare futuras rotinas com antecedência.

-   **REGRA 4.6.4 (Validação de Treinos):** Para avançar da etapa de Treinos, cada treino definido (ex: Treino A, Treino B) deve ter pelo menos um grupo muscular associado.

-   **REGRA 4.6.5 (Validação de Exercícios):** Para que uma rotina possa ser finalizada e ativada, cada treino deve conter pelo menos um exercício.

-   **REGRA 4.6.6 (Consistência de Exercícios):** Ao editar os grupos musculares de um treino que já possui exercícios, o sistema remove automaticamente os exercícios que não são mais compatíveis com a nova seleção de grupos, garantindo a consistência do treino.

-   **REGRA 4.6.7 (Finalização e Geração de Sessões):** Ao ser finalizada, a rotina muda seu status para "Ativa". Neste momento, o sistema gera e insere automaticamente todas as entradas na tabela `execucoes_sessao` para todo o ciclo de vida da rotina (ex: uma rotina de 4 semanas com 3 treinos/semana resultará na criação de 12 registros de sessão).

### 4.7. Ciclo de Vida da Execução de Rotina

Esta seção detalha as regras que governam a execução de uma rotina ativa.

-   **REGRA 4.7.1 (Seleção de Treino):** O aluno (ou o PT em modo de acompanhamento) visualiza a lista de sessões de treino disponíveis da sua rotina "Ativa", organizadas em ordem.

-   **REGRA 4.7.2 (Status da Sessão):** Cada sessão de treino possui um ciclo de vida controlado pelos status: `em_aberto`, `em_andamento`, `pausada` e `concluida`.

-   **REGRA 4.7.3 (Início e Continuação):** O usuário só pode iniciar uma sessão com status `em_aberto`. Ele pode continuar uma sessão que esteja `em_andamento` ou `pausada`.

-   **REGRA 4.7.4 (Registro de Performance):** Durante a execução, o usuário registra os dados de performance (repetições e carga) para cada série. Esses dados são salvos na tabela `execucoes_series`.

-   **REGRA 4.7.5 (Conclusão da Rotina):** Quando todas as sessões de uma rotina são marcadas como `concluida`, a rotina principal tem seu status automaticamente alterado para "Concluída" e é movida para o histórico (arquivada).

## 5. Gestão de Contas de Usuário

Esta seção cobre as regras relacionadas ao ciclo de vida das contas dos usuários.

- **REGRA 5.1 (Exclusão por Inatividade):** Se um usuário do tipo "Aluno" não acessar a aplicação por um período de 90 dias consecutivos, todos os seus dados pessoais e de uso (incluindo rotinas, avaliações, etc.) serão permanentemente removidos do sistema.
    - **Fundamento:** Esta regra está definida nos Termos de Uso do serviço.
    - **Implementação:** Requer um processo automatizado (como um cron job) que periodicamente verifica a data do último login (por exemplo, `last_sign_in_at` na tabela `auth.users` do Supabase) dos alunos e aciona a exclusão dos dados para aqueles que atendem ao critério.

## 6. Gestão de Vínculos entre Personal Trainer e Aluno

Esta seção define o ciclo de vida completo do relacionamento entre um Personal Trainer (PT) e um Aluno. O ciclo é controlado inteiramente pelo PT e consiste em duas operações fundamentais: a **Criação de Vínculo** (via convite) e a **Remoção de Vínculo** (desvinculação).

### 6.1 Criação de Vínculo (Processo de Convite)

O sistema utiliza um processo de convite seguro e centralizado, baseado em tokens, para estabelecer o vínculo entre PT e Aluno. O antigo sistema de `codigo_pt` foi descontinuado.

-   **REGRA 6.1.1 (Ponto de Partida):** O fluxo se inicia quando o PT insere o endereço de e-mail do aluno que deseja convidar.

-   **REGRA 6.1.2 (Verificação Centralizada):** Uma Edge Function do Supabase é acionada para verificar o status do e-mail fornecido. O resultado dessa verificação determina qual dos três cenários a seguir será executado.

-   **REGRA 6.1.3 (Cenário 1: Novo Aluno - Convite de Cadastro):**
    -   **Condição:** O e-mail informado não pertence a nenhum usuário cadastrado na plataforma.
    -   **Ação:** A Edge Function `enviar-convite` gera um token de convite único, de uso único, e o armazena na tabela `public.convites`. Um e-mail é enviado ao destinatário com um link para a **página de cadastro** (`/cadastro/aluno`), que já inclui o token.
    -   **Resultado:** Ao completar o cadastro, o token é validado e o vínculo com o PT que o convidou é estabelecido automaticamente.

-   **REGRA 6.1.4 (Cenário 2: Aluno Existente e Sem Vínculo - Convite de Vínculo):**
    -   **Condição:** O e-mail pertence a um aluno já cadastrado, mas que no momento não está vinculado a nenhum PT (o campo `personal_trainer_id` é `NULL`).
    -   **Ação:** A Edge Function `enviar-convite` gera um token de convite e envia um e-mail para o aluno. O link no e-mail direciona o aluno para a **Edge Function `aceitar-convite`** (`/functions/v1/aceitar-convite?token=...`).
    -   **Resultado:** Após a `aceitar-convite` processar o vínculo, o aluno é redirecionado para a página de login (`/login?message=vinculo_sucesso`), onde uma mensagem de sucesso é exibida. Em caso de erro no processo, o aluno é redirecionado para a página de convite inválido (`/convite-invalido?error=...`).

-   **REGRA 6.1.5 (Cenário 3: Aluno Existente e Já Vinculado):**
    -   **Condição:** O e-mail pertence a um aluno que já está ativo com outro PT.
    -   **Ação:** O processo é **imediatamente bloqueado** pela Edge Function `enviar-convite`. Nenhum token é gerado e nenhum e-mail é enviado.
    -   **Resultado:** O PT que tentou enviar o convite recebe uma notificação de erro na interface, informando que o aluno já está sob a orientação de outro profissional.

-   **REGRA 6.1.6 (Segurança do Token):** Todos os tokens de convite são de uso único e possuem um tempo de expiração para garantir a segurança do processo.

### 6.2 Remoção de Vínculo (Processo de Desvinculação)

A remoção de um vínculo é uma operação não destrutiva, que preserva a conta e o histórico do aluno.

-   **REGRA 6.2.1 (Ação de Desvincular):** A remoção de um aluno da lista de um PT é sempre uma **desvinculação**, nunca uma exclusão de conta. A interface do sistema reflete essa distinção: o botão de ação usa o termo "Remover", e a caixa de diálogo de confirmação especifica a ação como "Remover Vínculo" para garantir que o usuário não a confunda com a exclusão da conta.

-   **REGRA 6.2.2 (Implementação Técnica):** A operação consiste em um `UPDATE` na tabela `public.alunos`, definindo a coluna `personal_trainer_id` do aluno como `NULL`.

-   **REGRA 6.2.3 (Consequências da Desvinculação):**
    -   O PT perde **imediatamente** todo o acesso ao perfil, histórico de treinos e avaliações do aluno. O acesso é controlado por Políticas de Segurança (RLS).
    -   A conta do aluno e todo o seu histórico de dados são integralmente preservados.
    -   O aluno, agora sem vínculo, pode ser convidado por um novo PT.
    -   O aluno deve ser notificado (via e-mail ou notificação no app) sobre a desvinculação. *(Nota: A notificação é um item de implementação futura)*.

-   **REGRA 6.2.4 (Regra da Rotina Ativa):** Caso o aluno possua uma rotina de treino com status "ativa" no momento da desvinculação, o status dessa rotina é automaticamente alterado para "concluída".

-   **REGRA 6.2.5 (Iniciativa da Ação):** A desvinculação pode ser iniciada por qualquer uma das partes (PT ou Aluno), resultando sempre nas mesmas consequências.

-   **REGRA 6.2.6 (Exclusão de Conta):** A exclusão **permanente** de uma conta de Aluno, com todos os seus dados, só pode ser iniciada pelo próprio Aluno através das configurações de sua conta.

## 6. Gestão de Avaliações

Esta seção detalha as regras de negócio relacionadas à criação, posse e ciclo de vida das avaliações.

- **REGRA 6.1 (Limite de Avaliações Físicas):** Um aluno pode ter no máximo 4 avaliações físicas. Ao criar uma nova avaliação que exceda este limite, a avaliação mais antiga é automaticamente removida (lógica FIFO). Este processo de exclusão é iniciado pela aplicação, que primeiro remove as imagens associadas do bucket de armazenamento e depois o registro da avaliação no banco de dados.

---

# Parte III: Padrões de Interface de Usuário (UI)

Esta seção define os padrões de componentes e interações que devem ser seguidos para manter a consistência visual e a experiência do usuário em toda a plataforma.

## 7. Modais de Confirmação e Alerta

- **REGRA 7.1 (Padrão de Modal Unificado):** Todas as janelas modais destinadas a exibir informações ou solicitar confirmação do usuário (alertas, diálogos de exclusão, etc.) devem utilizar o componente `<Modal>` do `react-modal`.
    - **Fundamento:** Este padrão garante uma experiência de usuário coesa e consistente em toda a aplicação, simplificando a manutenção.
    - **Comportamento Esperado:**
        - O modal é estilizado com Tailwind CSS para ser totalmente responsivo.
        - **Em telas grandes (Desktop):** Renderiza como uma caixa de diálogo centralizada.
        - **Em telas pequenas (Mobile):** Ocupa a largura da tela com pequenas margens laterais, proporcionando uma experiência nativa.
    - **Implementação:** O componente `<Modal>` é importado e configurado com classes CSS que definem sua aparência e comportamento responsivo, eliminando a necessidade de componentes separados para mobile e desktop.
