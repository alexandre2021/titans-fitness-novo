# Documentação das Tabelas do Supabase

Este documento descreve a estrutura das tabelas do banco de dados, incluindo colunas, tipos de dados, e restrições.

## 1. Tabelas do Schema Public

### Tabela: `public.admins`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `admins_pkey` |  |
| `id` | 1 | `uuid` | False | `` | `FOREIGN KEY` | `admins_id_fkey` |  |
| `nome_completo` | 2 | `character varying` | True | `` | `` | `` |  |
| `email` | 3 | `character varying` | True | `` | `` | `` |  |
| `permissoes` | 4 | `ARRAY` | True | `ARRAY['exercicios'::text, 'planos'::text, 'usuarios'::text]` | `` | `` |  |
| `created_at` | 5 | `timestamp with time zone` | True | `now()` | `` | `` |  |

### Tabela: `public.alunos`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `alunos_pkey` | `public.user_profiles(id)` |
| `id` | 1 | `uuid` | False | `` | `FOREIGN KEY` | `fk_alunos_user_profiles` | `public.user_profiles(id)` |
| `nome_completo` | 2 | `text` | False | `` | `` | `` |  |
| `personal_trainer_id` | 3 | `uuid` | True | `` | `` | `` |  |
| `created_at` | 4 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 5 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `email` | 6 | `text` | False | `''::text` | `` | `` |  |
| `telefone` | 7 | `text` | True | `` | `` | `` |  |
| `data_nascimento` | 8 | `date` | True | `` | `` | `` |  |
| `genero` | 9 | `text` | True | `` | `` | `` |  |
| `endereco` | 10 | `text` | True | `` | `` | `` |  |
| `peso` | 11 | `numeric` | True | `` | `` | `` |  |
| `altura` | 12 | `numeric` | True | `` | `` | `` |  |
| `contato_emergencia_nome` | 17 | `text` | True | `` | `` | `` |  |
| `contato_emergencia_telefone` | 18 | `text` | True | `` | `` | `` |  |
| `par_q_respostas` | 20 | `jsonb` | True | `` | `` | `` |  |
| `onboarding_completo` | 21 | `boolean` | True | `False` | `` | `` |  |
| `status` | 22 | `text` | True | `'pendente'::text` | `` | `` |  |
| `avatar_letter` | 23 | `character varying` | True | `` | `` | `` |  |
| `avatar_color` | 24 | `character varying` | True | `'#60A5FA'::character varying` | `` | `` |  |
| `avatar_image_url` | 25 | `text` | True | `` | `` | `` |  |
| `avatar_type` | 26 | `character varying` | True | `'letter'::character varying` | `` | `` |  |
| `ultimo_objetivo_rotina` | 28 | `character varying` | True | `` | `` | `` |  |
| `descricao_pessoal` | 29 | `text` | True | `` | `` | `` |  |

### Tabela: `public.avaliacoes_fisicas`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `avaliacoes_fisicas_pkey` |  |
| `aluno_id` | 2 | `uuid` | True | `` | `FOREIGN KEY` | `avaliacoes_fisicas_aluno_id_fkey` | `public.alunos(id)` |
| `aluno_id` | 2 | `uuid` | True | `` | `FOREIGN KEY` | `fk_avaliacoes_alunos` | `public.alunos(id)` |
| `data_avaliacao` | 3 | `date` | False | `` | `` | `` |  |
| `peso` | 4 | `numeric` | False | `` | `` | `` |  |
| `altura` | 5 | `numeric` | False | `` | `` | `` |  |
| `imc` | 6 | `numeric` | False | `` | `` | `` |  |
| `peito_busto` | 7 | `numeric` | True | `` | `` | `` |  |
| `cintura` | 8 | `numeric` | True | `` | `` | `` |  |
| `quadril` | 9 | `numeric` | True | `` | `` | `` |  |
| `coxa_direita` | 10 | `numeric` | True | `` | `` | `` |  |
| `braco_direito` | 11 | `numeric` | True | `` | `` | `` |  |
| `observacoes` | 12 | `text` | True | `` | `` | `` |  |
| `foto_frente_url` | 13 | `text` | True | `` | `` | `` |  |
| `foto_lado_url` | 14 | `text` | True | `` | `` | `` |  |
| `created_at` | 15 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 16 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `foto_costas_url` | 17 | `text` | True | `` | `` | `` |  |
| `braco_esquerdo` | 18 | `numeric` | True | `` | `` | `` |  |
| `coxa_esquerda` | 19 | `numeric` | True | `` | `` | `` |  |
| `antebraco_direito` | 20 | `numeric` | True | `` | `` | `` |  |
| `antebraco_esquerdo` | 21 | `numeric` | True | `` | `` | `` |  |
| `panturrilha_direita` | 22 | `numeric` | True | `` | `` | `` |  |
| `panturrilha_esquerda` | 23 | `numeric` | True | `` | `` | `` |  |

