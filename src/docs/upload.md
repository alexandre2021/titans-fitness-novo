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

1.  **Edge Function `upload-imagem` (Supabase):**
    -   Recebe a imagem original.
    -   Salva o arquivo sem processamento na pasta `originais/` do bucket R2 da Cloudflare.
    -   Imediatamente dispara o Worker `otimizador-exercicios` da Cloudflare com o nome do arquivo.
    -   Retorna uma resposta de sucesso para o frontend, indicando que o upload foi iniciado (o frontend não precisa esperar pela otimização).

2.  **Worker `otimizador-exercicios` (Cloudflare):**
    -   Baixa a imagem original da pasta `originais/`.
    -   Executa o processamento de otimização pesada usando a biblioteca `@jsquash/webp`:
        -   Converte o formato para **WebP**.
        -   Aplica **75%** de qualidade de compressão.
    -   Salva o arquivo final otimizado na pasta `tratadas/` do bucket R2.
    -   Deleta a imagem original da pasta `originais/` para liberar espaço.
    -   Dispara um callback para a Edge Function de retorno do Supabase.

3.  **Edge Function `retorno-tratadas` (Supabase):**
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

#### Backend (Função Serverless):

1.  Recebe o vídeo original (já validado pela duração).
2.  Executa o processamento pesado:
    -   Remove a faixa de áudio.
    -   Redimensiona a resolução para **360p**.
    -   Re-codifica o vídeo com um bitrate constante de **500 kbps**.
3.  Salva o arquivo final otimizado no bucket `exerciciospt`.

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
    -   Esta etapa deve ser rápida, pois não há processamento de imagem.

-   **Disparo do Worker (Edge Function):**
    -   Após o upload para o R2, a Edge Function faz uma nova requisição (assíncrona) para a URL do Worker `otimizador-exercicios`.
    -   Esta requisição dispara o processo de otimização.

-   **Processamento no Worker (Cloudflare):**
    -   O Worker baixa a imagem original do R2.
    -   Utiliza a biblioteca `@jsquash/webp` para otimizar o arquivo para um WebP de 75% de qualidade.
    -   Salva a imagem otimizada em uma nova pasta `tratadas/`.
    -   Deleta a imagem original da pasta `originais/` para economizar espaço de armazenamento.

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