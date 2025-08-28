# Guia PWA (Progressive Web App) para o Titans Fitness

Este documento serve como um guia completo sobre o que é um Progressive Web App (PWA), seus benefícios para o Titans Fitness, e como planejamos implementá-lo.

---

## 1. O que é um PWA?

Um PWA não é uma tecnologia específica, mas sim um conjunto de melhores práticas e APIs da web que, quando usadas juntas, dão a um site a aparência e a funcionalidade de um aplicativo nativo.

> **Analogia:** Se o React é o **motor** do nosso carro, o PWA são os **acessórios** que o transformam em um veículo de alta performance, capaz de funcionar em qualquer terreno (online e offline).

Para ser considerado um PWA, um site precisa de três requisitos técnicos:

1.  **HTTPS:** Ser servido em uma conexão segura.
2.  **Web App Manifest:** Um arquivo de configuração (`manifest.json`) que define o nome do app, ícone, cores, etc.
3.  **Service Worker:** Um script que o navegador executa em segundo plano para gerenciar o cache (para acesso offline), notificações push e sincronização em segundo plano.

---

## 2. Principais Vantagens para os Usuários

-   **"Instalação" na Tela de Início:** O usuário pode adicionar um ícone do Titans Fitness à tela inicial do celular, permitindo acesso rápido e direto, como um app nativo.
-   **Acesso e Funcionamento Offline:** Permite que os alunos executem seus treinos e os PTs consultem informações mesmo em locais com internet ruim ou inexistente.
    -   **Como e Onde?** Essa "mágica" é configurada em um único lugar: no arquivo `vite.config.ts`. Nós não alteramos o código dos componentes React. Em vez disso, criamos um "livro de regras" para o Service Worker.
    -   **As Regras:** Cada regra define um padrão de URL de API que queremos observar e uma estratégia de cache para aplicar. Por exemplo:

        ```typescript
        // Exemplo de regra dentro do vite.config.ts
        runtimeCaching: [
          {
            // REGRA: Para a lista de treinos da rotina
            urlPattern: ({ url }) => url.pathname.includes('/rest/v1/rotinas'),
            handler: 'StaleWhileRevalidate', // Estratégia: entrega do cache, mas atualiza em background
            options: { cacheName: 'api-rotinas-cache' }
          },
          {
            // REGRA: Para as mídias (imagens/vídeos)
            urlPattern: ({ url }) => url.hostname.includes('prvfvlyzfyprjliqniki.supabase.co'),
            handler: 'CacheFirst', // Estratégia: se está no cache, nem tenta ir pra internet
            options: { cacheName: 'media-cache' }
          }
        ]
        ```
    -   **Resultado:** Com essas regras, quando o app tentar buscar dados de uma dessas URLs e estiver offline, o Service Worker interceptará o pedido e responderá com os dados que ele guardou no cache, mantendo o app funcional.
-   **Notificações Push:** Mantém os usuários engajados com lembretes de treino, avisos de novas mensagens e outras atualizações importantes. Como o aplicativo está hospedado na Vercel (plano gratuito), é importante notar que a plataforma não limita as notificações diretamente. O limite é indireto, baseado na execução das Funções Serverless que disparam os pushes.
    -   **Limite Prático:** O plano gratuito da Vercel oferece uma cota muito generosa de execução de funções, que é mais do que suficiente para a nossa necessidade. O custo de processamento para enviar uma notificação é mínimo, então o envio de pushes para um chat e outras funcionalidades se encaixa confortavelmente dentro dos limites gratuitos.
-   **Performance e Carregamento Instantâneo:** Após a primeira visita, o app carrega quase instantaneamente, pois seus arquivos principais são servidos a partir do cache local.
-   **Experiência Imersiva:** Ao ser aberto pelo ícone, o app roda em tela cheia, sem a barra de endereço do navegador, proporcionando uma experiência mais focada.

---

## 3. Funcionalidades e APIs Nativas

Um PWA pode acessar diversos recursos do dispositivo:

