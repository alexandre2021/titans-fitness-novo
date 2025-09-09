# 🏋️ Sistema de Execução de Rotinas

Este documento descreve a arquitetura e o fluxo de funcionamento do sistema de execução de rotinas, que é compartilhado entre Personal Trainers e Alunos.

## 📂 Estrutura de Arquivos Essencial

```
src/
├── pages/
│   ├── PaginaRotinas.tsx               # ✅ Hub central para ver/gerenciar rotinas (PT e Aluno)
│   ├── ExecucaoSelecionarTreino.tsx    # 1ª etapa: Seleção de treino/sessão
│   └── ExecucaoExecutarTreino.tsx      # 2ª etapa: Coordenador da execução
├── components/
│   ├── layout/
│   │   ├── ProtectedRoutes.tsx         # Define o layout (PT ou Aluno)
│   │   └── AlunoBottomNav.tsx          # Navegação mobile do aluno
│   └── rotina/
│       ├── RotinaDetalhesModal.tsx     # Modal de detalhes para o aluno
│       └── execucao/
│           ├── Executor.tsx            # Interface unificada de execução
│           └── shared/                 # Componentes da tela de execução (mantidos)
│               ├── RegistroSerieSimples.tsx
│               ├── RegistroSerieCombinada.tsx
│               ├── CronometroSerie.tsx
│               ├── CronometroExercicio.tsx
│               ├── ExercicioDetalhesModal.tsx
│               └── ExercicioHistoricoModal.tsx
├── hooks/
│   └── useExercicioExecucao.ts         # Hook principal com toda a lógica
└── types/
    └── exercicio.types.ts              # Tipagens do sistema
```

---

## 🔄 Fluxo de Funcionamento

O fluxo de entrada é diferente para cada perfil, mas converge para as mesmas telas de execução.

### 1. Fluxo de Entrada (Personal Trainer)

1.  PT navega para a lista de seus alunos e clica em "Ver Rotinas".
2.  É direcionado para `/alunos-rotinas/:alunoId`.
3.  A rota renderiza `<PaginaRotinas modo="personal" />`, que exibe a lista de rotinas do aluno com opções de gerenciamento.
4.  Ao clicar em "Treinar", navega para a tela de seleção de treino.

### 2. Fluxo de Entrada (Aluno)

1.  Aluno clica em "Rotinas" no `AlunoBottomNav`.
2.  É direcionado para `/minhas-rotinas`.
3.  A rota renderiza `<PaginaRotinas modo="aluno" />`, que exibe suas próprias rotinas com opções limitadas.
4.  Ao clicar em "Executar Treino", navega para a tela de seleção de treino.

### 3. Fluxo de Execução (Comum a ambos)

```mermaid
graph TD
    A[PaginaRotinas.tsx] -->|Navega com state: { modo }| B(ExecucaoSelecionarTreino.tsx);
    B --> C(ExecucaoExecutarTreino.tsx);
    C --> D{Finalização};
    D --> E[Arquivamento Automático];
    E --> A;
```

---

## ⚙️ Componentes e Lógica Principal

**PaginaRotinas.tsx:**
-   **Ponto de Entrada Principal.** Renderiza a lista de rotinas.
-   A prop `modo` adapta a UI e as ações disponíveis (criar/editar vs. apenas executar).
-   É a origem da navegação para a execução de treinos para ambos os perfis.

**ProtectedRoutes.tsx:**
-   Atua como um "roteador de layout".
-   Verifica o `user_type` e renderiza o layout correto (`AlunoLayout` ou `PTLayout`).
-   Garante que as páginas de execução compartilhadas sejam exibidas com a interface correta para cada usuário.

**useExercicioExecucao.ts (Hook Principal):**
-   Recebe o `modo` ('pt' ou 'aluno') como argumento.
-   Carrega os exercícios e o progresso salvo da sessão.
-   Gerencia o cronômetro geral da sessão.
-   Valida o acesso à rotina (status 'Ativa', permissão do aluno).
-   Contém as funções `pausarSessao` e `salvarExecucaoCompleta`.
-   **Novo:** Gerencia o processo completo de arquivamento automático quando a rotina é finalizada.

**Executor.tsx:**
-   A interface de execução em si.
-   Renderiza a lista de exercícios, os cronômetros e os modais de registro.
-   É um componente "burro" que recebe a lógica do hook `useExercicioExecucao`.
-   **Atualizado:** Comportamento de finalização idêntico para PT e Aluno (sem modais de verificação de completude).

### Componentes da Interface de Execução (`/shared/`)

Estes componentes são os blocos de construção da tela do `Executor.tsx` e são essenciais para a interatividade do usuário durante o treino. Eles foram mantidos da arquitetura original e continuam com suas funcionalidades principais.

#### Componentes de Registro de Séries

