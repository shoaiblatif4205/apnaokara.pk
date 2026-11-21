import { Megaphone } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { BannerRow } from '@/lib/public';

// One banner (brand or our own). Without an image it shows the text on a colour block.

export function BannerBox({
  banner,
  locale,
  sponsoredLabel,
  className = '',
}: {
  banner: BannerRow;
  locale: 'en' | 'ur';
  sponsoredLabel: string;
  className?: string;
}) {
  const title = locale === 'ur' ? banner.title_ur || banner.title_en : banner.title_en || banner.title_ur;
  const subtitle = locale === 'ur' ? banner.subtitle_ur || banner.subtitle_en : banner.subtitle_en || banner.subtitle_ur;
  const button = locale === 'ur' ? banner.button_ur || banner.button_en : banner.button_en || banner.button_ur;
  const img = banner.image_desktop_path ? `/api/files/banners/${banner.image_desktop_path}` : null;
  const imgMobile = banner.image_mobile_path ? `/api/files/banners/${banner.image_mobile_path}` : img;
  const external = /^(https?:|tel:)/.test(banner.link_url ?? '');
  const inner = (
    <div className={`relative flex h-full min-h-[124px] overflow-hidden rounded-2xl ${img ? 'bg-page' : 'bg-accent-light'} ${className}`}>
      {img ? (
        <picture className="absolute inset-0">
          {imgMobile && <source media="(max-width: 640px)" srcSet={imgMobile} />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={title ?? ''} className="h-full w-full object-cover" />
        </picture>
      ) : (
        <div className="flex flex-col justify-center gap-1 p-5 text-orange-900">
          {title && <p className="text-lg font-bold">{title}</p>}
          {subtitle && <p className="text-sm">{subtitle}</p>}
          {button && <span className="mt-1 text-sm font-semibold underline">{button}</span>}
        </div>
      )}
      {banner.owner_type === 'brand' && (
        <span className="absolute end-2 top-2 rounded bg-white/90 px-1.5 text-[11px] text-ink-muted">{sponsoredLabel}</span>
      )}
    </div>
  );
  const track = `/api/v1/banners/${banner.id}/click`;
  if (!banner.link_url) return inner;
  return external ? (
    <a href={`${track}?to=${encodeURIComponent(banner.link_url)}`} target="_blank" rel="noopener sponsored" className="block h-full">
      {inner}
    </a>
  ) : (
    <Link href={banner.link_url} className="block h-full">
      {inner}
    </Link>
  );
}

/** Empty slot inviting brands to advertise. */
export function BannerSlot({ title, cta, sponsoredLabel }: { title: string; cta: string; sponsoredLabel: string }) {
  return (
    <Link
      href="/advertise"
      className="relative flex h-full min-h-[124px] flex-col justify-center rounded-2xl border border-dashed border-accent bg-accent-light p-5 text-orange-900 hover:border-solid"
    >
      <span className="absolute end-3 top-2 text-xs text-orange-900/80">{sponsoredLabel}</span>
      <Megaphone size={22} aria-hidden="true" />
      <span className="mt-1 text-lg font-bold">{title}</span>
      <span className="text-sm">{cta}</span>
    </Link>
  );
}
