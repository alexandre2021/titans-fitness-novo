# Arquitetura de Upload de Mídia (Cliente Inteligente + Upload Direto para R2)

Este documento descreve a arquitetura para upload de mídias, que combina processamento no cliente com uploads diretos para o Cloudflare R2, evitando gargalos no backend.

---

## Capítulo 1: Upload de Mídia para Exercícios

### 1.1. Princípio Central: Cliente Inteligente, Backend como Porteiro

-   **O Problema:** Enviar arquivos grandes (imagens/vídeos) através de uma Edge Function do Supabase consome rapidamente a cota de transferência de dados (50MB/mês no plano gratuito), tornando a aplicação não escalável.
-   **A Solução:** O frontend é responsável por **capturar, redimensionar e comprimir** a mídia. Em vez de enviar o arquivo para a função, ele pede uma **permissão de upload** (URL pré-assinada) e envia o arquivo pesado **diretamente para o Cloudflare R2**. O backend atua apenas como um "porteiro" que autoriza a operação, sem lidar com o tráfego pesado.

---

### 1.2. Fluxo de Imagens de Exercícios: Otimização no Cliente via Canvas

A interface se adapta ao dispositivo para uma melhor experiência do usuário.

1.  **Captura de Mídia:**
    -   **Mobile:** A interface prioriza a captura direta pela câmera (`<input type="file" capture="user">`).
    -   **Desktop:** A interface abre o seletor de arquivos padrão.

2.  **Processamento no Cliente (A Mágica do Canvas):**
    -   A foto tirada (que pode ser um arquivo grande) **não é enviada diretamente**.
    -   Ela é carregada em um elemento `<canvas>` HTML, que fica oculto na tela.
    -   O método `context.drawImage()` é usado para desenhar a imagem no canvas, forçando as dimensões para um padrão (ex: **largura máxima de 640 pixels**). Isso garante o redimensionamento.
    -   Em seguida, o método `canvas.toDataURL('image/jpeg', 0.85)` exporta a imagem do canvas como uma string **base64**, já comprimida em formato JPEG com 85% de qualidade.

3.  **Pedido de Permissão de Upload:**
    -   O frontend chama a Edge Function `upload-media` com os metadados do arquivo (nome, tipo).
    -   A função valida a autenticação do usuário e gera uma **URL de upload pré-assinada** para o Cloudflare R2, válida por um curto período.

4.  **Upload Direto para o Cloudflare R2:**
    -   O frontend usa a URL pré-assinada recebida para enviar o objeto `File` (a imagem otimizada) diretamente para o bucket do Cloudflare R2, usando o método `PUT`.
    -   O tráfego pesado **não passa pelo Supabase**.

5.  **Confirmação no Banco de Dados:**
    -   Após o upload ser bem-sucedido, o frontend atualiza a tabela `exercicios` no Supabase com o caminho do novo arquivo.

---

### 1.3. Fluxo de Vídeos de Exercícios: Gravação e Compressão no Cliente

A lógica também se adapta ao dispositivo, priorizando a gravação em celulares.

1.  **Captura de Vídeo:**
    -   **Mobile:** A interface oferece a opção de **"Gravar Vídeo"**.
    -   **Desktop:** A interface permite **"Selecionar Vídeo"** do sistema de arquivos.

2.  **Gravação Controlada (Mobile):**
    -   Um modal informa o usuário: "O vídeo terá duração máxima de **12 segundos** e será salvo **sem áudio**."
    -   O PWA usa `navigator.mediaDevices.getUserMedia({ video: true, audio: false })` para acessar a câmera.
    -   A gravação é iniciada com o `MediaRecorder` e parada automaticamente após 12 segundos.
    -   **Ponto Chave (Compressão):** A compressão é forçada no cliente ao instanciar o `MediaRecorder` com `videoBitsPerSecond: 500000` (500 kbps). Isso garante um arquivo final com cerca de **750 KB**.

3.  **Upload para o Backend:**
    -   O fluxo é idêntico ao de imagens: o frontend pede uma URL pré-assinada para a função `upload-media` e envia o `Blob` ou `File` de vídeo diretamente para o Cloudflare R2.

---

### 1.4. Backend como Porteiro (Função Compartilhada)

A complexidade de processamento de mídia no backend é eliminada. As funções têm papéis claros de controle de acesso.

-   **Edge Function `upload-media`:**
    1.  Recebe uma requisição do frontend com uma `action` (`generate_upload_url`).
    2.  Valida o token de autenticação do usuário.
    3.  Gera e retorna uma URL pré-assinada de `PUT` para o Cloudflare R2.

-   **Edge Function `delete-media`:**
    -   Recebe uma requisição para deletar um arquivo específico.
    -   Valida a permissão do usuário.
    -   Executa a exclusão do arquivo no Cloudflare R2.

