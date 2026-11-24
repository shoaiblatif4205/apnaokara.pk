import { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { formatPrice } from '@apna-okara/shared';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme';
import { AppText } from '../../src/components/AppText';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Button, Chip, ChipRow, Input } from '../../src/components/Form';
import { API_URL, ApiError, getMeta, myAd, type LocalFile, type MyAd, type PayMethod } from '../../src/api';
import { getSavedAds, saveAd, type SavedAd } from '../../src/savedAds';
import { pickPhotos } from '../../src/photos';

const STATUS_KEY: Record<string, string> = {
  pending: 'myAds.statusPending',
  approved: 'myAds.statusApproved',
  rejected: 'myAds.statusRejected',
  expired: 'myAds.statusExpired',
  removed: 'myAds.statusRemoved',
  sold: 'myAds.statusSold',
};
const METHOD_LABEL: Record<PayMethod, string> = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank transfer' };

export default function MyAdsScreen() {
  const { t, locale } = useI18n();
  const [saved, setSaved] = useState<SavedAd[]>([]);
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [ad, setAd] = useState<MyAd | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [days, setDays] = useState<number | null>(null);
  const [methods, setMethods] = useState<PayMethod[]>([]);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [screenshot, setScreenshot] = useState<LocalFile | null>(null);
  const [replies, setReplies] = useState<Record<number, string>>({});
  const [upFeatured, setUpFeatured] = useState(false);
  const [upBoost, setUpBoost] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  useFocusEffect(
    useCallback(() => {
      getSavedAds().then(setSaved);
    }, []),
  );

  async function run(extra: Record<string, string> = {}, file?: { key: string; file: LocalFile }, ref = reference, ph = phone, codeArg?: string) {
    setBusy(true);
    setError('');
    try {
      // Secret manage code: typed now, or saved on this phone when the ad was posted
      const code = codeArg || (await getSavedAds()).find((s) => s.reference === ref.trim().toUpperCase())?.key || '';
      const result = await myAd({ reference: ref.trim(), phone: ph.trim(), ...(code ? { key: code } : {}), ...extra }, file);
      setAd(result);
      await saveAd({ reference: result.reference, phone: ph.trim(), ...(code && result.canManage ? { key: code } : {}) });
      if ((result.canRenew && !result.renew.free) || result.upgrade) getMeta().then((m) => setMethods(m.paymentMethods)).catch(() => {});
      return true;
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? t('myAds.notFound') : e instanceof Error ? e.message : t('post.errorGeneric'));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const date = (s: string | null) => (s ? new Date(s).toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK') : '-');

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t('myAds.title')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
        {saved.length > 0 && (
          <>
            <AppText bold size={14}>
              {t('myAds.savedAds')}
            </AppText>
            <ChipRow>
              {saved.map((s) => (
                <Chip
                  key={s.reference}
                  label={s.reference}
                  active={ad?.reference === s.reference}
                  onPress={() => {
                    setReference(s.reference);
                    setPhone(s.phone);
                    setNotice('');
                    void run({}, undefined, s.reference, s.phone);
                  }}
                />
              ))}
            </ChipRow>
            <View style={{ height: spacing.lg }} />
          </>
        )}

        <AppText color={colors.textMuted} style={{ marginBottom: spacing.md }}>
          {t('myAds.intro')}
        </AppText>
        <Input label={t('myAds.reference')} value={reference} onChangeText={setReference} autoCapitalize="characters" placeholder="AO-10001" ltr />
        <Input label={t('myAds.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="03001234567" ltr />
        <Button
          label={t('myAds.find')}
          disabled={busy}
          onPress={() => {
            setNotice('');
            void run();
          }}
        />

        {error ? (
          <AppText color={colors.danger} style={{ marginTop: spacing.md }} accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
        {ad && !ad.canManage ? (
          <View style={{ marginTop: spacing.md, backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: radius.md, padding: spacing.md }}>
            <AppText size={13} color="#78350F">{t('myAds.keyNeeded')}</AppText>
            <Input label={t('post.manageKey')} value={keyInput} onChangeText={(v) => setKeyInput(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} autoCapitalize="characters" ltr />
            <Button label={t('myAds.keyApply')} kind="outline" onPress={() => run({}, undefined, reference, phone, keyInput)} />
            <AppText size={12} color="#78350F" style={{ marginTop: spacing.sm }}>{t('myAds.keyLost')}</AppText>
          </View>
        ) : null}
        {notice ? (
          <AppText color={colors.primaryDark} style={{ marginTop: spacing.md }}>
            {notice}
          </AppText>
        ) : null}

        {ad && (
          <View style={{ marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            {ad.coverUrl && (
              <Image source={{ uri: `${API_URL}${ad.coverUrl}` }} style={{ width: '100%', height: 180, borderRadius: radius.sm, marginBottom: spacing.md }} />
            )}
            <AppText size={13} color={colors.textMuted} align="left">
              {ad.reference}
            </AppText>
            <AppText bold size={18}>
              {ad.title}
            </AppText>
            <AppText size={14} color={colors.textMuted}>
              {`${ad.categoryName[locale]} · ${ad.cityName[locale]}${ad.price ? ` · ${formatPrice(ad.price, locale)}` : ''}`}
            </AppText>
            <AppText bold style={{ marginTop: spacing.sm }}>
              {`${t('myAds.status')}: ${t(STATUS_KEY[ad.status] ?? ad.status)}`}
            </AppText>
            {ad.rejectReason && (ad.status === 'rejected' || ad.status === 'removed') ? (
              <AppText color={colors.danger}>{`${t('myAds.reason')}: ${ad.rejectReason}`}</AppText>
            ) : null}
            <AppText size={13} color={colors.textMuted}>
              {`${t('myAds.posted')}: ${date(ad.createdAt)}${ad.expiresAt ? ` · ${t('myAds.expires')}: ${date(ad.expiresAt)}` : ''}`}
            </AppText>

            {ad.canMarkSold && (
              <View style={{ marginTop: spacing.lg }}>
                <Button
                  label={t('myAds.markSold')}
                  kind="outline"
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(t('myAds.markSold'), t('myAds.markSoldConfirm'), [
                      { text: t('post.no'), style: 'cancel' },
                      { text: t('post.yes'), onPress: async () => (await run({ action: 'sold' })) && setNotice(t('myAds.done')) },
                    ])
                  }
                />
              </View>
            )}

            {ad.upgrade && (ad.upgrade.pending || ad.upgrade.featured !== null || ad.upgrade.boost !== null) && (
              <View style={{ marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.accentLight }}>
                <AppText bold>{t('myAds.upgradeTitle')}</AppText>
                {ad.upgrade.pending ? (
                  <AppText size={13}>{t('myAds.upgradePending')}</AppText>
                ) : (
                  <>
                    <AppText size={13} color={colors.textMuted}>
                      {t('myAds.upgradeText')}
                    </AppText>
                    <ChipRow>
                      {ad.upgrade.featured !== null && (
                        <Chip label={`${t('common.featured')} +${formatPrice(ad.upgrade.featured, locale)}`} active={upFeatured} onPress={() => setUpFeatured(!upFeatured)} />
                      )}
                      {ad.upgrade.boost !== null && (
                        <Chip label={`WhatsApp Boost +${formatPrice(ad.upgrade.boost, locale)}`} active={upBoost} onPress={() => setUpBoost(!upBoost)} />
                      )}
                    </ChipRow>
                    {(upFeatured || upBoost) && (
                      <>
                        <ChipRow>
                          {methods.map((m) => (
                            <Chip key={m} label={METHOD_LABEL[m]} active={method === m} onPress={() => setMethod(m)} />
                          ))}
                        </ChipRow>
                        <Button
                          label={screenshot ? `✓ ${t('post.screenshot')}` : t('post.screenshot')}
                          kind="outline"
                          onPress={async () => setScreenshot((await pickPhotos(1))[0] ?? screenshot)}
                        />
                        <View style={{ marginTop: spacing.sm }}>
                          <Button
                            label={t('myAds.upgradeSend')}
                            kind="accent"
                            disabled={busy}
                            onPress={async () => {
                              if (!method || !screenshot) return setError(t('post.required'));
                              const ok = await run(
                                { action: 'upgrade', featured: String(upFeatured), boost: String(upBoost), method },
                                { key: 'screenshot', file: screenshot },
                              );
                              if (ok) setNotice(t('myAds.done'));
                            }}
                          />
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            )}

            {ad.canRenew && (
              <View style={{ marginTop: spacing.lg }}>
                <AppText bold>{t('myAds.renew')}</AppText>
                <AppText size={13} color={colors.textMuted}>
                  {t('myAds.renewText')}
                </AppText>
                <ChipRow>
                  {ad.renew.durations.map((d) => (
                    <Chip
                      key={d.days}
                      label={`${d.days} ${t('post.days')}`}
                      sub={ad.renew.free ? t('post.priceFree') : d.price !== null ? formatPrice(d.price, locale) : '-'}
                      active={days === d.days}
                      onPress={() => setDays(d.days)}
                    />
                  ))}
                </ChipRow>
                {!ad.renew.free && (
                  <>
                    <ChipRow>
                      {methods.map((m) => (
                        <Chip key={m} label={METHOD_LABEL[m]} active={method === m} onPress={() => setMethod(m)} />
                      ))}
                    </ChipRow>
                    <Button label={screenshot ? '✓ ' + t('post.screenshot') : t('post.screenshot')} kind="outline" onPress={async () => setScreenshot((await pickPhotos(1))[0] ?? screenshot)} />
                  </>
                )}
                <View style={{ marginTop: spacing.sm }}>
                  <Button
                    label={t('myAds.renew')}
                    disabled={busy}
                    onPress={async () => {
                      if (!days) return setError(t('post.required'));
                      if (!ad.renew.free && (!method || !screenshot)) return setError(t('post.required'));
                      const extra: Record<string, string> = { action: 'renew', durationDays: String(days) };
                      if (!ad.renew.free) Object.assign(extra, { method: method! });
                      if (await run(extra, !ad.renew.free && screenshot ? { key: 'screenshot', file: screenshot } : undefined)) setNotice(t('myAds.done'));
                    }}
                  />
                </View>
              </View>
            )}

            {ad.reviews && (
              <View style={{ marginTop: spacing.lg }}>
                <AppText bold>
                  {`${t('reviews.replyTitle')}${ad.rating && ad.rating.count ? ` · ${ad.rating.avg.toFixed(1)} ★ (${ad.rating.count})` : ''}`}
                </AppText>
                {ad.reviews.length === 0 && (
                  <AppText size={13} color={colors.textMuted}>
                    {t('reviews.noReviews')}
                  </AppText>
                )}
                {ad.reviews.map((r) => (
                  <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm, marginTop: spacing.sm }}>
                    <AppText bold size={14}>{`${r.name} · ${'★'.repeat(r.rating)}`}</AppText>
                    {r.comment ? <AppText size={14}>{r.comment}</AppText> : null}
                    {r.reply ? (
                      <AppText size={13} color={colors.textMuted}>{`${t('reviews.reply')}: ${r.reply}`}</AppText>
                    ) : (
                      <>
                        <Input
                          label={t('reviews.replyHint')}
                          value={replies[r.id] ?? ''}
                          onChangeText={(v) => setReplies({ ...replies, [r.id]: v })}
                          maxLength={500}
                        />
                        <Button
                          label={t('reviews.sendReply')}
                          kind="outline"
                          disabled={busy}
                          onPress={async () => {
                            const text = (replies[r.id] ?? '').trim();
                            if (text.length < 2) return setError(t('post.required'));
                            if (await run({ action: 'reply', reviewId: String(r.id), reply: text })) setNotice(t('myAds.done'));
                          }}
                        />
                      </>
                    )}
                  </View>
                ))}
              </View>
            )}

            {ad.status !== 'removed' && (
              <View style={{ marginTop: spacing.lg }}>
                <Input label={t('myAds.requestEdit')} value={message} onChangeText={setMessage} multiline maxLength={1000} placeholder={t('myAds.requestEditHint')} />
                <Button
                  label={t('myAds.send')}
                  kind="outline"
                  disabled={busy}
                  onPress={async () => {
                    if (message.trim().length < 3) return setError(t('post.required'));
                    if (await run({ action: 'edit', message: message.trim() })) {
                      setMessage('');
                      setNotice(t('myAds.done'));
                    }
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