### Tabela: `public.convites`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `convites_pkey` |  |
| `personal_trainer_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `convites_personal_trainer_id_fkey` | `public.personal_trainers(id)` |
| `email_convidado` | 3 | `text` | False | `` | `` | `` |  |
| `token_convite` | 4 | `uuid` | False | `gen_random_uuid()` | `UNIQUE` | `convites_token_convite_key` |  |
| `tipo_convite` | 5 | `character varying` | False | `` | `` | `` |  |
| `status` | 6 | `character varying` | True | `'pendente'::character varying` | `` | `` |  |
| `expires_at` | 7 | `timestamp with time zone` | False | `(now() + '7 days'::interval)` | `` | `` |  |
| `aceito_em` | 8 | `timestamp with time zone` | True | `` | `` | `` |  |
| `created_at` | 9 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 10 | `timestamp with time zone` | True | `now()` | `` | `` |  |

### Tabela: `public.execucoes_series`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `execucoes_series_pkey` |  |
| `execucao_sessao_id` | 2 | `uuid` | True | `` | `FOREIGN KEY` | `execucoes_series_execucao_sessao_id_fkey` | `public.execucoes_sessao(id)` |
| `execucao_sessao_id` | 2 | `uuid` | True | `` | `UNIQUE` | `execucoes_series_unique` | `public.execucoes_sessao(id)` |
| `exercicio_rotina_id` | 3 | `uuid` | True | `` | `FOREIGN KEY` | `execucoes_series_exercicio_rotina_id_fkey` | `public.exercicios_rotina(id)` |
| `exercicio_rotina_id` | 3 | `uuid` | True | `` | `UNIQUE` | `execucoes_series_unique` | `public.exercicios_rotina(id)` |
| `serie_numero` | 4 | `integer` | False | `` | `UNIQUE` | `execucoes_series_unique` |  |
| `repeticoes_executadas_1` | 5 | `integer` | True | `` | `` | `` |  |
| `carga_executada_1` | 6 | `numeric` | True | `` | `` | `` |  |
| `repeticoes_executadas_2` | 7 | `integer` | True | `` | `` | `` |  |
| `carga_executada_2` | 8 | `numeric` | True | `` | `` | `` |  |
| `carga_dropset` | 10 | `numeric` | True | `` | `` | `` |  |
| `observacoes` | 12 | `text` | True | `` | `` | `` |  |
| `created_at` | 13 | `timestamp with time zone` | True | `now()` | `` | `` |  |

### Tabela: `public.execucoes_sessao`

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
| `modo_execucao` | 11 | `character varying` | True | `'pt'::character varying` | `` | `` |  |
| `tempo_decorrido` | 12 | `integer` | True | `0` | `` | `` |  |

### Tabela: `public.exercicios`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `exercicios_pkey` |  |
| `nome` | 2 | `character varying` | False | `` | `` | `` |  |
| `grupo_muscular` | 3 | `character varying` | True | `` | `` | `` |  |
| `equipamento` | 4 | `character varying` | True | `` | `` | `` |  |
| `descricao` | 5 | `text` | True | `` | `` | `` |  |
| `instrucoes` | 6 | `text` | True | `` | `` | `` |  |
| `created_at` | 7 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `tipo` | 8 | `character varying` | True | `'base'::character varying` | `` | `` |  |
| `pt_id` | 9 | `uuid` | True | `` | `FOREIGN KEY` | `exercicios_pt_id_fkey` |  |
| `exercicio_padrao_id` | 10 | `uuid` | True | `` | `FOREIGN KEY` | `exercicios_exercicio_base_id_fkey` | `public.exercicios(id)` |
| `video_url` | 11 | `text` | True | `` | `` | `` |  |
| `imagem_2_url` | 12 | `text` | True | `` | `` | `` |  |
| `imagem_1_url` | 13 | `text` | True | `` | `` | `` |  |
| `youtube_url` | 14 | `text` | True | `` | `` | `` |  |
| `is_ativo` | 19 | `boolean` | True | `True` | `` | `` |  |
| `dificuldade` | 20 | `character varying` | True | `'Iniciante'::character varying` | `` | `` |  |
| `slug` | 21 | `character varying` | True | `` | `UNIQUE` | `exercicios_slug_key` |  |
| `grupo_muscular_primario` | 22 | `character varying` | True | `` | `` | `` |  |
| `grupos_musculares_secundarios` | 23 | `character varying` | True | `` | `` | `` |  |

### Tabela: `public.exercicios_rotina`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `exercicios_rotina_pkey` |  |
| `treino_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `exercicios_rotina_treino_id_fkey` | `public.treinos(id)` |
| `intervalo_apos_exercicio` | 9 | `integer` | True | `120` | `` | `` |  |
| `observacoes` | 10 | `text` | True | `` | `` | `` |  |
| `ordem` | 11 | `integer` | False | `` | `` | `` |  |
| `created_at` | 12 | `timestamp without time zone` | True | `now()` | `` | `` |  |
| `exercicio_1_id` | 13 | `uuid` | False | `` | `FOREIGN KEY` | `fk_exercicio_1` | `public.exercicios(id)` |
| `exercicio_2_id` | 14 | `uuid` | True | `` | `FOREIGN KEY` | `fk_exercicio_2` | `public.exercicios(id)` |

