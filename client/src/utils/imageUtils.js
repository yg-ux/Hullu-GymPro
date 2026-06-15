/**
 * Resize and compress an image file client-side using a canvas.
 * Returns a base64 data URL.
 *
 * @param {File} file        - The image file to process
 * @param {number} maxDim    - Max width or height in pixels (default 600)
 * @param {number} quality   - JPEG quality 0–1 (default 0.82)
 * @returns {Promise<string>} - Compressed base64 data URL
 */
export function resizeImage(file, maxDim = 600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height / width) * maxDim);
          width = maxDim;
        } else {
          width = Math.round((width / height) * maxDim);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}
