# Estratégia de Upload de Mídia

Este documento define a estratégia para upload de mídias (imagens e vídeos) para exercícios personalizados criados por Personal Trainers (PTs). A abordagem visa ser eficiente, robusta e amigável, mesmo em ambientes com conexão de internet lenta, como academias.

## 1. Princípios Gerais

A estratégia se baseia em uma **Abordagem Híbrida**, dividindo as responsabilidades entre o cliente (Frontend) e o servidor (Backend) para obter o melhor resultado:

-   **Frontend (PWA):** Executa tarefas leves, como pré-redimensionamento de imagens e validações instantâneas. Gerencia uploads em segundo plano de forma inteligente e resiliente.
-   **Backend (Função Serverless):** Executa o processamento pesado e final (conversão de formato, compressão, transcodificação), garantindo consistência e qualidade máxima.

## 2. Quota de Armazenamento por Personal Trainer
 
-   Em vez de uma quota de armazenamento em MB, o controle é feito pela **quantidade de exercícios personalizados** que um Personal Trainer (PT) pode criar.
-   O limite padrão para um novo PT é de **100 exercícios personalizados**.
-   Este limite é definido pelo plano de assinatura do PT e controlado pela coluna `limite_exercicios` na tabela `personal_trainers`.
 
## 3. Fluxo de Upload Detalhado

### 4.1. Imagens (JPG, PNG)

O objetivo é transformar uma imagem grande de celular em um arquivo WebP otimizado de ~150 KB.

1.  **Frontend (React PWA):**
    -   O PT seleciona uma imagem.
    -   O app usa a **`<canvas> API`** para fazer um pré-redimensionamento rápido da imagem para uma largura máxima de 1080px. Isso reduz drasticamente o tamanho do arquivo (ex: de 8 MB para ~1 MB) sem sobrecarregar o dispositivo.
    -   O PWA inicia o upload do arquivo pré-redimensionado em segundo plano, usando o Service Worker.

2.  **Backend (Função Serverless):**
    -   Recebe a imagem pré-redimensionada.
    -   Executa a otimização final e pesada:
        -   Converte o formato para **WebP**.
        -   Aplica **80%** de qualidade de compressão.
        -   Redimensiona para a altura final de **360px**.
    -   Salva o arquivo final otimizado (~150 KB) no bucket `exerciciospt`.

### 4.2. Vídeos (MP4, MOV, etc.)

O objetivo é transformar um vídeo grande de celular em um arquivo de vídeo leve (~750 KB para 12s), sem áudio e em 360p.

1.  **Frontend (React PWA):**
    -   O PT seleciona um vídeo.
    -   **Validação Imediata:** O app lê os metadados do vídeo para verificar se a duração é **menor ou igual a 12 segundos**. Se for maior, um erro é exibido imediatamente, e o upload é cancelado.
    -   **Detecção de Rede Inteligente:** O app usa a **`Network Information API`** para verificar a qualidade da rede.
        -   **Se a rede for rápida (Wi-Fi/4G):** O upload do arquivo original inicia em segundo plano via Service Worker. A UI é liberada.
        -   **Se a rede for lenta (2G/3G/Modo Economia):** O app exibe a mensagem: *"Sua conexão está lenta. O vídeo será enviado quando você se conectar a uma rede mais rápida."* O arquivo é salvo temporariamente no **`IndexedDB`** (uma base de dados no navegador) e uma tarefa é registrada com a **`Background Sync API`**.

2.  **Service Worker (Em Segundo Plano):**
    -   A `Background Sync API` automaticamente "acorda" o Service Worker quando uma conexão de boa qualidade é detectada.
    -   O Service Worker recupera o vídeo do `IndexedDB` e o envia para o backend. Este processo é resiliente a fechamento do app e perda de conexão.

3.  **Backend (Função Serverless):**
    -   Recebe o vídeo original (já validado pela duração).
    -   Executa o processamento pesado:
        -   Remove a faixa de áudio.
        -   Redimensiona a resolução para **360p**.
        -   Re-codifica o vídeo com um bitrate constante de **500 kbps**.
    -   Salva o arquivo final otimizado no bucket `exerciciospt`.

4.  **Feedback Final (Opcional, mas recomendado):**
    -   Após o processamento, o backend pode usar a **`Push API`** para enviar uma notificação ao PT, confirmando que o exercício está pronto.

## 4. Tecnologias e APIs Envolvidas

-   **`<canvas> API`:** Para pré-redimensionamento rápido de imagens no cliente.
-   **Network Information API:** Para detectar a qualidade da rede do usuário.
-   **IndexedDB:** Para armazenar arquivos temporariamente no dispositivo ("caixa de saída").
-   **Background Sync API:** Para agendar tarefas para serem executadas quando houver boa conexão.
-   **Service Worker:** O motor que executa tarefas em segundo plano (uploads, etc.).
-   **Push API:** Para enviar notificações de volta para o usuário.
---

## 5. Implementação do Controle de Limite

A abordagem de limitar pela quantidade de exercícios simplifica drasticamente a implementação.

### 5.1. Fluxo de Validação

1.  **Frontend (Validação de UI):**
    -   Antes de permitir que o PT acesse as páginas "Novo Exercício" ou "Copiar Exercício", a aplicação verifica a contagem atual de exercícios personalizados do PT contra o valor da coluna `limite_exercicios` (obtida do perfil do PT).
    -   Se o limite for atingido, os botões de criação são desabilitados e uma mensagem informativa é exibida.

2.  **Backend (Validação de Segurança):**
    -   A função serverless responsável por criar um novo exercício (`INSERT INTO exercicios`) realiza uma verificação final e autoritativa no banco de dados.
    -   Ela executa um `SELECT COUNT(*)` na tabela `exercicios` para o `pt_id` em questão antes de confirmar a inserção. Isso previne qualquer tentativa de burlar a validação do frontend.

### 5.2. Vantagens da Abordagem

-   **Simplicidade:** Elimina a necessidade de tabelas de controle (`pt_media_assets`) e transações complexas para gerenciar bytes. A lógica se resume a uma consulta `COUNT`.
-   **Melhor UX:** Para o usuário, "Você usou 35 de 100 exercícios" é muito mais claro e tangível do que "Você usou 34.7 MB de 100 MB".
-   **Alinhamento com o Modelo de Negócio:** A quantidade de exercícios é uma métrica de valor mais direta para os planos de assinatura.