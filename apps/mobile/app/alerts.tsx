import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useI18n } from '../src/i18n';
import { colors, radius, spacing } from '../src/theme';
import { AppText } from '../src/components/AppText';
import { Button } from '../src/components/Form';
import { pushState, registerPush, setPushOptions, unfollow, type PushState } from '../src/push';

// Menu -> Notifications: turn on, choose what to get, manage followed searches.
export default function AlertsScreen() {
  const { t, locale, isUrdu } = useI18n();
  const [state, setState] = useState<PushState | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    pushState()
      .then(setState)
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const row = isUrdu ? 'row-reverse' : 'row';
  const toggle = (key: 'notify_ads' | 'notify_follows' | 'notify_rishta', label: string) => (
    <View key={key} style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.md }}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      <Switch
        value={state?.[key] !== false}
        onValueChange={(v) => {
          setPushOptions(locale, { [key]: v })
            .then((s) => {
              if (s) setState(s);
            })
            .catch(() => {});
        }}
        trackColor={{ true: colors.primary }}
        accessibilityLabel={label}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: true, title: t('push.title'), headerTintColor: colors.primary }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <AppText color={colors.textMuted}>{t('push.intro')}</AppText>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : !state ? (
          <>
            <Button
              label={t('push.turnOn')}
              onPress={async () => {
                const s = await registerPush(locale, true).catch(() => null);
                setFailed(!s);
                if (s) setState(s);
              }}
            />
            {failed && <AppText color={colors.textMuted}>{t('push.notAvailable')}</AppText>}
          </>
        ) : (
          <>
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
              {toggle('notify_ads', t('push.myAds'))}
              {toggle('notify_follows', t('push.follows'))}
              {toggle('notify_rishta', t('push.rishta'))}
            </View>
            <AppText bold size={16}>{t('push.following')}</AppText>
            {state.follows.length === 0 ? (
              <AppText color={colors.textMuted}>{t('push.none')}</AppText>
            ) : (
              state.follows.map((f) => (
                <View key={f.id} style={{ flexDirection: row, alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={20} color={colors.primary} />
                  <AppText style={{ flex: 1 }}>
                    {`${isUrdu ? f.category_ur : f.category_en} · ${f.city ? (isUrdu ? f.city_ur : f.city_en) : t('push.allCities')}`}
                  </AppText>
                  <Pressable onPress={() => unfollow(f.id).then((s) => s && setState(s)).catch(() => {})} accessibilityRole="button" hitSlop={8} style={{ padding: 6 }}>
                    <AppText color={colors.danger} bold size={13}>{t('push.remove')}</AppText>
                  </Pressable>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
