'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { slugify } from '@apna-okara/shared';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, str } from '@/lib/admin/form';

function back(path: string, error?: string): never {
  revalidatePath('/admin/locations');
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : `${path}?saved=1`);
}

export async function createCity(fd: FormData) {
  const admin = await requireAdmin();
  const districtId = int(fd, 'district_id');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  if (!districtId || !nameEn || !nameUr) back('/admin/locations', 'District, English name and Urdu name are required.');
  let slug = slugify(nameEn);
  for (let i = 2; await q1('select 1 from cities where slug = $1', [slug]); i++) slug = `${slugify(nameEn)}-${i}`;
  const row = await q1<{ id: number }>(
    `insert into cities (district_id, slug, name_en, name_ur, sort_order)
     values ($1, $2, $3, $4, (select coalesce(max(sort_order), -1) + 1 from cities)) returning id`,
    [districtId, slug, nameEn, nameUr],
  );
  // Every city gets an "Other area" choice
  await q(
    `insert into localities (city_id, slug, name_en, name_ur, sort_order) values ($1, 'other', 'Other area', 'دوسرا علاقہ', 999)`,
    [row!.id],
  );
  await logActivity(admin.id, 'city.create', 'cities', row!.id, { slug });
  back('/admin/locations');
}

export async function updateCity(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  if (!nameEn || !nameUr) back('/admin/locations', 'English and Urdu names are required.');
  await q('update cities set name_en = $2, name_ur = $3, sort_order = $4, is_active = $5 where id = $1', [
    id, nameEn, nameUr, int(fd, 'sort_order'), bool(fd, 'is_active'),
  ]);
  await logActivity(admin.id, 'city.update', 'cities', id, { is_active: bool(fd, 'is_active') });
  back('/admin/locations');
}

export async function createLocality(fd: FormData) {
  const admin = await requireAdmin();
  const cityId = int(fd, 'city_id');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  const path = `/admin/locations/${cityId}`;
  if (!nameEn || !nameUr) back(path, 'English and Urdu names are required.');
  let slug = slugify(nameEn);
  for (let i = 2; await q1('select 1 from localities where city_id = $1 and slug = $2', [cityId, slug]); i++) slug = `${slugify(nameEn)}-${i}`;
  const row = await q1<{ id: number }>(
    `insert into localities (city_id, slug, name_en, name_ur, sort_order)
     values ($1, $2, $3, $4, (select coalesce(max(sort_order), -1) + 1 from localities where city_id = $1 and slug <> 'other'))
     returning id`,
    [cityId, slug, nameEn, nameUr],
  );
  await logActivity(admin.id, 'locality.create', 'localities', row!.id, { city_id: cityId, slug });
  back(path);
}

export async function updateLocality(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  const cityId = int(fd, 'city_id');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  const path = `/admin/locations/${cityId}`;
  if (!nameEn || !nameUr) back(path, 'English and Urdu names are required.');
  await q('update localities set name_en = $3, name_ur = $4, sort_order = $5, is_active = $6 where id = $1 and city_id = $2', [
    id, cityId, nameEn, nameUr, int(fd, 'sort_order'), bool(fd, 'is_active'),
  ]);
  await logActivity(admin.id, 'locality.update', 'localities', id, { is_active: bool(fd, 'is_active') });
  back(path);
}
