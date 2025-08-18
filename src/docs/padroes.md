# 📋 Padrões do Sistema - Rotinas e Exercícios

Centralização de todos os padrões, valores e configurações do sistema.

Cor principal #AA1808

---

## 🏋️ **GRUPOS MUSCULARES**

### **Valores Padrão:**
```typescript
const GRUPOS_MUSCULARES = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 
  'Abdômen', 'Pernas', 'Glúteos', 'Panturrilha'
];
```

### **🎨 Cores por Grupo:**
```typescript
const CORES_GRUPOS_MUSCULARES = {
  'Peito': 'bg-red-100 text-red-800',
  'Costas': 'bg-blue-100 text-blue-800', 
  'Pernas': 'bg-green-100 text-green-800',        // Verde (mantém)
  'Ombros': 'bg-yellow-100 text-yellow-800',
  'Bíceps': 'bg-purple-100 text-purple-800',
  'Tríceps': 'bg-pink-100 text-pink-800',
  'Abdômen': 'bg-orange-100 text-orange-800',
  'Glúteos': 'bg-violet-100 text-violet-800',     // Roxo/violeta - bem diferente
  'Panturrilha': 'bg-indigo-100 text-indigo-800'
};
```

---

## 📊 **STATUS DO SISTEMA**

### **🎯 Status de Rotina:**
```typescript
const STATUS_ROTINA = [
  'Ativa',                 // Nasce ativa e está liberada para execução
  'Bloqueada',            // Aluno atrasou pagamento, acesso suspenso
  'Concluída'             // Finalizada (todas as sessões executadas)
];

const CORES_STATUS_ROTINA = {
  'Ativa': 'bg-green-100 text-green-800',  
  'Bloqueada': 'bg-red-100 text-red-800',
  'Concluída': 'bg-gray-100 text-gray-800'
};
```

**IMPORTANTE:** Status "Bloqueada" é usado quando aluno atrasa mensalidade e PT suspende o acesso temporariamente.

### **⏱️ Status de Sessão:**
```typescript
const STATUS_SESSAO = [
  'em_aberto',  // Sessão criada, aguardando execução
  'em_andamento',  // Execução iniciada
  'pausada',       // Pausada temporariamente durante execução
  'concluida'      // Finalizada
];

const CORES_STATUS_SESSAO = {
  'em_aberto': 'bg-blue-100 text-blue-800',
  'em_andamento': 'bg-green-100 text-green-800',
  'pausada': 'bg-yellow-100 text-yellow-800',
  'concluida': 'bg-gray-100 text-gray-800'
};
```

---

## 🎛️ **CONFIGURAÇÕES DE ROTINA**

### **Objetivos:**
```typescript
const OBJETIVOS = [
  'Emagrecimento',
  'Ganho de massa',
  'Definição muscular',
  'Condicionamento físico',
  'Reabilitação',
  'Performance esportiva'
];

const CORES_OBJETIVOS = {
  'Emagrecimento': 'bg-orange-100 text-orange-800',
  'Ganho de massa': 'bg-blue-100 text-blue-800',
  'Definição muscular': 'bg-purple-100 text-purple-800',
  'Condicionamento físico': 'bg-green-100 text-green-800',
  'Reabilitação': 'bg-yellow-100 text-yellow-800',
  'Performance esportiva': 'bg-indigo-100 text-indigo-800'
};
```

### **Dificuldades:**
```typescript
const DIFICULDADES = ['Baixa', 'Média', 'Alta'];

const CORES_DIFICULDADES = {
  'Baixa': 'bg-green-100 text-green-800',
  'Média': 'bg-yellow-100 text-yellow-800',
  'Alta': 'bg-red-100 text-red-800'
};
```

### **Formas de Pagamento:**
```typescript
const FORMAS_PAGAMENTO = [
  'PIX', 'Cartão de Crédito', 'Cartão de Débito', 
  'Dinheiro', 'Transferência'
];
```

### **Limites de Validação:**
```typescript
const LIMITES = {
  DURACAO_SEMANAS: { min: 1, max: 52 },
  TREINOS_POR_SEMANA: { min: 1, max: 7 },
  VALOR_TOTAL: { min: 0, max: 10000 },
  TEMPO_ESTIMADO_MINUTOS: { min: 15, max: 180 }
};
```

---

## 🏋️ **EXERCÍCIOS**

### **Equipamentos:**
```typescript

const EQUIPAMENTOS = [
  'Barra', 'Halteres', 'Máquina', 'Peso Corporal', 'Cabo',
  'Kettlebell', 'Fitas de Suspensão', 'Elásticos', 
  'Bola Suíça', 'Bolas Medicinais', 'Landmine', 'Bola Bosu'
];
```

### **Tipos de Série:**
```typescript
const TIPOS_SERIE = {
  SIMPLES: 'simples',      // Série tradicional
  COMBINADA: 'combinada'   // Bi-set/Super-set
};
```

---

## 🎨 **SISTEMA DE CORES TAILWIND**

