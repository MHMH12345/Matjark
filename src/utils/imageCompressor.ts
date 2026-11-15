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
  const palettes: Array<{ from: string; mid: string; to: string; light: string; ring: string }> = [
    { from: '#0876ff', mid: '#064fd9', to: '#07185e', light: '#24dcff', ring: '#9af5ff' },
    { from: '#ed00c8', mid: '#a000df', to: '#31045f', light: '#ff65df', ring: '#ffd2f5' },
    { from: '#00a8e8', mid: '#0757cf', to: '#081b64', light: '#50edff', ring: '#d0fbff' },
    { from: '#a500e8', mid: '#6414d8', to: '#210852', light: '#ff57e8', ring: '#ffd4ff' },
    { from: '#ff5b13', mid: '#d72b4e', to: '#4a0b4b', light: '#ffd34c', ring: '#fff0bb' },
    { from: '#1658ed', mid: '#0733a6', to: '#080c54', light: '#4ec3ff', ring: '#d8f4ff' },
    { from: '#008fbc', mid: '#0756a5', to: '#07134f', light: '#45f0ef', ring: '#d1fffc' },
  ];

  const seed = `${name.trim()}|${category.trim()}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }
  const palette = palettes[Math.abs(hash) % palettes.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300">
    <defs>
      <linearGradient id="background" x1="12" y1="8" x2="408" y2="294" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.from}"/>
        <stop offset=".48" stop-color="${palette.mid}"/>
        <stop offset="1" stop-color="${palette.to}"/>
      </linearGradient>
      <radialGradient id="center-light" cx="210" cy="126" r="152" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.light}" stop-opacity=".5"/>
        <stop offset=".58" stop-color="${palette.from}" stop-opacity=".2"/>
        <stop offset="1" stop-color="${palette.to}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ring" x1="106" y1="60" x2="306" y2="220" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.ring}"/>
        <stop offset=".45" stop-color="#ffffff"/>
        <stop offset="1" stop-color="${palette.light}"/>
      </linearGradient>
      <linearGradient id="wave" x1="0" y1="190" x2="420" y2="282" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.light}"/>
        <stop offset=".48" stop-color="#ffffff"/>
        <stop offset="1" stop-color="${palette.ring}"/>
      </linearGradient>
    </defs>
    <rect width="420" height="300" fill="url(#background)"/>
    <rect width="420" height="300" fill="url(#center-light)"/>
    <path d="M-20 225C45 161 92 246 160 224S267 174 326 203 390 240 443 195" fill="none" stroke="${palette.light}" stroke-width="7" opacity=".84"/>
    <path d="M-20 246C42 188 91 265 159 245S269 196 329 224 391 257 443 218" fill="none" stroke="url(#wave)" stroke-width="3.5" opacity=".92"/>
    <path d="M-20 269C55 218 101 286 171 269S276 227 338 250 394 278 443 246" fill="none" stroke="${palette.ring}" stroke-width="1.8" opacity=".62"/>
    <circle cx="210" cy="133" r="112" fill="${palette.to}" opacity=".3"/>
    <circle cx="210" cy="133" r="104" fill="none" stroke="url(#ring)" stroke-width="4"/>
    <circle cx="210" cy="133" r="96" fill="${palette.mid}" opacity=".3"/>
    <circle cx="210" cy="133" r="91" fill="none" stroke="${palette.ring}" stroke-width="1.2" opacity=".6"/>
    <path d="M53 61h9m-4.5-4.5v9M355 62h9m-4.5-4.5v9" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".68"/>
    <text x="210" y="153" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" stroke="${palette.to}" stroke-width="1.2" paint-order="stroke" font-family="IBM Plex Sans Arabic, sans-serif" font-size="112" font-weight="800">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
