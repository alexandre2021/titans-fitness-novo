// c:\Users\alexa\titans-fitness-novo\src\lib\imageUtils.ts

import imageCompression from 'browser-image-compression';
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
// Usa a biblioteca browser-image-compression para lidar com EXIF e otimização.
export const resizeAndOptimizeImage = async (
  file: File,
  maxWidth: number
): Promise<File | null> => {
  console.log('🔍 [resizeAndOptimizeImage] Iniciado com arquivo:', { name: file.name, size: file.size, type: file.type });
  const options = {
    maxSizeMB: 1.5, // Define um alvo de tamanho máximo para o arquivo
    maxWidthOrHeight: maxWidth, // Redimensiona com base na maior dimensão
    useWebWorker: true, // Usa Web Worker para não travar a UI
    initialQuality: 0.85, // Qualidade inicial
    // A chave para o problema: lê e corrige a orientação da foto
    exifOrientation: -1,
  };

  console.log('🔍 [resizeAndOptimizeImage] Opções de compressão:', options);

  try {
    console.log('🔍 [resizeAndOptimizeImage] Iniciando compressão...');
    const compressedFile = await imageCompression(file, options);
    console.log('✅ [resizeAndOptimizeImage] Sucesso! Arquivo comprimido:', { name: compressedFile.name, size: compressedFile.size, type: compressedFile.type });
    return compressedFile;
  } catch (error) {
    console.error('❌ [resizeAndOptimizeImage] Erro durante a compressão:', error);
    return null;
  }
};
