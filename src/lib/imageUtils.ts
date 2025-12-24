// c:\Users\alexa\titans-fitness-novo\src\lib\imageUtils.ts

import { type Area } from 'react-easy-crop';

// Converte um arquivo para uma string base64 (Data URL)
export const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

// Cria um elemento de imagem a partir de uma URL
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

// Valida o arquivo de imagem (tamanho e tipo)
export const validateImageFile = (file: File, allowGif = false): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = allowGif
    ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    : ['image/jpeg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    return { isValid: false, error: 'O arquivo é muito grande (máx 10MB).' };
  }
  if (!allowedTypes.includes(file.type)) {
    const formats = allowGif ? 'JPEG, PNG, WebP ou GIF' : 'JPEG, PNG ou WebP';
    return { isValid: false, error: `Formato não suportado (use ${formats}).` };
  }
  return { isValid: true };
};

// Corta e otimiza a imagem
export const optimizeAndCropImage = async (
  imageSrc: string,
  pixelCrop: Area,
  maxWidth: number,
  quality: number = 0.85
): Promise<File | null> => {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Define o tamanho do canvas para o tamanho do corte
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Desenha a imagem cortada no canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Se a imagem já for menor que a largura máxima, não redimensiona
    if (pixelCrop.width <= maxWidth) {
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(null); return; }
          resolve(new File([blob], 'cropped_image.jpeg', { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      });
    }

    // Redimensiona para a largura máxima mantendo a proporção
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return null;

    const aspectRatio = pixelCrop.height / pixelCrop.width;
    finalCanvas.width = maxWidth;
    finalCanvas.height = maxWidth * aspectRatio;

    finalCtx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);

    return new Promise((resolve) => {
      finalCanvas.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        resolve(new File([blob], 'optimized_image.jpeg', { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    });
  } catch (error) {
    console.error('Erro ao otimizar imagem:', error);
    return null;
  }
};

// Redimensiona e otimiza uma imagem a partir de um arquivo, sem corte.
// Usa APIs nativas do navegador para redimensionamento e otimização.
export const resizeAndOptimizeImage = async (
  file: File,
  maxWidth: number
): Promise<File | null> => {
  console.log('🔍 [resizeAndOptimizeImage] Iniciado com arquivo:', { name: file.name, size: file.size, type: file.type });

  try {
    const imageSrc = await fileToDataURL(file);
    const image = await createImage(imageSrc);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Calcula as dimensões mantendo a proporção
    let width = image.width;
    let height = image.height;

    if (width > maxWidth || height > maxWidth) {
      if (width > height) {
        height = (height / width) * maxWidth;
        width = maxWidth;
      } else {
        width = (width / height) * maxWidth;
        height = maxWidth;
      }
    }

    canvas.width = width;
    canvas.height = height;

    // Desenha a imagem redimensionada
    ctx.drawImage(image, 0, 0, width, height);

    // Converte para blob com qualidade 85%
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('❌ [resizeAndOptimizeImage] Erro ao converter para blob');
          resolve(null);
          return;
        }
        const finalFile = new File([blob], file.name || `image_${Date.now()}.jpg`, { type: 'image/jpeg' });
        console.log('✅ [resizeAndOptimizeImage] Sucesso! Arquivo processado:', {
          name: finalFile.name,
          size: finalFile.size,
          type: finalFile.type
        });
        resolve(finalFile);
      }, 'image/jpeg', 0.85);
    });
  } catch (error) {
    console.error('❌ [resizeAndOptimizeImage] Erro durante o processamento:', error);
    return null;
  }
};

// Valida o arquivo de vídeo (tamanho e tipo)
export const validateVideoFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 16 * 1024 * 1024; // 16MB - limite máximo
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

  if (file.size > maxSize) {
    return { isValid: false, error: `O vídeo é muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). O tamanho máximo é 16MB. O vídeo será comprimido automaticamente após o upload.` };
  }
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Formato de vídeo não suportado (use MP4, WebM, MOV ou AVI).' };
  }
  return { isValid: true };
};

// Normaliza o nome do arquivo removendo caracteres especiais e espaços
export const normalizeFilename = (filename: string): string => {
  // Remove a extensão
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
  const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';

  // Normaliza o nome:
  // 1. Remove acentos e caracteres especiais
  // 2. Converte para minúsculas
  // 3. Substitui espaços e caracteres especiais por underscores
  // 4. Remove underscores duplicados
  const normalizedName = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_') // Substitui não-alfanuméricos por _
    .replace(/^_+|_+$/g, '') // Remove _ do início e fim
    .replace(/_+/g, '_'); // Remove _ duplicados

  return normalizedName + extension;
};

