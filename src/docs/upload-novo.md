# Arquitetura de Upload de Mídia (Cliente Inteligente + Upload Direto)

Este documento descreve a arquitetura para upload de mídias (imagens e vídeos), que combina processamento no cliente com uploads diretos para o Cloudflare R2, evitando gargalos no backend.
**Pré-requisito:** Esta arquitetura assume que a aplicação será um **Progressive Web App (PWA)** para garantir acesso confiável à câmera e uma experiência de usuário nativa.

---

## 1. Princípio Central: Cliente Inteligente, Backend como Porteiro

-   **O Problema:** Enviar arquivos grandes (imagens/vídeos) através de uma Edge Function do Supabase consome rapidamente a cota de transferência de dados (50MB/mês no plano gratuito), tornando a aplicação não escalável.
-   **A Solução:** O frontend continua responsável por **capturar, redimensionar e comprimir** a mídia. No entanto, em vez de enviar o arquivo para a função, ele pede uma **permissão de upload** (URL pré-assinada) e envia o arquivo pesado **diretamente para o Cloudflare R2**. O backend atua apenas como um "porteiro" que autoriza a operação, sem lidar com o tráfego pesado.

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

4.  **Pedido de Permissão de Upload:**
    -   O frontend chama a Edge Function `upload-media` com os metadados do arquivo (nome, tipo).
    -   A função valida a autenticação do usuário e gera uma **URL de upload pré-assinada** para o Cloudflare R2, válida por um curto período.

5.  **Upload Direto para o Cloudflare R2:**
    -   O frontend usa a URL pré-assinada recebida para enviar o objeto `File` (a imagem otimizada) diretamente para o bucket do Cloudflare R2, usando o método `PUT`.
    -   O tráfego pesado **não passa pelo Supabase**.

6.  **Confirmação no Banco de Dados:**
    -   Após o upload ser bem-sucedido, o frontend atualiza a tabela `exercicios` no Supabase com o caminho do novo arquivo.

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
    -   O fluxo é idêntico ao de imagens: o frontend pede uma URL pré-assinada para a função `upload-media` e envia o `Blob` de vídeo diretamente para o Cloudflare R2.

---

## 4. Backend como Porteiro

A complexidade de processamento de mídia no backend é eliminada. A função agora tem um papel de controle de acesso.

-   **Edge Function `upload-media`:**
    1.  Recebe uma requisição do frontend com uma `action` (`generate_upload_url` ou `delete_file`).
    2.  Valida o token de autenticação do usuário.
    3.  Para `generate_upload_url`: Gera e retorna uma URL pré-assinada de `PUT` para o Cloudflare R2.
    4.  Para `delete_file`: Executa a exclusão do arquivo no Cloudflare R2.

-   **Componentes Removidos da Arquitetura:**
    -   Worker `otimizador-exercicios`.
    -   Fluxo assíncrono de callback (`retorno-tratadas`).
    -   Pasta `originais/` no R2.

---

## 5. Vantagens da Nova Arquitetura

-   **Escalabilidade:** Resolve o gargalo de 50MB/mês de transferência do Supabase, permitindo uploads ilimitados (dentro dos limites do Cloudflare R2).
-   **Segurança:** O acesso para escrita e exclusão no bucket R2 é controlado pela Edge Function, que valida a autenticação do usuário. As chaves secretas nunca são expostas no frontend.
-   **Performance Superior:** Uploads quase instantâneos para o usuário, mesmo em redes de academia (3G/4G).
-   **Redução de Custos:** Evita custos de transferência de dados no Supabase e utiliza o armazenamento de baixo custo do R2.
-   **Padronização:** Todas as mídias são padronizadas em formato e tamanho no cliente, garantindo consistência visual no app.
-   **Concessão Principal:** A criação de exercícios com novas mídias (fotos/vídeos) se torna uma funcionalidade primariamente para dispositivos móveis, o que está alinhado com o caso de uso de um PT em campo.
-   **Segurança Aprimorada:** A validação de hardware (câmera) impede que usuários em desktop burlem o fluxo de captura de mídia, garantindo que a funcionalidade seja usada como projetado.

---

## 6. Validação Robusta de Dispositivo e UX

Para garantir que a experiência "mobile-first" seja segura e funcional, implementamos validações adicionais.

### 6.1. Detecção de Câmera (Anti-Fraude)
-   **O Problema:** Um usuário em um desktop poderia usar as ferramentas de desenvolvedor (F12) para emular um dispositivo móvel e, ao clicar em "Tirar Foto", o sistema abriria o seletor de arquivos do computador, quebrando a regra de negócio.
-   **A Solução:** Antes de acionar o `<input>`, a aplicação agora verifica ativamente se o dispositivo possui uma câmera de vídeo disponível através de `navigator.mediaDevices.enumerateDevices()`.
-   **Resultado:** Se nenhuma câmera for detectada, a ação é bloqueada e uma mensagem de erro é exibida. Isso fecha a brecha e garante que apenas dispositivos com câmera possam usar a funcionalidade de captura.

### 6.2. Experiência de Gravação de Vídeo
-   **O Problema:** Na interface de gravação de vídeo, o botão "Iniciar Gravação" era empurrado para fora da tela assim que o stream da câmera era ativado.
-   **A Solução:** Foi criado um novo componente dedicado, `VideoRecorder.tsx`, com um layout robusto que utiliza posicionamento absoluto para os controles (botão e cronômetro).
-   **Resultado:** A interface de gravação agora é estável, e os controles permanecem visíveis e acessíveis durante todo o processo, corrigindo o bug de layout.