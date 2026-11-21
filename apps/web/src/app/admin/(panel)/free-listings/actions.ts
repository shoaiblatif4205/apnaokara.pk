'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { setSetting, type FreeModeSettings } from '@/lib/settings';
import { bool, optInt, pkDateTime, str } from '@/lib/admin/form';

const MODELS = ['buy_sell', 'vehicles', 'property', 'jobs', 'services', 'business'];

export async function saveFreeMode(fd: FormData) {
  const admin = await requireAdmin();
  const fail = (msg: string): never => redirect(`/admin/free-listings?error=${encodeURIComponent(msg)}`);

  const days_by_model: Record<string, number> = {};
  for (const m of MODELS) {
    const d = optInt(fd, `days_${m}`);
    if (d === null || d < 1 || d > 365) fail('Free days must be a number from 1 to 365 for every model.');
    days_by_model[m] = d!;
  }
  const models = MODELS.filter((m) => bool(fd, `model_${m}`));
  const categorySlugs = fd.getAll('category_slugs').map(String).filter(Boolean);
  const startsAt = pkDateTime(str(fd, 'starts_at'));
  const endsAt = pkDateTime(str(fd, 'ends_at'));
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) fail('End date must be after the start date.');
  const maxPerPhone = optInt(fd, 'max_free_ads_per_phone');
  if (maxPerPhone !== null && maxPerPhone < 1) fail('Limit per phone must be 1 or more (or empty for no limit).');

  const value: FreeModeSettings = {
    enabled: bool(fd, 'enabled'),
    starts_at: startsAt,
    ends_at: endsAt,
    days_by_model,
    models,
    category_slugs: categorySlugs.length ? categorySlugs : null,
    max_free_ads_per_phone: maxPerPhone,
    banner: { en: str(fd, 'banner_en'), ur: str(fd, 'banner_ur') },
  };
  if (value.enabled && !models.length) fail('Choose at least one model for free listings.');

  await setSetting('public.free_mode', value);
  await logActivity(admin.id, value.enabled ? 'free_mode.on' : 'free_mode.off', 'site_settings', 'public.free_mode', {
    models,
    categories: value.category_slugs,
    starts_at: startsAt,
    ends_at: endsAt,
  });
  revalidatePath('/', 'layout');
  redirect('/admin/free-listings?saved=1');
}
