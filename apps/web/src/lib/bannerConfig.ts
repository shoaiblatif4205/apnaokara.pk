// Banner places, sizes and booking lengths (shared by admin, booking page and API).

export const BANNER_PLACEMENTS = ['hero_slider', 'hero_side', 'home_strip', 'category_top', 'in_feed', 'ad_detail', 'app_home', 'popup'] as const;
export type Placement = (typeof BANNER_PLACEMENTS)[number];
export const BANNER_DAYS = [7, 15, 30] as const;

export const PLACEMENT_INFO: Record<Placement, { en: string; ur: string; size: string }> = {
  hero_slider: { en: 'Home hero slider (big)', ur: 'ہوم پیج بڑا سلائیڈر', size: '1200x400 / mobile 800x400' },
  hero_side: { en: 'Next to the hero (2 small)', ur: 'سلائیڈر کے ساتھ (2 چھوٹے)', size: '400x195' },
  home_strip: { en: 'Home page wide strip', ur: 'ہوم پیج چوڑی پٹی', size: '1200x200 / mobile 800x250' },
  category_top: { en: 'Top of category pages', ur: 'کیٹیگری صفحات کے اوپر', size: '1200x200 / mobile 800x250' },
  in_feed: { en: 'Inside ad lists (every 8 ads)', ur: 'اشتہاروں کے بیچ (ہر 8 کے بعد)', size: '400x400' },
  ad_detail: { en: 'On ad pages', ur: 'اشتہار کے صفحے پر', size: '300x600 / mobile 800x250' },
  app_home: { en: 'App home screen', ur: 'ایپ ہوم اسکرین', size: '800x400' },
  popup: { en: 'Popup (once a day)', ur: 'پاپ اپ (دن میں ایک بار)', size: '600x600' },
};
