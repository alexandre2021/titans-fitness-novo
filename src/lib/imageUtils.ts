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
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (file.size > maxSize) {
    return { isValid: false, error: 'O arquivo é muito grande (máx 10MB).' };
  }
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Formato não suportado (use JPEG, PNG, ou WebP).' };
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
