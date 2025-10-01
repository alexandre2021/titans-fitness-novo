# 💬 Sistema de Mensagens

Este documento descreve a arquitetura e o fluxo de dados do sistema de mensagens da plataforma, projetado para ser intuitivo e eficiente, seguindo um modelo similar ao de aplicativos populares como o WhatsApp.

---

## 1. Visão Geral

O sistema de mensagens permite que Personal Trainers (PTs) se comuniquem diretamente com os alunos que os seguem. A interface principal é um "drawer" (gaveta lateral) que, ao ser aberto, exibe uma lista unificada de:

1.  **Conversas existentes**, ordenadas pela mensagem mais recente.
2.  **Alunos seguidores** com quem ainda não há uma conversa iniciada.

Ao clicar em qualquer item da lista, o sistema abre a tela de chat correspondente, criando uma nova conversa se ela ainda não existir. O chat permite envio e recebimento de mensagens em tempo real.

---

## 2. Arquitetura de Arquivos

A funcionalidade é distribuída entre hooks de lógica, componentes de UI e o backend do Supabase.

```
src/
├── components/
│   └── messages/
│       ├── MessageDrawer.tsx      # 🎨 UI principal: gaveta de mensagens
│       └── ChatView.tsx           # 💬 UI do chat ativo com mensagens
│
├── hooks/
│   ├── useConversas.tsx           # 🧠 Lógica central para buscar e gerenciar conversas
│   ├── useAlunosSeguidores.tsx    # 🎣 Hook para buscar a lista de alunos que seguem o PT
│   └── useMensagens.tsx           # 📨 Hook para enviar/receber mensagens de uma conversa
│
├── integrations/supabase/
│   └── types.ts                   # 📘 Typing do banco de dados
│
└── supabase/
    ├── functions/
    │   └── create_conversation_with_aluno/
    │       └── index.ts           # ⚡ Edge Function para criar/encontrar conversas
    └── ...
```

---

## 3. Descrição dos Componentes

### 3.1. Hooks (Lógica de Negócio)

#### `src/hooks/useConversas.tsx`
-   **Responsabilidade**: É o cérebro do sistema de mensagens.
-   **O que faz**:
    -   Chama a função RPC `get_minhas_conversas` do Supabase para buscar todas as conversas existentes do usuário logado.
    -   Utiliza o hook `useAlunosSeguidores` para obter a lista de contatos (alunos seguidores).
    -   **Mescla as duas listas**: cria uma lista unificada que mostra conversas ativas no topo e contatos sem conversa abaixo.
    -   Expõe a função `iniciarConversa`, que invoca a Edge Function `create_conversation_with_aluno` para criar uma nova conversa ou obter o objeto completo da conversa criada.
    -   Gerencia os estados de `loading` para a lista e `loadingConversa` para a criação de uma nova conversa.
    -   Mantém subscription Realtime para atualizar a lista quando novas mensagens chegam.
-   **Retorno**:
    ```typescript
    {
      conversas: ConversaUI[],
      loading: boolean,
      loadingConversa: boolean,
      iniciarConversa: (conversaPlaceholder: ConversaUI) => Promise<ConversaUI | null>,
      refetchConversas: () => Promise<void>
    }
    ```

#### `src/hooks/useAlunosSeguidores.tsx`
-   **Responsabilidade**: Fornecer uma lista de todos os alunos que seguem o PT logado.
-   **O que faz**:
    -   Realiza uma query na tabela `alunos_professores` para encontrar os `aluno_id` associados ao `professor_id` atual.
    -   Busca os dados completos de cada aluno (nome, avatar completo com tipo/letra/cor) da tabela `alunos`.
    -   Retorna a lista de alunos seguidores, que é consumida pelo `useConversas`.
-   **Retorno**:
    ```typescript
    {
      alunos: AlunoSeguidor[],
      loading: boolean
    }
    ```

