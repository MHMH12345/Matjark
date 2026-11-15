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
  const palettes: Array<{ from: string; mid: string; to: string; light: string; ring: string; accent: string }> = [
    { from: '#0876ff', mid: '#064fd9', to: '#07185e', light: '#24dcff', ring: '#d7fbff', accent: '#4778ff' },
    { from: '#f000bd', mid: '#a500e6', to: '#31045f', light: '#ff65df', ring: '#ffe0fa', accent: '#ff35d0' },
    { from: '#00a8e8', mid: '#0757cf', to: '#081b64', light: '#50edff', ring: '#d0fbff', accent: '#246bff' },
    { from: '#a500e8', mid: '#6414d8', to: '#210852', light: '#ff57e8', ring: '#ffd4ff', accent: '#a93bff' },
    { from: '#ff5b13', mid: '#d72b4e', to: '#4a0b4b', light: '#ffd34c', ring: '#fff0bb', accent: '#ff4b9d' },
    { from: '#1658ed', mid: '#0733a6', to: '#080c54', light: '#4ec3ff', ring: '#d8f4ff', accent: '#1759ef' },
    { from: '#008fbc', mid: '#0756a5', to: '#07134f', light: '#45f0ef', ring: '#d1fffc', accent: '#03a1e4' },
  ];

  // FNV-1a gives the sample catalogue a stable, evenly distributed palette.
  const seed = `${name.trim()}|${category.trim()}`;
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const palette = palettes[(hash >>> 0) % palettes.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="background" x1="0" y1="0" x2="420" y2="300" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.from}"/>
        <stop offset=".52" stop-color="${palette.mid}"/>
        <stop offset="1" stop-color="${palette.to}"/>
      </linearGradient>
      <radialGradient id="center-light" cx="210" cy="122" r="188" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.light}" stop-opacity=".46"/>
        <stop offset=".64" stop-color="${palette.from}" stop-opacity=".18"/>
        <stop offset="1" stop-color="${palette.to}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ring" x1="72" y1="38" x2="344" y2="230" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.ring}"/>
        <stop offset=".48" stop-color="#ffffff"/>
        <stop offset="1" stop-color="${palette.light}"/>
      </linearGradient>
      <linearGradient id="wave" x1="0" y1="178" x2="420" y2="278" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${palette.light}"/>
        <stop offset=".48" stop-color="#ffffff"/>
        <stop offset="1" stop-color="${palette.accent}"/>
      </linearGradient>
    </defs>

    <rect width="420" height="300" fill="url(#background)"/>
    <rect width="420" height="300" fill="url(#center-light)"/>

    <path d="M-16 36 112 0h74L0 118z" fill="#ffffff" opacity=".035"/>
    <path d="M274 0h146v92L335 154 267 80z" fill="#ffffff" opacity=".035"/>

    <circle cx="210" cy="126" r="145" fill="${palette.to}" opacity=".23"/>
    <circle cx="210" cy="126" r="137" fill="none" stroke="url(#ring)" stroke-width="4.5"/>
    <circle cx="210" cy="126" r="126" fill="${palette.mid}" opacity=".32"/>
    <circle cx="210" cy="126" r="119" fill="none" stroke="${palette.ring}" stroke-width="1.4" opacity=".7"/>

    <path d="M-26 218C47 147 95 246 167 219S279 170 337 205 395 241 446 193" fill="none" stroke="${palette.light}" stroke-width="8" opacity=".88"/>
    <path d="M-22 241C48 180 99 264 168 240S280 192 340 224 396 254 445 215" fill="none" stroke="url(#wave)" stroke-width="4" opacity=".95"/>
    <path d="M-18 266C56 216 111 288 181 267S288 225 347 249 399 277 444 244" fill="none" stroke="${palette.ring}" stroke-width="2" opacity=".72"/>

    <path d="M47 62h10m-5-5v10M357 63h10m-5-5v10M54 181h7m-3.5-3.5v7" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity=".72"/>
    <circle cx="82" cy="86" r="2.5" fill="#ffffff" opacity=".65"/>
    <circle cx="338" cy="92" r="2.2" fill="#ffffff" opacity=".6"/>

    <text x="210" y="151" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" stroke="${palette.to}" stroke-width="1.4" paint-order="stroke" font-family="IBM Plex Sans Arabic, sans-serif" font-size="142" font-weight="800">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
