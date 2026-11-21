import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { BadImageError } from '@/lib/images';
import { saveObject } from '@/lib/storage';

// Rishta photos: keep the original private, and make two copies for members:
// a watermarked one (shown only with permission) and a blurred one (shown in search).

function watermark(width: number, height: number, text: string): Buffer {
  const size = Math.max(18, Math.round(width / 22));
  const rows = Array.from({ length: 6 }, (_, i) => {
    const y = Math.round(((i + 1) * height) / 7);
    return `<text x="50%" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}" font-weight="700" fill="white" fill-opacity="0.35" transform="rotate(-20 ${width / 2} ${y})">${text}</text>`;
  }).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rows}</svg>`);
}

export async function saveRishtaPhoto(input: Buffer, profileId: string, reference: string) {
  let base: ReturnType<typeof sharp>;
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
  try {
    base = sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' }).rotate();
    meta = await base.metadata();
    if (!meta.width || !meta.height) throw new Error('no size');
  } catch {
    throw new BadImageError('Not a valid image');
  }
  const original = await base.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const om = await sharp(original).metadata();
  const w = om.width!;
  const h = om.height!;
  const label = `Apna Okara · ${reference}`;
  const watermarked = await sharp(original).composite([{ input: watermark(w, h, label) }]).webp({ quality: 80 }).toBuffer();
  const small = await sharp(original).resize({ width: 480, height: 480, fit: 'inside' }).toBuffer();
  const sm = await sharp(small).metadata();
  const blurred = await sharp(small).blur(28).composite([{ input: watermark(sm.width!, sm.height!, label) }]).webp({ quality: 60 }).toBuffer();

  const id = randomUUID();
  const paths = {
    original: `${profileId}/${id}-orig.webp`,
    watermarked: `${profileId}/${id}-wm.webp`,
    blurred: `${profileId}/${id}-blur.webp`,
  };
  await saveObject('rishta-photos', paths.original, original, 'image/webp');
  await saveObject('rishta-photos', paths.watermarked, watermarked, 'image/webp');
  await saveObject('rishta-photos', paths.blurred, blurred, 'image/webp');
  return paths;
}