-   **Câmera:** Para tirar fotos e gravar vídeos diretamente pelo app, usando a tag `<input type="file">` com os atributos `capture`.
-   **Geolocalização (GPS):** Para registrar locais de treinos ou encontrar locais próximos.
-   **Compartilhamento Nativo (Web Share API):** Para usar a caixa de diálogo de compartilhamento do celular e enviar conteúdo para outros apps (WhatsApp, Instagram, etc.).
-   **Contatos do Dispositivo (Contact Picker API):** Para facilitar o convite de novos alunos a partir da agenda do PT.
-   **Vibração (Vibration API):** Para dar feedback tátil, como ao final de um cronômetro de descanso.
-   **Alerta Sonoro (HTML5 Audio):** Para emitir sons, complementando a vibração no aviso do cronômetro.

---

## 4. Como Funciona na Prática (Resumo da Nossa Conversa)

-   **Como funciona a "Instalação"?**
    O navegador detecta o engajamento do usuário e dispara um evento (`beforeinstallprompt`). Nós capturamos esse evento e mostramos um botão "Instalar App" no momento mais oportuno (ex: após o primeiro login). O usuário clica, confirma, e o ícone é adicionado à tela inicial. Se o ícone for removido, o processo pode ser oferecido novamente em uma visita futura.

-   **Como funciona o Cache Offline? (A Analogia do Chef)**
    A lógica de negócio **(o Chef)** permanece no código React. O Service Worker **(o Assistente)** é um "armazém" que guarda respostas de chamadas de API. O Chef não precisa saber se o Assistente pegou os ingredientes (dados) do supermercado (internet) ou do freezer (cache); ele simplesmente os recebe e aplica sua receita (lógica).

-   **Como o PWA sabe o que guardar no cache?**
    Nós não o ensinamos sobre "rotinas". Nós o ensinamos a observar **URLs de API**. Configuramos regras como: "Toda vez que o app pedir uma URL contendo `/rest/v1/rotinas`, guarde a resposta". A granularidade do cache depende de como nosso app já busca os dados.

-   **Como funcionam as Notificações Push?**
    O usuário precisa dar permissão explícita. Uma vez permitido, o app envia um "endereço de notificação" único para o nosso backend. Para enviar um push, nosso backend manda a mensagem para os servidores da Google/Apple, que se encarregam da entrega gratuita. O custo é apenas o da execução da nossa função de backend, que é mínimo.

-   **E se o app já estiver aberto?**
    Não enviamos um push. Usamos uma abordagem dupla: para usuários ativos, usamos **Realtime Subscriptions** do Supabase para atualizações instantâneas na tela. Para usuários inativos, usamos as **Notificações Push** para chamá-los de volta.

---

## 5. Plano de Implementação (Passo a Passo)

Para transformar o Titans Fitness em um PWA, seguiremos os seguintes passos:

**Passo 1: Instalar Dependência**
-   Executar o comando `npm install vite-plugin-pwa -D` para adicionar a ferramenta principal ao nosso projeto como uma dependência de desenvolvimento.

**Passo 2: Configurar o `vite.config.ts`**
-   Importar e adicionar o `VitePWA` à lista de plugins.
-   Dentro da configuração do `VitePWA`, definiremos:
    -   As opções do `manifest.json` (nome do app, cores, etc.).
    -   As regras de cache em `workbox.runtimeCaching`, especificando os padrões de URL das nossas APIs e as estratégias de cache (`StaleWhileRevalidate`, `CacheFirst`).

**Passo 3: Criar Ícones e o Manifesto**
-   Criar os ícones do aplicativo em diferentes tamanhos (ex: 192x192, 512x512) e colocá-los na pasta `public`.
-   O `vite-plugin-pwa` usará as configurações do Passo 2 para gerar o arquivo `manifest.json`.

**Passo 4: Gerar e Registrar o Service Worker**
-   O plugin irá gerar automaticamente o arquivo do Service Worker (`sw.js`) durante o processo de build (`npm run build`) com base nas nossas regras.
-   O plugin também injetará o código de registro do Service Worker no `index.html` automaticamente.

**Passo 5: Implementar a Lógica de Interação no App (React)**
-   Criar componentes de UI para oferecer a instalação e a ativação de notificações (ex: um botão "Instalar App").
-   Adicionar a lógica para ouvir o evento `beforeinstallprompt` e mostrar o botão de instalação.
-   Implementar a lógica de "fila de saída" com `IndexedDB` e `Background Sync` para as funcionalidades que precisam funcionar offline (salvar progresso de treino, etc.).