### Tabela: `public.personal_trainers`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `personal_trainers_pkey` |  |
| `nome_completo` | 2 | `text` | False | `` | `` | `` |  |
| `codigo_pt` | 3 | `text` | True | `` | `UNIQUE` | `personal_trainers_codigo_pt_key` |  |
| `created_at` | 4 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 5 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `onboarding_completo` | 6 | `boolean` | True | `False` | `` | `` |  |
| `genero` | 7 | `text` | True | `` | `` | `` |  |
| `data_nascimento` | 8 | `date` | True | `` | `` | `` |  |
| `telefone` | 9 | `text` | True | `` | `` | `` |  |
| `telefone_publico` | 10 | `boolean` | True | `False` | `` | `` |  |
| `cref` | 11 | `text` | True | `` | `` | `` |  |
| `anos_experiencia` | 12 | `text` | True | `` | `` | `` |  |
| `especializacoes` | 13 | `ARRAY` | True | `` | `` | `` |  |
| `bio` | 14 | `text` | True | `` | `` | `` |  |
| `instagram` | 15 | `text` | True | `` | `` | `` |  |
| `facebook` | 16 | `text` | True | `` | `` | `` |  |
| `linkedin` | 17 | `text` | True | `` | `` | `` |  |
| `website` | 18 | `text` | True | `` | `` | `` |  |
| `plano` | 19 | `USER-DEFINED` | False | `'gratuito'::plano_tipo` | `` | `` |  |
| `data_plano` | 20 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `avatar_letter` | 21 | `character varying` | True | `` | `` | `` |  |
| `avatar_color` | 22 | `character varying` | True | `'#3B82F6'::character varying` | `` | `` |  |
| `avatar_image_url` | 23 | `text` | True | `` | `` | `` |  |
| `avatar_type` | 24 | `character varying` | True | `'letter'::character varying` | `` | `` |  |
| `limite_alunos` | 25 | `integer` | True | `3` | `` | `` |  |
| `limite_exercicios` | 26 | `integer` | True | `3` | `` | `` |  |

### Tabela: `public.planos`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `text` | False | `` | `PRIMARY KEY` | `planos_pkey` |  |
| `nome` | 2 | `text` | False | `` | `` | `` |  |
| `preco` | 3 | `numeric` | False | `` | `` | `` |  |
| `limite_alunos` | 4 | `integer` | True | `` | `` | `` |  |
| `limite_exercicios` | 5 | `integer` | True | `` | `` | `` |  |
| `ativo` | 6 | `boolean` | True | `True` | `` | `` |  |

