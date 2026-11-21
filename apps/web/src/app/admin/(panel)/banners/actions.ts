'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, q1, tx } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { int, optStr, pkDateTime, str } from '@/lib/admin/form';
import { applyPaymentEffects } from '@/lib/payments';
import { BadImageError, processPhoto } from '@/lib/images';
import { saveObject } from '@/lib/storage';
import { BANNER_PLACEMENTS } from '@/lib/bannerConfig';

function back(id: string, error?: string): never {
  revalidatePath('/admin/banners');
  revalidatePath('/', 'layout');
  redirect(error ? `/admin/banners/${id}?error=${encodeURIComponent(error)}` : `/admin/banners/${id}?saved=1`);
}

async function upload(fd: FormData, key: string, id: string): Promise<string | null> {
  const f = fd.get(key) as unknown as { size?: number; arrayBuffer?: () => Promise<ArrayBuffer> } | null;
  if (!f || typeof f !== 'object' || !f.size || !f.arrayBuffer) return null;
  try {
    const path = `brand/${id}/${key}-${randomUUID().slice(0, 8)}.webp`;
    await saveObject('banners', path, await processPhoto(Buffer.from(await f.arrayBuffer()), 2000), 'image/webp');
    return path;
  } catch (e) {
    if (e instanceof BadImageError) back(id, 'Banner must be an image.');
    throw e;
  }
}

/** Approve: accept the payment (or make it free) and put the banner live / scheduled. */
export async function approveBanner(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const free = str(fd, 'free') === 'true';
  const b = await q1<{ status: string; image_desktop_path: string | null }>('select status, image_desktop_path from banners where id = $1', [id]);
  if (!b || b.status !== 'pending') back(id, 'Only pending banners can be approved.');
  if (!b!.image_desktop_path) back(id, 'Upload the banner image first (design service).');
  await tx(async (c) => {
    let pay = (await c.query<{ id: string }>(`select id from payments where banner_id = $1 and status = 'pending' order by created_at desc limit 1`, [id])).rows[0];
    if (!pay) {
      pay = (await c.query<{ id: string }>(`insert into payments (purpose, banner_id, amount, method, status) values ('banner', $1, 0, 'free', 'pending') returning id`, [id])).rows[0];
    }
    await c.query(
      `update payments set status = $2::payment_status, verified_by = $3, verified_at = now() where id = $1`,
      [pay.id, free ? 'free' : 'verified', admin.id],
    );
    if (free) await c.query('update banners set is_free = true where id = $1', [id]);
    await applyPaymentEffects(c, pay.id, admin.id);
  });
  await logActivity(admin.id, free ? 'banner.approve_free' : 'banner.approve', 'banners', id);
  back(id);
}

export async function rejectBanner(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const reason = str(fd, 'reason');
  if (reason.length < 3) back(id, 'Write the reason (the brand sees it).');
  await tx(async (c) => {
    await c.query(`update banners set status = 'rejected', reject_reason = $2 where id = $1`, [id, reason]);
    await c.query(
      `update payments set status = 'rejected', reject_reason = $2, verified_by = $3, verified_at = now() where banner_id = $1 and status = 'pending'`,
      [id, reason, admin.id],
    );
  });
  await logActivity(admin.id, 'banner.reject', 'banners', id, { reason });
  back(id);
}

export async function setBannerStatus(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const to = str(fd, 'to');
  if (to === 'paused') await q(`update banners set status = 'paused' where id = $1 and status in ('running', 'scheduled')`, [id]);
  else if (to === 'running')
    await q(
      `update banners set status = case when starts_at > now() then 'scheduled'::banner_status else 'running'::banner_status end
        where id = $1 and status = 'paused' and (ends_at is null or ends_at > now())`,
      [id],
    );
  else back(id, 'Unknown action');
  await logActivity(admin.id, `banner.${to}`, 'banners', id);
  back(id);
}

export async function extendBanner(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const days = int(fd, 'days');
  if (days < 1 || days > 365) back(id, 'Days must be 1 to 365.');
  await q(
    `update banners set ends_at = greatest(coalesce(ends_at, now()), now()) + make_interval(days => $2::int),
            status = case when status = 'expired' then 'running'::banner_status else status end
      where id = $1 and status in ('running', 'scheduled', 'paused', 'expired')`,
    [id, days],
  );
  await logActivity(admin.id, 'banner.extend', 'banners', id, { days });
  back(id);
}

export async function saveBanner(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const placement = str(fd, 'placement');
  if (!(BANNER_PLACEMENTS as readonly string[]).includes(placement)) back(id, 'Choose a place.');
  const link = optStr(fd, 'link_url');
  if (link && !/^(https:\/\/|\/|tel:)/.test(link)) back(id, 'Link must start with https://, / or tel:');
  const cityIds = fd.getAll('city_ids').map(Number).filter(Boolean);
  const catIds = fd.getAll('category_ids').map(Number).filter(Boolean);
  const desktop = await upload(fd, 'image_desktop', id);
  const mobile = await upload(fd, 'image_mobile', id);
  await q(
    `update banners set placement = $2, business_name = $3, title_en = $4, title_ur = $5, subtitle_en = $6, subtitle_ur = $7, link_url = $8,
            target_city_ids = $9, target_category_ids = $10, target_platform = $11, starts_at = coalesce($12, starts_at), ends_at = coalesce($13, ends_at),
            sort_order = $14, image_desktop_path = coalesce($15, image_desktop_path), image_mobile_path = coalesce($16, image_mobile_path)
      where id = $1`,
    [
      id, placement, optStr(fd, 'business_name'), optStr(fd, 'title_en'), optStr(fd, 'title_ur'), optStr(fd, 'subtitle_en'), optStr(fd, 'subtitle_ur'),
      link, cityIds.length ? cityIds : null, catIds.length ? catIds : null, str(fd, 'target_platform') || 'both',
      pkDateTime(str(fd, 'starts_at')), pkDateTime(str(fd, 'ends_at')), int(fd, 'sort_order'), desktop, mobile,
    ],
  );
  await logActivity(admin.id, 'banner.update', 'banners', id, { new_images: !!(desktop || mobile) });
  back(id);
}

/** Banner booked on phone / WhatsApp: admin creates it directly (pending until approved). */
export async function createBrandBanner(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const name = str(fd, 'business_name');
  const placement = str(fd, 'placement');
  const days = int(fd, 'days', 7);
  if (name.length < 2 || !(BANNER_PLACEMENTS as readonly string[]).includes(placement)) redirect('/admin/banners?error=Business%20name%20and%20place%20are%20required');
  const row = await q1<{ id: string }>(
    `insert into banners (owner_type, placement, business_name, contact_phone, days, starts_at, status)
     values ('brand', $1, $2, $3, $4, coalesce($5, now()), 'pending') returning id`,
    [placement, name, optStr(fd, 'contact_phone'), days, pkDateTime(str(fd, 'starts_at'))],
  );
  const amount = int(fd, 'amount');
  await q(`insert into payments (purpose, banner_id, amount, method, transaction_id, status) values ('banner', $1, $2, $3, $4, 'pending')`, [
    row!.id, amount, amount > 0 ? str(fd, 'method') || 'jazzcash' : 'free', optStr(fd, 'transaction_id'),
  ]);
  await logActivity(admin.id, 'banner.create', 'banners', row!.id, { placement, days, amount });
  redirect(`/admin/banners/${row!.id}?saved=1`);
}
