# 🏋️ Sistema de Execução de Rotinas

## 📂 **Estrutura de Arquivos**

```
src/
├── pages/
│   ├── ExecucaoSelecionarTreino.tsx    # Seleção de treino/sessão
│   └── ExecucaoExecutarTreino.tsx      # Coordenador principal
├── components/rotina/execucao/
│   ├── Executor.tsx                    # Interface unificada PT/Aluno
│   └── shared/
│       ├── CronometroSerie.tsx         # Timer entre séries
│       ├── CronometroExercicio.tsx     # Timer entre exercícios  
│       ├── RegistroSerieSimples.tsx    # Entrada dados série normal
│       ├── RegistroSerieCombinada.tsx  # Entrada dados bi-set/super-set
│       ├── ExercicioDetalhesModal.tsx  # Modal com info do exercício
│       └── ExercicioHistoricoModal.tsx # Modal com execuções anteriores
├── hooks/
│   └── useExercicioExecucao.ts         # Hook principal da execução
├── utils/
│   ├── exercicio.utils.ts              # Funções utilitárias
│   └── exercicioLookup.ts              # Cache de nomes por ID
├── constants/
│   └── exercicio.constants.ts          # Status e constantes
└── types/
    └── exercicio.types.ts              # Tipagens do sistema
```

---

## 🔄 **Fluxo de Funcionamento**

### **1. Navegação**
```
/alunos-rotinas/:id → Modal "Ir para Execução"
        ↓
/execucao-rotina/selecionar-treino/:rotinaId
        ↓  
/execucao-rotina/executar-treino/:sessaoId
        ↓
Finalização → Volta para origem
```

### **2. Componentes Principais**

**ExecucaoSelecionarTreino.tsx:**
- Lista sessões da rotina (em_aberto, pausada, concluida)
- Sugere próximo treino baseado na sequência
- Cria nova sessão ou continua pausada
- Navega para execução

**ExecucaoExecutarTreino.tsx:**
- Verifica permissões (PT ou aluno)
- Carrega dados da sessão
- Determina modo de execução
- Renderiza componente Executor

**Executor.tsx:**
- Interface unificada para PT e aluno
- Controla cronômetro da sessão
- Renderiza lista de exercícios
- Gerencia modais (cronômetros, detalhes, histórico)
- Botões pausar/finalizar

---

## ⚙️ **Hook Principal**

**useExercicioExecucao.ts:**
```typescript
const {
  exercicios,                 // Array com exercícios e progresso
  loading,                    // Estado de carregamento
  tempoSessao,               // Cronômetro em segundos
  atualizarSerieExecutada,   // Salva dados de uma série
  pausarSessao,              // Pausa e salva progresso
  salvarExecucaoCompleta,    // Finaliza sessão + arquivamento
} = useExercicioExecucao(sessaoData, modoExecucao, cronometroPausado);
```

**Responsabilidades:**
- Carrega exercícios e progresso salvo
- Gerencia cronômetro da sessão
- Salva progresso em `execucoes_series`
- Detecta rotina completa e arquiva automaticamente

---

## 🎮 **Componentes de Entrada**

### **RegistroSerieSimples.tsx**
**Entrada para séries normais:**
- Repetições executadas
- Carga utilizada  
- Dropset (opcional)
- Observações
- Peso corporal (campos bloqueados + estilo amarelo)

### **RegistroSerieCombinada.tsx**
**Entrada para bi-sets/super-sets:**
- Exercício 1: repetições + carga
- Exercício 2: repetições + carga
- Botões detalhes/histórico por exercício
- Peso corporal individual

---

## ⏱️ **Sistema de Cronômetros**

### **CronometroSerie.tsx**
- Ativado automaticamente após completar série
- Intervalo: `intervalo_apos_serie` ou 60s padrão
- Modal com timer regressivo
- Botão "Pular" para avançar

### **CronometroExercicio.tsx**
- Ativado após último exercício de uma série
- Intervalo: `intervalo_apos_exercicio` ou 120s padrão
- Exibe exercício atual → próximo exercício
- Modal com timer regressivo

---

## 🗄️ **Modais de Informação**

### **ExercicioDetalhesModal.tsx**
- Mostra músculos primários/secundários
- Instruções de execução formatadas
- Imagens, vídeos e mídias
- Dicas de segurança

### **ExercicioHistoricoModal.tsx**
- Execuções anteriores do exercício
- Progressão de cargas/repetições
- Gráficos de evolução

---

## 🔍 **Sistema de Lookup**

**exercicioLookup.ts:**
- Cache global de exercícios em memória
- Busca nome/equipamento por ID
- Performance otimizada com memoização
- **Regra:** NUNCA persistir nome, sempre lookup

