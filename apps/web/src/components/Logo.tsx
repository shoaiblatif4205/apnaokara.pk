type Props = { locale: 'en' | 'ur'; className?: string };

// Simple Apna Okara logo: green location pin + wordmark (English or Urdu).
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 3C15.2 3 8 10 8 18.8 8 30.5 24 45 24 45s16-14.5 16-26.2C40 10 32.8 3 24 3z"
        fill="#15803D"
      />
      <circle cx="24" cy="19" r="9" fill="#FFFFFF" />
      <path d="M19 21.5h10l-1.2 4h-7.6z" fill="#F97316" />
      <path d="M20.5 21.5c0-3 1.6-5.5 3.5-5.5s3.5 2.5 3.5 5.5" fill="none" stroke="#F97316" strokeWidth="1.8" />
    </svg>
  );
}

export function Logo({ locale, className = '' }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      {locale === 'ur' ? (
        <span className="font-urdu text-xl font-bold leading-[1.6] text-brand">اپنا اوکاڑہ</span>
      ) : (
        <span className="text-xl font-extrabold tracking-tight text-brand">
          Apna <span className="text-accent">Okara</span>
        </span>
      )}
    </span>
  );
}
