# 💬 Sistema de Mensagens

Este documento descreve a arquitetura e o fluxo de dados do sistema de mensagens da plataforma, projetado para ser intuitivo e eficiente, seguindo um modelo similar ao de aplicativos populares como o WhatsApp.

---

## 1. Visão Geral

O sistema de mensagens permite que professores se comuniquem diretamente com os alunos que os seguem. A interface principal é um "drawer" (gaveta lateral) que, ao ser aberto, exibe uma lista unificada de:

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
│   └── useMensagens.tsx           # 📨 Hook para enviar/receber mensagens de uma conversa
│
├── integrations/supabase/
│   └── types.ts                   # 📘 Typing do banco de dados
│
└── supabase/
    ├── functions/
    │   ├── create_conversation_with_aluno/
    │   │   └── index.ts           # ⚡ Edge Function para criar/encontrar conversas
    │   └── enviar-notificacao/
    │       └── index.ts           # ⚡ Edge Function para notificações do sistema
    └── ...
```

---

## 3. Descrição dos Componentes

### 3.1. Hooks (Lógica de Negócio)

#### `src/hooks/useConversas.tsx`
    -   **Lógica Centralizada**: Chama a função RPC `get_minhas_conversas_e_contatos` do Supabase, que já retorna uma lista unificada de conversas existentes e contatos (alunos seguidores) com quem ainda não há uma conversa.
    -   **Eficiência**: Elimina a necessidade de um segundo hook (`useAlunosSeguidores`) e da lógica de mesclagem no frontend, simplificando o código e reduzindo as chamadas ao banco de dados.
    -   Calcula a contagem de mensagens não lidas para cada conversa (`naoLidas`) e o total (`unreadCount`).
    -   Expõe a função `iniciarConversa` (para chats 1-para-1) e `criarGrupo` (para chats em grupo).
    -   Gerencia os estados de `loading` e `loadingConversa`.
    -   Mantém subscription Realtime para eventos de `INSERT` e `UPDATE` na tabela `mensagens`, garantindo que a lista e os contadores sejam atualizados em tempo real.
    -   **Atualização Otimista**: Ao criar ou excluir um grupo, o hook modifica o estado local imediatamente para uma resposta rápida da UI, antes de sincronizar com o servidor.
    ```typescript
    {
      conversas: ConversaUI[],
      loading: boolean,
      loadingConversa: boolean,
      unreadCount: number,
      iniciarConversa: (conversaPlaceholder: ConversaUI) => Promise<ConversaUI | null>,
      criarGrupo: (nomeGrupo: string, participantesIds: string[]) => Promise<ConversaUI | null>,
      removerParticipante: (conversaId: string, participantId: string) => Promise<boolean>,
      adicionarParticipantes: (conversaId: string, participantIds: string[]) => Promise<boolean>,
      editarGrupo: (conversaId: string, updates: { nome?: string; avatarUrl?: string }) => Promise<boolean>,
      excluirGrupo: (conversaId: string) => Promise<boolean>,
      refetchConversas: () => Promise<void>
    }
    ```

#### `src/hooks/useMensagens.tsx`
    -   Busca todas as mensagens de uma conversa específica via `conversa_id`, ordenadas cronologicamente.
    -   **Para grupos**, faz um `JOIN` para buscar os dados do perfil (nome, avatar) de cada remetente.
    -   Mantém subscription Realtime para receber novas mensagens instantaneamente.
    -   Expõe a função `enviarMensagem` que:
        -   Insere nova mensagem na tabela `mensagens` com `remetente_id` e `conteudo`.
        -   Atualiza `last_message_id` e `updated_at` da conversa automaticamente.
    -   Expõe a função `marcarComoLidas`, que atualiza o campo `lida_em` das mensagens recebidas quando o chat é aberto.
    -   Gerencia estados de `loading` (busca inicial) e `sending` (envio de mensagem).
    -   Marca cada mensagem como `isMine` (boolean) para renderização diferenciada no UI.
    ```typescript
    {
      mensagens: Mensagem[], // Agora inclui dados do remetente para grupos
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
        -   **Contador de mensagens não lidas** (`conversa.naoLidas`) por conversa.
        -   Última mensagem ou "Inicie uma conversa"
    -   Possui um botão para "Novo Grupo", que alterna a visão para o componente `CreateGroupView`.
    -   Implementa a lógica de clique (`handleItemClick`):
        -   Se conversa existe (`conversa.id` não vazio): define como `conversaAtiva` e exibe o chat.
        -   Se não existe (é um contato sem conversa): chama `iniciarConversa`, aguarda retorno e define como `conversaAtiva`.
    -   Gerencia a transição entre a lista de conversas e a tela de chat ativa.
    -   Contém barra de busca para filtrar conversas por nome.

#### `src/components/messages/GroupInfoView.tsx` ⭐ NOVO
-   **Responsabilidade**: Exibir detalhes de um grupo e permitir ações de gerenciamento.
-   **O que faz**:
    -   Mostra o nome e o avatar do grupo, com opção de edição para o criador.
    -   Lista os participantes, indicando quem é o criador.
    -   Permite ao criador adicionar ou remover participantes.
    -   Oferece a opção para o criador excluir o grupo, que aciona um diálogo de confirmação.
    -   Após a exclusão, dispara um evento global (`forceRefreshMessages`) para notificar outros componentes da mudança.

#### `src/components/messages/ChatView.tsx`
    -   Utiliza o hook `useMensagens` passando `conversa.id`.
    -   Chama `marcarComoLidas` quando o componente é montado.
    -   Renderiza lista de mensagens com scroll automático para a última.
    -   Diferencia visualmente mensagens próprias (à direita, fundo azul/primary) de mensagens recebidas (à esquerda, fundo cinza/muted).
    -   **Em grupos**, exibe o nome e o avatar do remetente de cada mensagem.
    -   Formata timestamp das mensagens usando `date-fns`:
        -   Hoje: "HH:mm"
        -   Ontem: "Ontem HH:mm"
        -   Outros: "dd/MM/yyyy às HH:mm"
    -   **Input de mensagem aprimorado**:
        -   Usa um `<textarea>` que **aumenta de altura** conforme o usuário digita.
        -   Possui um botão para abrir um **seletor de emojis** (`emoji-picker-react`).
        -   Envio via botão "Send" ou tecla Enter (Shift+Enter para nova linha).

#### `src/components/messages/CreateGroupView.tsx` ⭐ NOVO
-   **Responsabilidade**: Renderizar a interface para criação de um novo grupo.
-   **O que faz**:
    -   Utiliza o hook `useAlunosSeguidores` para listar todos os alunos que podem ser adicionados.
    -   Permite a seleção de múltiplos alunos através de checkboxes.
    -   Possui um campo para definir o nome do grupo.
    -   Ao clicar em "Criar Grupo", chama a função `criarGrupo` do hook `useConversas`.

#### `src/components/layout/ProtectedRoutes.tsx`
-   **Responsabilidade**: Renderizar os componentes globais de mensagem.
-   **O que faz**:
    -   Renderiza o `<MessagesButton />` (botão flutuante) e passa a prop `unreadCount` obtida do `useConversas`.
    -   Controla o estado de abertura do `<MessageDrawer />`.
    -   Ao fechar o drawer (`onClose`), chama `refetchConversas` para garantir que o contador de mensagens não lidas seja atualizado.

### 3.3. Backend (Supabase)

#### Tabelas do Banco de Dados
-   `conversas`: Armazena metadados da conversa.
    -   **Novas colunas**: `is_grupo` (boolean), `nome_grupo` (text), `avatar_grupo` (text).

#### Função RPC: `get_minhas_conversas()`
    -   Verifica se a conversa é um grupo (`is_grupo`).
    -   **Se for 1-para-1**: Busca os dados do outro participante.
    -   **Se for um grupo**: Busca o `nome_grupo` e `avatar_grupo`.
    -   Busca a última mensagem de cada conversa via `last_message_id`.
    -   Calcula a contagem de mensagens não lidas para cada conversa.
    -   Retorna um objeto unificado com todos os dados prontos para consumo.
    -   Ordena por `ultima_mensagem_criada_em DESC NULLS LAST` (conversas sem mensagem vão para o final).
    ```typescript
    {
      conversa_id: string,
      is_grupo: boolean,
      outro_participante_id: string | null,
      nome: string, // Nome do grupo ou do outro participante
      avatar: string | null,
      avatar_type: string | null,
      avatar_letter: string | null,
      avatar_color: string | null,
      ultima_mensagem_conteudo: string | null,
      ultima_mensagem_criada_em: string | null,
      remetente_ultima_mensagem_id: string | null,
      mensagens_nao_lidas: number
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
-   **Retorno**: Objeto com o UUID da conversa.

#### Edge Function: `create_group_conversation` ⭐ NOVO
-   **Responsabilidade**: Criar uma nova conversa em grupo.
-   **O que faz**:
    -   Recebe `nome_grupo` e um array de `participantes_ids`.
    -   Cria um novo registro na tabela `conversas` com `is_grupo = true`.
    -   Adiciona todos os participantes (incluindo o criador) à tabela `participantes_conversa`.
    -   Realiza as operações de forma atômica (se algo falhar, a conversa é removida).
-   **Retorno**: Objeto com o `conversa_id` do novo grupo.


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
2. handleItemClick no MessageDrawer invoca a Edge Function `create_conversation_with_aluno`
3. A função é chamada com o ID do aluno
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
   b. Atualiza `last_message_id` e `updated_at` da conversa (via trigger no DB).
   c. Atualiza updated_at da conversa (via trigger no DB)
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
   - Para `useMensagens` (se chat está aberto): adiciona a nova mensagem à lista.
   - Para o `MessageDrawer` (que está ouvindo mudanças): ele refaz a chamada à RPC `get_conversas_e_contatos` para obter a lista atualizada.
4. Se o chat é aberto, `useMensagens` chama `marcarComoLidas`.
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

## 11. Problemas Atuais e Depuração

Durante o desenvolvimento, enfrentamos desafios persistentes relacionados à sincronização de estado entre a UI e o backend, especialmente em operações de criação e exclusão de grupos.

### 11.1. Problema na Criação de Grupo

-   **Sintoma:** Ao criar um novo grupo, ele aparece brevemente na lista de conversas e depois desaparece, só sendo exibido corretamente após um refresh manual da página.
-   **Causa Raiz:** O problema é uma **condição de corrida (race condition)**.
    1.  **Ação do Usuário:** A função `criarGrupo` no hook `useConversas` realiza uma **atualização otimista**, adicionando o novo grupo ao estado local da UI imediatamente.
    2.  **Evento Realtime:** A criação do grupo no banco de dados dispara um evento `INSERT` em tempo real.
    3.  **Busca de Dados:** O hook `useConversas` ouve esse evento e, como resposta, executa uma função (`debouncedFetch`) para buscar a lista completa de conversas do servidor, a fim de garantir a consistência.
    4.  **A Falha:** Devido a um pequeno atraso na replicação do banco de dados, a busca de dados (passo 3) acontece *antes* que o novo grupo esteja disponível para ser lido pelo servidor. Como resultado, o hook busca a lista antiga (sem o novo grupo) e a renderiza, sobrescrevendo a atualização otimista e fazendo o grupo recém-criado "desaparecer".
-   **Estado Atual:** A implementação atual tenta contornar isso com um `useRef` (`recentlyCreatedGroup`) para ignorar o primeiro evento de realtime após a criação, mas o problema persiste intermitentemente.

### 11.2. Problema na Exclusão de Grupo

-   **Sintoma:** Após o criador do grupo confirmar a exclusão na tela de `GroupInfoView`, a UI não navega de volta para a lista principal de conversas. Ela fica "presa" em uma tela intermediária (a de chat, agora inválida) ou não reage.
-   **Causa Raiz:** O `MessageDrawer`, que controla a navegação entre as telas (`list`, `chat`, `group-info`), não está reagindo corretamente à remoção da `activeConversation` (o grupo excluído) da lista de `conversas` gerenciada pelo `useConversas`.
-   **Estado Atual:** A solução implementada envolve um desacoplamento da lógica:
    1.  **`GroupInfoView.tsx`:** Após a exclusão bem-sucedida, ele dispara um evento global: `window.dispatchEvent(new CustomEvent('forceRefreshMessages'))`.
    2.  **`MessageDrawer.tsx`:** Um `useEffect` escuta este evento e, ao recebê-lo, força a navegação de volta para a lista, limpando o estado da conversa ativa e recarregando os dados.

    ```typescript
    // Em MessageDrawer.tsx
    useEffect(() => {
      const handleForceRefresh = () => {
        setActiveConversation(null);
        setView('list');
        refetchConversas();
      };
      
      window.addEventListener('forceRefreshMessages', handleForceRefresh);
      return () => window.removeEventListener('forceRefreshMessages', handleForceRefresh);
    }, [refetchConversas]);
    ```
    Apesar de ser uma solução funcional, ela depende de eventos globais, o que pode ser difícil de depurar e manter.

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