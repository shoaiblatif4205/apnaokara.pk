import { q } from '@/lib/db';

/** Record who did what. Shown on the Activity log page. */
export async function logActivity(
  adminId: string | null,
  action: string,
  entity: string,
  entityId: string | number | null = null,
  details: Record<string, unknown> = {},
): Promise<void> {
  await q(
    `insert into activity_log (admin_id, action, entity, entity_id, details) values ($1, $2, $3, $4, $5)`,
    [adminId, action, entity, entityId === null ? null : String(entityId), JSON.stringify(details)],
  );
}
