import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { heightLabel, optionLabel, RISHTA_OPTIONS, toWhatsAppNumber } from '@apna-okara/shared';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme';
import { AppText } from '../../src/components/AppText';
import { Button } from '../../src/components/Form';
import { RishtaPhoto } from '../../src/components/RishtaCardView';
import { rishta, type RCard } from '../../src/rishtaApi';

type ProfileView = RCard & {
  sect: string | null; religion: string | null; profession: string | null; father_profession: string | null; mother_profession: string | null;
  brothers: number | null; sisters: number | null; about: string | null; photos: { id: number; clear: boolean }[];
  interest: { id: number; direction: 'sent' | 'received'; status: string; iShared: boolean } | null;
  contact: { name: string; phone: string } | null; blocked: boolean;
};

export default function RishtaProfileScreen() {
  usePreventScreenCapture();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { t, locale } = useI18n();
  const [p, setP] = useState<ProfileView | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setP((await rishta<{ profile: ProfileView }>(`/api/rishta/view/${ref}`)).profile);
    } catch (e) {
      setError(e instanceof Error ? e.message : '');
    }
  }, [ref]);
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (body: Record<string, unknown>) => {
    try {
      await rishta('/api/rishta/interests', body);
      await load();
    } catch (e) {
      Alert.alert(e instanceof Error ? e.message : '');
    }
  };

  const L = (k: keyof typeof RISHTA_OPTIONS, v: string | null) => optionLabel(RISHTA_OPTIONS[k], v, locale);
  const i = p?.interest;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: true, title: ref ?? '', headerTintColor: '#BE185D' }} />
      {!p && !error && <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}
      {error ? <AppText align="center" style={{ marginTop: 40 }}>{error}</AppText> : null}
      {p && (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(p.photos.length ? p.photos : [{ id: 0, clear: false }]).map((ph) => (
              <View key={ph.id} style={{ marginRight: spacing.sm }}>
                <RishtaPhoto id={ph.id || null} clear={ph.clear} size={{ width: 220, height: 290 }} />
              </View>
            ))}
          </ScrollView>
          <AppText bold size={22} align="left" style={{ marginTop: spacing.md }}>{p.reference}</AppText>
          <AppText>{`${t('rishta.years').replace('{n}', String(p.age))} · ${heightLabel(p.height_cm)} · ${L('maritalStatus', p.marital_status)}`}</AppText>
          <View style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, gap: 4 }}>
            {[
              [t('rishta.education'), L('education', p.education)],
              [t('rishta.profession'), p.profession ?? '-'],
              [t('rishta.sect'), L('sect', p.sect)],
              [t('rishta.caste'), p.caste ?? '-'],
              [t('rishta.city'), (locale === 'ur' ? p.city_ur : p.city_en) ?? '-'],
              [t('rishta.country'), p.current_country],
              [t('rishta.father'), p.father_profession ?? '-'],
              [t('rishta.mother'), p.mother_profession ?? '-'],
              [`${t('rishta.brothers')} / ${t('rishta.sisters')}`, `${p.brothers ?? '-'} / ${p.sisters ?? '-'}`],
            ].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText size={14} color={colors.textMuted}>{k}</AppText>
                <AppText size={14} bold>{v}</AppText>
              </View>
            ))}
          </View>
          {p.about ? <AppText style={{ marginTop: spacing.md }}>{p.about}</AppText> : null}

          <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
            {p.blocked ? (
              <Button label={t('rishta.unblock')} kind="outline" onPress={() => act({ action: 'unblock', reference: p.reference })} />
            ) : !i || i.status === 'withdrawn' ? (
              <Button label={t('rishta.sendInterest')} onPress={() => act({ action: 'send', reference: p.reference })} />
            ) : i.status === 'sent' && i.direction === 'received' ? (
              <>
                <Button label={t('rishta.acceptShare')} onPress={() => act({ action: 'accept', interestId: i.id, share: true })} />
                <Button label={t('rishta.decline')} kind="outline" onPress={() => act({ action: 'decline', interestId: i.id })} />
              </>
            ) : i.status === 'sent' ? (
              <AppText>{t('rishta.interestSent')}</AppText>
            ) : i.status === 'accepted' ? (
              <View style={{ padding: spacing.md, backgroundColor: colors.primaryLight, borderRadius: radius.md, gap: spacing.sm }}>
                <AppText bold color={colors.primaryDark}>{t('rishta.accepted')}</AppText>
                {p.contact && (
                  <>
                    <AppText>{p.contact.name}</AppText>
                    <Button label={p.contact.phone} onPress={() => Linking.openURL(`tel:${p.contact!.phone}`)} />
                    <Button label="WhatsApp" kind="outline" onPress={() => Linking.openURL(`https://wa.me/${toWhatsAppNumber(p.contact!.phone)}`)} />
                  </>
                )}
                <Button label={i.iShared ? t('rishta.unsharePhotos') : t('rishta.sharePhotos')} kind="outline" onPress={() => act({ action: 'share', interestId: i.id, share: !i.iShared })} />
              </View>
            ) : (
              <AppText color={colors.textMuted}>{t('rishta.declined')}</AppText>
            )}
            {!p.blocked && (
              <Button
                label={t('rishta.block')}
                kind="outline"
                onPress={() =>
                  Alert.alert(t('rishta.block'), p.reference, [
                    { text: t('post.no'), style: 'cancel' },
                    { text: t('post.yes'), onPress: () => act({ action: 'block', reference: p.reference }) },
                  ])
                }
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