```typescript
const { lookup } = useExercicioLookup(['id1', 'id2']);
const nome = lookup['exercicio-id']?.nome || 'Exercício';
```

---

## 📊 **Tipos de Dados**

### **SessaoData:**
```typescript
interface SessaoData {
  id: string;
  rotina_id: string;
  treino_id: string;
  aluno_id: string;
  status: 'em_aberto' | 'em_andamento' | 'pausada' | 'concluida';
  data_execucao: string;
  tempo_total_minutos?: number;
  rotinas?: { nome: string; permite_execucao_aluno: boolean };
  treinos?: { nome: string };
  alunos?: { nome_completo: string };
}
```

### **ExercicioData:**
```typescript
interface ExercicioData {
  id: string;
  exercicio_1_id: string;
  exercicio_2_id?: string;
  ordem: number;
  intervalo_apos_exercicio?: number;
  equipamento_1?: string;
  equipamento_2?: string;
  series: SerieData[];
}
```

---

## 🎯 **Modos de Execução**

### **Modo Personal Trainer:**
- Acesso total a qualquer rotina de seus alunos
- Não valida completude das séries
- Header mostra nome do aluno
- Navegação: volta para `/alunos-rotinas/:id`

### **Modo Aluno:**
- Só acessa se `permite_execucao_aluno = true`
- Só suas próprias rotinas
- Modal de aviso se finalizar sessão incompleta
- Header mostra saudação pessoal
- Navegação: volta para `/index-aluno`

---

## 🗂️ **Persistência de Dados**

### **Durante Execução:**
- `execucoes_sessao.status` → 'em_andamento'
- `execucoes_series` → dados executados por série
- Cronômetro salvo em `tempo_total_minutos`

### **Ao Pausar:**
- `execucoes_sessao.status` → 'pausada'
- Progresso mantido em `execucoes_series`
- Pode continuar de onde parou

### **Ao Finalizar:**
- `execucoes_sessao.status` → 'concluida'
- Sistema verifica se rotina está completa
- Se sim: arquivamento automático + PDF + limpeza

---

## 🚦 **Estados e Validações**

### **Status de Sessão:**
- `em_aberto` - Pode iniciar execução
- `em_andamento` - Em execução ativa
- `pausada` - Pausada, pode continuar
- `concluida` - Finalizada, não pode alterar

### **Validações:**
- Rotina deve estar "Ativa"
- Sessão não pode estar "concluida" ou "cancelada"
- Aluno só acessa com permissão
- PT deve ser dono da rotina (RLS)

### **Regras de Peso Corporal:**
- Exercícios com `equipamento = "Peso Corporal"`
- Campos de carga ficam amarelos e desabilitados
- Valor padrão: 0 (não editável)

---

## 🔄 **Arquivamento Automático**

### **Trigger:**
Quando todas as `execucoes_sessao` de uma rotina ficam `status = 'concluida'`

### **Processo:**
1. Detecta rotina completa
2. Gera PDF com estatísticas
3. Upload para Cloudflare R2
4. Salva em `rotinas_arquivadas` com URL do PDF
5. Remove rotina das tabelas ativas

### **Resultado:**
- Sistema limpo e performático
- Histórico preservado com PDF
- Dados sumarizados para relatórios

---

## 🔧 **Configuração Necessária**

### **Rotas (App.tsx):**
```typescript
<Route path="/execucao-rotina/selecionar-treino/:rotinaId" element={<PTLayout />}>
  <Route index element={<ExecucaoSelecionarTreino />} />
</Route>
<Route path="/execucao-rotina/executar-treino/:sessaoId" element={<PTLayout />}>
  <Route index element={<ExecucaoExecutarTreino />} />
</Route>
```

### **Navegação:**
```typescript
// De qualquer lista de rotinas
navigate(`/execucao-rotina/selecionar-treino/${rotinaId}`)
```

### **Dependências:**
- `@/components/ui/*` - Componentes base
- `@/hooks/useAuth` - Autenticação
- `@/hooks/useToast` - Notificações
- `@/integrations/supabase/client` - Database

---

## 📋 **Checklist de Funcionamento**

- [ ] Tabela `execucoes_sessao` com sessões geradas
- [ ] Constraint única em `execucoes_series`
- [ ] RLS configurado nas tabelas
- [ ] Edge Functions para PDF e upload
- [ ] Bucket Cloudflare configurado
- [ ] Componentes UI disponíveis
- [ ] Tipos TypeScript atualizados

*Versão: 2.0 | Status: Sistema completo e funcional*