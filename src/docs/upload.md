# Estratégia de Upload de Mídia

Este documento define a estratégia para upload de mídias (imagens e vídeos) para exercícios personalizados criados por Personal Trainers (PTs). A abordagem visa ser eficiente, robusta e amigável, mesmo em ambientes com conexão de internet lenta, como academias.

---

## 1. Princípios Gerais

A estratégia se baseia em uma **Abordagem Híbrida**, dividindo as responsabilidades entre o cliente (Frontend) e o servidor (Backend) para obter o melhor resultado:

-   **Frontend (PWA):** Executa tarefas leves, como pré-redimensionamento de imagens e validações instantâneas. Gerencia uploads em segundo plano de forma inteligente e resiliente.
-   **Backend (Função Serverless):** Executa o processamento pesado e final (conversão de formato, compressão, transcodificação), garantindo consistência e qualidade máxima.

---

## 2. Quota de Armazenamento por Personal Trainer

Em vez de uma quota de armazenamento em MB, o controle é feito pela **quantidade de exercícios personalizados** que um Personal Trainer (PT) pode criar.

O limite padrão para um novo PT é de **100 exercícios personalizados**.

Este limite é definido pelo plano de assinatura do PT e controlado pela coluna `limite_exercicios` na tabela `personal_trainers`.

---

## 3. Fluxo de Upload Detalhado

### 3.1. Imagens (JPG, PNG)

O objetivo é transformar uma imagem grande de celular em um arquivo **WebP otimizado**, sem a necessidade de processamento pesado no cliente.

#### Frontend (React PWA):

1.  O PT seleciona uma imagem.
2.  O app inicia o upload do arquivo original para a Edge Function `upload-imagem` do Supabase.

#### Backend (Fluxo Assíncrono):

1.  **Edge Function `upload-imagem` (Supabase):** (Ponto de Entrada)
    -   Recebe a imagem original.
    -   Salva o arquivo sem processamento na pasta `originais/` do bucket R2 da Cloudflare.
    -   Imediatamente dispara o Worker `otimizador-exercicios` da Cloudflare com o nome do arquivo.
    -   Retorna uma resposta de sucesso para o frontend, indicando que o upload foi iniciado (o frontend não precisa esperar pela otimização).

2.  **Worker `otimizador-exercicios` (Cloudflare):** (Processamento Pesado)
    -   Baixa a imagem original da pasta `originais/`.
    -   Executa o processamento de otimização pesada usando as bibliotecas `@jsquash`:
        -   **Redimensiona** a imagem para um tamanho máximo (ex: 640px de largura).
        -   Converte o formato para **WebP** com **75%** de qualidade de compressão.
    -   Salva o arquivo final otimizado na pasta `tratadas/` do bucket R2.
    -   Deleta a imagem original da pasta `originais/` para liberar espaço.
    -   Dispara um callback para a Edge Function de retorno do Supabase.

3.  **Edge Function `retorno-tratadas` (Supabase):** (Finalização)
    -   Recebe o callback do Worker com a URL da imagem otimizada.
    -   Atualiza a URL na tabela `exercicios` do banco de dados, substituindo a URL temporária pela URL final e otimizada.

### 3.2. Vídeos (MP4, MOV, etc.)

O objetivo é transformar um vídeo grande de celular em um arquivo de vídeo leve (**~750 KB para 12s**), sem áudio e em **360p**.

#### Frontend (React PWA):

1.  O PT seleciona um vídeo.
2.  **Validação Imediata:** O app lê os metadados do vídeo para verificar se a duração é **menor ou igual a 12 segundos**. Se for maior, um erro é exibido imediatamente, e o upload é cancelado.
3.  **Detecção de Rede Inteligente:** O app usa a `Network Information API` para verificar a qualidade da rede.
    -   **Se a rede for rápida (Wi-Fi/4G):** O upload do arquivo original inicia em segundo plano via Service Worker. A UI é liberada.
    -   **Se a rede for lenta (2G/3G/Modo Economia):** O app exibe a mensagem: "Sua conexão está lenta. O vídeo será enviado quando você se conectar a uma rede mais rápida." O arquivo é salvo temporariamente no **IndexedDB** (uma base de dados no navegador) e uma tarefa é registrada com a **Background Sync API**.

#### Service Worker (Em Segundo Plano):
1.  A **Background Sync API** automaticamente "acorda" o Service Worker quando uma conexão de boa qualidade é detectada.
2.  O Service Worker recupera o vídeo do IndexedDB e o envia para o backend. Este processo é resiliente a fechamento do app e perda de conexão.