#### `src/hooks/useMensagens.tsx` ⭐ NOVO
-   **Responsabilidade**: Gerenciar mensagens de uma conversa específica.
-   **O que faz**:
    -   Busca todas as mensagens de uma conversa específica via `conversa_id`, ordenadas cronologicamente.
    -   Mantém subscription Realtime para receber novas mensagens instantaneamente.
    -   Expõe a função `enviarMensagem` que:
        -   Insere nova mensagem na tabela `mensagens` com `remetente_id` e `conteudo`.
        -   Atualiza `last_message_id` e `updated_at` da conversa automaticamente.
    -   Gerencia estados de `loading` (busca inicial) e `sending` (envio de mensagem).
    -   Marca cada mensagem como `isMine` (boolean) para renderização diferenciada no UI.
-   **Retorno**:
    ```typescript
    {
      mensagens: Mensagem[],
      loading: boolean,
      sending: boolean,
      enviarMensagem: (conteudo: string) => Promise<boolean>,
      refetch: () => Promise<void>
    }
    ```

### 3.2. Componentes de UI

#### `src/components/messages/MessageDrawer.tsx`
-   **Responsabilidade**: Renderizar a interface do sistema de mensagens (drawer lateral).
-   **O que faz**:
    -   Utiliza o hook `useConversas` para obter a lista unificada de conversas e contatos.
    -   Renderiza a lista de itens (`ConversaItem`), exibindo:
        -   Avatar (imagem ou letra com cor de fundo)
        -   Nome do contato
        -   Última mensagem ou "Inicie uma conversa"
    -   Implementa a lógica de clique (`handleItemClick`):
        -   Se conversa existe (`conversa.id` não vazio): define como `conversaAtiva` e exibe o chat.
        -   Se não existe: chama `iniciarConversa`, aguarda retorno e define como `conversaAtiva`.
    -   Gerencia a transição entre a lista de conversas e a tela de chat ativa.
    -   Contém barra de busca para filtrar conversas por nome.
    -   Exibe estados de loading durante operações assíncronas.

#### `src/components/messages/ChatView.tsx` ⭐ NOVO
-   **Responsabilidade**: Renderizar o chat ativo com histórico de mensagens e input para envio.
-   **O que faz**:
    -   Utiliza o hook `useMensagens` passando `conversa.id`.
    -   Renderiza lista de mensagens com scroll automático para a última.
    -   Diferencia visualmente mensagens próprias (à direita, fundo azul/primary) de mensagens recebidas (à esquerda, fundo cinza/muted).
    -   Exibe avatar do outro participante nas mensagens recebidas (renderização condicional: Avatar component para imagens, div simples para letras).
    -   Formata timestamp das mensagens usando `date-fns`:
        -   Hoje: "HH:mm"
        -   Ontem: "Ontem HH:mm"
        -   Outros: "dd/MM/yyyy às HH:mm"
    -   Input de mensagem com:
        -   Envio via botão "Send"
        -   Envio via Enter (Shift+Enter para nova linha)
        -   Desabilita durante envio (estado `sending`)
        -   Input controlado com `value` e `onChange`
    -   Exibe placeholder quando não há mensagens ainda.
    -   Usa `messagesEndRef` para auto-scroll suave

### 3.3. Backend (Supabase)

#### Tabelas do Banco de Dados
-   `conversas`: Armazena o ID de cada conversa e metadados como `updated_at` e `last_message_id`.
-   `participantes_conversa`: Tabela de junção que associa `user_id` a `conversa_id`.
-   `mensagens`: Armazena o conteúdo de cada mensagem, com `remetente_id`, `conversa_id`, `conteudo`, `created_at` e `lida_em`.

#### Função RPC: `get_minhas_conversas()`
-   **Responsabilidade**: Buscar de forma eficiente todas as conversas de um usuário.
-   **O que faz**:
    -   Encontra todas as `conversa_id` do usuário logado via `participantes_conversa`.
    -   Para cada conversa, identifica o **outro participante**.
    -   Busca os detalhes completos do outro participante (seja aluno ou professor):
        -   Nome completo
        -   Avatar (URL, tipo, letra, cor)
    -   Busca a última mensagem de cada conversa via `last_message_id`.
    -   Retorna um objeto "achatado" com todos os dados prontos para consumo.
    -   Ordena por `ultima_mensagem_criada_em DESC NULLS LAST` (conversas sem mensagem vão para o final).
