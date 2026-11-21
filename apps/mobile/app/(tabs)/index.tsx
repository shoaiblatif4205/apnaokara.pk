import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { IconKey } from '@apna-okara/shared';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme';
import { AppText } from '../../src/components/AppText';
import { CategoryIcon } from '../../src/components/CategoryIcon';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { AdGridView } from '../../src/components/AdCardView';
import { Button } from '../../src/components/Form';
import { getHome, type HomeData } from '../../src/api';

// App home: same order as the website. Data comes from /api/v1/home.
export default function HomeScreen() {
  const { t, isUrdu } = useI18n();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const name = (o: { name_en: string; name_ur: string }) => (isUrdu ? o.name_ur : o.name_en);

  const load = useCallback(async () => {
    setError(false);
    try {
      setData(await getHome());
    } catch {
      setError(true);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const row = isUrdu ? 'row-reverse' : 'row';
  const Title = ({ text, onMore }: { text: string; onMore?: () => void }) => (
    <View style={{ flexDirection: row, justifyContent: 'space-between', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.xl }}>
      <AppText bold size={18}>
        {text}
      </AppText>
      {onMore && (
        <Pressable onPress={onMore} accessibilityRole="link" hitSlop={8}>
          <AppText bold size={13} color={colors.primary}>
            {t('common.viewAll')}
          </AppText>
        </Pressable>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <Pressable
          onPress={() => router.push('/search')}
          style={{ margin: spacing.lg, flexDirection: row, alignItems: 'center', gap: spacing.sm, borderWidth: 2, borderColor: colors.primary, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: spacing.md, minHeight: 48 }}
          accessibilityRole="search"
        >
          <MaterialCommunityIcons name="magnify" size={22} color={colors.primary} />
          <TextInput editable={false} pointerEvents="none" placeholder={t('common.searchPlaceholder')} placeholderTextColor={colors.textMuted} style={{ flex: 1, textAlign: isUrdu ? 'right' : 'left' }} />
        </Pressable>

        <View style={{ marginHorizontal: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.primary, padding: spacing.xl }}>
          <AppText bold size={24} color="#FFFFFF">
            {t('home.heroTitle')}
          </AppText>
          <AppText size={14} color="#DCFCE7" style={{ marginTop: spacing.sm }}>
            {t('home.heroText')}
          </AppText>
          <Pressable
            onPress={() => router.push('/post')}
            style={{ marginTop: spacing.lg, alignSelf: isUrdu ? 'flex-end' : 'flex-start', backgroundColor: '#FFFFFF', borderRadius: radius.sm, paddingHorizontal: spacing.lg, minHeight: 44, justifyContent: 'center' }}
            accessibilityRole="button"
          >
            <AppText bold color={colors.primary}>
              {t('home.heroCta')}
            </AppText>
          </Pressable>
        </View>

        {!data && !error && <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl }} />}
        {error && (
          <View style={{ margin: spacing.lg, alignItems: 'center', gap: spacing.md }}>
            <AppText align="center" color={colors.textMuted}>
              {t('post.errorGeneric')}
            </AppText>
            <Button label={t('post.next')} onPress={load} />
          </View>
        )}

        {data && (
          <>
            <Title text={t('home.categoriesTitle')} />
            <View style={{ flexDirection: row, flexWrap: 'wrap', paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
              {data.categories
                .filter((c) => c.show_on_home)
                .map((c) => (
                  <Pressable
                    key={c.slug}
                    onPress={() => router.push({ pathname: '/search', params: { category: c.slug } })}
                    accessibilityRole="link"
                    accessibilityLabel={name(c)}
                    style={{ width: '25%', padding: spacing.xs }}
                  >
                    <View style={{ alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.md, paddingHorizontal: 2, minHeight: 104 }}>
                      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                        <CategoryIcon icon={(c.icon ?? 'other') as IconKey} color={colors.primary} />
                      </View>
                      <AppText size={11} align="center" style={{ marginTop: spacing.xs }} numberOfLines={2}>
                        {name(c)}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
            </View>

            {data.featured.length > 0 && (
              <>
                <Title text={t('home.featuredTitle')} onMore={() => router.push({ pathname: '/search', params: { featured: '1' } })} />
                <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
                  <AdGridView ads={data.featured} />
                </View>
              </>
            )}

            <Title text={t('home.freshTitle')} onMore={() => router.push('/search')} />
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
              {data.fresh.length ? (
                <AdGridView ads={data.fresh} />
              ) : (
                <AppText align="center" color={colors.textMuted}>
                  {t('home.emptyAds')}
                </AppText>
              )}
            </View>

            {data.services.length > 0 && (
              <>
                <Title text={t('home.servicesTitle')} onMore={() => router.push({ pathname: '/search', params: { category: 'services' } })} />
                <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
                  <AdGridView ads={data.services} />
                </View>
              </>
            )}

            <Title text={t('home.citiesTitle')} />
            <View style={{ flexDirection: row, flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
              {data.cities.map((c) => (
                <Pressable
                  key={c.slug}
                  onPress={() => router.push({ pathname: '/search', params: { city: c.slug } })}
                  accessibilityRole="link"
                  style={{ borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, minHeight: 40, justifyContent: 'center' }}
                >
                  <AppText size={13}>{`${name(c)} (${c.live})`}</AppText>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
