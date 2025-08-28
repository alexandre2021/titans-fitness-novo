# Estratégia de Upload de Mídia

Este documento define a estratégia para upload de mídias (imagens e vídeos) para exercícios personalizados criados por Personal Trainers (PTs). A abordagem visa ser eficiente, robusta e amigável, mesmo em ambientes com conexão de internet lenta, como academias.

## 1. Princípios Gerais

A estratégia se baseia em uma **Abordagem Híbrida**, dividindo as responsabilidades entre o cliente (Frontend) e o servidor (Backend) para obter o melhor resultado:

-   **Frontend (PWA):** Executa tarefas leves, como pré-redimensionamento de imagens e validações instantâneas. Gerencia uploads em segundo plano de forma inteligente e resiliente.
-   **Backend (Função Serverless):** Executa o processamento pesado e final (conversão de formato, compressão, transcodificação), garantindo consistência e qualidade máxima.

## 2. Quota de Armazenamento por Personal Trainer

-   Cada Personal Trainer (PT) terá uma quota inicial de **100 MB** para armazenamento de mídias de exercícios personalizados.
-   Esta quota será utilizada para os arquivos otimizados e armazenados nos buckets da Cloudflare.

## 3. Estimativa de Armazenamento por Exercício

A estimativa de uso da quota por exercício cadastrado com 2 imagens e 1 vídeo é:

-   **Vídeo (12s @ 500kbps):** ~750 KB
-   **Imagem 1 (WebP otimizada):** ~150 KB (estimativa)
-   **Imagem 2 (WebP otimizada):** ~150 KB (estimativa)
-   **Total por Exercício: ~1050 KB** (Aproximadamente **1.05 MB**)

O cálculo de ~95 exercícios representa o **pior cenário**, onde todos os exercícios possuem 2 imagens e 1 vídeo. Como a expectativa é que a maioria dos exercícios tenha apenas o vídeo (~750 KB), **é razoável e seguro manter a estimativa de que a quota de 100 MB permitirá ao PT armazenar, em média, cerca de 100 exercícios personalizados.**

## 4. Fluxo de Upload Detalhado

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

## 5. Tecnologias e APIs Envolvidas

-   **`<canvas> API`:** Para pré-redimensionamento rápido de imagens no cliente.
-   **Network Information API:** Para detectar a qualidade da rede do usuário.
-   **IndexedDB:** Para armazenar arquivos temporariamente no dispositivo ("caixa de saída").
-   **Background Sync API:** Para agendar tarefas para serem executadas quando houver boa conexão.
-   **Service Worker:** O motor que executa tarefas em segundo plano (uploads, etc.).
-   **Push API:** Para enviar notificações de volta para o usuário.

---

## 6. Controle de Quota de Armazenamento (100 MB por PT)

Para gerenciar a quota de 100 MB de cada PT de forma eficiente e precisa, usaremos uma abordagem híbrida de "Extrato + Saldo" no banco de dados.

### 6.1. A Tabela de Controle (O "Extrato")

Criaremos uma nova tabela `pt_media_assets` para registrar cada arquivo individualmente.

```sql
-- Estrutura da tabela pt_media_assets
CREATE TABLE pt_media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pt_id UUID REFERENCES personal_trainers(id) ON DELETE CASCADE,
  exercicio_id UUID REFERENCES exercicios(id) ON DELETE SET NULL,
  file_path TEXT NOT NULL, -- Caminho do arquivo no Cloudflare R2
  file_size_bytes BIGINT NOT NULL, -- Tamanho do arquivo em bytes
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.2. A Coluna de Controle (O "Saldo")

Adicionaremos uma coluna na tabela `personal_trainers` para ter um acesso rápido ao uso total.

```sql
-- Adicionar coluna na tabela de PTs
ALTER TABLE personal_trainers
ADD COLUMN storage_used_bytes BIGINT DEFAULT 0;
```

### 6.3. Fluxo de Funcionamento na Prática

#### Ao Fazer Upload de um Novo Arquivo

1.  Após a otimização, obtemos o tamanho final do arquivo em bytes.
2.  Lemos o valor `storage_used_bytes` atual do PT.
3.  Verificamos se `storage_used_bytes + novo_tamanho <= 104857600` (100MB).
4.  **Se houver espaço**, executamos uma transação no banco:
    a.  `UPDATE personal_trainers SET storage_used_bytes = storage_used_bytes + novo_tamanho WHERE id = pt_id`.
    b.  `INSERT` do novo arquivo na tabela `pt_media_assets`.
5.  **Se não houver espaço**, retornamos um erro ao usuário.

#### Ao Deletar um Arquivo

1.  A partir do `file_path` ou `exercicio_id`, encontramos o registro em `pt_media_assets` para obter o `file_size_bytes`.
2.  Executamos uma transação no banco:
    a.  `UPDATE personal_trainers SET storage_used_bytes = storage_used_bytes - tamanho_do_arquivo WHERE id = pt_id`.
    b.  `DELETE` do registro na tabela `pt_media_assets`.
3.  Finalmente, deletamos o arquivo do Cloudflare R2.

### 6.4. Vantagens da Abordagem

-   **Performance:** A verificação da quota é instantânea, lendo apenas um campo.
-   **Precisão:** Cada byte é contabilizado em um registro detalhado.
-   **Robustez:** O sistema é resiliente e fácil de auditar ou recalcular em caso de inconsistências.