-   **`RegistroSerieSimples.tsx` & `RegistroSerieCombinada.tsx`**:
    -   **Função:** Interfaces para o usuário registrar os dados de uma série. A versão `Simples` é para um exercício normal, enquanto a `Combinada` é para bi-sets/super-sets.
    -   **Campos:** Repetições executadas, carga utilizada, e um campo opcional para observações.
    -   **Comportamento:** Validam os dados e os enviam para o hook `useExercicioExecucao` para serem salvos no estado e, posteriormente, no banco de dados.

#### Componentes de Cronômetro

-   **`CronometroSerie.tsx`**:
    -   **Função:** Apresenta um modal com um timer regressivo para o descanso **entre as séries** de um mesmo exercício.
    -   **Trigger:** É acionado automaticamente após o usuário salvar os dados de uma série.
    -   **Duração:** O tempo de descanso é configurado na criação da rotina, com um valor padrão.

-   **`CronometroExercicio.tsx`**:
    -   **Função:** Apresenta um modal com um timer regressivo para o descanso **entre exercícios diferentes**.
    -   **Trigger:** É acionado automaticamente após o usuário completar a última série de um exercício.
    -   **Duração:** O tempo de descanso é configurado na criação da rotina, com um valor padrão.

#### Modais de Informação

-   **`ExercicioDetalhesModal.tsx`**:
    -   **Função:** Exibe um modal com todas as informações técnicas de um exercício.
    -   **Conteúdo:** Músculos primários/secundários, instruções de execução, dicas de segurança e as mídias (imagens/vídeos) associadas.
    -   **Acesso:** Disponível através de um ícone de "informação" no card do exercício durante a execução.

-   **`ExercicioHistoricoModal.tsx`**:
    -   **Função:** Exibe um modal com o histórico de execuções anteriores para um exercício específico.
    -   **Conteúdo:** Mostra um gráfico ou uma tabela com a progressão de cargas e repetições ao longo do tempo, ajudando o usuário a visualizar sua evolução.
    -   **Acesso:** Disponível através de um ícone de "histórico" no card do exercício.

---

## 🎯 Modos de Execução (PT vs. Aluno) - ATUALIZADO

A interface de execução é a mesma e o comportamento de finalização é idêntico para ambos os perfis:

| Característica | Modo Personal Trainer | Modo Aluno |
|---|---|---|
| **Acesso** | Acesso total a qualquer rotina de seus alunos. | Acesso apenas às suas próprias rotinas e se `permite_execucao_aluno = true`. |
| **Finalização** | **Pode finalizar a qualquer momento, sem validações de completude.** | **Pode finalizar a qualquer momento, sem validações de completude.** |
| **Interface** | O cabeçalho mostra o nome do aluno que está treinando. | O cabeçalho mostra uma saudação pessoal. |
| **Navegação** | Ao finalizar, retorna para a página de rotinas do aluno (`/alunos-rotinas/:id`). | Ao finalizar, retorna para a sua área de rotinas (`/minhas-rotinas`). |
| **Arquivamento** | Executa o processo completo de arquivamento quando finaliza a última sessão de uma rotina. | Executa o processo completo de arquivamento quando finaliza a última sessão de uma rotina. |

### Mudanças Importantes:
- **Removido:** Modal de verificação de completude para alunos
- **Unificado:** Comportamento de finalização idêntico entre PT e Aluno
- **Mantido:** Validações de acesso e interface diferenciada por perfil

---

## 💡 Diferenciação de Comportamentos

### Modal vs. Página de Detalhes

**Aluno:**
-   Clica em "Detalhes" → Abre `RotinaDetalhesModal.tsx` sobre a página atual.
-   Visualização rápida dos treinos e exercícios sem sair da página principal.

**Personal Trainer:**
-   Clica em "Detalhes" → Navega para página completa de gerenciamento.
-   Acesso completo: `/alunos-rotinas/:alunoId/:rotinaId`.

---

## 🗂️ Persistência e Arquivamento - ATUALIZADO

### Processo de Execução e Salvamento

O processo de salvar o progresso, pausar e finalizar permanece o mesmo e é gerenciado pelo `useExercicioExecucao`, que é acionado a partir do `Executor.tsx`.

### Arquivamento Automático Completo

**Quando a última sessão de uma rotina é finalizada, o sistema automaticamente:**

1. **Atualiza Status:** Rotina passa de "Ativa" para "Concluída"
2. **Verifica Completude:** Confirma que todas as sessões da rotina estão finalizadas
3. **Inicia Arquivamento Automático:**
   - Busca dados completos da rotina (exercícios, séries, execuções)
   - **Lógica FIFO:** Verifica rotinas arquivadas do aluno (limite 4)
   - **Limpeza:** Remove rotinas antigas (PDFs do Cloudflare + registros do banco)
   - **Geração PDF:** Chama edge function `gerar-pdf-conclusao`
   - **Upload:** Envia PDF para Cloudflare R2 via `upload-media`
   - **Arquivamento:** Salva metadados em `rotinas_arquivadas`
   - **Exclusão:** Remove rotina e dados relacionados da base ativa (CASCADE)

### Sistema FIFO de Rotinas Arquivadas

