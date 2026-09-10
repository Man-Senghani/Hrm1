/**
 * ⚡ Client-Side Image Compressor & Base64 Converter
 * Downscales high-resolution camera/phone photos to reasonable web dimensions (max 1200px)
 * and compresses them to JPEG (quality 0.75), reducing 10MB-15MB files to ~100KB-250KB in milliseconds.
 *
 * @param {File|Blob} file - The file to compress
 * @param {number} maxWidth - Maximum width in pixels (default: 1200)
 * @param {number} maxHeight - Maximum height in pixels (default: 1200)
 * @param {number} quality - JPEG compression quality 0 to 1 (default: 0.75)
 * @returns {Promise<string>} Data URL string (Base64)
 */
export const compressImageAndConvertToBase64 = (
  file,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.75
) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return resolve(null);
    }

    // If file is not an image (e.g. PDF), fall back to standard uncompressed Base64 reader
    if (!file.type || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => {
        // If image decoding fails, fallback to raw base64
        resolve(readerEvent.target.result);
      };
      img.onload = () => {
        try {
          let { width, height } = img;

          // If image is already smaller than max dimensions and file size is small (< 300KB), keep as-is
          if (width <= maxWidth && height <= maxHeight && file.size < 300 * 1024) {
            return resolve(readerEvent.target.result);
          }

          // Calculate aspect-ratio-preserving downscaled dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return resolve(readerEvent.target.result);
          }

          // Draw white background to avoid black background on transparent PNG converted to JPEG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          // Draw scaled image
          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed JPEG
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        } catch (canvasErr) {
          console.warn('Canvas compression fallback to raw Base64:', canvasErr);
          resolve(readerEvent.target.result);
        }
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  });
};