#### Backend (Supabase Edge Function):
1.  A Edge Function do Supabase recebe o vídeo original (já validado pela duração).
2.  Executa o processamento pesado usando uma versão do **FFmpeg** compilada para WebAssembly:
    -   Remove a faixa de áudio.
    -   Redimensiona a resolução para **360p**.
    -   Re-codifica o vídeo com um bitrate constante de **500 kbps**.
3.  Salva o arquivo final otimizado no bucket R2 da Cloudflare.

#### Feedback Final (Opcional, mas recomendado):

-   Após o processamento, o backend pode usar a **Push API** para enviar uma notificação ao PT, confirmando que o exercício está pronto.

---

## 4. Tecnologias e APIs Envolvidas

-   **Network Information API:** Para detectar a qualidade da rede do usuário.
-   **IndexedDB:** Para armazenar arquivos temporariamente no dispositivo ("caixa de saída").
-   **Background Sync API:** Para agendar tarefas para serem executadas quando houver boa conexão.
-   **Service Worker:** O motor que executa tarefas em segundo plano (uploads, etc.).
-   **Push API:** Para enviar notificações de volta para o usuário.

---

## 5. Implementação do Controle de Limite

A abordagem de limitar pela quantidade de exercícios simplifica drasticamente a implementação.

### 5.1. Fluxo de Validação

-   **Frontend (Validação de UI):**
    -   Antes de permitir que o PT acesse as páginas "Novo Exercício" ou "Copiar Exercício", a aplicação verifica a contagem atual de exercícios personalizados do PT contra o valor da coluna `limite_exercicios` (obtida do perfil do PT).
    -   Se o limite for atingido, os botões de criação são desabilitados e uma mensagem informativa é exibida.

-   **Backend (Validação de Segurança):**
    -   A função serverless responsável por criar um novo exercício (`INSERT INTO exercicios`) realiza uma verificação final e autoritativa no banco de dados.
    -   Ela executa um `SELECT COUNT(*)` na tabela `exercicios` para o `pt_id` em questão antes de confirmar a inserção. Isso previne qualquer tentativa de burlar a validação do frontend.

### 5.2. Vantagens da Abordagem

-   **Simplicidade:** Elimina a necessidade de tabelas de controle (`pt_media_assets`) e transações complexas para gerenciar bytes. A lógica se resume a uma consulta `COUNT`.
-   **Melhor UX:** Para o usuário, "Você usou 35 de 100 exercícios" é muito mais claro e tangível do que "Você usou 34.7 MB de 100 MB".
-   **Alinhamento com o Modelo de Negócio:** A quantidade de exercícios é uma métrica de valor mais direta para os planos de assinatura.

---

## 6. A Nova Arquitetura de Otimização de Imagens (Cloudflare + Supabase)

A nova solução de otimização de imagens é um fluxo assíncrono e desacoplado, que oferece robustez e evita falhas no lado do cliente.

### Diagrama Simplificado do Fluxo:

### Detalhes Técnicos do Fluxo de Imagem:

-   **Requisição Inicial (Frontend -> Edge Function):**
    -   O cliente envia a imagem original para a Edge Function `upload-imagem`.
    -   Esta requisição é síncrona, mas a Edge Function retorna a resposta imediatamente, sem esperar pelo processamento.

-   **Upload para o R2 (Edge Function):**
    -   A Edge Function `upload-imagem` usa as credenciais de autenticação (AWS Signature V4) para fazer o upload da imagem original para a pasta `originais/` do bucket R2.

-   **Disparo do Worker (Edge Function):**
    -   Após o upload para o R2, a Edge Function faz uma nova requisição (assíncrona) para a URL do Worker `otimizador-exercicios`.
    -   Esta requisição dispara o processo de otimização.

-   **Processamento no Worker (Cloudflare):**
    -   O Worker baixa a imagem original do R2 e a decodifica.
    -   **Etapa 1 (Redimensionamento):** Usa `@jsquash/resize` para diminuir as dimensões da imagem para um tamanho máximo (ex: 640px de largura), resolvendo o problema de limite de memória.
    -   **Etapa 2 (Compressão):** Usa `@jsquash/webp` para converter a imagem já redimensionada para o formato WebP com 75% de qualidade.
    -   Salva a imagem final e otimizada na pasta `tratadas/`.
    -   Deleta a imagem original da pasta `originais/`.

