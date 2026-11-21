// Core types shared by website, mobile app, admin panel and seed scripts.
// Plain string unions (no enums) so Node can run these files directly.

export type Locale = 'en' | 'ur';

/** Bilingual text used for every name shown to users. */
export interface Bilingual {
  en: string;
  ur: string;
}

/** The 6 marketplace models + the separate Rishta section. */
export type ModelType =
  | 'buy_sell'
  | 'vehicles'
  | 'property'
  | 'jobs'
  | 'services'
  | 'business';

export type ListingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'removed'
  | 'sold';

export type PaymentStatus = 'pending' | 'verified' | 'rejected' | 'free';

export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'nayapay' | 'bank';

export type AdminRole =
  | 'super_admin'
  | 'moderator'
  | 'blog_writer'
  | 'rishta_coordinator';

/** Key of an icon. Each app maps it to its own icon library. */
export type IconKey =
  | 'mobile'
  | 'electronics'
  | 'furniture'
  | 'fashion'
  | 'books'
  | 'kids'
  | 'animals'
  | 'agriculture'
  | 'industrial'
  | 'other'
  | 'car'
  | 'bike'
  | 'home'
  | 'home-rent'
  | 'briefcase'
  | 'tools'
  | 'store'
  | 'heart';

/** Form field types for category-specific fields. */
export type FieldType = 'text' | 'number' | 'select' | 'boolean' | 'year';

export interface CategoryField {
  key: string;
  label: Bilingual;
  type: FieldType;
  required?: boolean;
  /** For select fields. */
  options?: Bilingual[];
  /** Unit shown next to number fields, e.g. km, marla. */
  unit?: Bilingual;
}

export interface SubCategory {
  slug: string;
  name: Bilingual;
}

export interface Category {
  slug: string;
  model: ModelType;
  name: Bilingual;
  icon: IconKey;
  /** Shown on the home page category grid. */
  showOnHome: boolean;
  subcategories: SubCategory[];
  fields?: CategoryField[];
}

export interface Locality {
  slug: string;
  name: Bilingual;
}

export interface City {
  slug: string;
  district: string;
  name: Bilingual;
  localities: Locality[];
}

export interface District {
  slug: string;
  name: Bilingual;
}
