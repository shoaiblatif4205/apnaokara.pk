import type { ReactNode } from 'react';

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="card mb-6 p-4 md:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Shows a green "Saved" or red error message from ?saved=1 / ?error=... */
export function Notice({ saved, error }: { saved?: string; error?: string }) {
  if (error) {
    return (
      <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p role="status" className="mb-4 rounded-lg border border-green-200 bg-brand-light p-3 text-sm text-brand-dark">
        {saved.length > 2 ? saved : 'Saved.'}
      </p>
    );
  }
  return null;
}

export function Badge({ tone = 'gray', children }: { tone?: 'gray' | 'green' | 'orange' | 'red'; children: ReactNode }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-brand-light text-brand-dark',
    orange: 'bg-accent-light text-orange-900',
    red: 'bg-red-50 text-red-800',
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="admin-label">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked, id }: { name: string; label: string; defaultChecked?: boolean; id?: string }) {
  const inputId = id ?? name;
  return (
    <label htmlFor={inputId} className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-sm">
      <input id={inputId} name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-brand" />
      {label}
    </label>
  );
}
