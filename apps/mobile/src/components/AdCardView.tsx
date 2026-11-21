import { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatPrice } from '@apna-okara/shared';
import { fileUrl, type AdCard } from '../api';
import { getFavs, onFavsChange, toggleFav } from '../favourites';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

export function priceText(ad: { price: number | null; priceType: string }, locale: 'en' | 'ur', t: (k: string) => string) {
  if (ad.priceType === 'free') return t('browse.free');
  if (!ad.price) return t('browse.contactForPrice');
  return formatPrice(ad.price, locale);
}

export function FavButton({ ad }: { ad: AdCard }) {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => getFavs().then((l) => setOn(l.some((a) => a.reference === ad.reference)));
    sync();
    return onFavsChange(sync);
  }, [ad.reference]);
  return (
    <Pressable
      onPress={() => toggleFav(ad)}
      accessibilityRole="button"
      accessibilityLabel={on ? t('browse.saved') : t('browse.save')}
      accessibilityState={{ selected: on }}
      hitSlop={8}
      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' }}
    >
      <MaterialCommunityIcons name={on ? 'heart' : 'heart-outline'} size={20} color={on ? colors.danger : colors.text} />
    </Pressable>
  );
}

/** Ad card used in grids on Home, Search and Saved. Width is set by the parent. */
export function AdCardView({ ad }: { ad: AdCard }) {
  const { t, locale } = useI18n();
  const provider = ad.model === 'services' || ad.model === 'business';
  return (
    <Pressable
      onPress={() => router.push(`/ad/${ad.reference}`)}
      accessibilityRole="link"
      accessibilityLabel={ad.title}
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: ad.featured ? 2 : 1,
        borderColor: ad.featured ? colors.accentBright : colors.border,
        overflow: 'hidden',
      }}
    >
      <View style={{ aspectRatio: 4 / 3, backgroundColor: colors.background }}>
        {ad.cover ? <Image source={{ uri: fileUrl(ad.cover)! }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
        {ad.featured && (
          <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: colors.accent, borderRadius: 4, paddingHorizontal: 6 }}>
            <AppText size={11} bold color="#FFFFFF" align="left">
              {t('common.featured')}
            </AppText>
          </View>
        )}
        <View style={{ position: 'absolute', top: 6, right: 6 }}>
          <FavButton ad={ad} />
        </View>
      </View>
      <View style={{ padding: spacing.sm }}>
        {!provider && (
          <AppText bold size={16}>
            {priceText(ad, locale, t)}
          </AppText>
        )}
        <AppText size={13} numberOfLines={2} color={provider ? colors.text : colors.textMuted}>
          {ad.title}
        </AppText>
        {provider && ad.verified && (
          <AppText size={12} bold color={colors.primary}>
            {`✓ ${t('common.verified')}`}
          </AppText>
        )}
        <AppText size={11} color={colors.textMuted} numberOfLines={1}>
          {locale === 'ur' ? ad.city.ur : ad.city.en}
        </AppText>
      </View>
    </Pressable>
  );
}

/** Two-column grid of ad cards. */
export function AdGridView({ ads }: { ads: AdCard[] }) {
  const { isUrdu } = useI18n();
  return (
    <View style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs }}>
      {ads.map((a) => (
        <View key={a.id} style={{ width: '50%', padding: spacing.xs }}>
          <AdCardView ad={a} />
        </View>
      ))}
    </View>
  );
}
