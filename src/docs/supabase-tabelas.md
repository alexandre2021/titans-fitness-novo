# Documentação das Tabelas do Supabase - Modelo de Professores

Este documento descreve a estrutura completa das tabelas do banco de dados no novo modelo, onde alunos podem seguir múltiplos professores, incluindo colunas, tipos de dados, restrições e relacionamentos.

## 1. Tabelas do Schema Public

### Tabela: `public.admins`
**Descrição**: Gerenciamento de administradores do sistema com permissões específicas.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `admins_pkey` |  |
| `id` | 1 | `uuid` | False | `` | `FOREIGN KEY` | `admins_id_fkey` |  |
| `nome_completo` | 2 | `character varying` | True | `` | `` | `` |  |
| `email` | 3 | `character varying` | True | `` | `` | `` |  |
| `permissoes` | 4 | `ARRAY` | True | `ARRAY['exercicios'::text, 'planos'::text, 'usuarios'::text]` | `` | `` |  |
| `created_at` | 5 | `timestamp with time zone` | True | `now()` | `` | `` |  |

**Permissões Padrão**: exercicios, planos, usuarios

---

### Tabela: `public.user_profiles`
**Descrição**: Perfis base para todos os usuários do sistema, definindo o tipo de usuário.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `user_profiles_pkey` |  |
| `user_type` | 2 | `text` | False | `` | `` | `` |  |
| `created_at` | 3 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 4 | `timestamp with time zone` | True | `now()` | `` | `` |  |

**Tipos de Usuário**: aluno, professor, admin

---

### Tabela: `public.professores`
**Descrição**: Dados dos professores, incluindo informações profissionais e planos de assinatura.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `professores_pkey` |  |
| `nome_completo` | 2 | `text` | False | `` | `` | `` |  |
| `email` | 3 | `text` | False | `''::text` | `UNIQUE` | `professores_email_key` | |
| `created_at` | 4 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 5 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `onboarding_completo` | 6 | `boolean` | True | `false` | `` | `` |  |
| `genero` | 7 | `text` | True | `` | `` | `` |  |
| `data_nascimento` | 8 | `date` | True | `` | `` | `` |  |
| `telefone` | 9 | `text` | True | `` | `` | `` |  |
| `telefone_publico` | 10 | `boolean` | True | `false` | `` | `` |  |
| `cref` | 11 | `text` | True | `` | `` | `` |  |
| `anos_experiencia` | 12 | `text` | True | `` | `` | `` |  |
| `especializacoes` | 13 | `ARRAY` | True | `` | `` | `` |  |
| `bio` | 14 | `text` | True | `` | `` | `` |  |
| `instagram` | 15 | `text` | True | `` | `` | `` |  |
| `facebook` | 16 | `text` | True | `` | `` | `` |  |
| `linkedin` | 17 | `text` | True | `` | `` | `` |  |
| `website` | 18 | `text` | True | `` | `` | `` |  |
| `plano` | 19 | `plano_tipo` | False | `'gratuito'::plano_tipo` | `` | `` |  |
| `data_plano` | 20 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `avatar_letter` | 21 | `character varying` | True | `` | `` | `` |  |
| `avatar_color` | 22 | `character varying` | True | `'#3B82F6'::character varying` | `` | `` |  |
| `avatar_image_url` | 23 | `text` | True | `` | `` | `` |  |
| `avatar_type` | 24 | `character varying` | True | `'letter'::character varying` | `` | `` |  |
| `limite_exercicios` | 25 | `integer` | True | `3` | `` | `` |  |
| `last_warning_email_sent_at` | 26 | `timestamp with time zone` | True | `` | `` | `` |  |
| `codigo_vinculo` | 27 | `text` | True | | `UNIQUE` | `professores_codigo_vinculo_key` | |

**Tipos de Plano**: gratuito, basico, premium, profissional  
**MUDANÇA**: Removido `limite_alunos` - aplicativo gratuito sem limite de seguidores
**NOVO**: `codigo_vinculo` é o código de 6 dígitos para que alunos possam seguir o professor.

---

### Tabela: `public.planos`
**Descrição**: Definição dos planos de assinatura disponíveis para professores.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `text` | False | `` | `PRIMARY KEY` | `planos_pkey` |  |
| `nome` | 2 | `text` | False | `` | `` | `` |  |
| `preco` | 3 | `numeric` | False | `` | `` | `` |  |
| `limite_exercicios` | 4 | `integer` | True | `` | `` | `` |  |
| `ativo` | 5 | `boolean` | True | `true` | `` | `` |  |

**MUDANÇA**: Removido `limite_alunos` - não há mais limite de seguidores

---

### Tabela: `public.alunos`
**Descrição**: Dados dos alunos, incluindo informações pessoais e status de onboarding.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `alunos_pkey` | `public.user_profiles(id)` |
| `id` | 1 | `uuid` | False | `` | `FOREIGN KEY` | `fk_alunos_user_profiles` | `public.user_profiles(id)` |
| `nome_completo` | 2 | `text` | False | `` | `` | `` |  |
| `professor_id` | 3 | `uuid` | True | `` | `FOREIGN KEY` | `alunos_professor_id_fkey` | `public.professores(id)` |
| `created_at` | 4 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 5 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `email` | 6 | `text` | False | `''::text` | `` | `` |  |
| `telefone` | 7 | `text` | True | `` | `` | `` |  |
| `data_nascimento` | 8 | `date` | True | `` | `` | `` |  |
| `genero` | 9 | `text` | True | `` | `` | `` |  |
| `endereco` | 10 | `text` | True | `` | `` | `` |  |
| `peso` | 11 | `numeric` | True | `` | `` | `` |  |
| `altura` | 12 | `numeric` | True | `` | `` | `` |  |
| `contato_emergencia_nome` | 13 | `text` | True | `` | `` | `` |  |
| `contato_emergencia_telefone` | 14 | `text` | True | `` | `` | `` |  |
| `par_q_respostas` | 15 | `jsonb` | True | `` | `` | `` |  |
| `onboarding_completo` | 16 | `boolean` | True | `false` | `` | `` |  |
| `status` | 17 | `text` | True | `'pendente'::text` | `` | `` |  |
| `avatar_letter` | 18 | `character varying` | True | `` | `` | `` |  |
| `avatar_color` | 19 | `character varying` | True | `'#60A5FA'::character varying` | `` | `` |  |
| `avatar_image_url` | 20 | `text` | True | `` | `` | `` |  |
| `avatar_type` | 21 | `character varying` | True | `'letter'::character varying` | `` | `` |  |
| `ultimo_objetivo_rotina` | 22 | `character varying` | True | `` | `` | `` |  |
| `descricao_pessoal` | 23 | `text` | True | `` | `` | `` |  |
| `last_warning_email_sent_at` | 24 | `timestamp with time zone` | True | `` | `` | `` |  |
| `codigo_vinculo` | 25 | `text` | True | | `UNIQUE` | `alunos_codigo_vinculo_key` | |

