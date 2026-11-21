import { Linking, Pressable, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { brand } from '@apna-okara/shared';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme';
import { AppText } from '../../src/components/AppText';
import { ScreenHeader } from '../../src/components/ScreenHeader';

// Menu: language switch + the same links as the website footer.
const links: { key: string; path: string }[] = [
  { key: 'footer.aboutUs', path: 'about' },
  { key: 'footer.contact', path: 'contact' },
  { key: 'footer.howItWorks', path: 'how-it-works' },
  { key: 'footer.pricing', path: 'pricing' },
  { key: 'common.advertise', path: 'advertise' },
  { key: 'footer.faq', path: 'faq' },
  { key: 'footer.safety', path: 'safety' },
  { key: 'footer.postingRules', path: 'posting-rules' },
  { key: 'footer.terms', path: 'terms' },
  { key: 'footer.privacy', path: 'privacy' },
  { key: 'footer.refund', path: 'refund-policy' },
  { key: 'footer.disclaimer', path: 'disclaimer' },
];

export default function MenuScreen() {
  const { t, locale, setLocale, isUrdu } = useI18n();
  const site = process.env.EXPO_PUBLIC_SITE_URL || `https://${brand.domain}`;

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t('nav.menu')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}>
        <Pressable
          onPress={() => setLocale(locale === 'en' ? 'ur' : 'en')}
          style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.lg, minHeight: 52 }}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="translate" size={22} color={colors.primary} />
          <AppText bold color={colors.primaryDark}>
            {t('common.language')}
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/rishta')}
          style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FDF2F8', borderRadius: radius.md, padding: spacing.lg, minHeight: 52 }}
          accessibilityRole="link"
        >
          <MaterialCommunityIcons name="heart-multiple-outline" size={22} color="#BE185D" />
          <AppText bold color="#9D174D">{t('rishta.title')}</AppText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/alerts')}
          style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, minHeight: 52 }}
          accessibilityRole="link"
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color={colors.primary} />
          <AppText bold>{t('push.title')}</AppText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/blog')}
          style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, minHeight: 52 }}
          accessibilityRole="link"
        >
          <MaterialCommunityIcons name="book-open-variant" size={22} color={colors.primary} />
          <AppText bold>{t('blog.title')}</AppText>
        </Pressable>

        <Pressable
          onPress={() => router.push('/saved')}
          style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, minHeight: 52 }}
          accessibilityRole="link"
        >
          <MaterialCommunityIcons name="heart-outline" size={22} color={colors.danger} />
          <AppText bold>{t('browse.favourites')}</AppText>
        </Pressable>

        {links.map((l) => (
          <Pressable
            key={l.path}
            onPress={() => Linking.openURL(`${site}/${locale}/${l.path}`)}
            style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, minHeight: 48, justifyContent: 'center' }}
            accessibilityRole="link"
          >
            <AppText>{t(l.key)}</AppText>
          </Pressable>
        ))}

        <AppText size={12} align="center" color={colors.textMuted} style={{ marginTop: spacing.lg }}>
          {`© ${new Date().getFullYear()} ${t('common.siteName')} · ${brand.domain}`}
        </AppText>
      </ScrollView>
    </View>
  );
}
