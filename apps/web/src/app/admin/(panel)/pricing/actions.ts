'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { AD_DURATIONS, PROVIDER_PLAN } from '@apna-okara/shared';
import { q, tx } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, optInt, str } from '@/lib/admin/form';
import { getSetting, setSetting } from '@/lib/settings';
import { BANNER_DAYS, BANNER_PLACEMENTS } from '@/lib/bannerConfig';

function back(anchor: string, error?: string): never {
  revalidatePath('/', 'layout');
  redirect(error ? `/admin/pricing?error=${encodeURIComponent(error)}#${anchor}` : `/admin/pricing?saved=1#${anchor}`);
}

export async function saveDefaultPrices(fd: FormData) {
  const admin = await requireAdmin();
  const changes: Record<string, number> = {};
  await tx(async (c) => {
    for (const model of ['buy_sell', 'vehicles', 'property', 'jobs']) {
      for (const d of AD_DURATIONS) {
        const v = optInt(fd, `p_${model}_${d}`);
        if (v === null) continue;
        if (v < 0 || v > 1_000_000) throw new Error('bad');
        await c.query(
          `insert into pricing (model, category_id, duration_days, price) values ($1, null, $2, $3)
           on conflict (model, category_id, duration_days) do update set price = excluded.price, is_active = true`,
          [model, d, v],
        );
        changes[`${model}_${d}`] = v;
      }
    }
    for (const model of ['services', 'business']) {
      const v = optInt(fd, `p_${model}_${PROVIDER_PLAN.days}`);
      if (v === null) continue;
      await c.query(
        `insert into pricing (model, category_id, duration_days, price) values ($1, null, $2, $3)
         on conflict (model, category_id, duration_days) do update set price = excluded.price, is_active = true`,
        [model, PROVIDER_PLAN.days, v],
      );
      changes[`${model}_${PROVIDER_PLAN.days}`] = v;
    }
  }).catch(() => back('defaults', 'Prices must be numbers from 0 to 1,000,000.'));
  await logActivity(admin.id, 'pricing.defaults', 'pricing', null, changes);
  back('defaults');
}

export async function addOverride(fd: FormData) {
  const admin = await requireAdmin();
  const categoryId = int(fd, 'category_id');
  const days = int(fd, 'days');
  const price = int(fd, 'price', -1);
  if (!categoryId || days < 1 || price < 0) back('overrides', 'Choose a category, days and a price.');
  const cat = await q<{ model: string }>('select model::text from categories where id = $1 and parent_id is null', [categoryId]);
  if (!cat.length) back('overrides', 'Category not found.');
  await q(
    `insert into pricing (model, category_id, duration_days, price) values ($1, $2, $3, $4)
     on conflict (model, category_id, duration_days) do update set price = excluded.price, is_active = true`,
    [cat[0].model, categoryId, days, price],
  );
  await logActivity(admin.id, 'pricing.override', 'pricing', categoryId, { days, price });
  back('overrides');
}

export async function deleteOverride(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  await q('delete from pricing where id = $1 and category_id is not null', [id]);
  await logActivity(admin.id, 'pricing.override_remove', 'pricing', id);
  back('overrides');
}

export async function saveAddons(fd: FormData) {
  const admin = await requireAdmin();
  for (const key of ['featured', 'whatsapp_boost']) {
    const price = int(fd, `${key}_price`, -1);
    if (price < 0) back('addons', 'Add-on prices must be 0 or more.');
    await q('update addons set price = $2, is_active = $3 where key = $1', [key, price, bool(fd, `${key}_active`)]);
  }
  await logActivity(admin.id, 'pricing.addons', 'addons', null, {
    featured: int(fd, 'featured_price'),
    whatsapp_boost: int(fd, 'whatsapp_boost_price'),
  });
  back('addons');
}

export async function saveRishtaPlan(fd: FormData) {
  const admin = await requireAdmin();
  const n = (k: string, min = 0) => {
    const v = optInt(fd, k);
    if (v !== null && v < min) back('rishta', 'Rishta numbers must be positive.');
    return v;
  };
  const plan = {
    price: n('price') ?? 1000,
    days: n('days', 1) ?? 90,
    premium_price: n('premium_price'),
    premium_days: n('premium_days', 1) ?? 90,
    interests_per_day: n('interests_per_day', 1) ?? 10,
    premium_interests_per_day: n('premium_interests_per_day', 1) ?? 30,
    coordinator_fee: n('coordinator_fee'),
  };
  await setSetting('public.rishta_plan', plan);
  await setSetting('public.rishta_free_mode', { enabled: bool(fd, 'free_enabled'), days: n('free_days', 1) ?? 90 });
  await setSetting('public.rishta_preview', { enabled: bool(fd, 'preview_enabled') });
  await logActivity(admin.id, 'pricing.rishta', 'site_settings', 'public.rishta_plan', { ...plan, free: bool(fd, 'free_enabled') });
  back('rishta');
}

export async function saveBannerPrices(fd: FormData) {
  const admin = await requireAdmin();
  for (const p of BANNER_PLACEMENTS) {
    for (const d of BANNER_DAYS) {
      const raw = str(fd, `b_${p}_${d}`);
      if (raw === '') {
        await q('update banner_pricing set is_active = false where placement = $1 and days = $2', [p, d]);
        continue;
      }
      const v = Number.parseInt(raw, 10);
      if (!Number.isFinite(v) || v < 0) back('banners', 'Banner prices must be numbers.');
      await q(
        `insert into banner_pricing (placement, days, price) values ($1, $2, $3)
         on conflict (placement, days) do update set price = excluded.price, is_active = true`,
        [p, d, v],
      );
    }
  }
  const current = (await getSetting<Record<string, unknown>>('public.banner_settings')) ?? {};
  await setSetting('public.banner_settings', {
    ...current,
    design_price: optInt(fd, 'design_price'),
    popup_enabled: bool(fd, 'popup_enabled'),
    max_per_placement: optInt(fd, 'max_per_placement') ?? 5,
  });
  await logActivity(admin.id, 'pricing.banners', 'banner_pricing', null);
  back('banners');
}
