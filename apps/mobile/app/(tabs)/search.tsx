import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme';
import { AppText } from '../../src/components/AppText';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AdGridView } from '../../src/components/AdCardView';
import { Button, Chip, ChipRow } from '../../src/components/Form';
import { getHome, searchAds, type AdCard, type HomeData } from '../../src/api';
import { follow } from '../../src/push';

// Search with category, city and sort. Opens with filters from Home (category / city / featured).
export default function SearchScreen() {
  const { t, locale, isUrdu } = useI18n();
  const params = useLocalSearchParams<{ category?: string; city?: string; featured?: string }>();
  const [meta, setMeta] = useState<HomeData | null>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(params.category ?? '');
  const [city, setCity] = useState(params.city ?? '');
  const [featured, setFeatured] = useState(params.featured === '1');
  const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
  const [ads, setAds] = useState<AdCard[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [followed, setFollowed] = useState<string | null>(null); // "category|city" just followed
  const [followMsg, setFollowMsg] = useState('');
  const name = (o: { name_en: string; name_ur: string }) => (isUrdu ? o.name_ur : o.name_en);

  useEffect(() => {
    setCategory(params.category ?? '');
    setCity(params.city ?? '');
    setFeatured(params.featured === '1');
  }, [params.category, params.city, params.featured]);

  useEffect(() => {
    getHome().then(setMeta).catch(() => {});
  }, []);

  const run = useCallback(
    async (p = 1) => {
      setBusy(true);
      setError('');
      try {
        const r = await searchAds({ q: q.trim() || undefined, category: category || undefined, city: city || undefined, featured: featured ? '1' : undefined, sort, page: String(p) });
        if (p === 1) setAds(r.ads);
        else setAds((prev) => [...prev, ...r.ads]);
        setTotal(r.total);
        setPage(r.page);
        setPages(r.pages);
      } catch {
        setError(t('post.errorGeneric'));
      } finally {
        setBusy(false);
      }
    },
    [q, category, city, featured, sort, t],
  );

  useEffect(() => {
    void run(1);
  }, [category, city, featured, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t('nav.search')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 2, borderColor: colors.primary, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: spacing.md }}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => run(1)}
            returnKeyType="search"
            placeholder={t('common.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={t('common.search')}
            style={{ flex: 1, minHeight: 48, fontSize: 16, color: colors.text, textAlign: isUrdu ? 'right' : 'left' }}
          />
        </View>

        {meta && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.md }}>
              <Chip label={t('common.allCategories')} active={!category} onPress={() => setCategory('')} />
              {meta.categories.map((c) => (
                <Chip key={c.slug} label={name(c)} active={category === c.slug} onPress={() => setCategory(c.slug)} />
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Chip label={t('common.allCities')} active={!city} onPress={() => setCity('')} />
              {meta.cities.map((c) => (
                <Chip key={c.slug} label={name(c)} active={city === c.slug} onPress={() => setCity(c.slug)} />
              ))}
            </ScrollView>
          </>
        )}
        <ChipRow>
          <Chip label={t('browse.newest')} active={sort === 'newest'} onPress={() => setSort('newest')} />
          <Chip label={t('browse.priceLow')} active={sort === 'price_asc'} onPress={() => setSort('price_asc')} />
          <Chip label={t('browse.priceHigh')} active={sort === 'price_desc'} onPress={() => setSort('price_desc')} />
          <Chip label={t('browse.featuredOnly')} active={featured} onPress={() => setFeatured(!featured)} />
        </ChipRow>

        <View style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginVertical: spacing.sm }}>
          <AppText size={13} color={colors.textMuted}>
            {t('browse.adsCount').replace('{count}', String(total))}
          </AppText>
          {!!category && (
            <Pressable
              accessibilityRole="button"
              disabled={followed === `${category}|${city}`}
              onPress={async () => {
                setFollowMsg('');
                const s = await follow(locale, category, city || null).catch(() => null);
                if (s) setFollowed(`${category}|${city}`);
                else setFollowMsg(t('push.notAvailable'));
              }}
              style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary, minHeight: 36 }}
            >
              <MaterialCommunityIcons name={followed === `${category}|${city}` ? 'bell-check' : 'bell-plus-outline'} size={18} color={colors.primary} />
              <AppText size={13} bold color={colors.primary}>
                {followed === `${category}|${city}` ? t('push.followed') : t('push.follow')}
              </AppText>
            </Pressable>
          )}
        </View>
        {followMsg ? <AppText size={13} color={colors.textMuted}>{followMsg}</AppText> : null}
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        {ads.length ? <AdGridView ads={ads} /> : !busy ? <AppText align="center" color={colors.textMuted}>{t('browse.noAds')}</AppText> : null}
        {busy && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />}
        {!busy && page < pages && (
          <View style={{ marginTop: spacing.lg }}>
            <Button label={t('browse.next')} kind="outline" onPress={() => run(page + 1)} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