-   **Retorno**: Array de objetos com estrutura:
    ```typescript
    {
      conversa_id: string,
      outro_participante_id: string,
      outro_participante_nome: string,
      outro_participante_avatar: string | null,
      outro_participante_avatar_type: string | null,
      outro_participante_avatar_letter: string | null,
      outro_participante_avatar_color: string | null,
      ultima_mensagem_conteudo: string | null,
      ultima_mensagem_criada_em: string | null,
      remetente_ultima_mensagem_id: string | null
    }
    ```

#### Edge Function: `create_conversation_with_aluno`
-   **Responsabilidade**: Criar uma nova conversa ou encontrar uma existente.
-   **O que faz**:
    -   Recebe o `p_aluno_id` como parâmetro no body da requisição.
    -   Verifica se já existe uma conversa entre o usuário logado (PT) e o aluno buscando em `participantes_conversa`.
    -   Se existir: retorna o `conversa_id` existente.
    -   Se não existir:
        1. Cria um novo registro em `conversas`
        2. Adiciona ambos os usuários em `participantes_conversa`
        3. Retorna o novo `conversa_id`
-   **Retorno**: String com o UUID da conversa (sem aspas ou wrapping JSON extra).

---

## 4. Fluxo de Dados

### 4.1. Fluxo de Abertura do Drawer
```
1. Usuário clica no ícone de mensagens
2. MessageDrawer abre (isOpen = true)
3. useConversas busca:
   - Conversas existentes (via get_minhas_conversas RPC)
   - Alunos seguidores (via useAlunosSeguidores)
4. Mescla e ordena as listas
5. Renderiza ConversaItem para cada entrada
```

### 4.2. Fluxo de Início de Conversa
```
1. Usuário clica em um aluno sem conversa (conversa.id vazio)
2. handleItemClick chama iniciarConversa(conversa)
3. iniciarConversa invoca Edge Function create_conversation_with_aluno
4. Edge Function:
   - Verifica se conversa existe
   - Cria nova se necessário
   - Retorna conversa_id
5. Hook atualiza estado interno com nova conversa
6. Retorna objeto ConversaUI completo
7. MessageDrawer define conversaAtiva
8. ChatView é renderizado
```

### 4.3. Fluxo de Envio de Mensagem
```
1. Usuário digita mensagem e clica Send (ou Enter)
2. ChatView chama enviarMensagem(conteudo)
3. useMensagens:
   a. Insere mensagem na tabela mensagens
   b. Atualiza last_message_id da conversa
   c. Atualiza updated_at da conversa
4. Realtime dispara evento INSERT
5. Subscription do useMensagens adiciona mensagem ao estado
6. Subscription do useConversas atualiza lista de conversas
7. UI atualiza automaticamente (scroll para última mensagem)
```

### 4.4. Fluxo de Recebimento de Mensagem
```
1. Outro usuário envia mensagem
2. INSERT na tabela mensagens
3. Realtime dispara evento:
   - Para useMensagens (se chat está aberto): adiciona mensagem
   - Para useConversas: recarrega lista (atualiza última mensagem)
4. UI atualiza automaticamente em ambos os lugares
```

---

## 5. Realtime Subscriptions

### 5.1. useConversas
-   **Canal**: `public:mensagens`
-   **Evento**: INSERT
-   **Ação**: Recarrega toda a lista de conversas para atualizar última mensagem e ordenação

### 5.2. useMensagens
-   **Canal**: `conversa:{conversaId}`
-   **Evento**: INSERT
-   **Filtro**: `conversa_id=eq.{conversaId}`
-   **Ação**: Adiciona nova mensagem ao array local sem recarregar

---

## 6. Estados e Loading

| Hook/Componente | Estado | Descrição |
|-----------------|--------|-----------|
| useConversas | loading | Carregando lista inicial de conversas |
| useConversas | loadingConversa | Criando nova conversa |
| useMensagens | loading | Carregando histórico de mensagens |
| useMensagens | sending | Enviando nova mensagem |
| MessageDrawer | conversaAtiva | Conversa atualmente aberta no chat |

