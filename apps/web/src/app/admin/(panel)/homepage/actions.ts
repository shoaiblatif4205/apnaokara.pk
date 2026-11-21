'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, optStr, pkDateTime, str } from '@/lib/admin/form';
import { BadImageError, processPhoto } from '@/lib/images';
import { saveObject } from '@/lib/storage';

const PLACEMENTS = ['hero_slider', 'hero_side', 'home_strip', 'category_top', 'in_feed', 'ad_detail', 'app_home'];

function back(error?: string): never {
  revalidatePath('/', 'layout');
  redirect(error ? `/admin/homepage?error=${encodeURIComponent(error)}` : '/admin/homepage?saved=1');
}

export async function saveSection(fd: FormData) {
  const admin = await requireAdmin();
  const key = str(fd, 'key');
  const config: Record<string, unknown> = {};
  if (key === 'seasonal') config.category_slug = optStr(fd, 'category_slug');
  await q(
    `update homepage_sections set is_enabled = $2, sort_order = $3, title_en = $4, title_ur = $5, config = $6 where key = $1`,
    [key, bool(fd, 'is_enabled'), int(fd, 'sort_order'), optStr(fd, 'title_en'), optStr(fd, 'title_ur'), JSON.stringify(config)],
  );
  await logActivity(admin.id, 'homepage.section', 'homepage_sections', key, { enabled: bool(fd, 'is_enabled') });
  back();
}

async function upload(fd: FormData, key: string): Promise<string | null> {
  const f = fd.get(key) as unknown as { size?: number; arrayBuffer?: () => Promise<ArrayBuffer> } | null;
  if (!f || typeof f !== 'object' || !f.size || !f.arrayBuffer) return null;
  if (f.size > 10 * 1024 * 1024) back('Image is too big (max 10 MB).');
  try {
    const buf = await processPhoto(Buffer.from(await f.arrayBuffer()), 2000);
    const path = `house/${randomUUID()}.webp`;
    await saveObject('banners', path, buf, 'image/webp');
    return path;
  } catch (e) {
    if (e instanceof BadImageError) back('Banner must be an image (JPG, PNG, WebP).');
    throw e;
  }
}

/** Our own banners / hero slides (house banners). Brand banners are booked in the Banner Manager (Phase 6). */
export async function saveHouseBanner(fd: FormData) {
  const admin = await requireAdmin();
  const id = optStr(fd, 'id');
  const placement = str(fd, 'placement');
  if (!PLACEMENTS.includes(placement)) back('Choose where the banner shows.');
  const link = optStr(fd, 'link_url');
  if (link && !/^(https:\/\/|\/)/.test(link)) back('Link must start with https:// or / (a page on this site).');
  const desktop = await upload(fd, 'image_desktop');
  const mobile = await upload(fd, 'image_mobile');
  const startsAt = pkDateTime(str(fd, 'starts_at'));
  const endsAt = pkDateTime(str(fd, 'ends_at'));
  const status = bool(fd, 'active') ? 'running' : 'paused';
  const values = [
    placement, optStr(fd, 'title_en'), optStr(fd, 'title_ur'), optStr(fd, 'subtitle_en'), optStr(fd, 'subtitle_ur'),
    optStr(fd, 'button_en'), optStr(fd, 'button_ur'), link, startsAt, endsAt, int(fd, 'sort_order'), status,
  ];
  if (!values[1] && !values[2] && !desktop && !id) back('Add a title or an image.');

  let bannerId = id;
  if (id) {
    await q(
      `update banners set placement = $2, title_en = $3, title_ur = $4, subtitle_en = $5, subtitle_ur = $6, button_en = $7,
              button_ur = $8, link_url = $9, starts_at = $10, ends_at = $11, sort_order = $12, status = $13,
              image_desktop_path = coalesce($14, image_desktop_path), image_mobile_path = coalesce($15, image_mobile_path)
        where id = $1 and owner_type = 'house'`,
      [id, ...values, desktop, mobile],
    );
    if (bool(fd, 'remove_images')) await q(`update banners set image_desktop_path = null, image_mobile_path = null where id = $1`, [id]);
  } else {
    const row = await q1<{ id: string }>(
      `insert into banners (owner_type, placement, title_en, title_ur, subtitle_en, subtitle_ur, button_en, button_ur, link_url,
                            starts_at, ends_at, sort_order, status, image_desktop_path, image_mobile_path, is_free)
       values ('house', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true) returning id`,
      [...values, desktop, mobile],
    );
    bannerId = row!.id;
  }
  await logActivity(admin.id, id ? 'house_banner.update' : 'house_banner.create', 'banners', bannerId, { placement, status });
  back();
}
