# Documentação: Sistema de Execução de Rotinas

## 1. Visão Geral da Solução

O sistema de execução de rotinas permite que professores ou alunos iniciem e registrem o progresso de um treino em tempo real. O fluxo é otimizado para uma experiência de usuário fluida, com foco em simplicidade, contagem regressiva de intervalos e registro de desempenho (cargas e repetições).

## 2. Estrutura de Diretórios e Arquivos

Os arquivos mais importantes para o processo de execução de rotinas estão localizados nos seguintes diretórios:

src/
├── components/
│   ├── rotina/
│   │   └── execucao/
│   │       ├── Executor.tsx
│   │       └── shared/
│   │           ├── CronometroExercicio.tsx
│   │           ├── CronometroSerie.tsx
│   │           ├── ExercicioDetalhesModal.tsx
│   │           ├── ExercicioHistoricoModal.tsx
│   │           ├── RegistroSerieCombinada.tsx
│   │           └── RegistroSerieSimples.tsx
├── hooks/
│   ├── useExercicioExecucao.ts
│   └── useExercicioLookup.ts
├── pages/
│   ├── ExecucaoSelecionarTreino.tsx
│   └── ExecucaoExecutarTreino.tsx
├── types/
│   └── exercicio.types.ts
└── utils/
└── exercicio.utils.ts

---

## 3. Fluxo de Execução de Rotina

O processo de execução é dividido em duas etapas principais, gerenciadas por duas páginas distintas:

1.  **Seleção do Treino (`ExecucaoSelecionarTreino.tsx`):**
    * Esta página exibe a lista de treinos de uma rotina específica, mostrando o status atual de cada sessão (`'em_aberto'`, `'em_andamento'`, `'pausada'`, `'concluida'`).
    * A lógica de seleção, que decide se o usuário pode iniciar ou continuar um treino, é baseada nos dados recuperados do banco de dados e tipados por **`exercicio.types.ts`**.

2.  **Execução do Treino (`ExecucaoExecutarTreino.tsx`):**
    * Atua como o "container" do treino em si. É responsável por carregar os dados da sessão e do perfil do usuário e passá-los para o componente principal, o `Executor`.
    * Também gerencia a lógica de navegação e o modal de confirmação de pausa, garantindo que o progresso seja salvo antes de o usuário sair.

---

## 4. Componentes da Interface de Usuário

* **`Executor.tsx`**: O componente central que orquestra toda a experiência de execução. Ele gerencia o estado da sessão, a progressão entre exercícios e séries, exibe a interface de registro de desempenho e integra os modais de cronômetro e detalhes.
* **`RegistroSerieSimples.tsx` e `RegistroSerieCombinada.tsx`**: Componentes reutilizáveis para a entrada de dados. Eles fornecem a interface para o usuário registrar o número de repetições e a carga (peso) para cada tipo de série e chamam o `onSave` para salvar o progresso.
* **`CronometroSerie.tsx` e `CronometroExercicio.tsx`**: Modais de cronômetro que implementam uma contagem regressiva para os intervalos de descanso entre séries e entre exercícios, utilizando as constantes de tempo definidas em **`exercicio.constants.ts`**.
* **`ExercicioDetalhesModal.tsx`**: Exibe informações detalhadas sobre um exercício, como descrição e instruções de execução.
* **`ExercicioHistoricoModal.tsx`**: Busca e exibe o histórico de execuções de um exercício específico, permitindo ao usuário acompanhar sua evolução.

---

## 5. Hooks e Lógica de Negócio

* **`useExercicioExecucao.ts`**: Este é o principal hook de lógica de negócios. Ele centraliza a busca de dados do treino, a manipulação do estado da sessão e das séries, e as funções para salvar os registros e finalizar o treino, interagindo diretamente com o Supabase.
* **`useExercicioLookup.ts`**: Um hook de performance otimizada, crucial para buscar os nomes e detalhes de todos os exercícios do banco de dados e exibi-los rapidamente nos modais e na interface do `Executor`.

---

## 6. Dependências e Arquivos Essenciais

Com base nos imports e na lógica dos arquivos, os seguintes arquivos são absolutamente essenciais para o funcionamento do fluxo de execução, além dos componentes de UI:

* **`exercicio.types.ts`**: **Extremamente importante.** Define todas as interfaces e tipos de dados utilizados no fluxo de execução, como `SessaoData`, `UserProfile`, `ExercicioData` e `SerieData`. Sem este arquivo, a comunicação entre os componentes e o backend seria insegura e propensa a erros.
* **`exercicio.constants.ts`**: Contém as constantes e mensagens de sistema, como os status da sessão (`SESSAO_STATUS`) e tempos de intervalo padrão. O `Executor.tsx` e o `useExercicioExecucao.ts` dependem destas constantes para gerenciar o estado e exibir as mensagens corretas.
* **`exercicio.utils.ts`**: Um arquivo de utilidades que agrupa a lógica de negócios para manipulação de dados, como a formatação de tempo (`formatarTempo`), a verificação do tipo de série (`ehSerieCombinada`) e a preparação dos dados para serem enviados ao backend. O `Executor` e o `useExercicioExecucao` o utilizam extensivamente.
* **`supabase/client.ts` e `supabase/types.ts`**: São os arquivos que gerenciam a conexão e a tipagem do backend. Todas as operações de busca, inserção e atualização de dados dependem deles.