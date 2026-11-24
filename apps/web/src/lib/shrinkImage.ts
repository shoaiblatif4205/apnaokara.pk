// Browser-side photo shrinking before upload.
// Vercel accepts at most 4.5 MB per request, and phone photos are often 3-8 MB each,
// so every photo and payment screenshot is resized (longest side 1600 px) and saved as JPEG first.
// The server still processes every image again (sharp -> webp).

const MAX_SIDE = 1600;

export async function shrinkImage(file: File, maxSide = MAX_SIDE, quality = 0.82): Promise<File> {
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) return file;
  // Small files are sent as they are
  if (file.size < 350 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff'; // transparent PNGs get a white background
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    // Old browsers or unsupported formats (e.g. some HEIC files): send the original
    return file;
  }
}

/** All photos of one upload together stay under this (Vercel's limit is 4.5 MB, leave room for the screenshot). */
const TOTAL_BUDGET = 3.2 * 1024 * 1024;

/**
 * Shrinks a set of photos of any size. If together they are still too big
 * (many large, detailed photos), they are shrunk again a bit smaller.
 */
export async function shrinkImages(files: File[]): Promise<File[]> {
  const steps: [number, number][] = [
    [1600, 0.82],
    [1280, 0.75],
    [1024, 0.68],
    [800, 0.6],
  ];
  // One at a time: decoding several 50-100 MP photos together can run a phone out of memory
  const each = async (list: File[], side: number, quality: number) => {
    const res: File[] = [];
    for (const f of list) res.push(await shrinkImage(f, side, quality));
    return res;
  };
  let out = await each(files, steps[0][0], steps[0][1]);
  for (const [side, quality] of steps.slice(1)) {
    if (out.reduce((n, f) => n + f.size, 0) <= TOTAL_BUDGET) break;
    // shrink the already-small copies again (fast), not the huge originals
    out = await each(out, side, quality);
  }
  return out;
}

/** Reads the error from a failed upload, including Vercel's plain-text "too large" response. */
export async function uploadError(res: Response, fallback: string, tooBig: string): Promise<string> {
  if (res.status === 413) return tooBig;
  try {
    const j = (await res.json()) as { message?: string };
    return j.message || fallback;
  } catch {
    return fallback;
  }
}

/**
 * Adds a payment screenshot to an upload: kept a bit larger than photos so the server can read
 * the date, amount and transaction ID on it, plus the time the phone says the file was made.
 */
export async function appendScreenshot(fd: FormData, file: File) {
  fd.append('screenshot', await shrinkImage(file, 2200, 0.85));
  if (file.lastModified) fd.append('screenshotTime', String(file.lastModified));
}
