import type { ReactNode } from 'react';

// Small, dependency-free charts for the admin dashboard (server-rendered).
// One series each, brand green, thin marks, recessive grid; hover / keyboard
// focus shows the exact value; every chart has a table view.

export function StatTile({ label, value, hint, delta }: { label: string; value: ReactNode; hint?: string; delta?: { pct: number | null; good?: 'up' | 'down' } }) {
  const up = delta?.pct != null && delta.pct > 0;
  const down = delta?.pct != null && delta.pct < 0;
  const good = delta?.good ?? 'up';
  const tone = !delta || delta.pct == null || delta.pct === 0 ? 'text-ink-muted' : (up && good === 'up') || (down && good === 'down') ? 'text-brand-dark' : 'text-red-700';
  return (
    <li className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {(hint || delta) && (
        <p className="mt-1 text-xs text-ink-muted">
          {delta && delta.pct != null && (
            <span className={`font-semibold ${tone}`}>
              {up ? '▲' : down ? '▼' : '■'} {Math.abs(delta.pct)}%{' '}
            </span>
          )}
          {hint}
        </p>
      )}
    </li>
  );
}

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

/** Values per day as columns. */
export function ColumnChart({
  title,
  data,
  format = (n) => n.toLocaleString('en-PK'),
  unit,
}: {
  title: string;
  data: { label: string; short: string; value: number }[];
  format?: (n: number) => string;
  unit?: string;
}) {
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const total = data.reduce((s, d) => s + d.value, 0);
  const every = Math.ceil(data.length / 10); // at most ~10 axis labels
  const id = title.replace(/\W+/g, '-').toLowerCase();
  return (
    <section className="card p-4" aria-labelledby={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="font-bold">{title}</h2>
        <p className="text-sm text-ink-muted">
          Total <span className="font-semibold text-ink">{format(total)}</span>
          {unit ? ` ${unit}` : ''}
        </p>
      </div>
      <div className="relative mt-4 h-44 ps-16">
        {/* grid + y labels */}
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line/70" style={{ bottom: `${f * 100}%` }} aria-hidden="true">
            <span className="absolute -top-2 start-0 w-14 whitespace-nowrap text-end text-[10px] text-ink-muted">{f ? format(max * f) : '0'}</span>
          </div>
        ))}
        <ul className="relative flex h-full items-end gap-[2px]" role="list" aria-label={title}>
          {data.map((d, i) => (
            <li key={d.label} className="group relative flex h-full flex-1 items-end outline-none" tabIndex={0} aria-label={`${d.label}: ${format(d.value)}`}>
              {/* hit area is the full column height */}
              <span
                className="block w-full rounded-t-[4px] bg-brand transition-colors group-hover:bg-brand-dark group-focus:bg-brand-dark"
                style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0 }}
              />
              <span className="pointer-events-none invisible absolute bottom-full start-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs text-white shadow group-hover:visible group-focus:visible rtl:translate-x-1/2">
                {d.label}: <span className="font-semibold">{format(d.value)}</span>
              </span>
              {i % every === 0 && <span className="absolute -bottom-5 start-1/2 -translate-x-1/2 text-[10px] text-ink-muted" aria-hidden="true">{d.short}</span>}
            </li>
          ))}
        </ul>
      </div>
      <details className="mt-7 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-ink-muted">Show as table</summary>
        <table className="admin-table mt-2">
          <thead><tr><th>Day</th><th className="text-end">Value</th></tr></thead>
          <tbody>
            {data.filter((d) => d.value).map((d) => (
              <tr key={d.label}><td>{d.label}</td><td className="text-end tabular-nums">{format(d.value)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

/** Ranked horizontal bars with the value as text (categories, cities, ...). */
export function BarList({ title, rows, format = (n) => n.toLocaleString('en-PK'), empty = 'No data yet.', note }: {
  title: string;
  rows: { label: string; value: number; href?: string }[];
  format?: (n: number) => string;
  empty?: string;
  note?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const id = title.replace(/\W+/g, '-').toLowerCase();
  return (
    <section className="card p-4" aria-labelledby={id}>
      <h2 id={id} className="font-bold">{title}</h2>
      {note && <p className="text-xs text-ink-muted">{note}</p>}
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-2">
                {r.href ? <a href={r.href} className="truncate hover:text-brand hover:underline" dir="auto">{r.label}</a> : <span className="truncate" dir="auto">{r.label}</span>}
                <span className="shrink-0 font-semibold tabular-nums">{format(r.value)}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-page" aria-hidden="true">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