// Converte GIF para WebP estático (primeiro frame) com redimensionamento
export const convertGifToWebp = async (file: File): Promise<File> => {
  console.log(`🎨 [convertGifToWebp] Iniciando conversão de GIF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

  try {
    // Cria uma imagem a partir do GIF
    const imageSrc = await fileToDataURL(file);
    const image = await createImage(imageSrc);

    // Cria canvas para extrair o primeiro frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível criar contexto do canvas');

    // Redimensiona para 640x640 mantendo proporção
    const maxSize = 640;
    let width = image.width;
    let height = image.height;

    if (width > maxSize || height > maxSize) {
      if (width > height) {
        height = (height / width) * maxSize;
        width = maxSize;
      } else {
        width = (width / height) * maxSize;
        height = maxSize;
      }
    }

    canvas.width = width;
    canvas.height = height;

    // Desenha o primeiro frame do GIF
    ctx.drawImage(image, 0, 0, width, height);

    // Converte para WebP
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Erro ao converter para WebP'));
          return;
        }

        const webpFile = new File([blob], file.name.replace(/\.gif$/i, '.webp'), {
          type: 'image/webp'
        });

        const sizeReduction = ((1 - webpFile.size / file.size) * 100).toFixed(1);
        console.log(`✅ [convertGifToWebp] GIF convertido para WebP estático: ${(webpFile.size / 1024 / 1024).toFixed(2)}MB (redução de ${sizeReduction}%)`);

        resolve(webpFile);
      }, 'image/webp', 0.85);
    });

  } catch (error) {
    console.error('❌ [convertGifToWebp] Erro ao converter GIF:', error);
    throw error;
  }
};

// Comprime um vídeo reduzindo resolução e bitrate
export const compressVideo = async (file: File): Promise<File> => {
  console.log(`🎬 [compressVideo] INICIANDO compressão de vídeo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = async () => {
      console.log(`📹 [compressVideo] Metadata carregada. Dimensões: ${video.videoWidth}x${video.videoHeight}, Duração: ${video.duration}s`);

      const videoUrl = video.src;
      URL.revokeObjectURL(videoUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('❌ [compressVideo] Não foi possível obter contexto do canvas');
        reject(new Error('Não foi possível obter contexto do canvas'));
        return;
      }

      // Define resolução máxima (mantém aspect ratio)
      const maxWidth = 640;
      const maxHeight = 1138; // 16:9 vertical

      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = maxWidth;
          height = Math.round(maxWidth / aspectRatio);
        } else {
          height = maxHeight;
          width = Math.round(maxHeight * aspectRatio);
        }
      }

      canvas.width = width;
      canvas.height = height;
      console.log(`🎨 [compressVideo] Canvas criado com dimensões: ${width}x${height}`);

      // Cria MediaRecorder para recomprimir o vídeo
      const stream = canvas.captureStream(30); // 30 FPS

      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 800000 // 800 kbps
        });
        console.log(`🎙️ [compressVideo] MediaRecorder criado com sucesso`);
      } catch (error) {
        console.error('❌ [compressVideo] Erro ao criar MediaRecorder:', error);
        reject(new Error('Navegador não suporta compressão de vídeo'));
        return;
      }

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
          console.log(`📦 [compressVideo] Chunk recebido: ${e.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log(`🛑 [compressVideo] MediaRecorder parado. Total de chunks: ${chunks.length}`);
        const compressedBlob = new Blob(chunks, { type: 'video/webm' });
        const compressedFile = new File([compressedBlob], file.name.replace(/\.(mp4|mov|avi|webm)$/i, '.webm'), {
          type: 'video/webm'
        });

        const economia = ((1 - compressedFile.size / file.size) * 100).toFixed(1);
        console.log(`✅ [compressVideo] Vídeo comprimido: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB (economia de ${economia}%)`);
        resolve(compressedFile);
      };

      mediaRecorder.onerror = (e) => {
        console.error('❌ [compressVideo] Erro no MediaRecorder:', e);
        reject(new Error('Erro ao comprimir vídeo'));
      };

      // Inicia gravação
      console.log(`▶️ [compressVideo] Iniciando gravação...`);
      mediaRecorder.start();
      video.currentTime = 0;
      video.play();

      // Renderiza cada frame no canvas
      let frameCount = 0;
      const renderFrame = () => {
        if (video.ended || video.paused) {
          console.log(`🏁 [compressVideo] Vídeo finalizado. Total de frames: ${frameCount}`);
          mediaRecorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        frameCount++;
        requestAnimationFrame(renderFrame);
      };

      video.onended = () => {
        console.log(`🎬 [compressVideo] Evento onended disparado`);
        setTimeout(() => mediaRecorder.stop(), 100);
      };

      renderFrame();
    };

    video.onerror = (e) => {
      console.error('❌ [compressVideo] Erro ao carregar vídeo:', e);
      reject(new Error('Erro ao carregar vídeo'));
    };

    const objectUrl = URL.createObjectURL(file);
    console.log(`🔗 [compressVideo] ObjectURL criada: ${objectUrl}`);
    video.src = objectUrl;
  });
};