---

### 1.5. Vantagens da Arquitetura

-   **Escalabilidade:** Resolve o gargalo de 50MB/mês de transferência do Supabase, permitindo uploads ilimitados (dentro dos limites do Cloudflare R2).
-   **Segurança:** O acesso para escrita e exclusão no bucket R2 é controlado pelas Edge Functions, que validam a autenticação do usuário. As chaves secretas nunca são expostas no frontend.
-   **Performance Superior:** Uploads quase instantâneos para o usuário, mesmo em redes de academia (3G/4G).
-   **Redução de Custos:** Evita custos de transferência de dados no Supabase e utiliza o armazenamento de baixo custo do R2.
-   **Padronização:** Todas as mídias são padronizadas em formato e tamanho no cliente, garantindo consistência visual no app.

---

### 1.6. Validação Robusta de Dispositivo e UX (Exercícios)

Para garantir que a experiência "mobile-first" seja segura e funcional, implementamos validações adicionais.

### 6.1. Detecção de Câmera (Anti-Fraude)
-   **O Problema:** Um usuário em um desktop poderia usar as ferramentas de desenvolvedor (F12) para emular um dispositivo móvel e, ao clicar em "Tirar Foto", o sistema abriria o seletor de arquivos do computador, quebrando a regra de negócio.
-   **A Solução:** Antes de acionar o `<input>`, a aplicação agora verifica ativamente se o dispositivo possui uma câmera de vídeo disponível através de `navigator.mediaDevices.enumerateDevices()`.
-   **Resultado:** Se nenhuma câmera for detectada, a ação é bloqueada e uma mensagem de erro é exibida. Isso fecha a brecha e garante que apenas dispositivos com câmera possam usar a funcionalidade de captura.

### 6.2. Experiência de Gravação de Vídeo
-   **O Problema:** Na interface de gravação de vídeo, o botão "Iniciar Gravação" era empurrado para fora da tela assim que o stream da câmera era ativado.
-   **A Solução:** Foi criado um novo componente dedicado, `VideoRecorder.tsx`, com um layout robusto que utiliza posicionamento absoluto para os controles (botão e cronômetro).
-   **Resultado:** A interface de gravação agora é estável, e os controles permanecem visíveis e acessíveis durante todo o processo, corrigindo o bug de layout.

---

## Capítulo 2: Upload de Mídia para Posts

O sistema de posts utiliza a mesma arquitetura de "cliente inteligente", mas com um fluxo adaptado para gerenciar duas imagens de capa distintas: uma para desktop e outra para mobile.

### 2.1. Objetivo

-   **Desktop:** Uma imagem na proporção **16:9**, otimizada para uma largura máxima de **1200px**.
-   **Mobile:** Uma imagem na proporção **1:1** (quadrada), otimizada para uma largura máxima de **640px**.

Essa separação garante que a imagem de capa seja sempre exibida da melhor forma, sem cortes inesperados ou perda de qualidade, independentemente do dispositivo do usuário.

### 2.2. Fluxo de Upload (para cada imagem)

O processo é executado individualmente para a imagem de desktop e para a de mobile.

1.  **Seleção da Imagem:** O usuário clica em "Selecionar Imagem" para a versão desejada (desktop ou mobile).

2.  **Ajuste e Corte no Cliente (`react-easy-crop`):**
    -   A imagem selecionada é carregada em um modal que contém o componente `Cropper`.
    -   O `Cropper` é configurado com a proporção correta (`16/9` para desktop, `1/1` para mobile).
    -   O usuário pode dar zoom e reposicionar a imagem para definir a área de corte ideal.

3.  **Otimização com Canvas (`imageUtils.ts`):**
    -   Ao salvar o corte, a função `optimizeAndCropImage` é chamada.
    -   Ela desenha a área cortada em um `<canvas>` e redimensiona a imagem para a largura máxima correspondente (1200px ou 640px).
    -   A imagem é exportada do canvas como um `File` JPEG comprimido com **85% de qualidade**, pronta para o upload.

4.  **Pedido de Permissão de Upload:**
    -   O frontend chama a Edge Function `upload-media`, especificando o `bucket_type: 'posts'`.

5.  **Upload Direto para o R2:**
    -   O arquivo otimizado é enviado diretamente para a URL pré-assinada do bucket `posts` no Cloudflare R2.

6.  **Confirmação no Banco de Dados:**
    -   Ao salvar o post (seja como rascunho ou publicado), os nomes dos arquivos gerados são salvos nas colunas `cover_image_desktop_url` e `cover_image_mobile_url` da tabela `posts`.
    -   Se uma imagem for substituída, a função `delete-media` é chamada para remover o arquivo antigo do R2, mantendo o bucket limpo.