### **Classes Padrão para Badges:**
```css
/* Grupos Musculares */
.badge-peito { @apply bg-red-100 text-red-800; }
.badge-costas { @apply bg-blue-100 text-blue-800; }
.badge-pernas { @apply bg-green-100 text-green-800; }
.badge-ombros { @apply bg-yellow-100 text-yellow-800; }

/* Status de Rotina */
.badge-ativa { @apply bg-green-100 text-green-800; }
.badge-aguardando { @apply bg-yellow-100 text-yellow-800; }
.badge-bloqueada { @apply bg-red-100 text-red-800; }
.badge-concluida { @apply bg-gray-100 text-gray-800; }

/* Status de Sessão */
.badge-nao-iniciada { @apply bg-blue-100 text-blue-800; }
.badge-em-andamento { @apply bg-green-100 text-green-800; }
.badge-pausada { @apply bg-yellow-100 text-yellow-800; }
.badge-concluida-sessao { @apply bg-gray-100 text-gray-800; }

/* Dificuldades */
.badge-baixa { @apply bg-green-100 text-green-800; }
.badge-media { @apply bg-yellow-100 text-yellow-800; }
.badge-alta { @apply bg-red-100 text-red-800; }

/* Objetivos */
.badge-emagrecimento { @apply bg-orange-100 text-orange-800; }
.badge-ganho-massa { @apply bg-blue-100 text-blue-800; }
.badge-definicao { @apply bg-purple-100 text-purple-800; }
.badge-condicionamento { @apply bg-green-100 text-green-800; }
.badge-reabilitacao { @apply bg-yellow-100 text-yellow-800; }
.badge-performance { @apply bg-indigo-100 text-indigo-800; }
```

---

## 🔧 **PADRÕES TÉCNICOS**

### **Nomenclatura:**
- **Banco de dados**: `snake_case` (`grupo_muscular`, `data_inicio`)
- **TypeScript**: `camelCase` (`grupoMuscular`, `dataInicio`)
- **Componentes**: `PascalCase` (`RotinaConfiguracao`)
- **Constantes**: `UPPER_CASE` (`STATUS_ROTINA`)

### **Estrutura SessionStorage:**
```typescript
interface RotinaStorage {
  alunoId: string;
  etapaAtual: 'configuracao' | 'treinos' | 'exercicios' | 'revisao';
  configuracao?: ConfiguracaoRotina;
  treinos?: TreinoTemp[];
  exercicios?: ExerciciosPorTreino;
}
```

### **Rotas de Rotina:**
```typescript
const ROTAS_ROTINA = {
  CONFIGURACAO: '/rotinas-criar/:alunoId/configuracao',
  TREINOS: '/rotinas-criar/:alunoId/treinos',
  EXERCICIOS: '/rotinas-criar/:alunoId/exercicios',
  REVISAO: '/rotinas-criar/:alunoId/revisao'
};

const ROTAS_EXECUCAO = {
  SELECIONAR: '/execucao-rotina/selecionar-treino/:rotinaId',
  EXECUTAR: '/execucao-rotina/executar-treino/:sessaoId'
};
```

---

## 📋 **TABELAS SUPABASE**

### **Estrutura Principal:**
```sql
-- Fluxo de criação de rotina:
rotinas → treinos → exercicios_rotina → series → execucoes_sessao

-- Geração automática de sessões:
-- Para rotina de X semanas e Y treinos/semana = X*Y sessões
```

### **Campos Obrigatórios:**
- **rotinas**: `nome`, `objetivo`, `aluno_id`, `personal_trainer_id`, `status`
- **treinos**: `rotina_id`, `nome`, `grupos_musculares`, `ordem`
- **execucoes_sessao**: `rotina_id`, `treino_id`, `sessao_numero`, `status`

---

## 🎯 **REGRAS DE NEGÓCIO**

### **Fluxo de Status de Rotina:**
2. **Ativação**: Rotina criada com status "Ativa"
3. **Bloqueio**: Aluno atrasa mensalidade → PT muda para "Bloqueada"
4. **Reativação**: Aluno paga → PT reativa para "Ativa"
5. **Conclusão**: Todas as sessões executadas → sistema muda para "Concluída"

### **Validações:**
- ✅ Pelo menos 1 exercício por treino
- ✅ Pelo menos 1 série por exercício
- ✅ Data de início não pode ser no passado
- ✅ Peso corporal não permite edição de carga
- ✅ Rotina deve estar "Ativa" para execução

### **Comportamentos:**
- ✅ Sessões criadas automaticamente independente do status
- ✅ Treinos em ciclo (A → B → C → A...)
- ✅ Storage limpo após sucesso
- ✅ Navegação bloqueada se dados incompletos

---

## 🔄 **MENU DE OPÇÕES POR STATUS**

### **Menu Adaptativo (3 pontinhos):**
```typescript

// Status "Ativa":
['Detalhes', 'Treinar', 'Bloquear', 'Excluir']

// Status "Bloqueada":  
['Detalhes', 'Reativar', 'Excluir']

// Status "Concluída":
['Ver Informações'] // Modal informativa apenas
```

---

*Versão: 3.0 | Última atualização: 30/07/2025*