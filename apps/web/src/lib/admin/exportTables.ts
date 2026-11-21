import { q } from '@/lib/db';

// Tables the Super Admin can download as CSV (Admin -> Backups & export).
// Secret columns (passwords, codes, tokens) are never exported.

export const SECRET_COLUMN = /(password|hash|secret|token|otp|_code$|code_hash)/i;
const NEVER = new Set(['_migrations', 'rishta_otps', 'rishta_otp_codes', 'admin_login_attempts', 'backups']);

export async function exportableTables(): Promise<{ name: string; rows: number }[]> {
  const rows = await q<{ name: string; rows: number }>(
    `select c.relname as name, greatest(c.reltuples, 0)::bigint::int as rows
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' order by c.relname`,
  );
  return rows.filter((r) => !NEVER.has(r.name) && !/otp/i.test(r.name));
}

export async function exportColumns(table: string): Promise<string[]> {
  const cols = await q<{ column_name: string }>(
    `select column_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position`,
    [table],
  );
  // referral codes and promo codes are business data, keep them
  return cols.map((c) => c.column_name).filter((c) => !SECRET_COLUMN.test(c) || ['promo_code_id', 'code', 'referral_code', 'status_code'].includes(c));
}
