import { NextResponse } from 'next/server';
import { featuredAds, getBanners, getCategories, getCities, latestAds, topProviders } from '@/lib/public';
import { runExpiryIfDue } from '@/lib/expiry';

export const dynamic = 'force-dynamic';

// Everything the app's home screen shows.
export async function GET() {
  void runExpiryIfDue();
  const [cats, cities, featured, fresh, services, banners] = await Promise.all([
    getCategories(),
    getCities(),
    featuredAds(8),
    latestAds({ limit: 12, models: ['buy_sell', 'vehicles', 'property'] }),
    topProviders('services', 6),
    getBanners(['app_home', 'hero_slider'], { platform: 'app' }),
  ]);
  return NextResponse.json(
    {
      categories: cats.map(({ fields: _f, ...c }) => c),
      cities,
      featured,
      fresh,
      services,
      banners,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
