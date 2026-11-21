import type { MetadataRoute } from 'next';
import { brand } from '@apna-okara/shared';

// Lets people "Add to Home screen" / install the website like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name.en} | ${brand.name.ur}`,
    short_name: brand.name.en,
    description: 'Buy, sell, find services, jobs, property and businesses in Okara, Sahiwal and Pakpattan.',
    start_url: '/ur?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#15803D',
    lang: 'ur',
    dir: 'rtl',
    categories: ['shopping', 'business', 'lifestyle'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Post an ad', short_name: 'Post', url: '/ur/post-ad' },
      { name: 'My ads', short_name: 'My ads', url: '/ur/my-ad' },
      { name: 'Search', short_name: 'Search', url: '/ur/search' },
    ],
  };
}
