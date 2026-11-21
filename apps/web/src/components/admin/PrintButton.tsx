'use client';

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-sm bg-brand text-white">
      {label}
    </button>
  );
}
