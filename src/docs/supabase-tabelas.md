# Documentação das Tabelas do Supabase

Este documento descreve a estrutura completa das tabelas do banco de dados, incluindo colunas, tipos de dados, restrições e relacionamentos.

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

**Tipos de Usuário**: aluno, personal_trainer, admin

---

### Tabela: `public.personal_trainers`
**Descrição**: Dados dos personal trainers, incluindo informações profissionais e planos de assinatura.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `` | `PRIMARY KEY` | `personal_trainers_pkey` |  |
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
| `limite_alunos` | 24 | `integer` | True | `3` | `` | `` |  |
| `limite_exercicios` | 25 | `integer` | True | `3` | `` | `` |  |

**Tipos de Plano**: gratuito, basico, premium, profissional

---

### Tabela: `public.planos`
**Descrição**: Definição dos planos de assinatura disponíveis para personal trainers.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `text` | False | `` | `PRIMARY KEY` | `planos_pkey` |  |
| `nome` | 2 | `text` | False | `` | `` | `` |  |
| `preco` | 3 | `numeric` | False | `` | `` | `` |  |
| `limite_alunos` | 4 | `integer` | True | `` | `` | `` |  |
| `limite_exercicios` | 5 | `integer` | True | `` | `` | `` |  |
| `ativo` | 6 | `boolean` | True | `true` | `` | `` |  |

---

### Tabela: `public.alunos`
**Descrição**: Dados dos alunos, incluindo informações pessoais e status de onboarding.

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

---

### Tabela: `public.convites`
**Descrição**: Sistema de convites para cadastro de alunos e vínculo com personal trainers.

| Coluna | Posição | Tipo de Dado | Nulável | Padrão | Tipo de Restrição | Nome da Restrição | Chave Estrangeira |
|---|---|---|---|---|---|---|---|
| `id` | 1 | `uuid` | False | `gen_random_uuid()` | `PRIMARY KEY` | `convites_pkey` |  |
| `personal_trainer_id` | 2 | `uuid` | False | `` | `FOREIGN KEY` | `convites_personal_trainer_id_fkey` | `public.personal_trainers(id)` |
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
| `pt_id` | 9 | `uuid` | True | `` | `FOREIGN KEY` | `exercicios_pt_id_fkey` |  |
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

---

### Tabela: `public.rotinas`
**Descrição**: Rotinas de treino criadas pelos personal trainers para seus alunos.

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
| `permite_execucao_aluno` | 15 | `boolean` | True | `false` | `` | `` |  |
| `objetivo` | 16 | `character varying` | True | `` | `` | `` |  |
| `pdf_email_enviado` | 17 | `boolean` | True | `false` | `` | `` |  |
| `observacoes_rotina` | 18 | `text` | True | `` | `` | `` |  |

**Status Possíveis**: ativa, pausada, finalizada, cancelada  
**Objetivos Comuns**: Emagrecimento, Ganho de Massa, Condicionamento, Reabilitação

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

**Status Possíveis**: nao_iniciada, em_andamento, finalizada, cancelada  
**Modos de Execução**: pt (personal trainer), aluno

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

---

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

## 2. Tipos Personalizados (ENUMs)

### `plano_tipo`
- `gratuito`
- `basico` 
- `premium`
- `profissional`

---

## 3. Índices Importantes

### Índices de Performance
- **`idx_alunos_personal_trainer`**: Otimiza consultas de alunos por personal trainer
- **`idx_alunos_status`**: Acelera filtros por status dos alunos
- **`idx_alunos_onboarding`**: Facilita consultas de onboarding
- **`idx_convites_pt_status`**: Otimiza consultas de convites por PT e status
- **`idx_personal_trainers_plano`**: Acelera consultas por tipo de plano
- **`idx_exercicios_dificuldade`**: Facilita filtros por dificuldade dos exercícios

### Índices Únicos
- **`exercicios_slug_key`**: Garante slugs únicos para exercícios
- **`convites_token_convite_key`**: Tokens únicos para convites
- **`execucoes_series_unique`**: Evita duplicação de execuções de séries

---

## 4. Constraints e Validações

### Check Constraints Importantes

**Convites**:
- `convites_tipo_convite_check`: Permite apenas 'cadastro' ou 'vinculo'
- `convites_status_check`: Status válidos: 'pendente', 'aceito', 'cancelado', 'expirado'

**Exercícios**:
- `exercicios_tipo_check`: Tipos válidos: 'padrao', 'personalizado'

**Execuções de Sessão**:
- `execucoes_sessao_modo_execucao_check`: Modos válidos: 'pt', 'aluno'

---

## 5. Sistema de Relacionamentos

### Hierarquia Principal
```
auth.users → user_profiles → alunos/personal_trainers
```

### Fluxo de Rotinas
```
personal_trainers → rotinas → treinos → exercicios_rotina → series
                         ↓
                    execucoes_sessao → execucoes_series
```

### Sistema de Convites
```
personal_trainers → convites → alunos (vinculação)
```

---

## 6. Gerenciamento de Dados e Exclusão em Cascata

### Corrente de Exclusão
Para que a exclusão total funcione, a seguinte cadeia de dependências foi configurada com a regra `ON DELETE CASCADE`:

```
auth.users CASCADE→ user_profiles CASCADE→ alunos CASCADE→ [rotinas, rotinas_arquivadas, avaliacoes_fisicas]
```

### Níveis de Cascade
1. **Nível 1**: `auth.users` → `user_profiles`
2. **Nível 2**: `user_profiles` → `alunos`
3. **Nível 3**: `alunos` → `rotinas`
4. **Nível 4**: `alunos` → `rotinas_arquivadas`
5. **Nível 5**: `alunos` → `avaliacoes_fisicas`

### Relacionamentos de Execução
- `rotinas` → `execucoes_sessao` → `execucoes_series`
- `treinos` → `exercicios_rotina` → `series`
- `exercicios_rotina` → `execucoes_series`

---

## 7. Regras de Negócio Implementadas

### Limites por Plano
- **Gratuito**: 3 alunos, 3 exercícios personalizados
- **Outros planos**: Definidos na tabela `planos`

### Sistema de Avatar
- Suporte a avatars por letra (`avatar_letter`) ou imagem (`avatar_image_url`)
- Cores personalizáveis para avatars

### Convites com Expiração
- Convites expiram em 7 dias por padrão
- Sistema de tokens únicos para segurança

### Supersets
- Suporte a exercícios em superset através de `exercicio_2_id`
- Permite combinação de dois exercícios em sequência

### Execução Flexível
- Treinos podem ser executados pelo PT ou pelo aluno
- Registro detalhado de cargas e repetições executadas
- Suporte a dropsets com cargas específicas

---

## 8. Considerações de Segurança

### Row Level Security (RLS)
- Implementar políticas RLS para isolamento de dados por personal trainer
- Alunos só acessam seus próprios dados
- Personal trainers só acessam dados de seus alunos

### Tokens e Autenticação
- Tokens de convite com UUID para segurança
- Integração com sistema de autenticação Supabase

### Validação de Dados
- Check constraints garantem integridade referencial
- Campos obrigatórios bem definidos
- Validação de tipos de dados e valores aceitos