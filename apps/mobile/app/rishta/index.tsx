import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, View } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { optionLabel, RISHTA_OPTIONS } from '@apna-okara/shared';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme';
import { AppText } from '../../src/components/AppText';
import { Button, Chip, ChipRow, ErrorText, Input } from '../../src/components/Form';
import { RishtaCardView } from '../../src/components/RishtaCardView';
import { API_URL } from '../../src/api';
import { getToken, rishta, RishtaError, setActiveProfile, setToken, type RCard } from '../../src/rishtaApi';
import { linkRishta } from '../../src/push';

type Profile = { id: string; reference: string; status: string; gender: string; full_name: string | null; reject_reason: string | null; expires_at: string | null; is_premium: boolean };
type Interest = { id: number; direction: 'sent' | 'received'; status: string; other: RCard; contact: { name: string; phone: string } | null };

// Rishta in the app: login with phone + code, my profiles, search and interests.
// Making / editing a profile and uploading photos opens the website form.
export default function RishtaScreen() {
  usePreventScreenCapture();
  const { t, locale } = useI18n();
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'search' | 'interests' | 'me'>('search');
  const [me, setMe] = useState<{ profiles: Profile[]; active: { id: string } | null } | null>(null);
  const [results, setResults] = useState<RCard[] | null>(null);
  const [interests, setInterests] = useState<Interest[] | null>(null);
  const [needProfile, setNeedProfile] = useState(false);
  const [filters, setFilters] = useState<{ ageMin?: string; ageMax?: string; caste?: string }>({});

  const load = useCallback(async () => {
    setError('');
    try {
      const m = await rishta<{ profiles: Profile[]; active: { id: string } | null }>('/api/rishta/me');
      setMe(m);
      if (m.active) await setActiveProfile(m.active.id);
      if (tab === 'search') {
        const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString();
        setResults((await rishta<{ profiles: RCard[] }>(`/api/rishta/search?${qs}`)).profiles);
      }
      if (tab === 'interests') setInterests((await rishta<{ interests: Interest[] }>('/api/rishta/interests')).interests);
      setNeedProfile(false);
    } catch (e) {
      if (e instanceof RishtaError && e.status === 401) {
        await setToken(null);
        setLogged(false);
      } else if (e instanceof RishtaError && e.status === 403) setNeedProfile(true);
      else setError(e instanceof Error ? e.message : '');
    }
  }, [tab, filters]);

  useEffect(() => {
    getToken().then((tk) => {
      setLogged(!!tk);
      setReady(true);
    });
  }, []);
  useFocusEffect(
    useCallback(() => {
      if (logged) void load();
    }, [logged, load]),
  );

  const statusText: Record<string, string> = {
    pending: t('rishta.statusPending'), approved: t('rishta.statusApproved'), rejected: t('rishta.statusRejected'),
    expired: t('rishta.statusExpired'), hidden: t('rishta.statusHidden'), removed: t('rishta.statusRemoved'),
  };
  const web = (path: string) => Linking.openURL(`${API_URL}/${locale}${path}`);

  if (!ready) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: true, title: t('rishta.title'), headerTintColor: '#BE185D' }} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
        {!logged ? (
          <View>
            <AppText bold size={22}>{t('rishta.heroTitle')}</AppText>
            <AppText color={colors.textMuted} style={{ marginVertical: spacing.sm }}>{t('rishta.privacy1')}</AppText>
            {!codeSent ? (
              <>
                <Input label={t('rishta.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="03001234567" ltr />
                <Button
                  label={t('rishta.sendCode')}
                  onPress={async () => {
                    setError('');
                    try {
                      const r = await rishta<{ devCode?: string }>('/api/rishta/auth', { action: 'send', phone });
                      setDevCode(r.devCode ?? '');
                      setCodeSent(true);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : '');
                    }
                  }}
                />
              </>
            ) : (
              <>
                <AppText size={14}>{t('rishta.codeSent')}</AppText>
                {devCode ? <AppText size={13} color="#92400E">{t('rishta.devCode').replace('{code}', devCode)}</AppText> : null}
                <Input label={t('rishta.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} ltr />
                <Button
                  label={t('rishta.verify')}
                  onPress={async () => {
                    setError('');
                    try {
                      const r = await rishta<{ token: string }>('/api/rishta/auth', { action: 'verify', phone, code });
                      await setToken(r.token);
                      linkRishta().catch(() => {});
                      setLogged(true);
                    } catch (e) {
                      setError(e instanceof Error ? e.message : '');
                    }
                  }}
                />
              </>
            )}
            <ErrorText text={error} />
          </View>
        ) : (
          <View>
            <ChipRow>
              <Chip label={t('rishta.search')} active={tab === 'search'} onPress={() => setTab('search')} />
              <Chip label={t('rishta.interests')} active={tab === 'interests'} onPress={() => setTab('interests')} />
              <Chip label={t('rishta.myProfiles')} active={tab === 'me'} onPress={() => setTab('me')} />
            </ChipRow>
            <ErrorText text={error} />

            {needProfile && tab !== 'me' && (
              <View style={{ marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md }}>
                <AppText>{t('rishta.statusPending')}</AppText>
                <View style={{ marginTop: spacing.sm }}>
                  <Button label={t('rishta.myProfiles')} kind="outline" onPress={() => setTab('me')} />
                </View>
              </View>
            )}

            {tab === 'search' && !needProfile && (
              <View style={{ marginTop: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Input label={t('rishta.ageFrom')} value={filters.ageMin ?? ''} onChangeText={(v) => setFilters({ ...filters, ageMin: v })} keyboardType="number-pad" ltr />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label={t('rishta.ageTo')} value={filters.ageMax ?? ''} onChangeText={(v) => setFilters({ ...filters, ageMax: v })} keyboardType="number-pad" ltr />
                  </View>
                </View>
                <Input label={t('rishta.caste')} value={filters.caste ?? ''} onChangeText={(v) => setFilters({ ...filters, caste: v })} />
                <Button label={t('rishta.search')} onPress={load} />
                <View style={{ marginTop: spacing.md }}>
                  {results?.map((p) => <RishtaCardView key={p.reference} p={p} />)}
                  {results && !results.length && <AppText color={colors.textMuted}>{t('rishta.noResults')}</AppText>}
                </View>
              </View>
            )}

            {tab === 'interests' && !needProfile && (
              <View style={{ marginTop: spacing.md }}>
                {interests?.map((i) => (
                  <RishtaCardView key={i.id} p={i.other}>
                    <AppText size={12} bold color={i.status === 'accepted' ? colors.primaryDark : colors.textMuted}>
                      {i.status === 'accepted' ? t('rishta.accepted') : i.direction === 'received' ? t('rishta.interestReceived') : t('rishta.interestSent')}
                    </AppText>
                    {i.contact && <AppText size={13} bold>{`${i.contact.name} · ${i.contact.phone}`}</AppText>}
                  </RishtaCardView>
                ))}
                {interests && !interests.length && <AppText color={colors.textMuted}>{t('rishta.noInterests')}</AppText>}
              </View>
            )}

            {tab === 'me' && me && (
              <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                {me.profiles.map((p) => (
                  <View key={p.id} style={{ padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: me.active?.id === p.id ? 2 : 1, borderColor: me.active?.id === p.id ? '#BE185D' : colors.border }}>
                    <AppText bold size={16} align="left">{p.reference}</AppText>
                    <AppText size={13} color={colors.textMuted}>{`${p.full_name ?? ''} · ${optionLabel(RISHTA_OPTIONS.gender, p.gender, locale)}`}</AppText>
                    <AppText size={13} bold>{statusText[p.status] ?? p.status}</AppText>
                    {p.reject_reason ? <AppText size={13} color={colors.danger}>{p.reject_reason}</AppText> : null}
                    <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
                      {p.status === 'approved' && me.active?.id !== p.id && (
                        <Button
                          label={t('rishta.useThis')}
                          kind="outline"
                          onPress={async () => {
                            await setActiveProfile(p.id);
                            await load();
                          }}
                        />
                      )}
                      <Button label={t('rishta.editProfile')} kind="outline" onPress={() => web(`/rishta/profile/${p.id}`)} />
                    </View>
                  </View>
                ))}
                {!me.profiles.length && <AppText color={colors.textMuted}>{t('rishta.noProfiles')}</AppText>}
                <Button label={t('rishta.newProfile')} onPress={() => web('/rishta/profile/new')} />
                <Button
                  label={t('rishta.logout')}
                  kind="outline"
                  onPress={async () => {
                    await setToken(null);
                    setLogged(false);
                    setCodeSent(false);
                  }}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