**Status Possíveis**: pendente, ativo, inativo, suspenso  
**NOVO**: `codigo_vinculo` é o código de 6 dígitos para que professores possam adicionar o aluno.
**MUDANÇA CRÍTICA**: `professor_id` agora representa apenas o professor da rotina ativa atual. Pode ser NULL se aluno não tem rotina ativa.

---

### Tabela: `public.alunos_professores` ⭐ NOVA
**Descrição**: Relacionamento N:N entre alunos e professores (sistema de "seguir"). A segurança (RLS) está ativada para garantir que cada usuário só veja seus próprios vínculos.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `aluno_id` | 1 | `uuid` | False | `` | `PRIMARY KEY, FOREIGN KEY` | `alunos_professores_pkey, alunos_professores_aluno_id_fkey` | `public.alunos(id)` |
| `professor_id` | 2 | `uuid` | False | `` | `PRIMARY KEY, FOREIGN KEY` | `alunos_professores_pkey, alunos_professores_professor_id_fkey` | `public.professores(id)` |
| `data_seguindo` | 3 | `timestamp without time zone` | True | `now()` | `` | `` |  |

**CONSTRAINT ÚNICA**: `UNIQUE(aluno_id, professor_id)` - Evita que aluno siga mesmo professor duas vezes  
**DELETE CASCADE**: Quando aluno ou professor é deletado, remove o relacionamento automaticamente.
**Políticas RLS**:
- `SELECT`: Permite que um usuário veja um vínculo se ele for o aluno (`aluno_id`) ou o professor (`professor_id`).
- `DELETE`: Permite que um usuário remova um vínculo se ele for o aluno ou o professor.
- `INSERT`:
  - **Alunos podem seguir professores**: Permite a inserção se `auth.uid() = aluno_id`.
  - **Professores podem adicionar alunos**: Permite a inserção se `auth.uid() = professor_id`.

---

### Tabela: `public.exercicios`
**Descrição**: Catálogo de exercícios disponíveis, incluindo exercícios padrão e personalizados.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `exercicios_pkey` |  |
| `nome` | 2 | `character varying` | False | `` | `` | `` |  |
| `grupo_muscular` | 3 | `character varying` | True | `` | `` | `` |  |
| `equipamento` | 4 | `character varying` | True | `` | `` | `` |  |
| `descricao` | 5 | `text` | True | `` | `` | `` |  |
| `instrucoes` | 6 | `text` | True | `` | `` | `` |  |
| `created_at` | 7 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `tipo` | 8 | `character varying` | True | `'padrao'::character varying` | `CHECK` | `exercicios_tipo_check` |  |
| `professor_id` | 9 | `uuid` | True | `` | `FOREIGN KEY` | `exercicios_professor_id_fkey` | `public.professores(id)` |
| `exercicio_padrao_id` | 10 | `uuid` | True | `` | `FOREIGN KEY` | `exercicios_exercicio_base_id_fkey` | `public.exercicios(id)` |
| `video_url` | 11 | `text` | True | `` | `` | `` |  |
| `imagem_1_url` | 12 | `text` | True | `` | `` | `` |  |
| `imagem_2_url` | 13 | `text` | True | `` | `` | `` |  |
| `youtube_url` | 14 | `text` | True | `` | `` | `` |  |
| `is_ativo` | 15 | `boolean` | True | `true` | `` | `` |  |
| `dificuldade` | 16 | `character varying` | True | `'Iniciante'::character varying` | `` | `` |  |
| `slug` | 17 | `character varying` | True | `` | `UNIQUE` | `exercicios_slug_key` |  |
| `grupo_muscular_primario` | 18 | `character varying` | True | `` | `` | `` |  |
| `grupos_musculares_secundarios` | 19 | `character varying` | True | `` | `` | `` |  |

**Tipos de Exercício**: padrao, personalizado  
**Níveis de Dificuldade**: Iniciante, Intermediário, Avançado  
**MUDANÇA**: `pt_id` renomeado para `professor_id`

---

### Tabela: `public.rotinas`
**Descrição**: Rotinas de treino criadas pelos professores para seus seguidores.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `rotinas_pkey` |  |
| `nome` | 2 | `character varying` | False | `` | `` | `` |  |
| `descricao` | 3 | `text` | True | `` | `` | `` |  |
| `aluno_id` | 4 | `uuid` | False | `` | `FOREIGN KEY` | `fk_rotinas_aluno` | `public.alunos(id)` |
| `professor_id` | 5 | `uuid` | True | `` | `FOREIGN KEY (ON DELETE SET NULL)` | `rotinas_professor_id_fkey` | `public.professores(id)` |
| `treinos_por_semana` | 6 | `integer` | False | `` | `` | `` |  |
| `dificuldade` | 7 | `character varying` | False | `` | `` | `` |  |
| `duracao_semanas` | 8 | `integer` | False | `` | `` | `` |  |
| `data_inicio` | 9 | `date` | False | `` | `` | `` |  |
| `valor_total` | 10 | `numeric` | False | `` | `` | `` |  |
| `forma_pagamento` | 11 | `character varying` | False | `` | `` | `` |  |
| `status` | 12 | `character varying` | True | `'ativa'::character varying` | `` | `` |  |
| `observacoes_pagamento` | 13 | `text` | True | `` | `` | `` |  |
| `created_at` | 14 | `timestamp without time zone` | True | `now()` | `` | `` |  |
| `permite_execucao_aluno` | 15 | `boolean` | True | `false` | `` | `` |  |
| `objetivo` | 16 | `character varying` | True | `` | `` | `` |  |
| `pdf_email_enviado` | 17 | `boolean` | True | `false` | `` | `` |  |
| `observacoes_rotina` | 18 | `text` | True | `` | `` | `` |  |

**Status Possíveis**: Rascunho, Ativa, Bloqueada, Concluída, Cancelada  
**Objetivos Comuns**: Emagrecimento, Ganho de massa, Condicionamento, Reabilitação  
**MUDANÇA**: Professor pode criar rotina para qualquer aluno que o segue

---

### Tabela: `public.treinos`
**Descrição**: Treinos individuais que compõem uma rotina, organizados por grupos musculares.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `treinos_pkey` |  |
| `rotina_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `treinos_rotina_id_fkey` | `public.rotinas(id)` |
| `nome` | 3 | `character varying` | False | `` | `` | `` |  |
| `grupos_musculares` | 4 | `text` | False | `` | `` | `` |  |
| `ordem` | 5 | `integer` | False | `` | `` | `` |  |
| `tempo_estimado_minutos` | 6 | `integer` | True | `60` | `` | `` |  |
| `observacoes` | 7 | `text` | True | `` | `` | `` |  |
| `created_at` | 8 | `timestamp without time zone` | True | `now()` | `` | `` |  |

---

### Tabela: `public.exercicios_rotina`
**Descrição**: Exercícios específicos dentro de cada treino, incluindo suporte para supersets (exercicio_2_id).

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `exercicios_rotina_pkey` |  |
| `treino_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `exercicios_rotina_treino_id_fkey` | `public.treinos(id)` |
| `exercicio_1_id` | 3 | `uuid` | False | `` | `FOREIGN KEY` | `fk_exercicio_1` | `public.exercicios(id)` |
| `exercicio_2_id` | 4 | `uuid` | True | `` | `FOREIGN KEY` | `fk_exercicio_2` | `public.exercicios(id)` |
| `intervalo_apos_exercicio` | 5 | `integer` | True | `120` | `` | `` |  |
| `observacoes` | 6 | `text` | True | `` | `` | `` |  |
| `ordem` | 7 | `integer` | False | `` | `` | `` |  |
| `created_at` | 8 | `timestamp without time zone` | True | `now()` | `` | `` |  |

