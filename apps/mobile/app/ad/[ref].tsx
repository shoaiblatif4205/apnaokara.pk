import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { toWhatsAppNumber } from '@apna-okara/shared';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme';
import { AppText } from '../../src/components/AppText';
import { AdGridView, FavButton, priceText } from '../../src/components/AdCardView';
import { Button } from '../../src/components/Form';
import { ProviderReviews } from '../../src/components/ProviderReviews';
import { API_URL, fileUrl, getAd, reportAd, type AdCard, type AdDetail } from '../../src/api';

const WIDTH = Dimensions.get('window').width;

export default function AdScreen() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { t, locale, isUrdu } = useI18n();
  const [ad, setAd] = useState<AdDetail | null>(null);
  const [similar, setSimilar] = useState<AdCard[]>([]);
  const [error, setError] = useState('');
  const [showPhone, setShowPhone] = useState(false);
  const pick = (o: { en: string; ur: string }) => (isUrdu ? o.ur : o.en);

  useEffect(() => {
    if (!ref) return;
    getAd(ref)
      .then((r) => {
        setAd(r.ad);
        setSimilar(r.similar);
      })
      .catch(() => setError(t('post.errorGeneric')));
  }, [ref, t]);

  const webUrl = ad ? `${API_URL}/${locale}/ad/${ad.slug}-${ad.reference}` : '';

  function report() {
    if (!ad) return;
    const reasons: [string, string][] = [
      ['fraud', t('browse.reportFraud')],
      ['wrong_category', t('browse.reportWrongCategory')],
      ['sold', t('browse.reportSold')],
      ['offensive', t('browse.reportOffensive')],
      ['duplicate', t('browse.reportDuplicate')],
    ];
    Alert.alert(t('browse.report'), t('browse.reportReason'), [
      ...reasons.map(([key, label]) => ({
        text: label,
        onPress: () => reportAd(ad.reference, key).then(() => Alert.alert(t('browse.reportThanks'))).catch(() => {}),
      })),
      { text: t('post.back'), style: 'cancel' as const },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: true, title: ad?.title ?? '', headerTintColor: colors.primary }} />
      {!ad && !error && <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: spacing.xl }} />}
      {error ? (
        <AppText align="center" style={{ marginTop: spacing.xl }}>
          {error}
        </AppText>
      ) : null}
      {ad && (
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
          {ad.status !== 'live' && (
            <View style={{ backgroundColor: '#FEF3C7', padding: spacing.md }}>
              <AppText bold color="#92400E">
                {ad.status === 'sold' ? t('browse.soldTitle') : t('browse.expiredTitle')}
              </AppText>
            </View>
          )}
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {(ad.images.length ? ad.images : [null]).map((src, i) => (
              <View key={i} style={{ width: WIDTH, height: WIDTH * 0.75, backgroundColor: '#111827' }}>
                {src && <Image source={{ uri: fileUrl(src)! }} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel={`${ad.title} ${i + 1}`} />}
              </View>
            ))}
          </ScrollView>
          <View style={{ padding: spacing.lg }}>
            <View style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText bold size={26}>
                {priceText(ad, locale, t)}
              </AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <FavButton ad={ad} />
                <Pressable
                  onPress={() => Share.share({ message: `${ad.title}\n${webUrl}` })}
                  accessibilityRole="button"
                  accessibilityLabel={t('browse.share')}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}
                >
                  <MaterialCommunityIcons name="share-variant" size={20} color={colors.text} />
                </Pressable>
              </View>
            </View>
            <AppText bold size={18} style={{ marginTop: spacing.sm }}>
              {ad.title}
            </AppText>
            {ad.verified && (
              <AppText bold size={14} color={colors.primary}>
                {`✓ ${t('common.verified')}`}
              </AppText>
            )}
            <AppText size={13} color={colors.textMuted}>
              {ad.locality ? `${pick(ad.locality)}, ${pick(ad.city)}` : pick(ad.city)}
            </AppText>

            {ad.fieldList.length > 0 && (
              <View style={{ marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }}>
                <AppText bold style={{ marginBottom: spacing.sm }}>
                  {t('browse.details')}
                </AppText>
                {ad.fieldList.map((f) => (
                  <View key={f.label.en} style={{ flexDirection: isUrdu ? 'row-reverse' : 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <AppText size={14} color={colors.textMuted}>
                      {pick(f.label)}
                    </AppText>
                    <AppText size={14} bold>
                      {`${pick(f.value)}${f.unit ? ` ${pick(f.unit)}` : ''}`}
                    </AppText>
                  </View>
                ))}
              </View>
            )}

            {ad.description ? (
              <View style={{ marginTop: spacing.lg }}>
                <AppText bold>{t('browse.description')}</AppText>
                <AppText style={{ marginTop: spacing.xs }}>{ad.description}</AppText>
              </View>
            ) : null}

            {(ad.model === 'services' || ad.model === 'business') && (
              <ProviderReviews reference={ad.reference} rating={ad.rating} count={ad.ratingCount} live={ad.status === 'live'} />
            )}

            <View style={{ marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }}>
              <AppText size={13} color={colors.textMuted}>
                {t('browse.postedBy')}
              </AppText>
              <AppText bold size={16}>
                {ad.sellerName}
              </AppText>
            </View>

            <View style={{ marginTop: spacing.lg, backgroundColor: '#FFF7ED', borderRadius: radius.md, padding: spacing.md }}>
              <AppText bold color="#9A3412">
                {t('browse.safetyTitle')}
              </AppText>
              <AppText size={13} color="#9A3412">
                {t('browse.safetyText')}
              </AppText>
            </View>
            {ad.status === 'live' && (
              <Pressable onPress={report} accessibilityRole="button" style={{ marginTop: spacing.md, minHeight: 44, justifyContent: 'center' }}>
                <AppText size={13} color={colors.textMuted}>
                  {`⚑ ${t('browse.report')}`}
                </AppText>
              </Pressable>
            )}

            {similar.length > 0 && (
              <>
                <AppText bold size={18} style={{ marginTop: spacing.xl, marginBottom: spacing.sm }}>
                  {t('browse.similar')}
                </AppText>
                <AdGridView ads={similar} />
              </>
            )}
          </View>
        </ScrollView>
      )}

      {ad && ad.status === 'live' && (ad.whatsapp || ad.phone) && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          {ad.whatsapp && (
            <View style={{ flex: 1 }}>
              <Button
                label={t('browse.whatsappSeller')}
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${toWhatsAppNumber(ad.whatsapp!)}?text=${encodeURIComponent(t('browse.waMessage').replace('{title}', ad.title).replace('{url}', webUrl))}`,
                  )
                }
              />
            </View>
          )}
          {ad.phone && (
            <View style={{ flex: 1 }}>
              <Button
                label={showPhone ? ad.phone : t('browse.callSeller')}
                kind="outline"
                onPress={() => (showPhone ? Linking.openURL(`tel:${ad.phone}`) : setShowPhone(true))}
              />
            </View>
          )}
        </View>
      )}
    </View>
  );
}
