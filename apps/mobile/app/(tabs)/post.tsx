import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, ScrollView, Switch, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  durationsFor,
  formatPrice,
  isFreeNow,
  isProviderModel,
  isValidPakMobile,
  MAX_PHOTOS,
  minPhotos,
  models,
  priceFor,
} from '@apna-okara/shared';
import { useI18n } from '../../src/i18n';
import { colors, radius, spacing } from '../../src/theme';
import { AppText } from '../../src/components/AppText';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Button, Chip, ChipRow, ErrorText, Input, Label } from '../../src/components/Form';
import { getMeta, getQuote, postListing, type LocalFile, type Meta, type PayMethod, type Quote } from '../../src/api';
import { pickPhotos, takePhoto } from '../../src/photos';
import { saveAd } from '../../src/savedAds';
import { linkMyAds, registerPush } from '../../src/push';

const STEPS = ['post.stepCategory', 'post.stepDetails', 'post.stepPhotos', 'post.stepContact', 'post.stepPlan'];
const METHOD_LABEL: Record<PayMethod, string> = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank transfer' };
type Named = { name_en: string; name_ur: string };

export default function PostScreen() {
  const { t, locale, isUrdu } = useI18n();
  const n = (o: Named) => (isUrdu ? o.name_ur : o.name_en);

  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState(0);
  const [model, setModel] = useState('buy_sell');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState<'fixed' | 'negotiable' | 'contact' | 'free'>('fixed');
  const [price, setPrice] = useState('');
  const [cityId, setCityId] = useState<number | null>(null);
  const [localityId, setLocalityId] = useState<number | null>(null);
  const [fields, setFields] = useState<Record<string, string | boolean>>({});
  const [photos, setPhotos] = useState<LocalFile[]>([]);
  const [sellerName, setSellerName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [durationDays, setDurationDays] = useState<number | null>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [paidFrom, setPaidFrom] = useState('');
  const [screenshot, setScreenshot] = useState<LocalFile | null>(null);
  const [agree, setAgree] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [boost, setBoost] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [promoError, setPromoError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [reference, setReference] = useState('');
  const [manageKey, setManageKey] = useState('');
  const [referral, setReferral] = useState('');
  const [notify, setNotify] = useState<'idle' | 'on' | 'off'>('idle');

  const load = useCallback(() => {
    setLoadError('');
    getMeta().then(setMeta).catch(() => setLoadError(t('post.errorGeneric')));
  }, [t]);
  useEffect(load, [load]);

  const category = meta?.categories.find((c) => c.id === categoryId) ?? null;
  const city = meta?.cities.find((c) => c.id === cityId) ?? null;
  const free = category && meta ? isFreeNow(meta.freeMode, category.model, category.slug) : false;
  const durations = useMemo(() => {
    if (!category || !meta) return [];
    if (free) return [{ days: meta.freeMode?.days_by_model[category.model] ?? 30, price: 0 }];
    return durationsFor(category.model).map((d) => ({ days: d, price: priceFor(meta.pricing, category.model, category.id, d) }));
  }, [category, free, meta]);
  useEffect(() => {
    if (durations.length === 1) setDurationDays(durations[0].days);
  }, [durations]);

  // Exact total from the server (plan + add-ons - promo)
  useEffect(() => {
    if (step !== 4 || !category || !durationDays) return;
    let cancelled = false;
    getQuote({ categoryId: category.id, days: durationDays, featured, boost, promoCode: promo, phone })
      .then((q) => {
        if (!cancelled) {
          setQuote(q);
          setPromoError('');
        }
      })
      .catch((e) => {
        if (!cancelled && promo) {
          setPromoError(e instanceof Error ? e.message : '');
          setPromo('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [step, category, durationDays, featured, boost, promo, phone]);
  const needsPayment = quote ? quote.total > 0 : !free || featured || boost;

  function reset() {
    setStep(0);
    setCategoryId(null);
    setSubcategoryId(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setFields({});
    setPhotos([]);
    setDurationDays(null);
    setScreenshot(null);
    setAgree(false);
    setFeatured(false);
    setBoost(false);
    setPromo('');
    setPromoInput('');
    setQuote(null);
    setReference('');
    setNotify('idle');
  }

  function validate(s: number) {
    const e: Record<string, string> = {};
    const req = t('post.required');
    if (s === 0) {
      if (!category) e.category = req;
      else if (category.subcategories.length && !subcategoryId) e.subcategory = req;
    }
    if (s === 1 && category) {
      if (title.trim().length < 5) e.title = req;
      if ((priceType === 'fixed' || priceType === 'negotiable') && !(Number(price) > 0)) e.price = req;
      if (!cityId) e.city = req;
      category.fields.forEach((f) => {
        if (f.is_required && f.type !== 'boolean' && (fields[f.key] === undefined || fields[f.key] === '')) e[f.key] = req;
      });
    }
    if (s === 2 && category && photos.length < minPhotos(category.model)) e.photos = t('post.photosRequired');
    if (s === 3) {
      if (sellerName.trim().length < 2) e.sellerName = req;
      if (!isValidPakMobile(phone)) e.phone = t('post.invalidPhone');
      if (whatsapp && !isValidPakMobile(whatsapp)) e.whatsapp = t('post.invalidPhone');
    }
    if (s === 4) {
      if (!durationDays) e.duration = req;
      if (needsPayment) {
        if (!method) e.method = req;
        if (!screenshot) e.screenshot = req;
      }
      if (!agree) e.agree = req;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate(4) || !category) return;
    setBusy(true);
    setServerError('');
    try {
      const res = await postListing(
        {
          categoryId: category.id,
          subcategoryId,
          title: title.trim(),
          description: description.trim(),
          priceType,
          price: priceType === 'fixed' || priceType === 'negotiable' ? Number(price) : null,
          cityId,
          localityId,
          fields,
          sellerName: sellerName.trim(),
          phone,
          whatsapp,
          showPhone,
          durationDays,
          featured,
          boost,
          promoCode: promo,
          referralCode: referral,
          payment: needsPayment ? { method, paidFrom: paidFrom.trim() } : null,
          agree: true,
          locale,
        },
        photos,
        needsPayment ? screenshot : null,
      );
      await saveAd({ reference: res.reference, phone, key: res.manageKey });
      setManageKey(res.manageKey ?? '');
      setReference(res.reference);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : t('post.errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  const row = isUrdu ? 'row-reverse' : 'row';

  if (!meta) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={t('post.title')} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          {loadError ? (
            <>
              <AppText align="center">{loadError}</AppText>
              <View style={{ marginTop: spacing.md }}>
                <Button label={t('post.next')} onPress={load} />
              </View>
            </>
          ) : (
            <ActivityIndicator color={colors.primary} size="large" />
          )}
        </View>
      </View>
    );
  }

  if (reference) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={t('post.title')} />
        <ScrollView contentContainerStyle={{ padding: spacing.xl, alignItems: 'center' }}>
          <MaterialCommunityIcons name="check-circle" size={64} color={colors.primary} />
          <AppText bold size={22} align="center" style={{ marginTop: spacing.md }}>
            {t('post.successTitle')}
          </AppText>
          <AppText align="center" color={colors.textMuted} style={{ marginTop: spacing.sm }}>
            {t('post.successText')}
          </AppText>
          <AppText size={13} color={colors.textMuted} style={{ marginTop: spacing.xl }}>
            {t('post.reference')}
          </AppText>
          <AppText bold size={30} color={colors.primary} align="center">
            {reference}
          </AppText>
          {!!manageKey && (
            <View style={{ marginTop: spacing.lg, alignSelf: 'stretch', backgroundColor: '#FFFBEB', borderColor: '#FDE68A', borderWidth: 1, borderRadius: radius.md, padding: spacing.md }}>
              <AppText bold size={13} color="#78350F">{t('post.manageKey')}</AppText>
              <AppText bold size={24} align="center" style={{ letterSpacing: 6, marginVertical: 4 }}>{manageKey}</AppText>
              <AppText size={12} color="#78350F">{t('post.manageKeyText')}</AppText>
            </View>
          )}
          <View style={{ gap: spacing.sm, marginTop: spacing.xl, alignSelf: 'stretch' }}>
            <Button
              label={t('post.shareRef')}
              onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`Apna Okara: ${t('post.reference')} ${reference}${manageKey ? `
${t('post.manageKey')}: ${manageKey} (${t('post.keepPrivate')})` : ''}`)}`)}
            />
            {notify === 'on' ? (
              <AppText align="center" color={colors.primaryDark}>{t('push.on')}</AppText>
            ) : (
              <Button
                label={t('push.notifyMe')}
                kind="outline"
                onPress={async () => {
                  const ok = await registerPush(locale, true).catch(() => null);
                  if (ok) await linkMyAds().catch(() => {});
                  setNotify(ok ? 'on' : 'off');
                }}
              />
            )}
            {notify === 'off' && <AppText size={13} align="center" color={colors.textMuted}>{t('push.notAvailable')}</AppText>}
            <Button label={t('post.postAnother')} kind="outline" onPress={reset} />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t('post.title')} />
      <View style={{ flexDirection: row, paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 4 }}>
        {STEPS.map((k, i) => (
          <View key={k} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? colors.primary : colors.border }} />
        ))}
      </View>
      <AppText bold size={13} color={colors.textMuted} style={{ paddingHorizontal: spacing.lg, marginTop: 4 }}>
        {`${step + 1} / 5 · ${t(STEPS[step])}`}
      </AppText>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <Label>{t('post.chooseType')}</Label>
            <ChipRow>
              {models.map((m) => (
                <Chip
                  key={m.key}
                  label={m.name[locale]}
                  active={model === m.key}
                  onPress={() => {
                    setModel(m.key);
                    setCategoryId(null);
                    setSubcategoryId(null);
                  }}
                />
              ))}
            </ChipRow>
            <View style={{ height: spacing.lg }} />
            <Label>{t('post.chooseCategory')}</Label>
            <ChipRow>
              {meta.categories
                .filter((c) => c.model === model)
                .map((c) => (
                  <Chip
                    key={c.id}
                    label={n(c)}
                    active={categoryId === c.id}
                    onPress={() => {
                      setCategoryId(c.id);
                      setSubcategoryId(null);
                      setFields({});
                    }}
                  />
                ))}
            </ChipRow>
            <ErrorText text={errors.category} />
            {category && category.subcategories.length > 0 && (
              <>
                <View style={{ height: spacing.lg }} />
                <Label>{t('post.chooseSubcategory')}</Label>
                <ChipRow>
                  {category.subcategories.map((s) => (
                    <Chip key={s.id} label={n(s)} active={subcategoryId === s.id} onPress={() => setSubcategoryId(s.id)} />
                  ))}
                </ChipRow>
                <ErrorText text={errors.subcategory} />
              </>
            )}
          </>
        )}

        {step === 1 && category && (
          <>
            <Input label={t('post.adTitle')} value={title} onChangeText={setTitle} maxLength={120} placeholder={t('post.adTitleHint')} error={errors.title} />
            <Input label={t('post.description')} value={description} onChangeText={setDescription} multiline maxLength={5000} placeholder={t('post.descriptionHint')} />
            {category.fields.map((f) => {
              const fl = isUrdu ? f.label_ur : f.label_en;
              const unit = isUrdu ? f.unit_ur : f.unit_en;
              const full = `${fl}${unit ? ` (${unit})` : ''}${f.is_required ? ' *' : ''}`;
              if (f.type === 'boolean') {
                return (
                  <View key={f.key} style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                    <AppText bold size={14}>
                      {fl}
                    </AppText>
                    <Switch value={fields[f.key] === true} onValueChange={(v) => setFields({ ...fields, [f.key]: v })} accessibilityLabel={fl} />
                  </View>
                );
              }
              if (f.type === 'select') {
                return (
                  <View key={f.key} style={{ marginBottom: spacing.md }}>
                    <Label>{full}</Label>
                    <ChipRow>
                      {f.options?.map((o) => (
                        <Chip key={o.en} label={isUrdu ? o.ur : o.en} active={fields[f.key] === o.en} onPress={() => setFields({ ...fields, [f.key]: o.en })} />
                      ))}
                    </ChipRow>
                    <ErrorText text={errors[f.key]} />
                  </View>
                );
              }
              return (
                <Input
                  key={f.key}
                  label={full}
                  value={String(fields[f.key] ?? '')}
                  onChangeText={(v) => setFields({ ...fields, [f.key]: v })}
                  keyboardType={f.type === 'text' ? 'default' : 'number-pad'}
                  error={errors[f.key]}
                />
              );
            })}
            <Label>{t('post.priceType')}</Label>
            <ChipRow>
              {(['fixed', 'negotiable', 'contact', ...(isProviderModel(category.model) ? [] : ['free'])] as const).map((p) => (
                <Chip
                  key={p}
                  label={t(`post.price${p.charAt(0).toUpperCase()}${p.slice(1)}`)}
                  active={priceType === p}
                  onPress={() => setPriceType(p as typeof priceType)}
                />
              ))}
            </ChipRow>
            <View style={{ height: spacing.md }} />
            {(priceType === 'fixed' || priceType === 'negotiable') && (
              <Input label={t('post.price')} value={price} onChangeText={setPrice} keyboardType="number-pad" ltr error={errors.price} />
            )}
            <Label>{t('post.city')}</Label>
            <ChipRow>
              {meta.cities.map((c) => (
                <Chip
                  key={c.id}
                  label={n(c)}
                  active={cityId === c.id}
                  onPress={() => {
                    setCityId(c.id);
                    setLocalityId(null);
                  }}
                />
              ))}
            </ChipRow>
            <ErrorText text={errors.city} />
            {city && city.localities.length > 0 && (
              <>
                <View style={{ height: spacing.md }} />
                <Label>{t('post.locality')}</Label>
                <ChipRow>
                  {city.localities.map((l) => (
                    <Chip key={l.id} label={n(l)} active={localityId === l.id} onPress={() => setLocalityId(l.id)} />
                  ))}
                </ChipRow>
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <AppText color={colors.textMuted}>{t('post.photosHint')}</AppText>
            <View style={{ flexDirection: row, flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
              {photos.map((p, i) => (
                <View key={p.uri} style={{ width: 100, height: 100 }}>
                  <Image source={{ uri: p.uri }} style={{ width: 100, height: 100, borderRadius: radius.sm }} accessibilityIgnoresInvertColors />
                  <Pressable
                    onPress={() => setPhotos(photos.filter((_, j) => j !== i))}
                    accessibilityRole="button"
                    accessibilityLabel={t('post.removePhoto')}
                    style={{ position: 'absolute', top: 4, right: 4, width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MaterialCommunityIcons name="close" size={20} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
            <AppText size={13} color={colors.textMuted} style={{ marginTop: spacing.sm }}>
              {`${photos.length} / ${MAX_PHOTOS}`}
            </AppText>
            <ErrorText text={errors.photos} />
            {photos.length < MAX_PHOTOS && (
              <View style={{ flexDirection: row, gap: spacing.sm, marginTop: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Button label={t('post.addPhotos')} onPress={async () => setPhotos([...photos, ...(await pickPhotos(MAX_PHOTOS - photos.length))])} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={t('post.takePhoto')}
                    kind="outline"
                    onPress={async () => {
                      const p = await takePhoto();
                      if (p) setPhotos([...photos, p]);
                    }}
                  />
                </View>
              </View>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <Input label={t('post.yourName')} value={sellerName} onChangeText={setSellerName} autoComplete="name" error={errors.sellerName} />
            <Input label={t('post.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="03001234567" ltr error={errors.phone} />
            <Input label={t('post.whatsapp')} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder={t('post.whatsappHint')} ltr error={errors.whatsapp} />
            <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText size={14} style={{ flex: 1 }}>
                {t('post.showPhone')}
              </AppText>
              <Switch value={showPhone} onValueChange={setShowPhone} accessibilityLabel={t('post.showPhone')} />
            </View>
          </>
        )}

        {step === 4 && category && (
          <>
            <Label>{t('post.duration')}</Label>
            {free && (
              <AppText bold color={colors.primaryDark} style={{ marginBottom: spacing.sm }}>
                {t('post.freeNow')}
              </AppText>
            )}
            <ChipRow>
              {durations.map((d) => (
                <Chip
                  key={d.days}
                  label={isProviderModel(category.model) ? t('post.twoMonths') : `${d.days} ${t('post.days')}`}
                  sub={free ? t('post.priceFree') : d.price !== null ? formatPrice(d.price, locale) : '-'}
                  active={durationDays === d.days}
                  onPress={() => setDurationDays(d.days)}
                />
              ))}
            </ChipRow>
            <ErrorText text={errors.duration} />

            {meta.addons.length > 0 && (
              <View style={{ marginTop: spacing.lg }}>
                <Label>{t('post.addonsTitle')}</Label>
                {meta.addons.map((a) => {
                  const on = a.key === 'featured' ? featured : boost;
                  return (
                    <View key={a.key} style={{ flexDirection: row, alignItems: 'center', gap: spacing.sm, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentLight : colors.surface }}>
                      <View style={{ flex: 1 }}>
                        <AppText bold size={14}>{`${isUrdu ? a.name_ur : a.name_en} · +${formatPrice(a.price, locale)}`}</AppText>
                        <AppText size={12} color={colors.textMuted}>
                          {a.key === 'featured' ? t('post.featuredInfo') : t('post.boostInfo')}
                        </AppText>
                      </View>
                      <Switch
                        value={on}
                        onValueChange={(v) => (a.key === 'featured' ? setFeatured(v) : setBoost(v))}
                        accessibilityLabel={isUrdu ? a.name_ur : a.name_en}
                      />
                    </View>
                  );
                })}
              </View>
            )}

            <Input
              label={t('post.referralCode')}
              value={referral}
              onChangeText={(v) => setReferral(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
              autoCapitalize="characters"
              ltr
              placeholder={t('post.referralHint')}
            />

            {(needsPayment || promo) && (
              <View style={{ flexDirection: row, alignItems: 'flex-end', gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Input label={t('post.promoCode')} value={promoInput} onChangeText={(v) => setPromoInput(v.toUpperCase())} autoCapitalize="characters" ltr error={promoError} />
                </View>
                <View style={{ marginBottom: spacing.md }}>
                  <Button label={t('post.apply')} kind="outline" onPress={() => setPromo(promoInput.trim())} />
                </View>
              </View>
            )}

            {quote && needsPayment && (
              <View style={{ marginTop: spacing.sm }}>
                {quote.discount > 0 && (
                  <AppText color={colors.primaryDark}>{`${t('post.discount')}: -${formatPrice(quote.discount, locale)}`}</AppText>
                )}
                <AppText bold size={18}>{`${t('post.total')}: ${formatPrice(quote.total, locale)}`}</AppText>
              </View>
            )}

            {needsPayment && (
              <View style={{ marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                <AppText bold size={17}>
                  {t('post.payTitle')}
                </AppText>
                {meta.paymentMethods.length === 0 ? (
                  <AppText color={colors.danger}>{t('post.noAccounts')}</AppText>
                ) : (
                  <>
                    <AppText size={13} color={colors.textMuted} style={{ marginVertical: spacing.sm }}>
                      {t('post.payInstructions')}
                    </AppText>
                    {meta.paymentMethods.map((m) => {
                      const acc = meta.paymentAccounts[m] ?? {};
                      return (
                        <AppText key={m} size={14} align="left" style={{ marginBottom: 4 }}>
                          {`${METHOD_LABEL[m]}: ${Object.values(acc).filter(Boolean).join(' · ')}`}
                        </AppText>
                      );
                    })}
                    <View style={{ height: spacing.md }} />
                    <Label>{t('post.payMethod')}</Label>
                    <ChipRow>
                      {meta.paymentMethods.map((m) => (
                        <Chip key={m} label={METHOD_LABEL[m]} active={method === m} onPress={() => setMethod(m)} />
                      ))}
                    </ChipRow>
                    <ErrorText text={errors.method} />
                    <View style={{ height: spacing.md }} />
                    <Input label={t('post.paidFrom')} value={paidFrom} onChangeText={setPaidFrom} />
                    <Label>{t('post.screenshot')}</Label>
                    {screenshot && <Image source={{ uri: screenshot.uri }} style={{ width: 120, height: 200, borderRadius: radius.sm, marginBottom: spacing.sm }} />}
                    <Button label={t('post.screenshot')} kind="outline" onPress={async () => setScreenshot((await pickPhotos(1))[0] ?? screenshot)} />
                    <ErrorText text={errors.screenshot} />
                  </>
                )}
              </View>
            )}

            <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg }}>
              <AppText size={14} style={{ flex: 1 }}>
                {t('post.agree')}
              </AppText>
              <Switch value={agree} onValueChange={setAgree} accessibilityLabel={t('post.agree')} />
            </View>
            <ErrorText text={errors.agree} />
            {serverError ? (
              <AppText color={colors.danger} style={{ marginTop: spacing.md }} accessibilityRole="alert">
                {serverError}
              </AppText>
            ) : null}
          </>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          flexDirection: row,
          gap: spacing.sm,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Button label={t('post.back')} kind="outline" onPress={() => setStep(step - 1)} />
          </View>
        )}
        <View style={{ flex: 2 }}>
          {step < 4 ? (
            <Button label={t('post.next')} onPress={() => validate(step) && setStep(step + 1)} />
          ) : (
            <Button label={busy ? t('post.submitting') : t('post.submit')} kind="accent" onPress={submit} disabled={busy} />
          )}
        </View>
      </View>
    </View>
  );
}