**Nota**: O campo `exercicio_2_id` permite criar supersets, onde dois exercícios são executados em sequência.

---

### Tabela: `public.series`
**Descrição**: Séries planejadas para cada exercício dentro de uma rotina.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `series_pkey` |  |
| `exercicio_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `series_exercicio_id_fkey` | `public.exercicios_rotina(id)` |
| `numero_serie` | 3 | `integer` | False | `` | `` | `` |  |
| `repeticoes` | 4 | `integer` | False | `` | `` | `` |  |
| `carga` | 5 | `numeric` | True | `0` | `` | `` |  |
| `tem_dropset` | 6 | `boolean` | True | `false` | `` | `` |  |
| `carga_dropset` | 7 | `numeric` | True | `` | `` | `` |  |
| `observacoes` | 8 | `text` | True | `` | `` | `` |  |
| `created_at` | 9 | `timestamp without time zone` | True | `now()` | `` | `` |  |
| `intervalo_apos_serie` | 10 | `integer` | True | `` | `` | `` |  |
| `repeticoes_1` | 11 | `integer` | True | `` | `` | `` |  |
| `carga_1` | 12 | `numeric` | True | `` | `` | `` |  |
| `repeticoes_2` | 13 | `integer` | True | `` | `` | `` |  |
| `carga_2` | 14 | `numeric` | True | `` | `` | `` |  |

---

### Tabela: `public.execucoes_sessao`
**Descrição**: Registro das sessões de treino executadas pelos alunos.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `execucoes_sessao_pkey` |  |
| `rotina_id` | 2 | `uuid` | True | `` | `FOREIGN KEY` | `execucoes_sessao_rotina_id_fkey` | `public.rotinas(id)` |
| `treino_id` | 3 | `uuid` | True | `` | `FOREIGN KEY` | `execucoes_sessao_treino_id_fkey` | `public.treinos(id)` |
| `aluno_id` | 4 | `uuid` | False | `` | `` | `` |  |
| `sessao_numero` | 5 | `integer` | False | `` | `` | `` |  |
| `data_execucao` | 6 | `date` | True | `` | `` | `` |  |
| `status` | 7 | `character varying` | True | `'nao_iniciada'::character varying` | `` | `` |  |
| `tempo_total_minutos` | 8 | `integer` | True | `` | `` | `` |  |
| `observacoes` | 9 | `text` | True | `` | `` | `` |  |
| `created_at` | 10 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `modo_execucao` | 11 | `character varying` | True | `'pt'::character varying` | `CHECK` | `execucoes_sessao_modo_execucao_check` |  |
| `tempo_decorrido` | 12 | `integer` | True | `0` | `` | `` |  |

**Status Possíveis**: em_aberto, em_andamento, pausada, concluida, cancelada  
**Modos de Execução**: professor, aluno

---

### Tabela: `public.execucoes_series`
**Descrição**: Registro detalhado da execução de cada série durante uma sessão de treino.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `execucoes_series_pkey` |  |
| `execucao_sessao_id` | 2 | `uuid` | True | `` | `FOREIGN KEY` | `execucoes_series_execucao_sessao_id_fkey` | `public.execucoes_sessao(id)` |
| `exercicio_rotina_id` | 3 | `uuid` | True | `` | `FOREIGN KEY` | `execucoes_series_exercicio_rotina_id_fkey` | `public.exercicios_rotina(id)` |
| `serie_numero` | 4 | `integer` | False | `` | `UNIQUE` | `execucoes_series_unique` |  |
| `repeticoes_executadas_1` | 5 | `integer` | True | `` | `` | `` |  |
| `carga_executada_1` | 6 | `numeric` | True | `` | `` | `` |  |
| `repeticoes_executadas_2` | 7 | `integer` | True | `` | `` | `` |  |
| `carga_executada_2` | 8 | `numeric` | True | `` | `` | `` |  |
| `carga_dropset` | 9 | `numeric` | True | `` | `` | `` |  |
| `observacoes` | 10 | `text` | True | `` | `` | `` |  |
| `created_at` | 11 | `timestamp with time zone` | True | `now()` | `` | `` |  |

**Constraint Única**: `execucoes_series_unique` (execucao_sessao_id, exercicio_rotina_id, serie_numero)

---

### Tabela: `public.posts` ⭐ NOVA
**Descrição**: Armazena os posts do blog e conteúdo da comunidade criados por professores. A segurança (RLS) está ativada.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `posts_pkey` | |
| `author_id` | 2 | `uuid` | True | | `FOREIGN KEY (ON DELETE SET NULL)` | `posts_author_id_fkey` | `public.professores(id)` |
| `title` | 3 | `text` | False | | | | |
| `category` | 4 | `text` | True | | | | |
| `slug` | 5 | `text` | False | | `UNIQUE` | `posts_slug_key` | |
| `excerpt` | 6 | `text` | True | | | | |
| `content` | 7 | `jsonb` | True | | | | |
| `cover_image_desktop_url` | 8 | `text` | True | | | | |
| `cover_image_mobile_url` | 9 | `text` | True | | | | |
| `status` | 10 | `text` | False | `'draft'::text` | `CHECK` | `posts_status_check` | |
| `created_at` | 11 | `timestamp with time zone` | False | `now()` | | | |
| `updated_at` | 12 | `timestamp with time zone` | False | `now()` | | | |

**Status Possíveis**: published, draft, archived
**Políticas de Segurança (RLS)**:
- Público pode ler posts publicados.
- Autores podem gerenciar (criar, ler, atualizar, deletar) seus próprios posts.
- Administradores (`contato@titans.fitness`) têm acesso total.

### Tabela: `public.avaliacoes_fisicas`
**Descrição**: Avaliações físicas dos alunos com medidas antropométricas e fotos de progresso.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `avaliacoes_fisicas_pkey` |  |
| `aluno_id` | 2 | `uuid` | True | `` | `FOREIGN KEY` | `avaliacoes_fisicas_aluno_id_fkey` | `public.alunos(id)` |
| `data_avaliacao` | 3 | `date` | False | `` | `` | `` |  |
| `peso` | 4 | `numeric` | False | `` | `` | `` |  |
| `altura` | 5 | `numeric` | False | `` | `` | `` |  |
| `imc` | 6 | `numeric(6,2)` | False | `` | `` | `` |  |
| `peito_busto` | 7 | `numeric` | True | `` | `` | `` |  |
| `cintura` | 8 | `numeric` | True | `` | `` | `` |  |
| `quadril` | 9 | `numeric` | True | `` | `` | `` |  |
| `coxa_direita` | 10 | `numeric` | True | `` | `` | `` |  |
| `coxa_esquerda` | 11 | `numeric` | True | `` | `` | `` |  |
| `braco_direito` | 12 | `numeric` | True | `` | `` | `` |  |
| `braco_esquerdo` | 13 | `numeric` | True | `` | `` | `` |  |
| `antebraco_direito` | 14 | `numeric` | True | `` | `` | `` |  |
| `antebraco_esquerdo` | 15 | `numeric` | True | `` | `` | `` |  |
| `panturrilha_direita` | 16 | `numeric` | True | `` | `` | `` |  |
| `panturrilha_esquerda` | 17 | `numeric` | True | `` | `` | `` |  |
| `observacoes` | 18 | `text` | True | `` | `` | `` |  |
| `foto_frente_url` | 19 | `text` | True | `` | `` | `` |  |
| `foto_lado_url` | 20 | `text` | True | `` | `` | `` |  |
| `foto_costas_url` | 21 | `text` | True | `` | `` | `` |  |
| `created_at` | 22 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 23 | `timestamp with time zone` | True | `now()` | `` | `` |  |

### Tabela: `public.rotinas_arquivadas`
**Descrição**: (OBSOLETA) Esta tabela foi removida. O histórico de rotinas agora é gerenciado pela coluna `status` na tabela `rotinas`.

### Tabela: `public.modelos_rotina`
**Descrição**: Armazena os modelos de rotina (templates) criados pelos Professores ou pelo Sistema (padrão).

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `modelos_rotina_pkey` | |
| `professor_id` | 2 | `uuid` | **True** | | `FOREIGN KEY (ON DELETE CASCADE)` | `modelos_rotina_professor_id_fkey` | `public.professores(id)` |
| `nome` | 3 | `character varying` | False | | | | |
| `descricao` | 4 | `text` | True | | | | |
| `objetivo` | 5 | `character varying` | True | | | | |
| `dificuldade` | 6 | `character varying` | False | | | | |
| `treinos_por_semana` | 7 | `integer` | False | | | | |
| `duracao_semanas` | 8 | `integer` | False | | | | |
| `observacoes_rotina` | 9 | `text` | True | | | | |
| `created_at` | 10 | `timestamp with time zone` | False | `now()` | | | |
| `updated_at` | 11 | `timestamp with time zone` | False | `now()` | | | |
| `tipo` | 12 | `character varying` | True | `'personalizado'` | `CHECK` | `modelos_rotina_tipo_check` | |
| `modelo_padrao_id` | 13 | `uuid` | True | | `FOREIGN KEY (ON DELETE SET NULL)` | `modelos_rotina_modelo_padrao_id_fkey` | `public.modelos_rotina(id)` |

**Tipos de Modelo**: padrao, personalizado
**MUDANÇA IMPORTANTE**:
- `professor_id` agora é **nullable** - NULL para modelos padrão criados pelo sistema
- `tipo` diferencia modelos padrão (visíveis para todos) de personalizados (só do professor)
- `modelo_padrao_id` referencia o modelo original quando um professor copia um modelo padrão

**Constraints**:
- `modelos_rotina_tipo_check`: Garante que `tipo` seja 'padrao' ou 'personalizado'
- `check_tipo_professor`:
  - Se `tipo = 'padrao'`, então `professor_id` deve ser NULL
  - Se `tipo = 'personalizado'`, então `professor_id` deve ser NOT NULL

**Políticas de Segurança (RLS)**:
- `select_modelos_policy`: Professores veem modelos padrão + seus personalizados. Admin vê tudo.
  ```sql
  USING (tipo = 'padrao' OR professor_id = auth.uid() OR auth.uid() IN (SELECT id FROM admins))
  ```
- `insert_modelos_policy`: Professores criam apenas personalizados. Admin cria qualquer tipo.
  ```sql
  WITH CHECK ((tipo = 'personalizado' AND professor_id = auth.uid()) OR auth.uid() IN (SELECT id FROM admins))
  ```
- `update_modelos_policy`: Apenas dono ou admin podem editar.
  ```sql
  USING (professor_id = auth.uid() OR auth.uid() IN (SELECT id FROM admins))
  WITH CHECK (professor_id = auth.uid() OR auth.uid() IN (SELECT id FROM admins))
  ```
- `delete_modelos_policy`: Apenas dono ou admin podem deletar.
  ```sql
  USING (professor_id = auth.uid() OR auth.uid() IN (SELECT id FROM admins))
  ```

---

### Tabela: `public.modelos_treino`
**Descrição**: Armazena os treinos (A, B, C...) que compõem um modelo de rotina.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `modelos_treino_pkey` | |
| `modelo_rotina_id` | 2 | `uuid` | False | | `FOREIGN KEY (ON DELETE CASCADE)` | `modelos_treino_modelo_rotina_id_fkey` | `public.modelos_rotina(id)` |
| `nome` | 3 | `character varying` | False | | | | |
| `grupos_musculares` | 4 | `text[]` | False | `'{}'::text[]` | | | |
| `ordem` | 5 | `integer` | False | | | | |
| `observacoes` | 6 | `text` | True | | | | |
| `created_at` | 7 | `timestamp with time zone` | False | `now()` | | | |

---

### Tabela: `public.modelos_exercicio`
**Descrição**: Armazena os exercícios (simples ou combinados) de um treino de modelo.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `modelos_exercicio_pkey` | |
| `modelo_treino_id` | 2 | `uuid` | False | | `FOREIGN KEY (ON DELETE CASCADE)` | `modelos_exercicio_modelo_treino_id_fkey` | `public.modelos_treino(id)` |
| `exercicio_1_id` | 3 | `uuid` | False | | `FOREIGN KEY (ON DELETE SET NULL)` | `modelos_exercicio_exercicio_1_id_fkey` | `public.exercicios(id)` |
| `exercicio_2_id` | 4 | `uuid` | True | | `FOREIGN KEY (ON DELETE SET NULL)` | `modelos_exercicio_exercicio_2_id_fkey` | `public.exercicios(id)` |
| `ordem` | 5 | `integer` | False | | | | |
| `intervalo_apos_exercicio` | 6 | `integer` | True | `120` | | | |
| `observacoes` | 7 | `text` | True | | | | |
| `created_at` | 8 | `timestamp with time zone` | False | `now()` | | | |

---

### Tabela: `public.modelos_serie`
**Descrição**: Armazena as séries (reps, carga, etc.) de um exercício de modelo.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `modelos_serie_pkey` | |
| `modelo_exercicio_id` | 2 | `uuid` | False | | `FOREIGN KEY (ON DELETE CASCADE)` | `modelos_serie_modelo_exercicio_id_fkey` | `public.modelos_exercicio(id)` |
| `numero_serie` | 3 | `integer` | False | | | | |
| `repeticoes` | 4 | `integer` | True | | | | |
| `carga` | 5 | `numeric` | True | | | | |
| `repeticoes_1` | 6 | `integer` | True | | | | |
| `carga_1` | 7 | `numeric` | True | | | | |
| `repeticoes_2` | 8 | `integer` | True | | | | |
| `carga_2` | 9 | `numeric` | True | | | | |
| `tem_dropset` | 10 | `boolean` | True | `false` | | | |
| `carga_dropset` | 11 | `numeric` | True | | | | |
| `intervalo_apos_serie` | 12 | `integer` | True | | | | |
| `observacoes` | 13 | `text` | True | | | | |
| `created_at` | 14 | `timestamp with time zone` | False | `now()` | | | |

---

### Tabela: `public.agendamentos` ⭐ NOVA
**Descrição**: Armazena os agendamentos de sessões de treino e avaliações físicas entre professores e alunos.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `agendamentos_pkey` | |
| `professor_id` | 2 | `uuid` | False | | `FOREIGN KEY (ON DELETE CASCADE)` | `agendamentos_professor_id_fkey` | `public.professores(id)` |
| `aluno_id` | 3 | `uuid` | False | | `FOREIGN KEY (ON DELETE CASCADE)` | `agendamentos_aluno_id_fkey` | `public.alunos(id)` |
| `tipo` | 4 | `tipo_agendamento` | False | | | | |
| `status` | 5 | `status_agendamento` | False | `'pendente'` | | | |
| `data_hora_inicio` | 6 | `timestamp with time zone` | False | | | | |
| `data_hora_fim` | 7 | `timestamp with time zone` | False | | | | |
| `notas_professor` | 8 | `text` | True | | | | |
| `notas_aluno` | 9 | `text` | True | | | | |
| `created_at` | 10 | `timestamp with time zone` | False | `now()` | | | |
| `updated_at` | 11 | `timestamp with time zone` | False | `now()` | | | |

**Tipos de Agendamento**: sessao_treino, avaliacao_fisica
**Status do Agendamento**: pendente, confirmado, recusado, cancelado, concluido
**Segurança (RLS)**: Ativada. Políticas granulares para cada operação (CRUD) para garantir que apenas os usuários autorizados possam realizar ações específicas.

**Políticas de Segurança (RLS) Detalhadas**:
- **SELECT**: Professor e Aluno podem ver os agendamentos em que estão envolvidos.
  ```sql
  CREATE POLICY "Usuários podem ver seus próprios agendamentos"
  ON public.agendamentos FOR SELECT
  USING (auth.uid() = professor_id OR auth.uid() = aluno_id);
  ```
- **INSERT**: Apenas o professor pode criar um novo agendamento.
  ```sql
  CREATE POLICY "Professores podem criar agendamentos"
  ON public.agendamentos FOR INSERT
  WITH CHECK (auth.uid() = professor_id);
  ```
- **UPDATE**: Professor pode alterar qualquer campo. Aluno só pode alterar o status para 'confirmado' ou 'recusado', e adicionar notas.
  ```sql
  CREATE POLICY "Usuários podem atualizar seus agendamentos"
  ON public.agendamentos FOR UPDATE
  USING (auth.uid() = professor_id OR auth.uid() = aluno_id)
  WITH CHECK (
    (auth.uid() = professor_id) OR -- Professor pode tudo
    (auth.uid() = aluno_id AND status IN ('confirmado', 'recusado')) -- Aluno tem permissão limitada
  );
  ```
- **DELETE**: Apenas o professor pode deletar um agendamento.
  ```sql
  CREATE POLICY "Professores podem deletar agendamentos"
  ON public.agendamentos FOR DELETE
  USING (auth.uid() = professor_id);
  ```

---

## 2. Tabelas do Sistema de Mensagens ⭐ ATUALIZADO

### Tabela: `public.conversas`
**Descrição**: Representa uma conversa entre dois ou mais usuários (1:1 ou grupo).

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `conversas_pkey` | |
| `nome` | 2 | `text` | True | | | | |
| `created_at` | 3 | `timestamp with time zone` | False | `now()` | | | |
| `updated_at` | 4 | `timestamp with time zone` | False | `now()` | | | |
| `last_message_id` | 5 | `uuid` | True | | `FOREIGN KEY` | `conversas_last_message_id_fkey` | `public.mensagens(id)` |
| `is_grupo` | 6 | `boolean` | False | `false` | | | |
| `nome_grupo` | 7 | `text` | True | | | | |
| `avatar_grupo` | 8 | `text` | True | | | | |
| `creator_id` | 9 | `uuid` | True | | `FOREIGN KEY (ON DELETE SET NULL)` | `fk_conversas_creator` | `auth.users(id)` |

**Notas**: 
- `last_message_id` é usado para buscar rapidamente a última mensagem
- Para conversas 1:1, `is_grupo = false` e campos de grupo ficam NULL
- Para grupos, `is_grupo = true`, `nome_grupo` e `avatar_grupo` são preenchidos
- `creator_id` identifica o "dono" do grupo, que tem permissões de edição/exclusão
- A coluna `nome` não está sendo usada atualmente, mas existe no schema

**Segurança (RLS)**: Ativada. Usuário só vê conversas das quais participa (verificado via `participantes_conversa`)

---

### Tabela: `public.participantes_conversa`
**Descrição**: Tabela de junção N:N que associa usuários a conversas. Permite múltiplos participantes em grupos.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `conversa_id` | 1 | `uuid` | False | | `PRIMARY KEY, FOREIGN KEY (ON DELETE CASCADE)` | `participantes_conversa_pkey, fk_conversa` | `public.conversas(id)` |
| `user_id` | 2 | `uuid` | False | | `PRIMARY KEY, FOREIGN KEY (ON DELETE CASCADE)` | `participantes_conversa_pkey, fk_user` | `auth.users(id)` |
| `joined_at` | 3 | `timestamp with time zone` | False | `now()` | | | |

**Constraint Única**: `PRIMARY KEY(conversa_id, user_id)` - Garante que um usuário não entre duas vezes na mesma conversa  
**DELETE CASCADE**: Quando conversa ou usuário é deletado, remove participação automaticamente

**Segurança (RLS)**: Base do sistema - usuário só vê registros onde `user_id = auth.uid()`

**Políticas RLS**:
- `participantes_select`: SELECT onde `user_id = auth.uid()`
- `participantes_insert`: INSERT onde `user_id = auth.uid()`
- `participantes_delete`: DELETE onde `user_id = auth.uid()`

---

### Tabela: `public.mensagens`
**Descrição**: Armazena cada mensagem individual de uma conversa, com suporte para marcação de leitura.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `mensagens_pkey` | |
| `conversa_id` | 2 | `uuid` | False | | `FOREIGN KEY (ON DELETE CASCADE)` | `mensagens_conversa_id_fkey` | `public.conversas(id)` |
| `remetente_id` | 3 | `uuid` | False | | `FOREIGN KEY` | `mensagens_remetente_id_fkey` | `auth.users(id)` |
| `conteudo` | 4 | `text` | False | | `CHECK` | `conteudo_not_empty` | |
| `created_at` | 5 | `timestamp with time zone` | False | `now()` | | | |
| `lida_em` | 6 | `timestamp with time zone` | True | | | | |

**Validações**:
- `conteudo` não pode ser vazio (CHECK constraint)
- `lida_em` NULL = mensagem não lida
- `lida_em` NOT NULL = mensagem já visualizada

**Contador de Não Lidas**: A função RPC `get_minhas_conversas()` conta mensagens onde:
- `remetente_id <> auth.uid()` (não é do usuário logado)
- `lida_em IS NULL` (ainda não foi lida)

**Segurança (RLS)**: 
- Usuário pode ler mensagens de conversas das quais participa
- Usuário só pode criar mensagens como ele mesmo (`remetente_id = auth.uid()`)
- Usuário pode atualizar mensagens de suas conversas (para marcar como lida)

**Políticas RLS**:
- `mensagens_select`: SELECT de mensagens de conversas onde o usuário participa
- `mensagens_insert`: INSERT onde `remetente_id = auth.uid()`
- `mensagens_update`: UPDATE de mensagens de conversas onde o usuário participa

**Realtime**: Habilitado para esta tabela - permite recebimento instantâneo de novas mensagens

---

## 3. Funções RPC e Edge Functions do Sistema de Mensagens

### RPC: `get_minhas_conversas()`
**Descrição**: Busca todas as conversas do usuário logado com informações completas.

**Retorno**:
```typescript
{
  conversa_id: uuid,
  is_grupo: boolean,
  outro_participante_id: uuid | null,  // NULL para grupos
  nome: text,                          // Nome do contato ou grupo
  avatar: text | null,
  avatar_type: text | null,
  avatar_letter: text | null,
  avatar_color: text | null,
  ultima_mensagem_conteudo: text | null,
  ultima_mensagem_criada_em: timestamp with time zone | null,
  remetente_ultima_mensagem_id: uuid | null,
  mensagens_nao_lidas: bigint
}
```

**Lógica**:
1. Busca todas as `conversa_id` do usuário via `participantes_conversa`
2. Para conversas 1:1 (`is_grupo = false`):
   - Identifica o outro participante
   - Busca dados (nome, avatar) de `alunos` ou `professores`
   - Usa `CAST(... AS text)` para converter `character varying` → `text`
3. Para grupos (`is_grupo = true`):
   - Usa `nome_grupo` e `avatar_grupo` da própria tabela `conversas`
4. Busca última mensagem via `last_message_id`
5. Conta mensagens não lidas: `COUNT(*)` onde `remetente_id <> auth.uid()` e `lida_em IS NULL`
6. Ordena por `ultima_mensagem_criada_em DESC NULLS LAST`

**Importante**: Usa `CAST(COALESCE(...) AS text)` para campos avatar que são `character varying` nas tabelas base

---

### Edge Function: `create_conversation_with_aluno`
**Descrição**: Cria uma nova conversa 1:1 ou retorna conversa existente.

**Parâmetros**:
```json
{
  "p_aluno_id": "uuid-do-aluno"
}
```

**Lógica**:
1. Verifica se já existe conversa entre os dois usuários
2. Se existir: retorna `conversa_id` existente
3. Se não existir:
   - INSERT em `conversas` com `is_grupo = false`
   - INSERT dos dois usuários em `participantes_conversa`
   - Retorna novo `conversa_id`

**Retorno**:
```json
{
  "conversa_id": "uuid-da-conversa"
}
```

**Segurança**: Usa `SECURITY DEFINER` com service role para permitir criação

---

### Edge Function: `create_group_conversation`
**Descrição**: Cria uma nova conversa em grupo.

**Parâmetros**:
```json
{
  "nome_grupo": "Nome do Grupo",
  "participantes_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Lógica**:
1. INSERT em `conversas` com:
   - `is_grupo = true`
   - `nome_grupo` = nome fornecido
   - `avatar_grupo` = NULL (pode ser implementado futuramente)
2. INSERT de todos os participantes em `participantes_conversa`
3. Retorna `conversa_id` do grupo criado

**Retorno**:
```json
{
  "conversa_id": "uuid-do-grupo"
}
```

**Segurança**: Usa `SECURITY DEFINER` com service role

---

## 4. Regras de Negócio Atualizadas

### Sistema de "Seguir"
- **Aluno pode seguir N professores**: Relacionamento N:N na tabela `alunos_professores`
- **Professor é único gerador de conteúdo**: Cria rotinas, exercícios e modelos
- **Convite significa "começar a seguir"**: Não mais vínculo exclusivo
- **Mensagens entre seguidores**: Professor pode enviar mensagens apenas para alunos que o seguem

### Rotina Ativa
- **Apenas 1 rotina ativa por aluno**: Campo `alunos.professor_id`
- **Pode ser de qualquer professor seguido**: Não precisa ser do primeiro professor
- **Nova rotina substitui anterior**: Automaticamente bloqueia/arquiva anterior

### Sistema de Mensagens
- **Conversas 1:1**: Criadas automaticamente ao clicar em um contato
- **Grupos**: Criados explicitamente pelo professor com múltiplos participantes
- **Mensagens não lidas**: Contadas automaticamente na lista de conversas
- **Realtime**: Mensagens aparecem instantaneamente sem refresh
- **Segurança**: RLS garante que usuários só vejam suas próprias conversas

---

## 5. Queries Essenciais

### Seguidores de um Professor
```sql
SELECT a.*, ap.data_seguindo,
       CASE WHEN a.professor_id = $professor_id 
            THEN 'ATIVA' ELSE 'SEGUINDO' END as status_relacao
FROM alunos a
JOIN alunos_professores ap ON a.id = ap.aluno_id  
WHERE ap.professor_id = $professor_id
ORDER BY status_relacao DESC, ap.data_seguindo DESC
```

### Verificar se Pode Criar Rotina
```sql
-- Verifica se aluno segue o professor
SELECT 1 FROM alunos_professores 
WHERE aluno_id = $aluno_id AND professor_id = $professor_id

-- Verifica se aluno já tem rotina ativa
SELECT p.nome_completo as professor_conflito
FROM alunos a
JOIN professores p ON a.professor_id = p.id  
WHERE a.id = $aluno_id AND a.professor_id IS NOT NULL
```

### Buscar Conversas com Contador de Não Lidas
```sql
-- Já implementado na RPC get_minhas_conversas()
SELECT * FROM get_minhas_conversas();
```

### Marcar Mensagens como Lidas
```sql
UPDATE mensagens
SET lida_em = NOW()
WHERE conversa_id = $conversa_id
  AND remetente_id <> auth.uid()
  AND lida_em IS NULL;
```

---

**Última atualização**: 2025-10-01

---

## 6. Script de Dados Fictícios (Seed)

O script SQL abaixo pode ser usado para popular o banco de dados com dados de exemplo para testes e desenvolvimento.

**Atenção**: Este script insere usuários diretamente na tabela `auth.users`. Isso é útil para ambientes de desenvolvimento, mas não dispara e-mails de confirmação. Todos os usuários serão criados com a senha `senha123`.

```sql
-- Habilita a extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Inicia um bloco de transação para garantir a consistência
BEGIN;

-- Limpa as tabelas na ordem correta para evitar conflitos de chave estrangeira
TRUNCATE TABLE 
    public.execucoes_series, public.execucoes_sessao, public.series, public.exercicios_rotina, public.treinos, public.rotinas, 
    public.modelos_serie, public.modelos_exercicio, public.modelos_treino, public.modelos_rotina,
    public.avaliacoes_fisicas, public.agendamentos, public.mensagens, public.participantes_conversa, public.conversas,
    public.alunos_professores, public.posts, public.exercicios, public.alunos, public.professores, public.user_profiles, public.admins
RESTART IDENTITY CASCADE;

-- Declaração de variáveis para armazenar UUIDs
DO $$
DECLARE
    -- UUIDs dos Usuários
    admin_user_id uuid := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    prof_carlos_id uuid := 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
    aluno_ana_id uuid := 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
    aluno_joao_id uuid := 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
    aluno_maria_id uuid := 'e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a15';
    aluno_pedro_id uuid := 'f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a16';
    aluno_lucas_id uuid := 'a7eebc99-9c0b-4ef8-bb6d-6bb9bd380a17';

    -- IDs de Rotina, Treinos, Exercícios, etc.
    rotina_joao_id uuid;
    treino_a_id uuid;
    treino_b_id uuid;
    treino_c_id uuid;
    ex_rotina_1_id uuid;
    ex_rotina_2_id uuid;
    ex_rotina_3_id uuid;
    ex_padrao_1_id uuid;
    ex_padrao_2_id uuid;
    ex_personalizado_1_id uuid;
    conversa_1_id uuid;
    conversa_2_id uuid;
    modelo_rotina_id uuid;
    modelo_treino_id uuid;
    modelo_exercicio_id uuid;

BEGIN
    -- 0. Deletar usuários existentes para permitir a recriação com IDs fixos.
    -- Isso é necessário porque não podemos usar TRUNCATE na tabela auth.users.
    DELETE FROM auth.users WHERE email IN (
        'contato@titans.fitness',
        'carlos.magno@email.com',
        'ana.livia@email.com',
        'joao.silva@email.com',
        'maria.oliveira@email.com',
        'pedro.santos@email.com',
        'lucas.pereira@email.com'
    );

    -- 1. Inserir usuários no `auth.users` (com senha 'senha123' para todos)
    INSERT INTO auth.users (id, email, encrypted_password, role, email_confirmed_at) VALUES
    (admin_user_id, 'contato@titans.fitness', crypt('senha123', gen_salt('bf')), 'authenticated', now()),
    (prof_carlos_id, 'carlos.magno@email.com', crypt('senha123', gen_salt('bf')), 'authenticated', now()),
    (aluno_ana_id, 'ana.livia@email.com', crypt('senha123', gen_salt('bf')), 'authenticated', now()),
    (aluno_joao_id, 'joao.silva@email.com', crypt('senha123', gen_salt('bf')), 'authenticated', now()),
    (aluno_maria_id, 'maria.oliveira@email.com', crypt('senha123', gen_salt('bf')), 'authenticated', now()),
    (aluno_pedro_id, 'pedro.santos@email.com', crypt('senha123', gen_salt('bf')), 'authenticated', now()),
    (aluno_lucas_id, 'lucas.pereira@email.com', crypt('senha123', gen_salt('bf')), 'authenticated', now());

    -- 2. Inserir perfis em `user_profiles`
    INSERT INTO public.user_profiles (id, user_type) VALUES
    (admin_user_id, 'admin'),
    (prof_carlos_id, 'professor'),
    (aluno_ana_id, 'aluno'),
    (aluno_joao_id, 'aluno'),
    (aluno_maria_id, 'aluno'),
    (aluno_pedro_id, 'aluno'),
    (aluno_lucas_id, 'aluno');

    -- 3. Inserir dados dos professores
    INSERT INTO public.professores (id, nome_completo, email, onboarding_completo, cref, bio, codigo_vinculo) VALUES
    (prof_carlos_id, 'Carlos Magno', 'carlos.magno@email.com', true, '123456-G/SP', 'Especialista em hipertrofia e treinamento de força.', 'CARLOS');

    -- 4. Inserir dados dos alunos
    INSERT INTO public.alunos (id, nome_completo, email, onboarding_completo, status, codigo_vinculo) VALUES
    (aluno_joao_id, 'João da Silva', 'joao.silva@email.com', true, 'ativo', 'JOAO'),
    (aluno_maria_id, 'Maria Oliveira', 'maria.oliveira@email.com', true, 'ativo', 'MARIA'),
    (aluno_pedro_id, 'Pedro Santos', 'pedro.santos@email.com', false, 'pendente', 'PEDRO'),
    (aluno_ana_id, 'Ana Livia', 'ana.livia@email.com', true, 'ativo', 'ANA'),
    (aluno_lucas_id, 'Lucas Pereira', 'lucas.pereira@email.com', true, 'ativo', 'LUCAS');

    -- 5. Criar relacionamentos de "seguir"
    INSERT INTO public.alunos_professores (aluno_id, professor_id) VALUES
    (aluno_joao_id, prof_carlos_id), -- João segue Carlos
    (aluno_maria_id, prof_carlos_id), -- Maria segue Carlos
    (aluno_ana_id, prof_carlos_id),   -- Ana segue Carlos
    (aluno_lucas_id, prof_carlos_id); -- Lucas segue Carlos

    -- 6. Inserir exercícios (padrão e personalizados)
    INSERT INTO public.exercicios (id, nome, grupo_muscular, equipamento, tipo, is_ativo) VALUES
    (gen_random_uuid(), 'Supino Reto', 'Peito', 'Barra', 'padrao', true) RETURNING id INTO ex_padrao_1_id;
    INSERT INTO public.exercicios (id, nome, grupo_muscular, equipamento, tipo, is_ativo) VALUES
    (gen_random_uuid(), 'Agachamento Livre', 'Pernas', 'Barra', 'padrao', true) RETURNING id INTO ex_padrao_2_id;
    INSERT INTO public.exercicios (id, nome, grupo_muscular, equipamento, tipo, is_ativo) VALUES
    (gen_random_uuid(), 'Remada Curvada (Personalizada)', 'Costas', 'Barra', 'personalizado', true) RETURNING id INTO ex_personalizado_1_id;
    
    UPDATE public.exercicios SET professor_id = prof_carlos_id WHERE id = ex_personalizado_1_id;

    -- 7. Criar uma rotina para o Aluno João com o Professor Carlos
    INSERT INTO public.rotinas (nome, objetivo, aluno_id, professor_id, treinos_por_semana, dificuldade, duracao_semanas, data_inicio, valor_total, forma_pagamento, status) VALUES
    ('Hipertrofia Total - João', 'Ganho de massa', aluno_joao_id, prof_carlos_id, 3, 'Intermediário', 8, '2025-01-20', 150.00, 'PIX', 'Ativa')
    RETURNING id INTO rotina_joao_id;

    -- 8. Criar treinos para a rotina do João
    INSERT INTO public.treinos (rotina_id, nome, grupos_musculares, ordem) VALUES
    (rotina_joao_id, 'Treino A - Peito e Tríceps', 'Peito,Tríceps', 1) RETURNING id INTO treino_a_id;
    INSERT INTO public.treinos (rotina_id, nome, grupos_musculares, ordem) VALUES
    (rotina_joao_id, 'Treino B - Costas e Bíceps', 'Costas,Bíceps', 2) RETURNING id INTO treino_b_id;
    INSERT INTO public.treinos (rotina_id, nome, grupos_musculares, ordem) VALUES
    (rotina_joao_id, 'Treino C - Pernas e Ombros', 'Pernas,Ombros', 3) RETURNING id INTO treino_c_id;

    -- 9. Adicionar exercícios aos treinos
    -- Treino A
    INSERT INTO public.exercicios_rotina (treino_id, exercicio_1_id, ordem) VALUES
    (treino_a_id, ex_padrao_1_id, 1) RETURNING id INTO ex_rotina_1_id;
    
    -- Treino B (com exercício personalizado)
    INSERT INTO public.exercicios_rotina (treino_id, exercicio_1_id, ordem) VALUES
    (treino_b_id, ex_personalizado_1_id, 1) RETURNING id INTO ex_rotina_2_id;

    -- Treino C
    INSERT INTO public.exercicios_rotina (treino_id, exercicio_1_id, ordem) VALUES
    (treino_c_id, ex_padrao_2_id, 1) RETURNING id INTO ex_rotina_3_id;

    -- 10. Adicionar séries aos exercícios da rotina
    INSERT INTO public.series (exercicio_id, numero_serie, repeticoes, carga, intervalo_apos_serie) VALUES
    (ex_rotina_1_id, 1, 12, 50, 60),
    (ex_rotina_1_id, 2, 10, 55, 60),
    (ex_rotina_1_id, 3, 8, 60, 90),
    (ex_rotina_2_id, 1, 12, 40, 60),
    (ex_rotina_2_id, 2, 12, 40, 60),
    (ex_rotina_3_id, 1, 15, 80, 90),
    (ex_rotina_3_id, 2, 12, 90, 90),
    (ex_rotina_3_id, 3, 10, 100, 120);

    -- 11. Gerar sessões de treino para a rotina
    INSERT INTO public.execucoes_sessao (rotina_id, treino_id, aluno_id, sessao_numero, status) VALUES
    (rotina_joao_id, treino_a_id, aluno_joao_id, 1, 'concluida'),
    (rotina_joao_id, treino_b_id, aluno_joao_id, 2, 'em_andamento'),
    (rotina_joao_id, treino_c_id, aluno_joao_id, 3, 'em_aberto');

    -- 12. Criar posts para o blog
    INSERT INTO public.posts (author_id, title, category, slug, excerpt, content, status) VALUES
    (prof_carlos_id, '5 Dicas para Maximizar seu Supino', 'Exercícios', '5-dicas-supino', 'Aprenda como melhorar sua técnica e força no supino reto.', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Conteúdo completo do post aqui..."}]}]}', 'published'),
    (prof_carlos_id, 'A Verdade sobre Dietas Low-Carb', 'Nutrição', 'verdade-low-carb', 'Uma análise sobre os prós e contras da dieta low-carb para emagrecimento.', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Rascunho do post sobre dietas..."}]}]}', 'draft');

    -- 13. Criar uma avaliação física
    INSERT INTO public.avaliacoes_fisicas (aluno_id, data_avaliacao, peso, altura, imc, peito_busto, cintura, quadril) VALUES
    (aluno_joao_id, '2025-01-15', 85.5, 180, 26.4, 102, 85, 100);

    -- 14. Criar um modelo de rotina para o Professor Carlos
    INSERT INTO public.modelos_rotina (professor_id, nome, objetivo, dificuldade, treinos_por_semana, duracao_semanas) VALUES
    (prof_carlos_id, 'Hipertrofia Essencial 3x', 'Ganho de massa', 'Intermediário', 3, 8) RETURNING id INTO modelo_rotina_id;

    INSERT INTO public.modelos_treino (modelo_rotina_id, nome, grupos_musculares, ordem) VALUES
    (modelo_rotina_id, 'Push Day', ARRAY['Peito', 'Ombros', 'Tríceps'], 1) RETURNING id INTO modelo_treino_id;

    INSERT INTO public.modelos_exercicio (modelo_treino_id, exercicio_1_id, ordem) VALUES
    (modelo_treino_id, ex_padrao_1_id, 1) RETURNING id INTO modelo_exercicio_id;

    INSERT INTO public.modelos_serie (modelo_exercicio_id, numero_serie, repeticoes, carga) VALUES
    (modelo_exercicio_id, 1, 12, 50),
    (modelo_exercicio_id, 2, 10, 55);

    -- 15. Criar agendamentos
    INSERT INTO public.agendamentos (professor_id, aluno_id, tipo, status, data_hora_inicio, data_hora_fim) VALUES
    (prof_carlos_id, aluno_joao_id, 'sessao_treino', 'confirmado', now() + interval '2 days', now() + interval '2 days' + interval '1 hour'),
    (prof_carlos_id, aluno_maria_id, 'avaliacao_fisica', 'pendente', now() + interval '3 days', now() + interval '3 days' + interval '1 hour');

    -- 16. Criar conversas e mensagens
    -- Conversa 1:1 entre Carlos e João
    INSERT INTO public.conversas (is_grupo) VALUES (false) RETURNING id INTO conversa_1_id;
    INSERT INTO public.participantes_conversa (conversa_id, user_id) VALUES (conversa_1_id, prof_carlos_id), (conversa_1_id, aluno_joao_id);
    INSERT INTO public.mensagens (conversa_id, remetente_id, conteudo) VALUES
    (conversa_1_id, prof_carlos_id, 'E aí João, tudo certo com o treino?'),
    (conversa_1_id, aluno_joao_id, 'Tudo ótimo, professor! Só uma dúvida no supino.');

    -- Conversa em Grupo
    INSERT INTO public.conversas (is_grupo, nome_grupo, creator_id) VALUES (true, 'Galera da Força', prof_carlos_id) RETURNING id INTO conversa_2_id;
    INSERT INTO public.participantes_conversa (conversa_id, user_id) VALUES 
    (conversa_2_id, prof_carlos_id), 
    (conversa_2_id, aluno_joao_id),
    (conversa_2_id, aluno_maria_id);
    INSERT INTO public.mensagens (conversa_id, remetente_id, conteudo) VALUES
    (conversa_2_id, prof_carlos_id, 'Pessoal, amanhã o treino é pesado!');

END $$;

-- Finaliza a transação
COMMIT;

```