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
| `created_at` | 3 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 4 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `onboarding_completo` | 5 | `boolean` | True | `false` | `` | `` |  |
| `genero` | 6 | `text` | True | `` | `` | `` |  |
| `data_nascimento` | 7 | `date` | True | `` | `` | `` |  |
| `telefone` | 8 | `text` | True | `` | `` | `` |  |
| `telefone_publico` | 9 | `boolean` | True | `false` | `` | `` |  |
| `cref` | 10 | `text` | True | `` | `` | `` |  |
| `anos_experiencia` | 11 | `text` | True | `` | `` | `` |  |
| `especializacoes` | 12 | `ARRAY` | True | `` | `` | `` |  |
| `bio` | 13 | `text` | True | `` | `` | `` |  |
| `instagram` | 14 | `text` | True | `` | `` | `` |  |
| `facebook` | 15 | `text` | True | `` | `` | `` |  |
| `linkedin` | 16 | `text` | True | `` | `` | `` |  |
| `website` | 17 | `text` | True | `` | `` | `` |  |
| `plano` | 18 | `plano_tipo` | False | `'gratuito'::plano_tipo` | `` | `` |  |
| `data_plano` | 19 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `avatar_letter` | 20 | `character varying` | True | `` | `` | `` |  |
| `avatar_color` | 21 | `character varying` | True | `'#3B82F6'::character varying` | `` | `` |  |
| `avatar_image_url` | 22 | `text` | True | `` | `` | `` |  |
| `avatar_type` | 23 | `character varying` | True | `'letter'::character varying` | `` | `` |  |
| `limite_exercicios` | 24 | `integer` | True | `3` | `` | `` |  |

**Tipos de Plano**: gratuito, basico, premium, profissional  
**MUDANÇA**: Removido `limite_alunos` - aplicativo gratuito sem limite de seguidores

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

**Status Possíveis**: pendente, ativo, inativo, suspenso  
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
**DELETE CASCADE**: Quando aluno ou professor é deletado, remove relacionamento automaticamente

---

### Tabela: `public.convites`
**Descrição**: Sistema de convites para cadastro de alunos e início de relacionamento com professores.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `convites_pkey` |  |
| `professor_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `convites_professor_id_fkey` | `public.professores(id)` |
| `email_convidado` | 3 | `text` | False | `` | `` | `` |  |
| `token_convite` | 4 | `uuid` | False | `gen_random_uuid()` | `UNIQUE` | `convites_token_convite_key` |  |
| `tipo_convite` | 5 | `character varying` | False | `` | `CHECK` | `convites_tipo_convite_check` |  |
| `status` | 6 | `character varying` | True | `'pendente'::character varying` | `CHECK` | `convites_status_check` |  |
| `expires_at` | 7 | `timestamp with time zone` | False | `(now() + '7 days'::interval)` | `` | `` |  |
| `aceito_em` | 8 | `timestamp with time zone` | True | `` | `` | `` |  |
| `created_at` | 9 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 10 | `timestamp with time zone` | True | `now()` | `` | `` |  |

**Tipos de Convite**: cadastro, vinculo  
**Status Possíveis**: pendente, aceito, cancelado, expirado  
**MUDANÇA**: Convite agora significa "começar a seguir" ao invés de "vincular exclusivamente"

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
**Objetivos Comuns**: Emagrecimento, Ganho de Massa, Condicionamento, Reabilitação  
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
| `slug` | 4 | `text` | False | | `UNIQUE` | `posts_slug_key` | |
| `content` | 5 | `jsonb` | True | | | | |
| `cover_image_url` | 6 | `text` | True | | | | |
| `status` | 7 | `text` | False | `'draft'::text` | `CHECK` | `posts_status_check` | |
| `created_at` | 8 | `timestamp with time zone` | False | `now()` | | | |
| `updated_at` | 9 | `timestamp with time zone` | False | `now()` | | | |

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
| `imc` | 6 | `numeric` | False | `` | `` | `` |  |
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
**Descrição**: Arquivo de rotinas finalizadas com PDFs gerados para histórico.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `rotinas_arquivadas_pkey` |  |
| `aluno_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `rotinas_arquivadas_aluno_id_fkey` | `public.alunos(id)` |
| `nome_rotina` | 3 | `character varying` | False | `` | `` | `` |  |
| `objetivo` | 4 | `character varying` | False | `` | `` | `` |  |
| `treinos_por_semana` | 5 | `integer` | False | `` | `` | `` |  |
| `duracao_semanas` | 6 | `integer` | False | `` | `` | `` |  |
| `data_inicio` | 7 | `date` | False | `` | `` | `` |  |
| `data_conclusao` | 8 | `date` | False | `` | `` | `` |  |
| `pdf_url` | 9 | `text` | False | `` | `` | `` |  |
| `created_at` | 10 | `timestamp with time zone` | True | `now()` | `` | `` |  |

---

### Tabela: `public.modelos_rotina`
**Descrição**: Armazena os modelos de rotina (templates) criados pelos Professores.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `modelos_rotina_pkey` | |
| `professor_id` | 2 | `uuid` | False | | `FOREIGN KEY (ON DELETE CASCADE)` | `modelos_rotina_professor_id_fkey` | `public.professores(id)` |
| `nome` | 3 | `character varying` | False | | | | |
| `descricao` | 4 | `text` | True | | | | |
| `objetivo` | 5 | `character varying` | True | | | | |
| `dificuldade` | 6 | `character varying` | False | | | | |
| `treinos_por_semana` | 7 | `integer` | False | | | | |
| `duracao_semanas` | 8 | `integer` | False | | | | |
| `observacoes_rotina` | 9 | `text` | True | | | | |
| `created_at` | 10 | `timestamp with time zone` | False | `now()` | | | |
| `updated_at` | 11 | `timestamp with time zone` | False | `now()` | | | |

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

## Continuação - Regras de Negócio Atualizadas

### Sistema de "Seguir"
- **Aluno pode seguir N professores**: Relacionamento N:N na tabela `alunos_professores`
- **Professor é único gerador de conteúdo**: Cria rotinas, exercícios e modelos
- **Convite significa "começar a seguir"**: Não mais vínculo exclusivo

### Rotina Ativa
- **Apenas 1 rotina ativa por aluno**: Campo `alunos.professor_id`
- **Pode ser de qualquer professor seguido**: Não precisa ser do primeiro professor
- **Nova rotina substitui anterior**: Automaticamente bloqueia/arquiva anterior

### Queries Essenciais

#### Seguidores de um Professor
```sql
SELECT a.*, ap.data_seguindo,
       CASE WHEN a.professor_id = $professor_id 
            THEN 'ATIVA' ELSE 'SEGUINDO' END as status_relacao
FROM alunos a
JOIN alunos_professores ap ON a.id = ap.aluno_id  
WHERE ap.professor_id = $professor_id
ORDER BY status_relacao DESC, ap.data_seguindo DESC
```

#### Verificar se Pode Criar Rotina
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