### Tabela: `public.rotinas`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `rotinas_pkey` |  |
| `nome` | 2 | `character varying` | False | `` | `` | `` |  |
| `descricao` | 3 | `text` | True | `` | `` | `` |  |
| `aluno_id` | 4 | `uuid` | False | `` | `FOREIGN KEY` | `fk_rotinas_aluno` | `public.alunos(id)` |
| `personal_trainer_id` | 5 | `uuid` | False | `` | `FOREIGN KEY` | `fk_rotinas_personal` | `public.personal_trainers(id)` |
| `treinos_por_semana` | 6 | `integer` | False | `` | `` | `` |  |
| `dificuldade` | 7 | `character varying` | False | `` | `` | `` |  |
| `duracao_semanas` | 8 | `integer` | False | `` | `` | `` |  |
| `data_inicio` | 9 | `date` | False | `` | `` | `` |  |
| `valor_total` | 10 | `numeric` | False | `` | `` | `` |  |
| `forma_pagamento` | 11 | `character varying` | False | `` | `` | `` |  |
| `status` | 12 | `character varying` | True | `'ativa'::character varying` | `` | `` |  |
| `observacoes_pagamento` | 13 | `text` | True | `` | `` | `` |  |
| `created_at` | 14 | `timestamp without time zone` | True | `now()` | `` | `` |  |
| `permite_execucao_aluno` | 15 | `boolean` | True | `False` | `` | `` |  |
| `objetivo` | 16 | `character varying` | True | `` | `` | `` |  |
| `pdf_email_enviado` | 17 | `boolean` | True | `False` | `` | `` |  |
| `observacoes_rotina` | 18 | `text` | True | `` | `` | `` |  |

### Tabela: `public.rotinas_arquivadas`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `rotinas_arquivadas_pkey` |  |
| `aluno_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `rotinas_arquivadas_aluno_id_fkey` | `public.alunos(id)` |
| `nome_rotina` | 3 | `character varying` | False | `` | `` | `` |  |
| `objetivo` | 4 | `character varying` | False | `` | `` | `` |  |
| `treinos_por_semana` | 5 | `integer` | False | `` | `` | `` |  |
| `duracao_semanas` | 6 | `integer` | False | `` | `` | `` |  |
| `data_conclusao` | 7 | `date` | False | `` | `` | `` |  |
| `pdf_url` | 8 | `text` | False | `` | `` | `` |  |
| `created_at` | 9 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `data_inicio` | 10 | `date` | False | `` | `` | `` |  |

### Tabela: `public.series`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `series_pkey` |  |
| `exercicio_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `series_exercicio_id_fkey` | `public.exercicios_rotina(id)` |
| `numero_serie` | 3 | `integer` | False | `` | `` | `` |  |
| `repeticoes` | 4 | `integer` | False | `` | `` | `` |  |
| `carga` | 5 | `numeric` | True | `0` | `` | `` |  |
| `tem_dropset` | 6 | `boolean` | True | `False` | `` | `` |  |
| `carga_dropset` | 7 | `numeric` | True | `` | `` | `` |  |
| `observacoes` | 8 | `text` | True | `` | `` | `` |  |
| `created_at` | 9 | `timestamp without time zone` | True | `now()` | `` | `` |  |
| `intervalo_apos_serie` | 10 | `integer` | True | `` | `` | `` |  |
| `repeticoes_1` | 11 | `integer` | True | `` | `` | `` |  |
| `carga_1` | 12 | `numeric` | True | `` | `` | `` |  |
| `repeticoes_2` | 13 | `integer` | True | `` | `` | `` |  |
| `carga_2` | 14 | `numeric` | True | `` | `` | `` |  |

### Tabela: `public.treinos`

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

### Tabela: `public.user_profiles`

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `user_profiles_pkey` |  |
| `user_type` | 2 | `text` | False | `` | `` | `` |  |
| `created_at` | 3 | `timestamp with time zone` | True | `now()` | `` | `` |  |
| `updated_at` | 4 | `timestamp with time zone` | True | `now()` | `` | `` |  |


## 2. Gerenciamento de Dados e Exclusão em Cascata

### Corrente de Exclusão

Para que a exclusão total funcione, a seguinte cadeia de dependências foi configurada com a regra `ON DELETE CASCADE`:

```
auth.users Cascade-> user_profiles Cascade-> alunos Cascade-> [rotinas, rotinas_arquivadas, avaliacoes_fisicas]
```

### Nível 1: `auth.users` -> `user_profiles`
### Nível 2: `user_profiles` -> `alunos`
### Nível 3: `alunos` -> `rotinas`
### Nível 4: `alunos` -> `rotinas_arquivadas`
### Nível 5: `alunos` -> `avaliacoes_fisicas``
