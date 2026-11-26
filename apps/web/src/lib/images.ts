import sharp from 'sharp';

// Every uploaded photo is checked (must be a real image), turned the right
// way up, made smaller and saved as WebP to save space and data.
// Any size, shape or common format (JPG, PNG, WebP, GIF, AVIF, TIFF...) is accepted:
// people are never stopped because of how their photo was taken.

export class BadImageError extends Error {}

const open = (input: Buffer) => sharp(input, { limitInputPixels: false, failOn: 'none', animated: false });

export async function processPhoto(input: Buffer, maxSide = 1600): Promise<Buffer> {
  try {
    const img = open(input);
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

/** Every ad photo on the site has exactly this size (4:3, like the ad cards and the gallery). */
export const AD_PHOTO = { width: 1200, height: 900 };

/**
 * Ad photos: whatever the shape (tall phone photo, wide, square, tiny or huge), the result is
 * always exactly 1200 x 900. The whole photo stays visible (nothing is cut off); the empty
 * sides are filled with a soft, blurred copy of the same photo instead of black bars.
 */
export async function processAdPhoto(input: Buffer): Promise<Buffer> {
  const { width: W, height: H } = AD_PHOTO;
  try {
    // Upright first, so the phone's rotation is applied before measuring
    const upright = await open(input).rotate().toBuffer();
    const meta = await sharp(upright, { limitInputPixels: false }).metadata();
    if (!meta.width || !meta.height) throw new BadImageError('Not an image');
    const ratio = meta.width / meta.height;
    const fg = await sharp(upright, { limitInputPixels: false })
      .resize({ width: W, height: H, fit: 'inside' })
      .flatten({ background: '#ffffff' })
      .toBuffer();
    // Already (almost) 4:3: just fill the frame exactly
    if (Math.abs(ratio - W / H) < 0.02) {
      return await sharp(upright, { limitInputPixels: false }).resize(W, H, { fit: 'cover' }).flatten({ background: '#ffffff' }).webp({ quality: 80 }).toBuffer();
    }
    // Background: shrink to a tiny copy, blur it and stretch it back (sharp runs one resize per pipeline, so two steps)
    const tiny = await sharp(upright, { limitInputPixels: false })
      .resize(W / 20, H / 20, { fit: 'cover' })
      .flatten({ background: '#ffffff' })
      .toBuffer();
    const bg = await sharp(tiny).resize(W, H).blur(12).modulate({ brightness: 0.85 }).toBuffer();
    return await sharp(bg).composite([{ input: fg, gravity: 'center' }]).webp({ quality: 80 }).toBuffer();
  } catch (e) {
    if (e instanceof BadImageError) throw e;
    throw new BadImageError('Not a valid image');
  }
}
