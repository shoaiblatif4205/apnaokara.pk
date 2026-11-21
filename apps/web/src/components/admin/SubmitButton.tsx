'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/** Submit button that shows "Saving…" and blocks double clicks. */
export function SubmitButton({
  children,
  className = 'btn-primary',
  pendingText = 'Saving…',
  confirm,
}: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
  /** Ask "Are you sure?" before submitting */
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      aria-disabled={pending}
      onClick={(e) => {
        if (pending) e.preventDefault();
        else if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
