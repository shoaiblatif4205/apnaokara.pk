import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { brand } from '@apna-okara/shared';
import { useI18n } from '../src/i18n';
import { colors, radius, spacing } from '../src/theme';
import { AppText } from '../src/components/AppText';
import { fileUrl, getBlog, type BlogList } from '../src/api';

// Blog list in the app. A post opens on the website (full text, pictures, tables).
export default function BlogScreen() {
  const { t, locale, isUrdu } = useI18n();
  const site = process.env.EXPO_PUBLIC_SITE_URL || `https://${brand.domain}`;
  const [category, setCategory] = useState<string | undefined>();
  const [data, setData] = useState<BlogList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    getBlog({ locale, category })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [locale, category]);
  useEffect(load, [load]);

  const date = (iso: string) => new Date(iso).toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', { day: 'numeric', month: 'long', year: 'numeric' });
  const chip = (slug: string | undefined, label: string) => {
    const active = category === slug;
    return (
      <Pressable
        key={slug ?? 'all'}
        onPress={() => setCategory(slug)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        style={{ paddingHorizontal: spacing.md, minHeight: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.surface }}
      >
        <AppText size={13} bold color={active ? '#fff' : colors.text}>{label}</AppText>
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: t('blog.title'), headerTintColor: colors.primary }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }} refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}>
        <AppText color={colors.textMuted}>{t('blog.intro')}</AppText>
        {!!data?.categories.length && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, flexDirection: isUrdu ? 'row-reverse' : 'row' }}>
            {chip(undefined, t('blog.all'))}
            {data.categories.map((c) => chip(c.slug, isUrdu ? c.name_ur : c.name_en))}
          </ScrollView>
        )}
        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />}
        {error && !loading && (
          <Pressable onPress={load} accessibilityRole="button" style={{ padding: spacing.lg }}>
            <AppText align="center" color={colors.danger}>{t('post.errorGeneric')}</AppText>
          </Pressable>
        )}
        {!loading && !error && data && data.posts.length === 0 && (
          <AppText align="center" color={colors.textMuted} style={{ marginTop: spacing.xl }}>{t('blog.empty')}</AppText>
        )}
        {!loading &&
          data?.posts.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => Linking.openURL(`${site}/${p.locale}/blog/${encodeURIComponent(p.slug)}`)}
              accessibilityRole="link"
              style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}
            >
              {p.cover ? (
                <Image source={{ uri: fileUrl(p.cover)! }} style={{ width: '100%', aspectRatio: 16 / 9 }} accessibilityIgnoresInvertColors />
              ) : (
                <View style={{ width: '100%', aspectRatio: 16 / 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="book-open-variant" size={40} color={colors.primary} />
                </View>
              )}
              <View style={{ padding: spacing.md, gap: 4 }}>
                {p.category && <AppText size={12} bold color={colors.primary}>{isUrdu ? p.category.name_ur : p.category.name_en}</AppText>}
                <AppText bold size={16}>{p.title}</AppText>
                {!!p.excerpt && <AppText size={13} color={colors.textMuted} numberOfLines={3}>{p.excerpt}</AppText>}
                <AppText size={12} color={colors.textMuted}>{`${date(p.publishedAt)} · ${t('blog.minRead', { n: p.readingMinutes })}`}</AppText>
              </View>
            </Pressable>
          ))}
      </ScrollView>
    </View>
  );
}
