# 🗄️ Schema Completo do Banco de Dados - Sistema de Personal Training

Documentação completa da estrutura de dados para todo o sistema de gestão de Personal Training.

---

## 📊 **Entidades Principais**

### **1. `personal_trainers`** - Personal Trainers
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `nome_completo` | varchar | Nome completo do PT |
| `email` | varchar | Email (único) |
| `telefone` | varchar | Telefone de contato |
| `cref` | varchar | Registro CREF |
| `especialidades` | text[] | Array de especialidades |
| `bio` | text | Biografia profissional |
| `avatar_image_url` | varchar | URL da foto de perfil |
| `status` | varchar | ativo, inativo, suspenso |
| `data_nascimento` | date | Data de nascimento |
| `genero` | varchar | Gênero |
| `endereco` | varchar | Endereço completo |
| `data_inicio` | date | Data de início na plataforma |
| `onboarding_completo` | bool | Se completou o onboarding |
| `limite_alunos` | int4 | Limite de alunos ativos |
| `permite_execucao_aluno` | bool | Se permite alunos executarem sozinhos |
| `auth_users_id` | uuid (FK) | Referência ao auth.users |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Última atualização |

### **2. `alunos`** - Alunos/Clientes
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `personal_trainer_id` | uuid (FK) | PT responsável |
| `nome_completo` | varchar | Nome completo |
| `email` | varchar | Email do aluno |
| `telefone` | varchar | Telefone |
| `data_nascimento` | date | Data de nascimento |
| `genero` | varchar | Gênero |
| `avatar_type` | varchar | image, letter |
| `avatar_image_url` | varchar | URL da foto |
| `avatar_letter` | varchar | Letra para avatar |
| `avatar_color` | varchar | Cor do avatar |
| `status` | varchar | ativo, inativo, suspenso |
| `objetivo_principal` | varchar | Objetivo atual |
| `nivel_experiencia` | varchar | iniciante, intermediario, avancado |
| `limitacoes_fisicas` | text | Limitações ou lesões |
| `medicamentos` | text | Medicamentos em uso |
| `observacoes` | text | Observações gerais |
| `permite_whatsapp` | bool | Se aceita contato via WhatsApp |
| `data_inicio` | date | Data de início |
| `auth_users_id` | uuid (FK) | Referência ao auth.users (opcional) |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Última atualização |

### **3. `exercicios`** - Catálogo de Exercícios ⚡ ATUALIZADO
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `nome` | varchar | Nome do exercício |
| `grupo_muscular` | varchar | **Grupo para filtros** (valores simplificados) |
| `grupo_muscular_primario` | varchar | **Grupo primário técnico** |
| `grupos_musculares_secundarios` | text[] | **Array de grupos secundários técnicos** |
| `equipamento` | varchar | Equipamento necessário |
| `dificuldade` | varchar | iniciante, intermediario, avancado |
| `instrucoes` | text | Instruções de execução |
| `observacoes` | text | Observações importantes |
| `imagem_1_url` | varchar | URL da primeira imagem |
| `imagem_2_url` | varchar | URL da segunda imagem |
| `video_url` | varchar | URL do vídeo demonstrativo |
| `is_ativo` | bool | Se está ativo no catálogo |
| `popularidade` | int4 | Índice de popularidade |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Última atualização |

**Grupos Musculares para Filtros (campo `grupo_muscular`):** Peito, Costas, Pernas, Ombros, Bíceps, Tríceps, Abdômen, Glúteos, Panturrilha

**Equipamentos:** Barra, Halteres, Máquina, Peso Corporal, Cabo/Máquina, Kettlebell, Fitas de Suspensão, Elásticos, Bola Suíça

**Lógica de Exibição:**
- **Filtros**: Usar `grupo_muscular` (valores simplificados)
- **Cards/Detalhes**: Mostrar `grupo_muscular_primario` + `grupos_musculares_secundarios` (valores técnicos)

### **4. `rotinas`** - Configuração das Rotinas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `nome` | varchar | Nome da rotina |
| `objetivo` | varchar | Emagrecimento, Ganho de massa, etc. |
| `status` | varchar | Ativa, Bloqueada, Concluída |
| `dificuldade` | varchar | Baixa, Média, Alta |
| `aluno_id` | uuid (FK) | Referência ao aluno |
| `personal_trainer_id` | uuid (FK) | Referência ao PT |
| `data_inicio` | date | Data de início da rotina |
| `duracao_semanas` | int4 | Duração em semanas |
| `treinos_por_semana` | int4 | Frequência semanal |
| `valor_total` | numeric | Valor cobrado |
| `forma_pagamento` | varchar | PIX, Cartão, etc. |
| `descricao` | text | Descrição opcional |
| `permite_execucao_aluno` | bool | Se aluno pode executar sozinho |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Última atualização |

