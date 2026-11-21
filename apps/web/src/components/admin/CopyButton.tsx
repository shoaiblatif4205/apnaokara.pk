'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-sm border border-line bg-white hover:border-brand"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt('Copy this text:', text);
        }
      }}
    >
      <Copy size={16} aria-hidden="true" /> {copied ? 'Copied' : label}
    </button>
  );
}
