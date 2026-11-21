// Small helpers for reading HTML form data in server actions.

export function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === 'string' ? v.trim() : '';
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === '' ? null : v;
}

export function int(fd: FormData, key: string, fallback = 0): number {
  const n = Number.parseInt(str(fd, key), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function optInt(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === '') return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/** Checkbox: present ("on") = true. */
export function bool(fd: FormData, key: string): boolean {
  return fd.get(key) === 'on';
}

/** "English | Urdu" per line -> [{en, ur}] */
export function parseOptions(text: string): { en: string; ur: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [en, ur] = l.split('|').map((s) => s.trim());
      return { en, ur: ur || en };
    });
}

export function optionsToText(options: { en: string; ur: string }[] | null): string {
  return (options ?? []).map((o) => `${o.en} | ${o.ur}`).join('\n');
}

/** Turn a datetime-local value into an ISO string (Pakistan time, UTC+5), or null. */
export function pkDateTime(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+05:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO string -> value for <input type="datetime-local"> in Pakistan time. */
export function toPkInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 5 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}