---

## 7. Tratamento de Erros

-   Todos os hooks usam try/catch e console.error para logar erros
-   Funções retornam null ou false em caso de erro
-   UI deve implementar toasts/alertas para feedback ao usuário (TODO)
-   Validações:
    -   Conteúdo da mensagem não vazio (trim aplicado)
    -   Usuário autenticado antes de qualquer operação
    -   Conversa válida (conversaId não null)

### Erros Conhecidos e Soluções

**Erro: "infinite recursion detected in policy"**
- **Causa**: Políticas RLS com referências circulares
- **Solução**: Políticas reescritas com hierarquia clara (ver seção 11)

**Erro: Edge Function retorna string com aspas extras**
- **Causa**: `JSON.stringify(conversationId)` na Edge Function
- **Solução**: Retornar UUID direto ou objeto `{conversationId}`

---

## 8. Status de Implementação

### ✅ Funcionalidades Implementadas
- [x] Lista unificada de conversas e contatos
- [x] Criação automática de conversas
- [x] Envio de mensagens em tempo real
- [x] Recebimento instantâneo via Realtime
- [x] Interface completa com histórico
- [x] Avatares (imagem e letra com cor)
- [x] Formatação de timestamps
- [x] Auto-scroll para última mensagem
- [x] Enter para enviar, Shift+Enter para nova linha
- [x] Estados de loading/sending
- [x] RLS configurado sem recursão

### 🔄 Melhorias Futuras
- [ ] Indicador de "digitando..."
- [ ] Marcação de mensagens como lidas (campo `lida_em`)
- [ ] Notificações push para novas mensagens
- [ ] Contador de mensagens não lidas na lista
- [ ] Toast/alertas para erros
- [ ] Upload de imagens/arquivos
- [ ] Mensagens de voz
- [ ] Busca dentro de conversas
- [ ] Grupos (suporte a mais de 2 participantes)
- [ ] Reações a mensagens
- [ ] Mensagens temporárias
- [ ] Backup automático de conversas
- [ ] Edição/exclusão de mensagens

---

## 9. Dependências

-   `@supabase/supabase-js`: Cliente Supabase
-   `date-fns`: Formatação de datas
-   `lucide-react`: Ícones
-   `shadcn/ui`: Componentes UI (Avatar, Button, Input)

---

## 10. Considerações de Performance

-   Conversas são carregadas uma única vez e atualizadas via Realtime
-   Mensagens são carregadas por conversa (não todas de uma vez)
-   Subscriptions são limpas no unmount para evitar memory leaks
-   Auto-scroll usa `scrollIntoView` com `behavior: 'smooth'`
-   Lista de conversas usa `Map` para mesclar eficientemente

---

## 11. Segurança (RLS)

-   Row Level Security (RLS) habilitado nas tabelas:
    -   `conversas`
    -   `participantes_conversa`
    -   `mensagens`

### Políticas Implementadas

**participantes_conversa:**
- `participantes_select`: Usuário pode ver apenas registros onde `user_id = auth.uid()`
- `participantes_insert`: Usuário pode se adicionar em conversas
- `participantes_delete`: Usuário pode se remover de conversas

**conversas:**
- `conversas_select`: Usuário vê conversas das quais participa
- `conversas_insert`: Qualquer usuário autenticado pode criar conversas
- `conversas_update`: Usuário pode atualizar conversas das quais participa

**mensagens:**
- `mensagens_select`: Usuário vê mensagens de conversas das quais participa
- `mensagens_insert`: Usuário envia mensagens como ele mesmo em suas conversas
- `mensagens_update`: Usuário pode atualizar mensagens de suas conversas

### Importante
- Políticas RLS evitam referências circulares para prevenir recursão infinita
- `participantes_conversa` é a tabela base (sem subqueries para ela mesma)
- Edge Function usa `SECURITY DEFINER` com service role para operações privilegiadas