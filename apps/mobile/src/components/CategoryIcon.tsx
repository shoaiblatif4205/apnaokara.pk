import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { IconKey } from '@apna-okara/shared';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const icons: Record<IconKey, IconName> = {
  mobile: 'cellphone',
  electronics: 'television',
  furniture: 'sofa-outline',
  fashion: 'tshirt-crew-outline',
  books: 'book-open-variant',
  kids: 'baby-face-outline',
  animals: 'cow',
  agriculture: 'sprout',
  industrial: 'factory',
  other: 'package-variant-closed',
  car: 'car',
  bike: 'motorbike',
  home: 'home-outline',
  'home-rent': 'key-outline',
  briefcase: 'briefcase-outline',
  tools: 'wrench-outline',
  store: 'storefront-outline',
  heart: 'heart-outline',
};

export function CategoryIcon({ icon, size = 26, color }: { icon: IconKey; size?: number; color: string }) {
  return <MaterialCommunityIcons name={icons[icon] ?? 'package-variant-closed'} size={size} color={color} />;
}