- **Limite:** Máximo 4 rotinas arquivadas por aluno
- **Critério:** Ordem cronológica (First In, First Out)
- **Limpeza:** Automaticamente remove rotinas mais antigas ao ultrapassar o limite
- **Recursos:** Deleta PDFs do Cloudflare e registros do banco simultaneamente

---

## 🔒 Políticas de Segurança (RLS) - NOVO

### Tabela `rotinas` - Políticas Row Level Security

**Personal Trainer:**
```sql
-- Política: "Allow authenticated PTs to manage their routines"
-- Comando: ALL (CREATE, READ, UPDATE, DELETE)
-- Condição: auth.uid() = personal_trainer_id
```

**Aluno:**
```sql
-- Política: "Allow authenticated students to view their routines"  
-- Comando: SELECT
-- Condição: auth.uid() = aluno_id

-- Política: "Allow students to update their completed routines"
-- Comando: UPDATE  
-- Condição: auth.uid() = aluno_id AND status = 'Ativa'
-- Verificação: auth.uid() = aluno_id AND status = 'Concluída'

-- Política: "Allow students to delete their completed routines"
-- Comando: DELETE
-- Condição: auth.uid() = aluno_id AND status = 'Concluída'
```

### Cascata de Exclusão

As seguintes foreign keys possuem `ON DELETE CASCADE`:
- `treinos.rotina_id` → `rotinas.id`
- `execucoes_sessao.rotina_id` → `rotinas.id`

Isso garante que ao excluir uma rotina, todos os dados relacionados são automaticamente removidos.

---

## 🐛 Sistema de Debug

O sistema possui logs extensivos para troubleshooting em desenvolvimento:

```typescript
// Exemplos de logs no console:
🚀 Entrando na execução - Resetando estados locais
🔥 DEBUG - EXERCÍCIOS ATUALIZADOS: Array(1)
💾 Finalizando sessão definitivamente - Modo: aluno
🎉 Rotina completa detectada! Iniciando processo completo...
🗄️ Iniciando processo de arquivamento da rotina...
📄 Gerando PDF de conclusão...
☁️ Fazendo upload do PDF para Cloudflare...
🗑️ Removendo rotina da base ativa...
🎉 Processo de arquivamento concluído com sucesso!
```

Estes logs permitem acompanhar todo o fluxo de execução e identificar rapidamente onde podem ocorrer falhas.

---

## 🔧 Configuração Necessária

### Rotas (App.tsx)

```typescript
// O componente ProtectedRoutes é o responsável por decidir o layout.
import ProtectedRoutes from "./components/layout/ProtectedRoutes";

<Routes>
  {/* Rotas Públicas */}
  <Route path="/login" element={<Login />} />
  
  {/* ROTAS PROTEGIDAS (PT e Aluno) */}
  <Route element={<AuthGuard><ProtectedRoutes /></AuthGuard>}>
    {/* 
      O ProtectedRoutes renderiza o layout correto (PT ou Aluno) 
      e o <Outlet /> dentro do layout renderiza a rota filha.
    */}
    
    {/* Rota do PT para ver as rotinas de um aluno específico */}
    <Route 
      path="/alunos-rotinas/:alunoId" 
      element={<PaginaRotinas modo="personal" />} 
    />
    
    {/* Rota do Aluno para ver suas próprias rotinas */}
    <Route 
      path="/minhas-rotinas" 
      element={<PaginaRotinas modo="aluno" />} 
    />
    
    {/* Rotas de Execução (Compartilhadas e renderizadas no layout correto) */}
    <Route 
      path="/execucao-rotina/selecionar-treino/:rotinaId" 
      element={<ExecucaoSelecionarTreino />} 
    />
    <Route 
      path="/execucao-rotina/executar-treino/:sessaoId" 
      element={<ExecucaoExecutarTreino />} 
    />
  </Route>
</Routes>
```

### Navegação

```typescript
// A partir da PaginaRotinas.tsx
navigate(
  `/execucao-rotina/selecionar-treino/${rotinaId}`, 
  { state: { modo: 'pt' } } // ou 'aluno'
);
```

---

## 🚀 Melhorias Implementadas

### Arquiteturais
- Centralização da lógica de rotinas em um único componente inteligente
- Eliminação de duplicação de código entre PT e Aluno
- Fluxo de navegação mais consistente e previsível
- Unificação do comportamento de finalização

### Funcionais
- **Arquivamento automático completo:** PDF, upload, limpeza, exclusão
- **Sistema FIFO robusto:** Mantém histórico organizado por aluno
- **Políticas RLS granulares:** Segurança adequada para cada perfil
- **Logs de debug extensivos:** Facilita troubleshooting e manutenção

### Experiência do Usuário
- **Processo transparente:** Usuário não precisa se preocupar com arquivamento
- **Comportamento consistente:** PT e Aluno têm mesma experiência de finalização
- **Performance otimizada:** Processo em background não trava a interface

---

*Versão: 4.0 | Status: Documento completamente atualizado e alinhado com implementação atual*