# Documentação: Sistema de Criação de Rotinas

## 1. Estrutura de Diretórios e Arquivos

O projeto segue uma arquitetura modular, onde cada parte da aplicação tem uma responsabilidade bem definida. Os arquivos mais importantes para o processo de criação de rotinas estão localizados nos seguintes diretórios:

src/
├── components/
│   ├── rotina/
│   │   ├── RotinaDetalhesModal.tsx
│   │   ├── criacao/
│   │   │   ├── SerieCombinada.tsx
│   │   │   └── SerieSimples.tsx
│   │   └── execucao/
│   │       └── shared/
│   │           └── ExercicioDetalhesModal.tsx
│   └── ui/
│       └── CustomSelect.tsx
├── hooks/
│   ├── useAuth.tsx
│   ├── useExercicioLookup.ts
│   └── useExercicios.ts
├── integrations/
│   └── supabase/
│       ├── client.ts
│       └── types.ts
├── pages/
│   ├── PaginaRotinas.tsx
│   ├── RotinaCriacao.tsx
│   └── NovoModelo.tsx
└── types/
└── rotina.types.ts

---

## 2. Visão Geral da Solução

O sistema foi projetado para permitir que os professores criem e editem rotinas de treino, associando-as a alunos. A solução é baseada em React com TypeScript e utiliza o Supabase como backend para autenticação e banco de dados.

O processo de criação de uma rotina é dividido em etapas, gerenciadas pelo componente principal **`RotinaCriacao.tsx`**. A solução se baseia em uma arquitetura de módulos reutilizáveis, onde cada componente e hook tem uma responsabilidade bem definida.

---

## 3. Estrutura de Dados e Tipagem

A tipagem é central para a robustez da aplicação. Os modelos de dados são definidos nos seguintes arquivos:

* **`rotina.types.ts`**: Contém as interfaces e tipos que definem as estruturas de dados de alto nível, como `FiltrosExercicio`, `RotinaStorage`, `ExercicioInfo` e as constantes do sistema (como `OBJETIVOS` e `DIFICULDADES`). Este arquivo é o principal "dicionário" de tipos da aplicação.
* **`NovoModelo.tsx`**: Define as interfaces `ExercicioModelo` e `SerieModelo`, que representam a estrutura de dados durante o processo de criação de uma rotina, incluindo a possibilidade de `SerieCombinada`.
* **`types.ts`**: Gerado a partir do esquema do Supabase, este arquivo em `supabase/types` contém a tipagem completa das tabelas do banco de dados (por exemplo, `Tables<'exercicios'>`), garantindo que a comunicação com o backend seja segura e tipada.

---

## 4. Componentes da Interface de Usuário

Os seguintes componentes são os blocos de construção do fluxo de criação de rotinas:

* **`PaginaRotinas.tsx`**: A página inicial do sistema. É o ponto de entrada para a criação de novas rotinas, oferecendo ao usuário duas opções principais:
    1.  **Criar do Zero**: Iniciar uma rotina em branco, permitindo total liberdade de customização.
    2.  **Usar um Modelo**: Iniciar a rotina a partir de um dos modelos pré-existentes, agilizando o processo.

    A página gerencia o estado da lista de rotinas, filtros e o modal de detalhes, que é utilizado para visualizar rotinas já criadas.
* **`RotinaCriacao.tsx`**: O componente principal que orquestra o fluxo de criação. Ele gerencia as etapas (configuração, treinos, exercícios) e lida com a navegação entre elas.
* **`ExercicioModal.tsx`**: Um modal reutilizável para a seleção de exercícios. Ele utiliza o `useExercicios` para buscar os dados e o `ExercicioDetalhesModal` para exibir informações adicionais sobre cada exercício.
* **`ExercicioDetalhesModal.tsx`**: Exibe detalhes completos sobre um exercício, como descrição e instruções. Ele busca os dados de forma assíncrona do Supabase.
* **`FiltrosRotina.tsx`**: Responsável por renderizar os filtros de busca. É utilizado em `PaginaRotinas.tsx` para permitir que o usuário refine a lista de rotinas por objetivo, frequência e dificuldade.
* **`RotinaDetalhesModal.tsx`**: Exibe uma visão detalhada de uma rotina específica, com seus treinos e exercícios, e utiliza o `useExercicioLookup` para buscar os nomes dos exercícios.
* **`SerieSimples.tsx` e `SerieCombinada.tsx`**: Componentes reutilizáveis para renderizar a interface de uma série de treino, seja ela simples (um exercício) ou combinada (dois exercícios). Eles contêm a lógica de inputs e botões para gerenciar as repetições e o intervalo.
* **`CustomSelect.tsx`**: Um componente de seleção (dropdown) personalizado, usado para padronizar a experiência de usuário em vários lugares, como em **`FiltrosRotina.tsx`**.

---

## 5. Hooks Customizados e Lógica de Negócio

* **`useAuth.tsx`**: Hook para gerenciar o estado de autenticação do usuário. Ele se conecta ao `AuthContext.tsx` e fornece informações sobre o usuário logado, estado de carregamento e funções como `signOut`.
* **`useExercicioLookup.ts`**: Um hook de performance otimizada que cria um cache global de exercícios. Ele busca todos os exercícios do banco de dados Supabase uma única vez para evitar múltiplas requisições, melhorando a velocidade de renderização da interface.
* **`useExercicios.ts`**: Hook para gerenciar a busca e o estado de exercícios, separando-os em `exerciciosPadrao` e `exerciciosPersonalizados`. Ele utiliza o `useAuth` para buscar os dados de forma correta.

---

## 6. Integração com o Backend (Supabase)

O arquivo **`supabase/client.ts`** é a única fonte de verdade para a comunicação com o banco de dados. Ele configura o cliente Supabase, garantindo que as chaves de API sejam gerenciadas corretamente e que a persistência da sessão seja mantida. Todos os outros arquivos que precisam se comunicar com o banco de dados (como `useExercicioLookup.ts` e `RotinaDetalhesModal.tsx`) importam diretamente este cliente.