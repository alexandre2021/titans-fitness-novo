# Arquitetura de Upload de Mídia

Este documento descreve a arquitetura para upload de mídias (imagens e vídeos). O princípio central é o **"Cliente Inteligente"**: o frontend (navegador) é responsável por todo o processamento pesado (corte, redimensionamento, compressão) antes do upload. O backend atua apenas como um "porteiro", autorizando o envio direto para o serviço de armazenamento (Cloudflare R2 ou Supabase Storage), o que economiza recursos e custos.

---

## Capítulo 1: Caixa de Ferramentas (`imageUtils.ts`)

O arquivo `src/lib/imageUtils.ts` é o nosso módulo central de utilitários para manipulação de imagens. Ele não é um componente visual, mas uma "caixa de ferramentas" com funções que os componentes utilizam para processar imagens no cliente.

### 1.1. Ferramentas Disponíveis

-   **`validateImageFile`**: Valida um arquivo de imagem, verificando se o tipo (`jpeg`, `png`, `webp`) e o tamanho (máx. 10MB) são permitidos.
-   **`fileToDataURL`**: Converte um `File` em uma string `base64` (Data URL), usada para exibir uma pré-visualização instantânea da imagem para o usuário.
-   **`resizeAndOptimizeImage`**: **Redimensiona e otimiza** uma imagem.
    -   **Uso:** Exercícios personalizados.
    -   **Processo:** Recebe um `File`, redimensiona para uma largura máxima (ex: 640px) mantendo a proporção e exporta como um `File` JPEG com 85% de qualidade. Não realiza corte.
-   **`optimizeAndCropImage`**: **Corta e otimiza** uma imagem.
    -   **Uso:** Posts e Avatares de perfil.
    -   **Processo:** Recebe uma imagem (Data URL) e as coordenadas de corte (`pixelCrop` do `react-easy-crop`). Desenha a área cortada em um `<canvas>`, redimensiona para a largura máxima especificada e exporta como um `File` JPEG com 85% de qualidade.

---

## Capítulo 2: Exercícios Personalizados

O upload de mídias para exercícios personalizados utiliza o princípio de "cliente inteligente" para otimizar imagens e vídeos antes de enviá-los diretamente para o **Cloudflare R2**.

### 2.1. Fluxo de Imagens

1.  **Captura:** O usuário seleciona uma imagem ou tira uma foto.
2.  **Otimização no Cliente:** A função `resizeAndOptimizeImage` de `imageUtils.ts` é chamada.
    -   A imagem é redimensionada para uma **largura máxima de 640px**.
    -   É comprimida para o formato **JPEG com 85% de qualidade**.
3.  **Upload para R2:** O arquivo otimizado é enviado para o bucket `exercicios` no Cloudflare R2 através de uma URL pré-assinada, gerada pela Edge Function `upload-media`.

### 2.2. Fluxo de Vídeos

1.  **Gravação:** O componente `VideoRecorder.tsx` utiliza a API `MediaRecorder` do navegador.
2.  **Compressão no Cliente:** A gravação é configurada para ter no máximo **12 segundos**, **sem áudio** e com um bitrate baixo (`500 kbps`), resultando em um arquivo leve (aprox. 750 KB).
3.  **Upload para R2:** O fluxo de upload é idêntico ao das imagens, usando a Edge Function `upload-media`.

---

## Capítulo 3: Avatar do Perfil

O upload do avatar de perfil também processa a imagem no cliente, mas o armazenamento é feito diretamente no **Supabase Storage**, não no Cloudflare R2.

### 3.1. Fluxo de Upload

1.  **Seleção da Imagem:** O usuário seleciona uma imagem.
2.  **Corte no Cliente:** Um modal com `react-easy-crop` é aberto.
    -   A proporção é travada em **1:1 (quadrada)**.
    -   O usuário ajusta o zoom e a posição.
3.  **Otimização com Canvas:** A função `optimizeAndCropImage` de `imageUtils.ts` é chamada.
    -   A imagem é cortada e redimensionada para uma **largura máxima de 256px**.
    -   É comprimida para o formato **JPEG com 85% de qualidade**.
4.  **Upload para Supabase Storage:** O arquivo otimizado é enviado diretamente para o bucket `avatars` usando a função `supabase.storage.from('avatars').upload()`.
5.  **Confirmação no Banco de Dados:** A URL pública do avatar é salva na tabela `alunos` ou `professores`.

> **Nota Arquitetural:** Diferente de outras mídias, os avatares são armazenados no Supabase Storage para simplificar o acesso público e a integração com o `user_metadata` do Supabase Auth, que exibe o avatar em todo o sistema.

---

## Capítulo 4: Posts

O sistema de posts utiliza a mesma arquitetura de "cliente inteligente", mas com um fluxo adaptado para gerenciar duas imagens de capa distintas: uma para desktop e outra para mobile.

### 4.1. Objetivo

-   **Desktop:** Uma imagem na proporção **16:9**, otimizada para uma largura máxima de **1200px**.
-   **Mobile:** Uma imagem na proporção **1:1** (quadrada), otimizada para uma largura máxima de **640px**.

Essa separação garante que a imagem de capa seja sempre exibida da melhor forma, sem cortes inesperados ou perda de qualidade, independentemente do dispositivo do usuário.

### 4.2. Fluxo de Upload (para cada imagem)

O processo é executado individualmente para a imagem de desktop e para a de mobile.

1.  **Seleção da Imagem:** O usuário clica em "Selecionar Imagem" para a versão desejada (desktop ou mobile).

2.  **Corte no Cliente:** Um modal com `react-easy-crop` é aberto.
    -   A proporção é travada (`16/9` para desktop, `1/1` para mobile).
    -   O usuário pode dar zoom e reposicionar a imagem para definir a área de corte ideal.

3.  **Otimização com Canvas:** A função `optimizeAndCropImage` de `imageUtils.ts` é chamada.
    -   Ao salvar o corte, a função `optimizeAndCropImage` é chamada.
    -   Ela desenha a área cortada em um `<canvas>` e redimensiona a imagem para a largura máxima correspondente (1200px ou 640px).
    -   A imagem é exportada do canvas como um `File` JPEG comprimido com **85% de qualidade**, pronta para o upload.

4.  **Upload para R2:** O arquivo otimizado é enviado para o bucket `posts` no Cloudflare R2 através de uma URL pré-assinada, gerada pela Edge Function `upload-media`.

5.  **Confirmação no Banco de Dados:**
    -   Ao salvar o post (seja como rascunho ou publicado), os nomes dos arquivos gerados são salvos nas colunas `cover_image_desktop_url` e `cover_image_mobile_url` da tabela `posts`.
    -   Se uma imagem for substituída, a função `delete-media` é chamada para remover o arquivo antigo do R2, mantendo o bucket limpo.