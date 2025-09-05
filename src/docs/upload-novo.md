# Nova Estratégia de Upload de Mídia (Cliente Inteligente)

Este documento descreve a nova arquitetura para upload de mídias (imagens e vídeos), que transfere a responsabilidade do processamento pesado para o frontend, simplificando radicalmente o backend.
**Pré-requisito:** Esta arquitetura assume que a aplicação será um **Progressive Web App (PWA)** para garantir acesso confiável à câmera e uma experiência de usuário nativa.

---

## 1. Princípio Central: Cliente Inteligente, Backend Simples

-   **O Problema Anterior:** O processamento de imagens e vídeos no backend (Cloudflare Worker / Edge Function) era complexo, caro e propenso a erros de limite de memória (`Exceeded Memory Limit`).
-   **A Nova Solução:** O frontend se torna responsável por **capturar, redimensionar e comprimir** a mídia antes do upload. O backend apenas recebe um arquivo já otimizado e o armazena.

---

## 2. Fluxo de Imagens: Captura e Otimização via Canvas

Este fluxo é **exclusivo para dispositivos móveis** para garantir uma experiência de usuário alinhada com o caso de uso.

1.  **Interface:** O botão "Fazer Upload" é substituído por **"Tirar Foto"**. A opção de selecionar um arquivo existente é removida para este fluxo.

2.  **Captura via Câmera:**
    -   O PWA (Progressive Web App) utiliza a API nativa do navegador para abrir a câmera do celular.
    -   Usamos `<input type="file" accept="image/*" capture="user">`.

3.  **Processamento no Cliente (A Mágica do Canvas):**
    -   A foto tirada (que pode ser um arquivo grande) **não é enviada diretamente**.
    -   Ela é carregada em um elemento `<canvas>` HTML, que fica oculto na tela.
    -   O método `context.drawImage()` é usado para desenhar a imagem no canvas, forçando as dimensões para um padrão (ex: **640x360 pixels**). Isso garante o redimensionamento.
    -   Em seguida, o método `canvas.toDataURL('image/jpeg', 0.85)` exporta a imagem do canvas como uma string **base64**, já comprimida em formato JPEG com 85% de qualidade.

4.  **Upload para o Backend:**
    -   Apenas a string base64 resultante (que é leve e otimizada) é enviada para a nossa Edge Function.

---

## 3. Fluxo de Vídeos: Gravação e Compressão via MediaRecorder

Assim como as imagens, este fluxo é **exclusivo para dispositivos móveis**.

1.  **Interface:** O botão "Fazer Upload de Vídeo" é substituído por **"Gravar Vídeo"**.

2.  **Modal Informativo:** Antes da gravação, um modal informa o usuário:
    -   "O vídeo terá duração máxima de **12 segundos**."
    -   "A gravação será feita **sem áudio**."

3.  **Captura e Gravação Controlada:**
    -   O PWA usa `navigator.mediaDevices.getUserMedia({ video: true, audio: false })` para acessar a câmera, já solicitando uma resolução próxima de 360p.
    -   Uma interface com contagem regressiva de 12 segundos é exibida sobre a câmera.
    -   A gravação é iniciada com o `MediaRecorder`.
    -   **Ponto Chave (Compressão):** A compressão é forçada no cliente ao instanciar o `MediaRecorder` com `videoBitsPerSecond: 500000` (500 kbps). Isso garante um arquivo final com cerca de **750 KB**, independentemente da resolução da câmera do celular.
    -   A gravação é parada automaticamente após 12 segundos com `mediaRecorder.stop()`.

4.  **Upload para o Backend:**
    -   Apenas o `Blob` de vídeo resultante (leve e otimizado) é enviado para a Edge Function.

---

## 4. Backend Simplificado

A complexidade do backend é drasticamente reduzida.

-   **Edge Function `upload-midia`:**
    1.  Recebe a string base64 (imagem) ou o `Blob` (vídeo).
    2.  Decodifica/converte para um buffer.
    3.  Salva o arquivo final **diretamente na pasta de destino** no R2 (ex: `tratadas/`).
    4.  Retorna a URL final imediatamente (fluxo síncrono).

-   **Componentes Removidos da Arquitetura:**
    -   Worker `otimizador-exercicios`.
    -   Fluxo assíncrono de callback (`retorno-tratadas`).
    -   Pasta `originais/` no R2.

---

## 5. Vantagens da Nova Arquitetura

-   **Elimina Erros de Memória:** O problema de `Exceeded Memory Limit` no backend é completamente resolvido.
-   **Simplicidade Radical:** A arquitetura do backend se torna trivial, reduzindo a complexidade, o tempo de desenvolvimento e a manutenção.
-   **Performance Superior:** Uploads quase instantâneos para o usuário, mesmo em redes de academia (3G/4G).
-   **Redução de Custos:** Menos tempo de CPU em funções serverless, menos tráfego de dados e menos armazenamento.
-   **Padronização:** Todas as mídias são padronizadas em formato e tamanho no cliente, garantindo consistência visual no app.
-   **Concessão Principal:** A criação de exercícios com novas mídias (fotos/vídeos) se torna uma funcionalidade primariamente para dispositivos móveis, o que está alinhado com o caso de uso de um PT em campo.