'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { slugify } from '@apna-okara/shared';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, optStr, parseOptions, str } from '@/lib/admin/form';

const MODELS = ['buy_sell', 'vehicles', 'property', 'jobs', 'services', 'business'];
const FIELD_TYPES = ['text', 'number', 'select', 'boolean', 'year'];

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'category';
  for (let i = 2; await q1('select 1 from categories where slug = $1', [slug]); i++) {
    slug = `${base}-${i}`;
  }
  return slug;
}

function back(path: string, error?: string): never {
  revalidatePath('/admin/categories');
  redirect(error ? `${path}?error=${encodeURIComponent(error)}` : `${path}?saved=1`);
}

// ---------- top-level categories ----------

export async function createCategory(fd: FormData) {
  const admin = await requireAdmin();
  const model = str(fd, 'model');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  if (!MODELS.includes(model) || !nameEn || !nameUr) back('/admin/categories', 'Model, English name and Urdu name are required.');
  const slug = await uniqueSlug(slugify(str(fd, 'slug') || nameEn));
  const row = await q1<{ id: number }>(
    `insert into categories (model, slug, name_en, name_ur, icon, sort_order)
     values ($1, $2, $3, $4, $5, (select coalesce(max(sort_order), 0) + 1 from categories where parent_id is null))
     returning id`,
    [model, slug, nameEn, nameUr, optStr(fd, 'icon') ?? 'other'],
  );
  await logActivity(admin.id, 'category.create', 'categories', row!.id, { slug });
  back(`/admin/categories/${row!.id}`);
}

export async function updateCategory(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  if (!nameEn || !nameUr) back(`/admin/categories/${id}`, 'English and Urdu names are required.');
  await q(
    `update categories set name_en = $2, name_ur = $3, icon = $4, show_on_home = $5, sort_order = $6,
            is_active = $7, seo_title = $8, seo_description = $9
      where id = $1 and parent_id is null`,
    [id, nameEn, nameUr, optStr(fd, 'icon'), bool(fd, 'show_on_home'), int(fd, 'sort_order'), bool(fd, 'is_active'),
      optStr(fd, 'seo_title'), optStr(fd, 'seo_description')],
  );
  await logActivity(admin.id, 'category.update', 'categories', id, { is_active: bool(fd, 'is_active') });
  back(`/admin/categories/${id}`);
}

// ---------- sub-categories ----------

export async function createSubcategory(fd: FormData) {
  const admin = await requireAdmin();
  const parentId = int(fd, 'parent_id');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  const parent = await q1<{ slug: string; model: string }>('select slug, model from categories where id = $1 and parent_id is null', [parentId]);
  if (!parent || !nameEn || !nameUr) back(`/admin/categories/${parentId}`, 'English and Urdu names are required.');
  const slug = await uniqueSlug(`${parent!.slug}--${slugify(nameEn)}`);
  const row = await q1<{ id: number }>(
    `insert into categories (parent_id, model, slug, name_en, name_ur, sort_order)
     values ($1, $2, $3, $4, $5, (select coalesce(max(sort_order), -1) + 1 from categories where parent_id = $1))
     returning id`,
    [parentId, parent!.model, slug, nameEn, nameUr],
  );
  await logActivity(admin.id, 'subcategory.create', 'categories', row!.id, { parent_id: parentId, slug });
  back(`/admin/categories/${parentId}`);
}

export async function updateSubcategory(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  const parentId = int(fd, 'parent_id');
  const nameEn = str(fd, 'name_en');
  const nameUr = str(fd, 'name_ur');
  if (!nameEn || !nameUr) back(`/admin/categories/${parentId}`, 'English and Urdu names are required.');
  await q(
    `update categories set name_en = $2, name_ur = $3, sort_order = $4, is_active = $5 where id = $1 and parent_id = $6`,
    [id, nameEn, nameUr, int(fd, 'sort_order'), bool(fd, 'is_active'), parentId],
  );
  await logActivity(admin.id, 'subcategory.update', 'categories', id, { is_active: bool(fd, 'is_active') });
  back(`/admin/categories/${parentId}`);
}

// ---------- category form fields ----------

function readField(fd: FormData) {
  const type = str(fd, 'type');
  const options = type === 'select' ? parseOptions(str(fd, 'options')) : null;
  return {
    key: slugify(str(fd, 'key') || str(fd, 'label_en')).replace(/-/g, '_'),
    labelEn: str(fd, 'label_en'),
    labelUr: str(fd, 'label_ur'),
    type,
    options,
    unitEn: optStr(fd, 'unit_en'),
    unitUr: optStr(fd, 'unit_ur'),
    required: bool(fd, 'is_required'),
    sort: int(fd, 'sort_order'),
  };
}

export async function createField(fd: FormData) {
  const admin = await requireAdmin();
  const categoryId = int(fd, 'category_id');
  const f = readField(fd);
  if (!f.key || !f.labelEn || !f.labelUr || !FIELD_TYPES.includes(f.type)) {
    back(`/admin/categories/${categoryId}`, 'Field needs English label, Urdu label and a type.');
  }
  if (f.type === 'select' && !f.options?.length) back(`/admin/categories/${categoryId}`, 'A select field needs at least one option.');
  const exists = await q1('select 1 from category_fields where category_id = $1 and key = $2', [categoryId, f.key]);
  if (exists) back(`/admin/categories/${categoryId}`, `A field with key "${f.key}" already exists.`);
  const row = await q1<{ id: number }>(
    `insert into category_fields (category_id, key, label_en, label_ur, type, options, unit_en, unit_ur, is_required, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9,
             (select coalesce(max(sort_order), -1) + 1 from category_fields where category_id = $1))
     returning id`,
    [categoryId, f.key, f.labelEn, f.labelUr, f.type, f.options ? JSON.stringify(f.options) : null, f.unitEn, f.unitUr, f.required],
  );
  await logActivity(admin.id, 'category_field.create', 'category_fields', row!.id, { category_id: categoryId, key: f.key });
  back(`/admin/categories/${categoryId}`);
}

export async function updateField(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  const categoryId = int(fd, 'category_id');
  const f = readField(fd);
  if (!f.labelEn || !f.labelUr || !FIELD_TYPES.includes(f.type)) {
    back(`/admin/categories/${categoryId}`, 'Field needs English label, Urdu label and a type.');
  }
  if (f.type === 'select' && !f.options?.length) back(`/admin/categories/${categoryId}`, 'A select field needs at least one option.');
  await q(
    `update category_fields set label_en = $3, label_ur = $4, type = $5, options = $6, unit_en = $7, unit_ur = $8,
            is_required = $9, sort_order = $10
      where id = $1 and category_id = $2`,
    [id, categoryId, f.labelEn, f.labelUr, f.type, f.options ? JSON.stringify(f.options) : null, f.unitEn, f.unitUr, f.required, f.sort],
  );
  await logActivity(admin.id, 'category_field.update', 'category_fields', id, { category_id: categoryId });
  back(`/admin/categories/${categoryId}`);
}

/** Removes the field from the ad form. Values already saved in old ads are kept. */
export async function deleteField(fd: FormData) {
  const admin = await requireAdmin();
  const id = int(fd, 'id');
  const categoryId = int(fd, 'category_id');
  const row = await q1<{ key: string }>('delete from category_fields where id = $1 and category_id = $2 returning key', [id, categoryId]);
  await logActivity(admin.id, 'category_field.delete', 'category_fields', id, { category_id: categoryId, key: row?.key });
  back(`/admin/categories/${categoryId}`);
}
