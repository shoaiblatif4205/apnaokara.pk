import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { logAdPosted } from '../../src/meta';
import { linkMyAds, registerPush } from '../../src/push';

const METHOD_LABEL: Record<PayMethod, string> = { jazzcash: 'JazzCash', easypaisa: 'Easypaisa', nayapay: 'NayaPay', bank: 'Bank transfer' };
type Named = { name_en: string; name_ur: string };
type SectionKey = 'category' | 'details' | 'photos' | 'contact' | 'plan';

// Which section each error belongs to (to scroll to the first mistake)
const ERROR_SECTION: Record<string, SectionKey> = {
  category: 'category',
  subcategory: 'category',
  title: 'details',
  price: 'details',
  city: 'details',
  photos: 'photos',
  sellerName: 'contact',
  phone: 'contact',
  whatsapp: 'contact',
  duration: 'plan',
  method: 'plan',
  screenshot: 'plan',
};
const SECTION_ORDER: SectionKey[] = ['category', 'details', 'photos', 'contact', 'plan'];

// One simple screen: category, details, photos, contact, plan + payment, one Submit button (same as the website).
export default function PostScreen() {
  const { t, locale, isUrdu } = useI18n();
  const n = (o: Named) => (isUrdu ? o.name_ur : o.name_en);

  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadError, setLoadError] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [negotiable, setNegotiable] = useState(false);
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
  const [screenshot, setScreenshot] = useState<LocalFile | null>(null);
  const [featured, setFeatured] = useState(false);
  const [boost, setBoost] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [promoError, setPromoError] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState('');
  const [reference, setReference] = useState('');
  const [manageKey, setManageKey] = useState('');
  const [referral, setReferral] = useState('');
  const [notify, setNotify] = useState<'idle' | 'on' | 'off'>('idle');
  // Which optional boxes are open (area, more details, contact options, codes)
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: !o[k] }));

  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<SectionKey, number>>>({});

  const load = useCallback(() => {
    setLoadError('');
    getMeta().then(setMeta).catch(() => setLoadError(t('post.errorGeneric')));
  }, [t]);
  useEffect(load, [load]);

  // Only one payment method on: pick it, so the person is not asked
  useEffect(() => {
    if (meta?.paymentMethods.length === 1) setMethod(meta.paymentMethods[0]);
  }, [meta]);

  const category = meta?.categories.find((c) => c.id === categoryId) ?? null;
  const city = meta?.cities.find((c) => c.id === cityId) ?? null;
  const free = category && meta ? isFreeNow(meta.freeMode, category.model, category.slug) : false;
  const provider = category ? isProviderModel(category.model) : false;
  const requiredFields = category ? category.fields.filter((f) => f.is_required && f.type !== 'boolean') : [];
  const optionalFields = category ? category.fields.filter((f) => !(f.is_required && f.type !== 'boolean')) : [];
  const durations = useMemo(() => {
    if (!category || !meta) return [];
    if (free) return [{ days: meta.freeMode?.days_by_model[category.model] ?? 30, price: 0 }];
    return durationsFor(category.model).map((d) => ({ days: d, price: priceFor(meta.pricing, category.model, category.id, d) }));
  }, [category, free, meta]);

  // Always have a plan picked (the cheapest)
  useEffect(() => {
    if (!durations.length) setDurationDays(null);
    else if (!durationDays || !durations.some((d) => d.days === durationDays)) setDurationDays(durations[0].days);
  }, [durations, durationDays]);

  // Exact total from the server (plan + add-ons - promo)
  useEffect(() => {
    if (!category || !durationDays) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    getQuote({ categoryId: category.id, days: durationDays, featured, boost, promoCode: promo, phone })
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch((e) => {
        // Keep the message on screen; the code is dropped and the price is asked again without it
        if (!cancelled && promo) {
          setPromoError(e instanceof Error ? e.message : '');
          setPromo('');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category, durationDays, featured, boost, promo, phone]);
  const needsPayment = quote ? quote.total > 0 : !free || featured || boost;

  function reset() {
    setCategoryId(null);
    setSubcategoryId(null);
    setTitle('');
    setDescription('');
    setPrice('');
    setNegotiable(false);
    setFields({});
    setPhotos([]);
    setDurationDays(null);
    setScreenshot(null);
    setFeatured(false);
    setBoost(false);
    setPromo('');
    setPromoInput('');
    setPromoError('');
    setQuote(null);
    setTried(false);
    setReference('');
    setNotify('idle');
  }

  function validate() {
    const e: Record<string, string> = {};
    const req = t('post.required');
    if (!category) e.category = req;
    else if (category.subcategories.length && !subcategoryId) e.subcategory = req;
    if (title.trim().length < 5) e.title = t('post.titleShort');
    if (price && !(Number(price) > 0)) e.price = req;
    if (!cityId) e.city = req;
    requiredFields.forEach((f) => {
      if (fields[f.key] === undefined || fields[f.key] === '') e[f.key] = req;
    });
    if (category && photos.length < minPhotos(category.model)) e.photos = t('post.photosRequired');
    if (sellerName.trim().length < 2) e.sellerName = req;
    if (!isValidPakMobile(phone)) e.phone = t('post.invalidPhone');
    if (whatsapp && !isValidPakMobile(whatsapp)) e.whatsapp = t('post.invalidPhone');
    if (category && !durationDays) e.duration = req;
    if (category && meta && needsPayment && meta.paymentMethods.length) {
      if (!method) e.method = req;
      if (!screenshot) e.screenshot = req;
    }
    return e;
  }
  // After the first Submit, messages update live as the person fixes each field
  const errors = tried ? validate() : {};

  async function submit() {
    const e = validate();
    setTried(true);
    if (Object.keys(e).length || !category) {
      const first = SECTION_ORDER.find((s) => Object.keys(e).some((k) => (ERROR_SECTION[k] ?? 'details') === s));
      const y = first ? sectionY.current[first] : undefined;
      if (y !== undefined) scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
      return;
    }
    setBusy(true);
    setServerError('');
    const hasPrice = Number(price) > 0;
    try {
      const res = await postListing(
        {
          categoryId: category.id,
          subcategoryId,
          title: title.trim(),
          description: description.trim(),
          priceType: hasPrice ? (negotiable ? 'negotiable' : 'fixed') : 'contact',
          price: hasPrice ? Number(price) : null,
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
          payment: needsPayment ? { method, paidFrom: '' } : null,
          agree: true,
          locale,
        },
        photos,
        needsPayment ? screenshot : null,
      );
      await saveAd({ reference: res.reference, phone, key: res.manageKey });
      logAdPosted(String(categoryId ?? ''));
      setManageKey(res.manageKey ?? '');
      setReference(res.reference);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('post.errorGeneric'));
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

  const optional = ` (${t('post.optional')})`;

  const section = ({ id, num, title: heading, children }: { id: SectionKey; num: number; title: string; children: ReactNode }) => (
    <View
      onLayout={(e) => {
        sectionY.current[id] = e.nativeEvent.layout.y;
      }}
      style={{ paddingBottom: spacing.lg, marginBottom: spacing.lg, borderBottomWidth: id === 'plan' ? 0 : 1, borderBottomColor: colors.border }}
    >
      <View style={{ flexDirection: row, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <AppText bold size={14} color="#FFFFFF">{String(num)}</AppText>
        </View>
        <AppText bold size={18}>{heading}</AppText>
      </View>
      {children}
    </View>
  );

  // Closed box for optional things, opened with one tap
  const fold = ({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) => (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md }}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: row, alignItems: 'center', gap: 6, minHeight: 32 }}>
        <MaterialCommunityIcons name={open ? 'chevron-down' : isUrdu ? 'chevron-left' : 'chevron-right'} size={20} color={colors.primary} />
        <AppText bold size={14} color={colors.primary} style={{ flex: 1 }}>
          {label}
        </AppText>
      </Pressable>
      {open && <View style={{ marginTop: spacing.md }}>{children}</View>}
    </View>
  );

  const fieldInput = (f: (typeof optionalFields)[number]) => {
    const fl = isUrdu ? f.label_ur : f.label_en;
    const unit = isUrdu ? f.unit_ur : f.unit_en;
    const full = `${fl}${unit ? ` (${unit})` : ''}`;
    if (f.type === 'boolean') {
      return (
        <View key={f.key} style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <AppText bold size={14}>{fl}</AppText>
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
  };

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t('post.title')} />
          <ScrollView ref={scrollRef} contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            <AppText size={13} color={colors.textMuted} style={{ marginBottom: spacing.lg }}>
              {t('post.onePageHint')}
            </AppText>

            {/* ---------- 1. category ---------- */}
            {section({ id: 'category', num: 1, title: t('post.stepCategory'), children: (<>
              {models.map((m) => {
                const cats = meta.categories.filter((c) => c.model === m.key);
                if (!cats.length) return null;
                return (
                  <View key={m.key} style={{ marginBottom: spacing.sm }}>
                    <AppText size={12} color={colors.textMuted}>{m.name[locale]}</AppText>
                    <ChipRow>
                      {cats.map((c) => (
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
                  </View>
                );
              })}
              <ErrorText text={errors.category} />
              {category && category.subcategories.length > 0 && (
                <View style={{ marginTop: spacing.md }}>
                  <Label>{t('post.chooseSubcategory')}</Label>
                  <ChipRow>
                    {category.subcategories.map((s) => (
                      <Chip key={s.id} label={n(s)} active={subcategoryId === s.id} onPress={() => setSubcategoryId(s.id)} />
                    ))}
                  </ChipRow>
                  <ErrorText text={errors.subcategory} />
                </View>
              )}
            </>) })}

            {/* ---------- 2. details ---------- */}
            {section({ id: 'details', num: 2, title: t('post.stepDetails'), children: (<>
              <Input label={t('post.adTitle')} value={title} onChangeText={setTitle} maxLength={120} placeholder={t('post.adTitleHint')} error={errors.title} />
              <Input label={t('post.price') + optional} value={price} onChangeText={setPrice} keyboardType="number-pad" ltr placeholder={t('post.priceEmptyHint')} error={errors.price} />
              {!!price && (
                <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: -spacing.sm, marginBottom: spacing.md }}>
                  <AppText size={14}>{t('post.priceNegotiable')}</AppText>
                  <Switch value={negotiable} onValueChange={setNegotiable} accessibilityLabel={t('post.priceNegotiable')} />
                </View>
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
                <View style={{ marginTop: spacing.md }}>
                  {fold({ label: t('post.locality') + optional, open: open.area, onToggle: () => toggle('area'), children: (<>
                    <ChipRow>
                      {city.localities.map((l) => (
                        <Chip key={l.id} label={n(l)} active={localityId === l.id} onPress={() => setLocalityId(localityId === l.id ? null : l.id)} />
                      ))}
                    </ChipRow>
                  </>) })}
                </View>
              )}
              <View style={{ height: spacing.md }} />
              {requiredFields.map(fieldInput)}
              <Input label={t('post.description') + optional} value={description} onChangeText={setDescription} multiline maxLength={5000} placeholder={t('post.descriptionHint')} />
              {optionalFields.length > 0 &&
                fold({ label: t('post.moreDetailsOptional'), open: open.more, onToggle: () => toggle('more'), children: <>{optionalFields.map(fieldInput)}</> })}
            </>) })}

            {/* ---------- 3. photos ---------- */}
            {section({ id: 'photos', num: 3, title: t('post.stepPhotos'), children: (<>
              <AppText color={colors.textMuted}>{t('post.photosHint')}</AppText>
              <View style={{ flexDirection: row, flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
                {photos.map((p, i) => (
                  <View key={p.uri} style={{ width: 96, height: 96 }}>
                    <Image source={{ uri: p.uri }} style={{ width: 96, height: 96, borderRadius: radius.sm }} accessibilityIgnoresInvertColors />
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
            </>) })}

            {/* ---------- 4. contact ---------- */}
            {section({ id: 'contact', num: 4, title: t('post.stepContact'), children: (<>
              <Input label={t('post.yourName')} value={sellerName} onChangeText={setSellerName} autoComplete="name" error={errors.sellerName} />
              <Input label={t('post.phoneWhatsapp')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="03001234567" ltr error={errors.phone} />
              {fold({ label: t('post.moreContactOptions'), open: open.contact || !!errors.whatsapp, onToggle: () => toggle('contact'), children: (<>
                <Input label={t('post.whatsapp')} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholder={t('post.whatsappHint')} ltr error={errors.whatsapp} />
                <View style={{ flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }}>
                  <AppText size={14} style={{ flex: 1 }}>{t('post.showPhone')}</AppText>
                  <Switch value={showPhone} onValueChange={setShowPhone} accessibilityLabel={t('post.showPhone')} />
                </View>
              </>) })}
            </>) })}

            {/* ---------- 5. plan + payment ---------- */}
            {section({ id: 'plan', num: 5, title: t('post.stepPlan'), children: (<>
              {!category ? (
                <AppText color={colors.textMuted}>{t('post.chooseCategoryFirst')}</AppText>
              ) : (
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
                        label={provider ? t('post.twoMonths') : `${d.days} ${t('post.days')}`}
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
                            <Switch value={on} onValueChange={(v) => (a.key === 'featured' ? setFeatured(v) : setBoost(v))} accessibilityLabel={isUrdu ? a.name_ur : a.name_en} />
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={{ height: spacing.sm }} />
                  {fold({ label: t('post.haveCode'), open: open.code || !!promoError, onToggle: () => toggle('code'), children: (<>
                    {(needsPayment || promo) && (
                      <View style={{ flexDirection: row, alignItems: 'flex-end', gap: spacing.sm }}>
                        <View style={{ flex: 1 }}>
                          <Input
                            label={t('post.promoCode')}
                            value={promoInput}
                            onChangeText={(v) => {
                              setPromoInput(v.toUpperCase());
                              setPromoError('');
                            }}
                            autoCapitalize="characters"
                            ltr
                            error={promoError}
                          />
                        </View>
                        <View style={{ marginBottom: promoError ? spacing.xl : spacing.md }}>
                          <Button
                            label={t('post.apply')}
                            kind="outline"
                            onPress={() => {
                              setPromoError('');
                              setPromo(promoInput.trim());
                            }}
                          />
                        </View>
                      </View>
                    )}
                    {!!promo && !promoError && !!quote && quote.discount > 0 && <AppText color={colors.primaryDark} style={{ marginBottom: spacing.sm }}>{t('post.promoApplied')}</AppText>}
                    <Input
                      label={t('post.referralCode')}
                      value={referral}
                      onChangeText={(v) => setReferral(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                      autoCapitalize="characters"
                      ltr
                      placeholder={t('post.referralHint')}
                    />
                  </>) })}

                  {needsPayment && (
                    <View style={{ marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                      <AppText bold size={17}>{t('post.payTitle')}</AppText>
                      {quote && (
                        <View style={{ marginTop: spacing.sm }}>
                          {quote.discount > 0 && <AppText color={colors.primaryDark}>{`${t('post.discount')}: -${formatPrice(quote.discount, locale)}`}</AppText>}
                          <AppText bold size={18}>{`${t('post.total')}: ${formatPrice(quote.total, locale)}`}</AppText>
                        </View>
                      )}
                      {meta.paymentMethods.length === 0 ? (
                        <AppText color={colors.danger}>{t('post.noAccounts')}</AppText>
                      ) : (
                        <>
                          <AppText size={13} color={colors.textMuted} style={{ marginVertical: spacing.sm }}>
                            {t('post.payInstructions')}
                          </AppText>
                          {meta.paymentMethods.map((m) => {
                            const acc = meta.paymentAccounts[m] ?? {};
                            const lines = Object.entries(acc)
                              .filter(([k, v]) => k !== 'enabled' && typeof v === 'string' && v)
                              .map(([, v]) => v);
                            return (
                              <AppText key={m} size={14} align="left" style={{ marginBottom: 4 }}>
                                {`${METHOD_LABEL[m]}: ${lines.join(' · ')}`}
                              </AppText>
                            );
                          })}
                          {meta.paymentMethods.length > 1 && (
                            <View style={{ marginTop: spacing.md }}>
                              <Label>{t('post.payMethod')}</Label>
                              <ChipRow>
                                {meta.paymentMethods.map((m) => (
                                  <Chip key={m} label={METHOD_LABEL[m]} active={method === m} onPress={() => setMethod(m)} />
                                ))}
                              </ChipRow>
                              <ErrorText text={errors.method} />
                            </View>
                          )}
                          <View style={{ height: spacing.md }} />
                          <Label>{t('post.screenshot')}</Label>
                          {screenshot && <Image source={{ uri: screenshot.uri }} style={{ width: 120, height: 200, borderRadius: radius.sm, marginBottom: spacing.sm }} />}
                          <Button label={t('post.screenshot')} kind="outline" onPress={async () => setScreenshot((await pickPhotos(1))[0] ?? screenshot)} />
                          <ErrorText text={errors.screenshot} />
                        </>
                      )}
                    </View>
                  )}
                </>
              )}
            </>) })}

            {Object.keys(errors).length > 0 && (
              <AppText color={colors.danger} style={{ marginBottom: spacing.sm }} accessibilityRole="alert">
                {t('post.fixErrors')}
              </AppText>
            )}
            {serverError ? (
              <AppText color={colors.danger} style={{ marginBottom: spacing.sm }} accessibilityRole="alert">
                {serverError}
              </AppText>
            ) : null}
            <AppText size={12} color={colors.textMuted}>
              {`${t('post.agreeNote')} ${t('post.terms')} · ${t('post.rules')}`}
            </AppText>
          </ScrollView>

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button label={busy ? t('post.submitting') : t('post.submit')} kind="accent" onPress={submit} disabled={busy} />
      </View>
    </View>
  );
}
