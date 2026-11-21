import { q, q1 } from '@/lib/db';
export { isFreeNow, type FreeModeSettings } from '@apna-okara/shared';

// Site settings are JSON values in the site_settings table.
// Keys starting with "public." may be read by the website and app.

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await q1<{ value: T }>('select value from site_settings where key = $1', [key]);
  return row?.value ?? null;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await q(
    `insert into site_settings (key, value, updated_at) values ($1, $2, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value)],
  );
}
