import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { heightLabel, optionLabel, RISHTA_OPTIONS } from '@apna-okara/shared';
import { authHeaders, photoUrl, type RCard } from '../rishtaApi';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';

/** Rishta photo (needs the login token, so headers are added). */
export function RishtaPhoto({ id, clear = false, size }: { id: number | null; clear?: boolean; size: { width: number | `${number}%`; height: number } }) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    authHeaders().then(setHeaders);
  }, []);
  if (!id || !headers)
    return (
      <View style={{ ...size, borderRadius: radius.sm, backgroundColor: '#FDF2F8', alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name="account" size={40} color="#F9A8D4" />
      </View>
    );
  return <Image source={{ uri: photoUrl(id, clear), headers }} style={{ ...size, borderRadius: radius.sm }} resizeMode="cover" accessibilityIgnoresInvertColors />;
}

export function RishtaCardView({ p, children }: { p: RCard; children?: ReactNode }) {
  const { t, locale, isUrdu } = useI18n();
  return (
    <Pressable
      onPress={() => router.push(`/rishta/${p.reference}`)}
      accessibilityRole="link"
      style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: p.is_premium ? 2 : 1, borderColor: p.is_premium ? '#FBBF24' : colors.border, marginBottom: spacing.sm }}
    >
      <RishtaPhoto id={p.photo_id} size={{ width: 84, height: 84 }} />
      <View style={{ flex: 1 }}>
        <AppText bold size={16} align="left">
          {p.reference}
        </AppText>
        <AppText size={13}>{`${t('rishta.years').replace('{n}', String(p.age))} · ${heightLabel(p.height_cm)} · ${optionLabel(RISHTA_OPTIONS.maritalStatus, p.marital_status, locale)}`}</AppText>
        <AppText size={13} color={colors.textMuted}>
          {[optionLabel(RISHTA_OPTIONS.education, p.education, locale), p.profession].filter(Boolean).join(' · ')}
        </AppText>
        <AppText size={13} color={colors.textMuted}>
          {[isUrdu ? p.city_ur : p.city_en, p.current_country !== 'Pakistan' ? p.current_country : null, p.caste].filter(Boolean).join(' · ')}
        </AppText>
        {children}
      </View>
    </Pressable>
  );
}
