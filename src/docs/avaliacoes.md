# 🏋️ Sistema de Avaliações Físicas

Este documento detalha a arquitetura e o fluxo da funcionalidade de Avaliações Físicas, uma ferramenta essencial para o acompanhamento do progresso dos alunos.

---

## 1. Arquitetura de Arquivos

A funcionalidade é dividida entre a visão do Professor e a do Aluno, com base nos arquivos analisados. A lógica de negócio e as definições de tipo estão atualmente duplicadas dentro de cada componente de página.

```
src/
├── pages/
│   ├── AlunosAvaliacaoDetalhes.tsx  # (Visão do PT) Exibe os detalhes completos de uma avaliação.
│   └── AvaliacoesAluno.tsx          # (Visão do Aluno) Lista as avaliações e exibe detalhes em uma modal.
│
├── hooks/
│   └── useAuth.ts                   # Utilizado para obter o ID do usuário logado (PT ou Aluno).
│
├── integrations/supabase/
│   └── client.ts                    # Cliente de conexão com o Supabase.
│
└── supabase/functions/
    └── get-image-url/
        └── index.ts                 # Função para gerar URLs assinadas e seguras para as imagens.
```

---

## 2. Visão Geral

O sistema de avaliações permite que Professor registrem e analisem dados antropométricos e fotográficos de seus alunos. Os alunos, por sua vez, podem visualizar seu histórico completo de avaliações, acompanhar a evolução e ver as observações de seus treinadores.

O fluxo é dividido em duas perspectivas principais: a do Professor (criação e gerenciamento) e a do Aluno (visualização e acompanhamento).

---

## 3. Conceitos e Tecnologias Chave

-   **Modelo de Dados (`avaliacoes_fisicas`):** A tabela central no Supabase armazena todas as medidas (peso, altura, circunferências), o IMC calculado, observações do PT e os caminhos para as fotos de progresso.
-   **Armazenamento de Imagens (Supabase Storage):** As fotos de progresso (frente, lado, costas) são salvas em um bucket privado no Supabase Storage, garantindo que não sejam publicamente acessíveis.
-   **URLs Seguras (Edge Function `get-image-url`):** Para exibir as imagens de forma segura, o frontend não acessa o bucket diretamente. Em vez disso, ele invoca uma Edge Function que valida a autenticação do usuário e gera uma URL assinada e temporária para cada imagem. Isso previne o acesso não autorizado às fotos dos alunos.
-   **Segurança de Acesso (RLS - Row Level Security):** Políticas de segurança no nível da linha do banco de dados garantem que:
    -   Um **Professor** só pode criar, ver, editar ou excluir avaliações de alunos que estão diretamente vinculados a ele.
    -   Um **Aluno** só pode visualizar suas próprias avaliações.

---

## 4. Fluxo do Professor

Com base nos arquivos analisados, a funcionalidade implementada para o PT é a seguinte:

### 4.1. Detalhes da Avaliação (`AlunosAvaliacaoDetalhes.tsx`)
-   Esta tela é acessada pelo PT para visualizar os detalhes de uma avaliação específica de um aluno.
-   A página busca os dados do aluno e da avaliação, validando as permissões para garantir que o PT só acesse seus próprios alunos.
-   As informações são apresentadas de forma organizada em cards:
    -   **Card de Fotos:** Exibe as 3 fotos de progresso.
    -   **Card de Medidas Principais:** Peso, altura e IMC (com classificação colorida).
    -   **Cards de Medidas Corporais:** Detalhamento de tronco e membros.
    -   **Card de Análise de Simetria:** Calcula e exibe a simetria percentual entre membros (braços, coxas, etc.), um diferencial importante para a análise do PT.
    -   **Card de Observações:** Exibe as notas do PT.

---

## 5. Fluxo do Aluno

A visão do aluno é focada no consumo dos dados e no acompanhamento do seu próprio progresso.

### 5.1. Tela Principal de Avaliações (`AvaliacoesAluno.tsx`)
-   O aluno acessa a página "Minhas Avaliações" a partir de seu menu.
-   A página busca e exibe **apenas as suas próprias avaliações**, ordenadas da mais recente para a mais antiga.
-   **Card de Evolução:** Se houver mais de uma avaliação, um card no topo resume a evolução de peso entre a primeira e a última avaliação.
-   **Lista de Avaliações:** Cada item na lista é um resumo que contém Data, Peso, Altura, IMC, contagem de fotos e um preview das observações.
-   **Botão de Detalhes:** Cada item possui um botão (`<Eye />`) para abrir os detalhes completos.

### 5.2. Detalhes da Avaliação (Modal em `AvaliacoesAluno.tsx`)
   Ao clicar em "Detalhes", uma interface modal responsiva é aberta, garantindo uma boa experiência tanto em desktops quanto em dispositivos móveis.
-   O conteúdo desta modal espelha a tela de detalhes do PT, garantindo consistência visual e apresentando os mesmos cards: Fotos, Medidas Principais, Medidas Corporais, Análise de Simetria e Observações.
-   **Otimização:** As imagens só são carregadas do Storage quando o modal é aberto, evitando sobrecarregar a tela de listagem principal.

---

## 6. Pontos Importantes e Observações

- **Consistência de UI e Responsividade:** A tela de detalhes da avaliação é visualmente idêntica para o PT e para o Aluno, mudando apenas o contêiner (página vs. modal). A experiência de modais foi unificada em todo o projeto para garantir consistência, utilizando um componente responsivo que se adapta a telas grandes e dispositivos móveis.
- **Segurança:** O uso de RLS no Supabase é o pilar de segurança que impede vazamento de dados entre usuários.
- **Duplicação de Código:** Atualmente, a interface `AvaliacaoFisica` e as funções de cálculo (`getIMCClassification`, `calcularDiferenca`, `calcularSimetria`) estão duplicadas nos arquivos `AlunosAvaliacaoDetalhes.tsx` e `AvaliacoesAluno.tsx`.

### 6.1. Sugestão de Melhoria

Para melhorar a manutenibilidade e seguir o princípio DRY (Don't Repeat Yourself), é recomendado refatorar o código duplicado:

1.  **Centralizar Tipos:** Mover a interface `AvaliacaoFisica` para um arquivo compartilhado, como `src/types/avaliacao.ts`.
2.  **Centralizar Utilitários:** Mover as funções de cálculo para um arquivo de utilitários, como `src/utils/calculations.ts`.

Isso tornará o código mais limpo e fácil de manter, pois qualquer alteração na lógica de cálculo ou na estrutura de dados precisará ser feita em apenas um lugar.

---