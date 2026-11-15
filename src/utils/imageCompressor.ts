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
  const palettes: Array<{ from: string; to: string; glow: string; accent: string }> = [
    { from: '#073fc7', to: '#06236f', glow: '#00d9ff', accent: '#2778ff' },
    { from: '#9c00e9', to: '#370078', glow: '#ff3dd7', accent: '#e65bff' },
    { from: '#0064cf', to: '#071d75', glow: '#24e0ff', accent: '#426cff' },
    { from: '#b000db', to: '#470078', glow: '#ff65ec', accent: '#a93bff' },
    { from: '#b42b00', to: '#4d1047', glow: '#ffba32', accent: '#ff4e7a' },
    { from: '#005eaa', to: '#111d78', glow: '#30dfff', accent: '#3a8aff' },
  ];
  const normalizedCategory = category.trim();
  const categoryIndex =
    normalizedCategory.includes('حلويات') ? 1 :
    normalizedCategory.includes('مشروبات') ? 0 :
    normalizedCategory.includes('زيت') || normalizedCategory.includes('سمن') ? 2 :
    normalizedCategory.includes('منظف') ? 3 :
    normalizedCategory.includes('أدوات') ? 4 :
    normalizedCategory.includes('ألبان') || normalizedCategory.includes('جبن') ? 5 :
    Array.from(normalizedCategory).reduce((sum, char) => sum + char.charCodeAt(0), 0) % palettes.length;
  const palette = palettes[categoryIndex];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${palette.from}"/>
        <stop offset="1" stop-color="${palette.to}"/>
      </linearGradient>
      <radialGradient id="halo">
        <stop offset="0" stop-color="${palette.glow}" stop-opacity=".52"/>
        <stop offset=".62" stop-color="${palette.accent}" stop-opacity=".2"/>
        <stop offset="1" stop-color="${palette.to}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${palette.glow}"/>
        <stop offset=".52" stop-color="#ffffff"/>
        <stop offset="1" stop-color="${palette.accent}"/>
      </linearGradient>
      <filter id="blur"><feGaussianBlur stdDeviation="12"/></filter>
      <filter id="glow">
        <feGaussianBlur stdDeviation="4.5" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="420" height="300" fill="url(#bg)"/>
    <rect width="420" height="300" fill="url(#halo)"/>
    <circle cx="210" cy="143" r="120" fill="${palette.glow}" opacity=".22" filter="url(#blur)"/>
    <path d="M-25 226 C54 134 119 287 207 210 S349 132 447 201" fill="none" stroke="${palette.glow}" stroke-width="5" opacity=".86" filter="url(#glow)"/>
    <path d="M-22 256 C55 174 131 306 222 236 S356 171 446 229" fill="none" stroke="#ffffff" stroke-width="2.2" opacity=".5"/>
    <path d="M-20 279 C78 222 137 318 229 264 S365 211 443 263" fill="none" stroke="${palette.accent}" stroke-width="9" opacity=".74" filter="url(#blur)"/>
    <circle cx="210" cy="139" r="75" fill="${palette.to}" opacity=".48"/>
    <circle cx="210" cy="139" r="72" fill="none" stroke="url(#ring)" stroke-width="3.4" filter="url(#glow)"/>
    <circle cx="210" cy="139" r="63" fill="${palette.from}" opacity=".42"/>
    <path d="M62 74h13m-6.5-6.5v13M348 74h14m-7-7v14" stroke="#ffffff" stroke-width="2" opacity=".72"/>
    <text x="210" y="164" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" stroke="${palette.accent}" stroke-width="1" paint-order="stroke" font-family="IBM Plex Sans Arabic, sans-serif" font-size="94" font-weight="800" filter="url(#glow)">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
