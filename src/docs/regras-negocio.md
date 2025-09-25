# Regras de Negócio - Titans Fitness

Este documento centraliza as regras de negócio e os modelos de relacionamento da plataforma Titans Fitness no novo modelo de Professores.

## Índice

- [Parte I: Atores e Relacionamentos Fundamentais](#parte-i-atores-e-relacionamentos-fundamentais)
  - [1. Novo Modelo de Relacionamento (Professor e Aluno)](#1-novo-modelo-de-relacionamento-professor-e-aluno)
  - [2. Sistema de "Seguir" vs "Rotina Ativa"](#2-sistema-de-seguir-vs-rotina-ativa)
  - [3. Cenários de Relacionamento](#3-cenários-de-relacionamento)
- [Parte II: Módulos e Funcionalidades](#parte-ii-módulos-e-funcionalidades)
  - [4. Gestão de Rotinas de Treino](#4-gestão-de-rotinas-de-treino)
  - [5. Gestão de Contas de Usuário](#5-gestão-de-contas-de-usuário)
  - [6. Gestão de Relacionamentos Professor-Aluno](#6-gestão-de-relacionamentos-professor-aluno)
  - [7. Gestão de Avaliações](#7-gestão-de-avaliações)
- [Parte III: Padrões de Interface de Usuário (UI)](#parte-iii-padrões-de-interface-de-usuário-ui)
  - [8. Modais de Confirmação e Alerta](#8-modais-de-confirmação-e-alerta)

---

# Parte I: Atores e Relacionamentos Fundamentais

## 1. Novo Modelo de Relacionamento (Professor e Aluno)

O modelo foi completamente reestruturado para permitir que alunos sigam múltiplos professores, eliminando o conceito de exclusividade.

### 1.1. Definições Fundamentais

- **REGRA 1.1 (Professor como Gerador de Conteúdo):** O Professor é o único ator autorizado a criar conteúdo na plataforma, incluindo rotinas de treino, exercícios personalizados e modelos de rotina.

- **REGRA 1.2 (Aluno como Consumidor de Conteúdo):** O Aluno consome o conteúdo criado pelos professores e gera dados de progresso através da execução dos treinos.

- **REGRA 1.3 (Relacionamento N:N):** Um Aluno pode seguir múltiplos Professores simultaneamente, e um Professor pode ter múltiplos seguidores.
    - **Implementação:** Relacionamento N:N gerenciado pela tabela `alunos_professores`.

### 1.2. Estrutura de Dados Atualizada

- **Tabela `professores`:** Renomeada de `professores`, mantém informações dos profissionais
- **Tabela `alunos`:** Campo `professor_id` agora representa apenas o professor da rotina ativa atual
- **Tabela `alunos_professores`:** NOVA - gerencia relacionamento de "seguir" (N:N)
- **Tabela `user_profiles`:** Tipo de usuário agora é `'professor'` ao invés de `'professor'`

## 2. Sistema de "Seguir" vs "Rotina Ativa"

O novo modelo distingue claramente entre dois tipos de relacionamento:

### 2.1. Relacionamento de "Seguir"

- **REGRA 2.1.1 (Conceito de Seguir):** "Seguir" um professor significa ter acesso ao conteúdo público que ele produz (modelos de rotina, exercícios, dicas), sem compromisso de exclusividade.

- **REGRA 2.1.2 (Múltiplos Seguimentos):** Um aluno pode seguir quantos professores desejar simultaneamente.

- **REGRA 2.1.3 (Conteúdo Acessível):** Aluno que segue um professor pode visualizar:
    - Modelos de rotina públicos do professor
    - Exercícios personalizados criados pelo professor
    - Conteúdo educativo compartilhado pelo professor

### 2.2. Relacionamento de "Rotina Ativa"

- **REGRA 2.2.1 (Rotina Ativa Única):** Um aluno pode ter apenas UMA rotina ativa por vez, independente de quantos professores ele segue.

- **REGRA 2.2.2 (Professor da Rotina Ativa):** O campo `alunos.professor_id` indica qual professor criou a rotina atualmente ativa do aluno.

- **REGRA 2.2.3 (Acesso aos Dados de Execução):** Apenas o professor que criou a rotina ativa tem acesso aos dados de execução e progresso do aluno.

## 3. Cenários de Relacionamento

### 3.1. Novos Fluxos de Relacionamento

- **Cenário 1: Aluno Segue Múltiplos Professores**
    - `aluno_A` segue `professor_X`, `professor_Y` e `professor_Z`
    - `aluno_A` pode ver conteúdo de todos os três professores
    - `professor_Y` cria uma rotina ativa para `aluno_A`
    - Apenas `professor_Y` vê os dados de execução de `aluno_A`
    - `professor_X` e `professor_Z` continuam como "seguidos" mas sem acesso aos dados

- **Cenário 2: Mudança de Rotina Ativa**
    - `aluno_A` tem rotina ativa do `professor_Y`
    - `professor_Z` (que `aluno_A` também segue) cria nova rotina para `aluno_A`
    - Sistema verifica se `aluno_A` já tem rotina ativa
    - Rotina do `professor_Y` é automaticamente cancelada e arquivada
    - Nova rotina do `professor_Z` se torna ativa
    - `professor_Y` perde acesso aos dados de `aluno_A`

- **Cenário 3: Parar de Seguir**
    - `aluno_A` decide parar de seguir `professor_Y`
    - Se `professor_Y` tinha a rotina ativa: rotina é cancelada e arquivada
    - Relacionamento é removido da tabela `alunos_professores`
    - `professor_Y` perde acesso a todos os dados de `aluno_A`

---

# Parte II: Módulos e Funcionalidades

## 4. Gestão de Rotinas de Treino

### 4.1. Regras Fundamentais Atualizadas

- **REGRA 4.1 (Domínio):** O foco exclusivo do aplicativo são treinos de musculação.

- **REGRA 4.2 (Posse dos Dados):** O Aluno continua sendo proprietário de todo o seu histórico de rotinas e avaliações físicas.

- **REGRA 4.3 (Acesso Baseado em Criação):** Apenas o professor que criou uma rotina específica tem acesso aos dados de execução dessa rotina, mesmo que o aluno siga outros professores.

- **REGRA 4.4 (Rotina Ativa Única):** Mantém-se a regra de apenas uma rotina ativa por aluno, mas agora ela pode ser de qualquer professor que o aluno siga.

### 4.2. Novas Regras para Criação de Rotinas

- **REGRA 4.5 (Pré-requisito de Relacionamento):** Um professor só pode criar rotina para alunos que o seguem.
    - **Verificação:** Sistema verifica existência de relacionamento na tabela `alunos_professores`

- **REGRA 4.6 (Verificação de Conflito):** Antes de criar nova rotina, sistema verifica se aluno já possui rotina ativa de outro professor.
    - **Ação em Conflito:** Exibe mensagem informativa: "Este aluno já possui uma rotina ativa criada pelo Professor [Nome]. Para criar uma nova rotina, a atual será automaticamente encerrada."

- **REGRA 4.7 (Substituição Automática):** Ao ativar nova rotina, a rotina ativa anterior (de qualquer professor) é automaticamente cancelada e arquivada.

### 4.3. Ciclo de Vida Mantido

- **REGRA 4.8:** Mantêm-se todas as regras existentes do ciclo de vida (4.5 a 4.7.5 do documento original)
- **REGRA 4.9:** Limite de 4 rotinas arquivadas por aluno mantido (FIFO)

## 5. Gestão de Contas de Usuário

### 5.1. Regras Mantidas

- **REGRA 5.1 (Exclusão por Inatividade):** Mantém-se a regra de 90 dias para alunos inativos.

### 5.2. Novas Considerações

- **REGRA 5.2 (Aplicativo Gratuito):** O aplicativo é gratuito para todos os usuários, sem limites de seguidores.
- **REGRA 5.3 (Limite de Exercícios):** Mantém-se apenas o limite de exercícios personalizados por professor.

## 6. Gestão de Relacionamentos Professor-Aluno

### 6.1. Processo de Convite Atualizado

O sistema de convites foi adaptado para o novo modelo de "seguir".

- **REGRA 6.1.1 (Novo Significado do Convite):** Convite agora significa "começar a seguir" um professor, não mais vínculo exclusivo.

- **REGRA 6.1.2 (Convite sem Exclusividade):** Não há mais bloqueio de convite por aluno já estar vinculado. Um aluno pode receber e aceitar convites de múltiplos professores.

- **REGRA 6.1.3 (Cenário 1 Atualizado - Novo Aluno):**
    - Aluno completa cadastro via convite
    - Automaticamente passa a seguir o professor que o convidou
    - Relacionamento criado na tabela `alunos_professores`

- **REGRA 6.1.4 (Cenário 2 Atualizado - Aluno Existente):**
    - Aluno aceita convite de novo professor
    - Novo relacionamento criado na tabela `alunos_professores`
    - Não afeta relacionamentos existentes com outros professores

- **REGRA 6.1.5 (Cenário 3 Removido):** Não existe mais bloqueio por aluno já vinculado.

### 6.2. Sistema de "Seguir/Parar de Seguir"

- **REGRA 6.2.1 (Seguir Professor):** Aluno pode seguir professor através de:
    - Convite recebido
    - Busca e seleção na plataforma (funcionalidade futura)
    - QR Code do professor

- **REGRA 6.2.2 (Parar de Seguir):** Aluno ou professor podem encerrar o relacionamento de seguimento.

- **REGRA 6.2.3 (Consequências de Parar de Seguir):**
    - Remove relacionamento da tabela `alunos_professores`
    - Se professor tinha rotina ativa do aluno: rotina é cancelada/arquivada
    - Campo `alunos.professor_id` volta a ser NULL se era deste professor
    - Professor perde acesso imediato a todos os dados do aluno

### 6.3. Visibilidade e Acesso

- **REGRA 6.3.1 (Lista de Seguidores):** Professor vê lista de seguidores com indicação clara de quem tem rotina ativa.

- **REGRA 6.3.2 (Dados de Execução):** Professor só acessa dados de execução de alunos que têm SUA rotina ativa.

- **REGRA 6.3.3 (Histórico Limitado):** Quando aluno para de seguir, professor perde acesso ao histórico imediatamente.

## 7. Gestão de Avaliações

### 7.1. Regras Mantidas

- **REGRA 7.1 (Limite de Avaliações):** Mantém-se limite de 4 avaliações físicas por aluno (FIFO).

### 7.2. Novas Regras de Acesso

- **REGRA 7.2 (Acesso Baseado em Rotina Ativa):** Apenas professor com rotina ativa do aluno pode visualizar avaliações físicas.

- **REGRA 7.3 (Perda de Acesso):** Quando aluno para de seguir professor ou troca rotina ativa, professor anterior perde acesso às avaliações.

---

# Parte III: Padrões de Interface de Usuário (UI)

## 8. Modais de Confirmação e Alerta

### 8.1. Padrões Mantidos

- **REGRA 8.1:** Mantém-se o padrão unificado do componente `<Modal>` com comportamento responsivo.

### 8.2. Novos Modais Necessários

- **REGRA 8.2 (Modal de Conflito de Rotina):** Ao tentar criar rotina para aluno com rotina ativa de outro professor:
    - Informa nome do professor atual
    - Solicita confirmação para substituição
    - Explica consequências da ação

- **REGRA 8.3 (Modal de Parar de Seguir):** Confirma ação de parar de seguir com:
    - Explicação das consequências
    - Diferenciação clara entre "parar de seguir" e "excluir conta"

---

## Resumo das Principais Mudanças

### Conceitos Eliminados
- Vínculo exclusivo Professor-Aluno
- Limite de alunos por professor
- Bloqueio de convite por exclusividade

### Conceitos Introduzidos
- Sistema de "seguir" (N:N)
- Rotina ativa independente de seguimento
- Acesso a dados baseado em criação de rotina
- Professor como único gerador de conteúdo

### Estrutura de Dados
- Nova tabela `alunos_professores`
- Campo `alunos.professor_id` com novo significado
- Renomeação de `professores` para `professores`
- Atualização de tipos de usuário

### Impactos na Interface
- Lista de "seguidores" ao invés de "alunos"
- Indicação de status de rotina ativa
- Verificações de conflito na criação de rotinas
- Novos modais informativos