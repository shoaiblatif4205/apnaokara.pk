import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getReviews, postReview, type Review } from '../api';
import { useI18n } from '../i18n';
import { colors, radius, spacing } from '../theme';
import { AppText } from './AppText';
import { Button, ErrorText, Input } from './Form';

export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`${value.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialCommunityIcons key={i} name={i <= Math.round(value) ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );
}

/** Rating summary, reviews list and "write a review" for a provider / business. */
export function ProviderReviews({ reference, rating, count, live }: { reference: string; rating: number; count: number; live: boolean }) {
  const { t } = useI18n();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getReviews(reference).then((r) => setReviews(r.reviews)).catch(() => {});
  }, [reference]);
  useEffect(load, [load]);

  async function submit() {
    if (!stars) return setError(t('reviews.rateRequired'));
    setBusy(true);
    setError('');
    try {
      await postReview({ reference, name, phone, rating: stars, comment });
      setDone(true);
      setOpen(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('post.errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginTop: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md }}>
      <AppText bold size={17}>
        {t('reviews.title')}
      </AppText>
      {count > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
          <AppText bold size={22}>
            {rating.toFixed(1)}
          </AppText>
          <StarRow value={rating} size={18} />
          <AppText size={13} color={colors.textMuted}>
            {t('reviews.basedOn').replace('{count}', String(count))}
          </AppText>
        </View>
      ) : (
        <AppText size={14} color={colors.textMuted}>
          {t('reviews.noReviews')}
        </AppText>
      )}

      {done && (
        <AppText color={colors.primaryDark} style={{ marginTop: spacing.sm }}>
          {t('reviews.thanks')}
        </AppText>
      )}

      {live && !done && !open && (
        <View style={{ marginTop: spacing.md }}>
          <Button label={t('reviews.writeReview')} kind="outline" onPress={() => setOpen(true)} />
        </View>
      )}

      {open && (
        <View style={{ marginTop: spacing.md }}>
          <AppText bold size={14}>
            {t('reviews.yourRating')}
          </AppText>
          <View style={{ flexDirection: 'row', marginVertical: spacing.sm }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable
                key={i}
                onPress={() => setStars(i)}
                accessibilityRole="button"
                accessibilityLabel={t('reviews.star').replace('{n}', String(i))}
                accessibilityState={{ selected: stars === i }}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name={i <= stars ? 'star' : 'star-outline'} size={32} color="#F59E0B" />
              </Pressable>
            ))}
          </View>
          <Input label={t('reviews.yourName')} value={name} onChangeText={setName} maxLength={60} />
          <Input label={t('reviews.yourPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="03001234567" ltr />
          <AppText size={12} color={colors.textMuted} style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}>
            {t('reviews.phonePrivate')}
          </AppText>
          <Input label={t('reviews.comment')} value={comment} onChangeText={setComment} multiline maxLength={1000} placeholder={t('reviews.commentHint')} />
          <ErrorText text={error} />
          <Button label={t('reviews.submit')} onPress={submit} disabled={busy} />
        </View>
      )}

      {reviews.map((r) => (
        <View key={r.id} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: spacing.sm, marginTop: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AppText bold size={14}>
              {r.name}
            </AppText>
            <StarRow value={r.rating} size={14} />
          </View>
          {r.comment ? <AppText size={14}>{r.comment}</AppText> : null}
          {r.reply ? (
            <View style={{ backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.xs }}>
              <AppText bold size={13}>
                {t('reviews.reply')}
              </AppText>
              <AppText size={13} color={colors.textMuted}>
                {r.reply}
              </AppText>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
