'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { q, q1, tx } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { bool, int, optStr, str } from '@/lib/admin/form';
import { getPlan } from '@/lib/rishta/profiles';

const ROLE = ['rishta_coordinator'] as const;

function back(id: string, error?: string): never {
  revalidatePath('/admin/rishta');
  redirect(error ? `/admin/rishta/${id}?error=${encodeURIComponent(error)}` : `/admin/rishta/${id}?saved=1`);
}

/**
 * Approve after the phone call: profile goes live for the plan days,
 * pending payment is accepted and Premium switches on if it was paid for.
 * Also used to accept a Premium payment on a live profile.
 */
export async function approveRishta(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = str(fd, 'id');
  const free = str(fd, 'free') === 'true';
  const { plan, free: freeMode } = await getPlan();
  const p = await q1<{ status: string; expires_at: string | null }>('select status::text, expires_at from rishta_profiles where id = $1', [id]);
  if (!p) back(id, 'Profile not found');
  await tx(async (c) => {
    const pays = await c.query<{ id: string; items: { key: string }[] }>(
      `update payments set status = case when $3 or amount = 0 then 'free'::payment_status else 'verified'::payment_status end,
              verified_by = $2, verified_at = now(), applied_at = now()
        where rishta_profile_id = $1 and status = 'pending' returning id, items`,
      [id, admin.id, free],
    );
    const keys = pays.rows.flatMap((r) => (r.items ?? []).map((i) => i.key));
    if (p!.status === 'pending' || p!.status === 'rejected' || p!.status === 'expired') {
      const days = freeMode.enabled || free || !keys.includes('rishta_profile') ? freeMode.days || plan.days : plan.days;
      await c.query(
        `update rishta_profiles set status = 'approved', approved_at = now(), verified_by = $2, reject_reason = null,
                expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(days => $3::int)
          where id = $1`,
        [id, admin.id, days],
      );
    }
    if (keys.includes('rishta_premium')) {
      await c.query(
        `update rishta_profiles set is_premium = true,
                premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => $2::int) where id = $1`,
        [id, plan.premium_days],
      );
    }
  });
  await logActivity(admin.id, free ? 'rishta.approve_free' : 'rishta.approve', 'rishta_profiles', id);
  back(id);
}

export async function rejectRishta(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = str(fd, 'id');
  const reason = str(fd, 'reason');
  const to = str(fd, 'to') || 'rejected';
  if (!['rejected', 'hidden', 'removed'].includes(to)) back(id, 'Unknown action');
  if (reason.length < 3) back(id, 'Write the reason.');
  await tx(async (c) => {
    await c.query(`update rishta_profiles set status = $2::rishta_status, reject_reason = $3, hidden_reason = $3 where id = $1`, [id, to, reason]);
    if (to === 'rejected') {
      await c.query(
        `update payments set status = 'rejected', reject_reason = $2, verified_by = $3, verified_at = now() where rishta_profile_id = $1 and status = 'pending'`,
        [id, reason, admin.id],
      );
    }
  });
  await logActivity(admin.id, `rishta.${to}`, 'rishta_profiles', id, { reason });
  back(id);
}

export async function showRishtaAgain(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = str(fd, 'id');
  await q(`update rishta_profiles set status = 'approved', hidden_reason = null where id = $1 and status = 'hidden' and expires_at > now()`, [id]);
  await logActivity(admin.id, 'rishta.show', 'rishta_profiles', id);
  back(id);
}

export async function extendRishta(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = str(fd, 'id');
  const days = int(fd, 'days');
  if (days < 1 || days > 365) back(id, 'Days must be 1 to 365.');
  await q(
    `update rishta_profiles set expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(days => $2::int),
            status = case when status = 'expired' then 'approved'::rishta_status else status end
      where id = $1 and status in ('approved', 'expired')`,
    [id, days],
  );
  await logActivity(admin.id, 'rishta.extend', 'rishta_profiles', id, { days });
  back(id);
}

