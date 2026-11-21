'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, optInt, optStr, pkDateTime, str } from '@/lib/admin/form';

const PURPOSES = ['listing', 'featured', 'whatsapp_boost', 'banner'];

function back(error?: string): never {
  revalidatePath('/admin/promo-codes');
  redirect(error ? `/admin/promo-codes?error=${encodeURIComponent(error)}` : '/admin/promo-codes?saved=1');
}

export async function savePromo(fd: FormData) {
  const admin = await requireAdmin();
  const id = optInt(fd, 'id');
  const code = str(fd, 'code').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) back('Code: 3 to 30 letters/numbers, no spaces.');
  const percent = optInt(fd, 'discount_percent');
  const amount = optInt(fd, 'discount_amount');
  if (!percent && !amount) back('Give a discount: percent or rupees.');
  if (percent !== null && (percent < 0 || percent > 100)) back('Percent must be 0 to 100.');
  const purposes = PURPOSES.filter((p) => bool(fd, `purpose_${p}`));
  const values = [
    code, percent, amount, optInt(fd, 'max_uses'), optInt(fd, 'max_uses_per_phone'), pkDateTime(str(fd, 'valid_from')),
    pkDateTime(str(fd, 'valid_to')), bool(fd, 'is_active'), purposes.length ? purposes : null, optStr(fd, 'description'),
  ];
  try {
    if (id) {
      await q(
        `update promo_codes set code = $2, discount_percent = $3, discount_amount = $4, max_uses = $5, max_uses_per_phone = $6,
                valid_from = $7, valid_to = $8, is_active = $9, purposes = $10, description = $11 where id = $1`,
        [id, ...values],
      );
    } else {
      await q1(
        `insert into promo_codes (code, discount_percent, discount_amount, max_uses, max_uses_per_phone, valid_from, valid_to, is_active, purposes, description)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        values,
      );
    }
  } catch (e) {
    if ((e as { code?: string }).code === '23505') back('This code already exists.');
    throw e;
  }
  await logActivity(admin.id, id ? 'promo.update' : 'promo.create', 'promo_codes', id ?? code, { code, percent, amount });
  back();
}