### **5. `treinos`** - Treinos da Rotina
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `rotina_id` | uuid (FK) | Referência à rotina |
| `nome` | varchar | Nome do treino (ex: "Treino A - Peito") |
| `grupos_musculares` | varchar | Lista separada por vírgulas |
| `ordem` | int4 | Ordem de execução (1, 2, 3...) |
| `tempo_estimado_minutos` | int4 | Tempo estimado em minutos |
| `observacoes` | text | Observações do treino |
| `created_at` | timestamptz | Data de criação |

### **6. `exercicios_rotina`** - Exercícios dos Treinos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `treino_id` | uuid (FK) | Referência ao treino |
| `exercicio_1_id` | uuid (FK) | Primeiro exercício |
| `exercicio_2_id` | uuid (FK) | Segundo exercício (para bi-sets) |
| `ordem` | int4 | Ordem no treino |
| `intervalo_apos_exercicio` | int4 | Intervalo em segundos |
| `observacoes` | text | Observações específicas |
| `created_at` | timestamptz | Data de criação |

### **7. `series`** - Configuração das Séries
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `exercicio_id` | uuid (FK) | Referência ao exercicios_rotina |
| `numero_serie` | int4 | Número da série (1, 2, 3...) |
| `repeticoes` | int4 | Repetições planejadas (série simples) |
| `carga` | numeric | Carga planejada (série simples) |
| `repeticoes_1` | int4 | Repetições do 1º exercício (série combinada) |
| `carga_1` | numeric | Carga do 1º exercício (série combinada) |
| `repeticoes_2` | int4 | Repetições do 2º exercício (série combinada) |
| `carga_2` | numeric | Carga do 2º exercício (série combinada) |
| `tem_dropset` | bool | Se possui dropset |
| `carga_dropset` | numeric | Carga do dropset |
| `intervalo_apos_serie` | int4 | Intervalo em segundos |
| `created_at` | timestamptz | Data de criação |

### **8. `execucoes_sessao`** - Sessões de Treino
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `rotina_id` | uuid (FK) | Referência à rotina |
| `treino_id` | uuid (FK) | Treino a ser executado |
| `sessao_numero` | int4 | Número sequencial da sessão |
| `status` | varchar | em_aberto, em_andamento, pausada, concluida |
| `data_execucao` | date | Data planejada para execução |
| `data_inicio_execucao` | timestamptz | Quando iniciou a execução |
| `data_fim_execucao` | timestamptz | Quando finalizou |
| `tempo_total_minutos` | int4 | Tempo total gasto |
| `modo_execucao` | varchar | pt (Personal Trainer) ou aluno |
| `observacoes` | text | Observações da sessão |
| `created_at` | timestamptz | Data de criação |

### **9. `execucoes_series`** - Dados Executados
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `execucao_sessao_id` | uuid (FK) | Referência à sessão |
| `exercicio_rotina_id` | uuid (FK) | Referência ao exercício |
| `serie_numero` | int4 | Número da série executada |
| `repeticoes_executadas_1` | int4 | Repetições executadas (1º exercício) |
| `carga_executada_1` | numeric | Carga executada (1º exercício) |
| `repeticoes_executadas_2` | int4 | Repetições executadas (2º exercício) |
| `carga_executada_2` | numeric | Carga executada (2º exercício) |
| `carga_dropset` | numeric | Carga do dropset executado |
| `observacoes` | text | Observações da execução |
| `created_at` | timestamptz | Data de criação |

### **10. `avaliacoes_fisicas`** - Avaliações dos Alunos
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid (PK) | Identificador único |
| `aluno_id` | uuid (FK) | Referência ao aluno |
| `data_avaliacao` | date | Data da avaliação |
| `peso` | numeric | Peso em kg |
| `altura` | numeric | Altura em cm |
| `percentual_gordura` | numeric | % de gordura corporal |
| `massa_muscular` | numeric | Massa muscular |
| `imc` | numeric | Índice de Massa Corporal |
| `circunferencia_braco` | numeric | Circunferência do braço |
| `circunferencia_perna` | numeric | Circunferência da perna |
| `circunferencia_cintura` | numeric | Circunferência da cintura |
| `circunferencia_quadril` | numeric | Circunferência do quadril |
| `pressao_arterial` | varchar | Pressão arterial |
| `frequencia_cardiaca` | int4 | Frequência cardíaca em repouso |
| `objetivo` | varchar | Objetivo na época |
| `observacoes` | text | Observações da avaliação |
| `created_at` | timestamptz | Data de criação |

---

## 🔄 **Relacionamentos Principais**

```
personal_trainers ──┐
                   ├── rotinas ──┐
alunos ────────────┘             │
                                 ├── treinos ──> exercicios_rotina ──> series
                                 │                        │
                                 └── execucoes_sessao ────┘
                                           │
                                           └── execucoes_series
```

---

## ⚡ **Cores dos Grupos Musculares**
```typescript
const CORES_GRUPOS_MUSCULARES = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800', 
  'Pernas': 'bg-green-100 text-green-800',
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-green-100 text-green-800',
  'Panturrilha': 'bg-green-100 text-green-800'
};
```

---

*Última atualização: Schema exercícios com grupos musculares técnicos*