export async function setPremium(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = str(fd, 'id');
  const days = int(fd, 'days');
  await q(
    days > 0
      ? `update rishta_profiles set is_premium = true, premium_until = greatest(coalesce(premium_until, now()), now()) + make_interval(days => $2::int) where id = $1`
      : `update rishta_profiles set is_premium = false, premium_until = null where id = $1 and $2::int = 0`,
    [id, days],
  );
  await logActivity(admin.id, days > 0 ? 'rishta.premium' : 'rishta.premium_off', 'rishta_profiles', id, { days });
  back(id);
}

export async function reviewPhoto(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = str(fd, 'profile_id');
  const photoId = int(fd, 'photo_id');
  const ok = bool(fd, 'approve') || str(fd, 'approve') === 'true';
  await q(`update rishta_photos set is_approved = $2, is_rejected = not $2, approved_by = $3 where id = $1 and profile_id = $4`, [photoId, ok, admin.id, id]);
  await logActivity(admin.id, ok ? 'rishta.photo_approve' : 'rishta.photo_reject', 'rishta_photos', photoId, { profile_id: id });
  back(id);
}

export async function blockAccount(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = str(fd, 'id');
  const block = str(fd, 'block') === 'true';
  await tx(async (c) => {
    const r = await c.query<{ account_id: string }>('select account_id from rishta_profiles where id = $1', [id]);
    await c.query('update rishta_accounts set is_blocked = $2 where id = $1', [r.rows[0].account_id, block]);
    if (block) await c.query(`update rishta_profiles set status = 'hidden', hidden_reason = 'Account blocked' where account_id = $1 and status = 'approved'`, [r.rows[0].account_id]);
  });
  await logActivity(admin.id, block ? 'rishta.block_account' : 'rishta.unblock_account', 'rishta_profiles', id);
  back(id);
}

export async function handleMediation(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = int(fd, 'id');
  const status = str(fd, 'status');
  if (!['in_progress', 'done'].includes(status)) redirect('/admin/rishta/requests?error=Invalid');
  await q('update rishta_interests set mediation_status = $2, handled_by = $3 where id = $1', [id, status, admin.id]);
  await logActivity(admin.id, `rishta.mediation_${status}`, 'rishta_interests', id);
  revalidatePath('/admin/rishta/requests');
  redirect('/admin/rishta/requests?saved=1');
}

export async function handleRishtaReport(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = int(fd, 'id');
  const status = str(fd, 'status');
  if (!['actioned', 'dismissed'].includes(status)) redirect('/admin/rishta/requests?error=Invalid');
  await q('update rishta_reports set status = $2 where id = $1', [id, status]);
  await logActivity(admin.id, `rishta.report_${status}`, 'rishta_reports', id);
  revalidatePath('/admin/rishta/requests');
  redirect('/admin/rishta/requests?saved=1');
}

export async function saveStory(fd: FormData) {
  const admin = await requireAdmin([...ROLE]);
  const id = optStr(fd, 'id');
  const values = [str(fd, 'title_en'), str(fd, 'title_ur'), str(fd, 'body_en'), str(fd, 'body_ur'), optStr(fd, 'city'), bool(fd, 'is_published')];
  if (!values[0] || !values[1]) redirect('/admin/rishta/stories?error=Titles%20are%20required');
  if (id) await q('update rishta_stories set title_en = $2, title_ur = $3, body_en = $4, body_ur = $5, city = $6, is_published = $7 where id = $1', [id, ...values]);
  else await q('insert into rishta_stories (title_en, title_ur, body_en, body_ur, city, is_published) values ($1, $2, $3, $4, $5, $6)', values);
  await logActivity(admin.id, id ? 'rishta.story_update' : 'rishta.story_create', 'rishta_stories', id);
  revalidatePath('/admin/rishta/stories');
  redirect('/admin/rishta/stories?saved=1');
}