-   **Atualização no Banco de Dados (Worker -> Edge Function):**
    -   Após o processamento, o Worker envia um callback assíncrono para a Edge Function `retorno-tratadas` no Supabase.
    -   Este callback contém a URL final da imagem otimizada.

-   **Resposta do Callback (Edge Function):**
    -   A Edge Function `retorno-tratadas` recebe a URL otimizada.
    -   Utiliza o `SUPABASE_SERVICE_ROLE_KEY` para atualizar o registro correspondente na tabela `exercicios`, garantindo que o link para a imagem final e otimizada esteja correto.

### Vantagens Desta Arquitetura:

-   **Velocidade para o Usuário:** O frontend não precisa esperar a otimização pesada. O upload é "instantâneo" do ponto de vista do usuário.
-   **Processamento Confiável:** A otimização é delegada a um Worker da Cloudflare, que é um ambiente de execução rápido e confiável, independentemente da carga do servidor principal.
-   **Desacoplamento:** O fluxo é desacoplado, o que significa que se o Worker falhar, o upload inicial ainda terá sido bem-sucedido e a imagem estará disponível na pasta `originais/` para um reprocessamento posterior, se necessário.
-   **Custo-Benefício:** A Cloudflare Workers é uma solução de baixo custo para tarefas de processamento assíncronas, evitando que o backend principal seja sobrecarregado.

---

## 7. Lições Aprendidas - A Saga do WebAssembly no Cloudflare Workers

A integração de bibliotecas baseadas em WebAssembly (WASM), como a `@jsquash`, no ambiente do Cloudflare Workers (usando Wrangler 4) provou ser um desafio significativo devido a problemas de configuração do build. As seguintes abordagens foram tentadas e falharam, e a documentação delas serve para evitar a repetição desses erros no futuro.

### Tentativa 1: Imports com `?url` (Falhou)
-   **Abordagem:** Tentar importar os arquivos `.wasm` diretamente de `node_modules` usando o sufixo `?url`.
-   **Problema:** O empacotador do Wrangler (esbuild) não consegue resolver caminhos dentro de `node_modules` para esse tipo de asset. Ele procura os arquivos `.wasm` em um caminho relativo dentro da pasta `src/`, resultando em um erro `File not found`.

### Tentativa 2: Configuração `[build.transpile]` (Falhou)
-   **Abordagem:** Usar a seção `[build.transpile]` no `wrangler.toml` para instruir o empacotador a tratar arquivos `.wasm` como assets.
-   **Problema:** Esta sintaxe foi removida ou alterada no Wrangler 4. O deploy falha com o erro `Unexpected fields found`, indicando que a configuração não é mais suportada.

### Tentativa 3: Configuração `[[rules]]` (Falhou para o Build)
-   **Abordagem:** Usar a seção `[[rules]]` no `wrangler.toml` com `type = "CompiledWasm"`.
-   **Problema:** Esta configuração instrui o *ambiente de execução* da Cloudflare sobre como lidar com módulos WASM, mas não resolve o problema do *processo de build*. O empacotador ainda não consegue encontrar os arquivos em `node_modules`, e o build falha antes mesmo do deploy.

### ✅ A Solução Definitiva e Robusta

A única abordagem que funcionou de forma consistente e eliminou toda a complexidade do processo de build foi:

1.  **Copiar os Arquivos `.wasm` para o Projeto:**
    -   Criar uma pasta `src/wasm` dentro do projeto do Worker.
    -   Manualmente (ou via script) copiar todos os arquivos `.wasm` necessários (`mozjpeg_dec.wasm`, `squoosh_png_dec.wasm`, `squoosh_webp_enc.wasm`, `resize.wasm`, etc.) de `node_modules` para `src/wasm`.

2.  **Usar Imports Relativos:**
    -   Alterar todas as importações no código (`src/index.ts`) para usar caminhos relativos.
    -   Exemplo: `import jpegDecWasm from './wasm/mozjpeg_dec.wasm';`

3.  **Remover Configurações do `wrangler.toml`:**
    -   Remover completamente as seções `[build.transpile]` e `[[rules]]` relacionadas ao WASM. O Wrangler já sabe como lidar com arquivos `.wasm` locais por padrão.

**Conclusão:** Esta abordagem torna o Worker autossuficiente e independente da lógica de resolução de módulos do Wrangler, que se mostrou pouco confiável para este caso de uso.

---

## 8. Estratégia de Redimensionamento para Controle de Memória

