import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { useI18n } from '../src/i18n';
import { colors, spacing } from '../src/theme';
import { AppText } from '../src/components/AppText';
import { AdGridView } from '../src/components/AdCardView';
import { getFavs, onFavsChange } from '../src/favourites';
import type { AdCard } from '../src/api';

export default function SavedScreen() {
  const { t } = useI18n();
  const [list, setList] = useState<AdCard[]>([]);
  const load = useCallback(() => {
    getFavs().then(setList);
  }, []);
  useEffect(() => {
    load();
    return onFavsChange(load);
  }, [load]);
  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: t('browse.favourites'), headerTintColor: colors.primary }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        {list.length ? (
          <AdGridView ads={list} />
        ) : (
          <AppText align="center" color={colors.textMuted} style={{ marginTop: spacing.xl }}>
            {t('browse.noFavourites')}
          </AppText>
        )}
      </ScrollView>
    </View>
  );
}
