import {
  Baby,
  Bike,
  BookOpen,
  Briefcase,
  Car,
  Factory,
  Heart,
  Home,
  KeyRound,
  Package,
  PawPrint,
  Shirt,
  Smartphone,
  Sofa,
  Store,
  Tv,
  Wheat,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { IconKey } from '@apna-okara/shared';

const icons: Record<IconKey, LucideIcon> = {
  mobile: Smartphone,
  electronics: Tv,
  furniture: Sofa,
  fashion: Shirt,
  books: BookOpen,
  kids: Baby,
  animals: PawPrint,
  agriculture: Wheat,
  industrial: Factory,
  other: Package,
  car: Car,
  bike: Bike,
  home: Home,
  'home-rent': KeyRound,
  briefcase: Briefcase,
  tools: Wrench,
  store: Store,
  heart: Heart,
};

export function CategoryIcon({ icon, size = 24, className }: { icon: IconKey; size?: number; className?: string }) {
  const Icon = icons[icon] ?? Package;
  return <Icon size={size} className={className} aria-hidden="true" strokeWidth={1.8} />;
}
