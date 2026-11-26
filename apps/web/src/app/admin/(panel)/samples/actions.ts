'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { slugify } from '@apna-okara/shared';
import { q, q1, tx } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { processAdPhoto } from '@/lib/images';
import { getCategories, getCities } from '@/lib/public';
import { getSetting } from '@/lib/settings';
import { saveObject } from '@/lib/storage';
import { SAMPLE_ADS } from '@/lib/samples.data';

const BATCH = 12; // per click (stays inside Vercel's time limit)

/** Adds the next batch of sample ads (approved, labelled "Sample", no contact, end after 30 days). */
export async function importSamples() {
  const admin = await requireAdmin([]);
  const [cats, cities, contact, have] = await Promise.all([
    getCategories(),
    getCities(),
    getSetting<{ phone?: string | null }>('public.contact'),
    q<{ title: string }>(`select title from listings where is_sample and status = 'approved'`),
  ]);
  const existing = new Set(have.map((h) => h.title));
  const todo = SAMPLE_ADS.filter((a) => !existing.has(a.title)).slice(0, BATCH);
  const phone = (contact?.phone || '03072849373').replace(/\D/g, '').replace(/^92/, '0');
  let added = 0;
  const errors: string[] = [];
  for (const a of todo) {
    try {
      const cat = cats.find((c) => c.slug === a.cat);
      const sub = cat?.subs.find((s) => s.slug === a.sub);
      const city = cities.find((c) => c.slug === a.city);
      if (!cat || !city) throw new Error('category or city not found');
      const res = await fetch(`https://images.pexels.com/photos/${a.photo}/pexels-photo-${a.photo}.jpeg?auto=compress&cs=tinysrgb&w=1400`);
      if (!res.ok) throw new Error(`photo ${res.status}`);
      const img = await processAdPhoto(Buffer.from(await res.arrayBuffer()));
      const provider = cat.model === 'services' || cat.model === 'business';
      const days = 30; // samples always end after 30 days
      await tx(async (c) => {
        const ins = await c.query<{ id: string }>(
          `insert into listings (model, category_id, subcategory_id, slug, title, description, price, price_type, city_id, custom_fields,
                                 seller_name, seller_phone, whatsapp_phone, show_phone, duration_days, is_free, locale,
                                 status, approved_at, approved_by, expires_at, is_sample)
           values ($1::model_type, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, false, $13, true, 'ur',
                   'approved', now(), $14, now() + make_interval(days => $13), true)
           returning id`,
          [
            cat.model, cat.id, sub?.id ?? null, `${slugify(a.title) || 'ad'}-${city.slug}`.slice(0, 90), a.title,
            `${a.title}.\n\nThis is a sample ad to show how ads look on Apna Okara. Post your own ad in 2 minutes.\nیہ نمونہ اشتہار ہے۔ اپنا اشتہار 2 منٹ میں لگائیں۔`,
            a.price, a.price == null ? 'contact' : 'fixed', city.id, JSON.stringify(a.fields),
            provider ? a.title.split(':')[0].slice(0, 60) : 'Apna Okara', phone, days, admin.id,
          ],
        );
        const id = ins.rows[0].id;
        const key = `${id}/1-${randomUUID().slice(0, 8)}.webp`;
        await saveObject('listing-images', key, img, 'image/webp', c);
        await c.query('insert into listing_images (listing_id, storage_path, sort_order, is_cover) values ($1, $2, 0, true)', [id, key]);
        await c.query(`insert into listing_history (listing_id, event, details, admin_id) values ($1, 'created', '{"sample": true}', $2)`, [id, admin.id]);
      });
      added++;
    } catch (e) {
      errors.push(`${a.title.slice(0, 30)}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 120));
    }
  }
  await logActivity(admin.id, 'samples.import', 'listings', null, { added, errors: errors.length });
  revalidatePath('/', 'layout');
  const left = SAMPLE_ADS.length - existing.size - added;
  const msg = `Added ${added} sample ads.${left > 0 ? ` ${left} left: click again.` : ' All done.'}${errors.length ? ` Problems: ${errors.slice(0, 3).join(' | ')}` : ''}`;
  redirect(`/admin/samples?saved=${encodeURIComponent(msg)}`);
}

/** Takes all sample ads off the site (kept in records as "removed"). */
export async function removeSamples() {
  const admin = await requireAdmin([]);
  const r = await q1<{ n: number }>(
    `with u as (update listings set status = 'removed', reject_reason = 'Sample ad removed' where is_sample and status = 'approved' returning 1) select count(*)::int as n from u`,
  );
  await logActivity(admin.id, 'samples.remove', 'listings', null, { removed: r?.n ?? 0 });
  revalidatePath('/', 'layout');
  redirect(`/admin/samples?saved=${encodeURIComponent(`Removed ${r?.n ?? 0} sample ads from the site.`)}`);
}

/** Makes 8 sample ads "Featured" so the Featured section on the home page shows how it looks. */
export async function featureSamples() {
  const admin = await requireAdmin([]);
  const r = await q1<{ n: number }>(
    `with pick as (select id from listings where is_sample and status = 'approved' and not is_featured order by random() limit 8),
          u as (update listings l set is_featured = true, featured_until = l.expires_at from pick where l.id = pick.id returning 1)
     select count(*)::int as n from u`,
  );
  await logActivity(admin.id, 'samples.feature', 'listings', null, { featured: r?.n ?? 0 });
  revalidatePath('/', 'layout');
  redirect(`/admin/samples?saved=${encodeURIComponent(`Made ${r?.n ?? 0} sample ads featured.`)}`);
}
