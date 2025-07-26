/**
 * Utility functions for image processing and optimization
 */

/**
 * Resize and convert image to WebP format
 */
export const optimizeImage = async (file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      // Set canvas dimensions
      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx?.drawImage(img, 0, 0, width, height);
      
      // Convert to WebP base64
      const webpDataUrl = canvas.toDataURL('image/webp', quality);
      
      // Extract base64 string (remove data:image/webp;base64, prefix)
      const base64String = webpDataUrl.split(',')[1];
      resolve(base64String);
    };

    img.onerror = () => {
      reject(new Error('Erro ao processar a imagem'));
    };

    // Create object URL for the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Generate filename for image upload
 */
export const generateImageFilename = (alunoId: string, tipo: 'frente' | 'lado' | 'costas'): string => {
  const timestamp = Date.now();
  return `${alunoId}_${tipo}_${timestamp}.webp`;
};