O diagnóstico inicial de `Exceeded Memory Limit` no Worker revelou um ponto crítico: o problema não é o tamanho do arquivo em disco (ex: 2MB), mas sim o **consumo de RAM quando a imagem é descompactada**.

### A Causa do Erro

Uma imagem JPEG/PNG é um formato comprimido. Ao ser decodificada para processamento (por exemplo, para converter para WebP), ela é expandida para um buffer de pixels brutos na memória.

-   **Exemplo:** Uma imagem de 4000x3000 pixels, quando descompactada, ocupa `4000 * 3000 * 4 bytes` (para RGBA) = **48 MB de RAM**.

Essa alocação de memória, somada à sobrecarga da própria biblioteca WASM, ultrapassa facilmente o limite de 128 MB do Worker, causando a falha.

### A Solução: Redimensionar Antes de Comprimir

A estratégia implementada ataca o problema na raiz, garantindo que a operação mais pesada (codificação para WebP) seja feita em uma imagem pequena.

1.  **Decodificar:** A imagem original é carregada e decodificada para um objeto `ImageData`.
2.  **Redimensionar:** Usando a biblioteca `@jsquash/resize`, uma **nova e menor** `ImageData` é criada com as dimensões máximas definidas (ex: 360x360 para imagens 1:1 ou 640px de largura para retangulares).
3.  **Liberar Memória:** A `ImageData` original e gigante é descartada, liberando a RAM que ela ocupava.
4.  **Codificar:** Apenas a `ImageData` pequena e redimensionada é enviada para a biblioteca `@jsquash/webp`. Como a imagem agora é pequena, a operação de codificação consome pouquíssima memória e é executada com sucesso e rapidez.

Esta abordagem garante que o Worker permaneça sempre dentro dos limites de memória, independentemente do tamanho da imagem original enviada pelo usuário.

---

## 9. Arquitetura de Processamento: A Ferramenta Certa para Cada Tarefa

A plataforma utiliza uma arquitetura híbrida, escolhendo a ferramenta serverless mais adequada para cada tipo de processamento de mídia. Isso garante eficiência, escalabilidade e controle de custos.

### Processamento de Imagens: Cloudflare Workers

O processamento de imagens é uma tarefa relativamente rápida e que se beneficia da execução na borda (edge), mais próxima do usuário.

-   **Por que o Worker?** Ideal para tarefas curtas e de baixa latência. A otimização de uma imagem, após o redimensionamento, é uma operação que se encaixa perfeitamente nesse modelo.
-   **Paralelismo e Memória:** A plataforma da Cloudflare é altamente paralela. Se 10 usuários fizerem upload de imagens ao mesmo tempo, 10 instâncias separadas do Worker serão iniciadas. **Cada instância possui seu próprio limite de 128 MB de memória**, o que significa que o processamento de uma imagem não interfere no de outra. O erro de memória que encontramos foi resolvido porque agora cada instância processa uma imagem pequena, mantendo-se confortavelmente dentro do seu próprio limite de 128 MB.

### Processamento de Vídeos: Supabase Edge Functions

A transcodificação de vídeo é uma tarefa computacionalmente intensiva e demorada, inadequada para o ambiente restrito de um Worker.

-   **Por que a Edge Function?** As Edge Functions do Supabase (baseadas em Deno) oferecem um ambiente mais robusto e com limites mais altos, ideal para tarefas de backend mais pesadas.
    -   **Limite de Tempo:** **Até 60 segundos** de execução por invocação no plano gratuito, uma margem segura para transcodificar um vídeo de 12 segundos. Em contraste, o Worker da Cloudflare tem um limite de CPU muito mais restrito.
    -   **Flexibilidade:** Permite a execução de ferramentas complexas como o **FFmpeg** (compilado para WebAssembly), que é o padrão da indústria para manipulação de vídeo.
-   **Paralelismo:** Assim como os Workers, as Edge Functions são escaláveis. Se múltiplos usuários enviarem vídeos simultaneamente, o Supabase iniciará instâncias paralelas da função para processar cada vídeo, sem filas ou esperas.

### Conclusão da Estratégia

A arquitetura foi desenhada para usar a ferramenta certa para cada trabalho:

-   **Imagens:** Tarefa rápida e leve, ideal para a agilidade e a execução na borda dos **Cloudflare Workers**.
-   **Vídeos:** Tarefa pesada e demorada, que exige os recursos e o tempo de execução maiores das **Supabase Edge Functions**.

Este esforço de design garante que a plataforma seja robusta, escalável e não encontre os mesmos gargalos de memória ao lidar com diferentes tipos de mídia.