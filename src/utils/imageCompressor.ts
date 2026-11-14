/**
 * High-performance client-side image compression & thumbnail generation.
 * Resizes and compresses product photos, returning Blob URLs instead of Base64 strings.
 */

export async function compressProductImage(file: File, maxDimension = 480, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('الملف المحدد ليس صورة صالحة'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      // Clean up the source file URL as soon as decoding has completed.
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        reject(new Error('فشل إنشاء سياق الرسم'));
        return;
      }

      // Fill white background for transparent images converted to jpeg/webp.
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const toBlob = (mimeType: string) => new Promise<Blob | null>((resolveBlob) => {
        canvas.toBlob(resolveBlob, mimeType, quality);
      });

      try {
        let compressedBlob = await toBlob('image/webp');
        if (!compressedBlob || compressedBlob.type !== 'image/webp') {
          compressedBlob = await toBlob('image/jpeg');
        }

        canvas.width = 0;
        canvas.height = 0;

        if (!compressedBlob) {
          reject(new Error('تعذر ضغط الصورة'));
          return;
        }

        // Keep the image as a Blob URL; IndexedDB stores the Blob separately from store records.
        resolve(URL.createObjectURL(compressedBlob));
      } catch (error) {
        canvas.width = 0;
        canvas.height = 0;
        reject(error instanceof Error ? error : new Error('فشل ضغط الصورة'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة الصورة'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates a lightweight inline SVG thumbnail placeholder with product initials
 * Zero network request, zero memory overhead.
 */
export function getProductPlaceholderSvg(name: string, category: string): string {
  const initial = (name.trim()[0] || 'م').toUpperCase();
  const colors: Record<string, string> = {
    'مشروبات': '#0288d1',
    'أطعمة': '#2e7d32',
    'إلكترونيات': '#7b1fa2',
    'عطور': '#c2185b',
    'منظفات': '#00796b',
    'أدوات': '#e65100',
    'حلويات': '#f57c00',
  };
  const bg = colors[category] || '#1976d2';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
    <rect width="80" height="80" rx="12" fill="${bg}" opacity="0.12"/>
    <circle cx="40" cy="40" r="26" fill="${bg}" opacity="0.2"/>
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${bg}" font-family="Cairo, sans-serif" font-weight="700" font-size="28">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
