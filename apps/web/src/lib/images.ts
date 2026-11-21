import sharp from 'sharp';

// Every uploaded photo is checked (must be a real image), turned the right
// way up, made smaller (max 1600px) and saved as WebP to save space and data.

export class BadImageError extends Error {}

export async function processPhoto(input: Buffer, maxSide = 1600): Promise<Buffer> {
  try {
    const img = sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' });
    const meta = await img.metadata();
    if (!meta.width || !meta.height) throw new BadImageError('Not an image');
    return await img
      .rotate()
      .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (e) {
    if (e instanceof BadImageError) throw e;
    throw new BadImageError('Not a valid image');
  }
}
