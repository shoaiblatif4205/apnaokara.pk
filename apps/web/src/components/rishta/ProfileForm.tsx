'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { formatPrice, RISHTA_OPTIONS, type Option } from '@apna-okara/shared';
import type { PaymentAccounts } from '@/lib/meta';
import { appendPay, PaymentFields, payValid, type Method, type PayState } from './PaymentFields';

type City = { id: number; name: string; localities: { id: number; name: string }[] };
type Plan = { price: number; days: number; premium_price: number | null };

const EMPTY = {
  createdBy: 'parent', fullName: '', gender: 'male', dateOfBirth: '', heightCm: '', complexion: '', maritalStatus: 'never_married', children: '0',
  religion: 'islam', sect: '', caste: '', education: '', profession: '', incomeRange: '', nativeCityId: '', nativeLocalityId: '', currentCity: '',
  currentCountry: 'Pakistan', houseType: '', fatherProfession: '', motherProfession: '', brothers: '', sisters: '', marriedSiblings: '', familyType: '',
  about: '', ageMin: '', ageMax: '', lookNotes: '', guardianName: '', guardianPhone: '',
};
type F = typeof EMPTY;

function Field({ id, label, children, wide }: { id: string; label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'md:col-span-2' : ''}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="card p-4 md:p-5">
      <legend className="px-1 text-lg font-bold">{title}</legend>
      <div className="mt-2 grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function ProfileForm({
  locale,
  cities,
  profileId,
  plan,
  freeMode,
  methods,
  accounts,
}: {
  locale: 'en' | 'ur';
  cities: City[];
  profileId?: string;
  plan: Plan;
  freeMode: boolean;
  methods: Method[];
  accounts: PaymentAccounts;
}) {
  const t = useTranslations('rishta');
  const tf = useTranslations('rishta.form');
  const tp = useTranslations('post');
  const [f, setF] = useState<F>(EMPTY);
  const [loaded, setLoaded] = useState(!profileId);
  const [photos, setPhotos] = useState<{ id: number; is_approved: boolean }[]>([]);
  const [agree, setAgree] = useState(false);
  const [premium, setPremium] = useState(false);
  const [pay, setPay] = useState<PayState>({ method: '', tid: '', paidFrom: '', shot: null });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');

  const loadOwn = async () => {
    if (!profileId) return;
    const r = await fetch(`/api/rishta/profiles/${profileId}`);
    if (!r.ok) return setError((await r.json()).message);
    const { profile: p, photos: ph } = await r.json();
    const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
    setF({
      createdBy: s(p.created_by), fullName: s(p.full_name), gender: s(p.gender), dateOfBirth: s(p.date_of_birth), heightCm: s(p.height_cm), complexion: s(p.complexion),
      maritalStatus: s(p.marital_status), children: s(p.children), religion: s(p.religion), sect: s(p.sect), caste: s(p.caste), education: s(p.education),
      profession: s(p.profession), incomeRange: s(p.income_range), nativeCityId: s(p.native_city_id), nativeLocalityId: s(p.native_locality_id),
      currentCity: s(p.current_city), currentCountry: s(p.current_country), houseType: s(p.house_type), fatherProfession: s(p.father_profession),
      motherProfession: s(p.mother_profession), brothers: s(p.brothers), sisters: s(p.sisters), marriedSiblings: s(p.married_siblings), familyType: s(p.family_type),
      about: s(p.about), ageMin: s(p.looking_for?.ageMin), ageMax: s(p.looking_for?.ageMax), lookNotes: s(p.looking_for?.notes),
      guardianName: s(p.guardian_name), guardianPhone: s(p.guardian_phone),
    });
    setPhotos(ph);
    setAgree(true);
    setLoaded(true);
  };
  useEffect(() => {
    void loadOwn();
  }, [profileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof F) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const input = 'block min-h-[44px] w-full rounded-lg border border-line bg-white px-3 py-2';
  const city = cities.find((c) => String(c.id) === f.nativeCityId);
  const num = (v: string) => (v === '' ? null : Number(v));
  const total = (freeMode ? 0 : plan.price) + (premium && plan.premium_price ? plan.premium_price : 0);

  // A plain function (not a component) so inputs keep focus while typing
  const sel = (id: string, k: keyof F, options: readonly Option[], optional: boolean) => (
    <select id={id} value={f[k]} onChange={set(k)} className={input} required={!optional}>
      <option value="">{tp('select')}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label[locale]}
        </option>
      ))}
    </select>
  );

  if (reference) {
    return (
      <div className="card p-6 text-center">
        <p className="text-3xl font-extrabold text-pink-700" dir="ltr">
          {reference}
        </p>
        <p className="mt-2">{tf('created')}</p>
        <a href={`/${locale}/rishta/me`} className="btn mt-4 bg-pink-700 text-white">
          {t('myProfiles')}
        </a>
      </div>
    );
  }
  if (!loaded) return <p className="text-ink-muted">…</p>;

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        setNotice('');
        if (!agree) return setError(tp('required'));
        const data = {
          createdBy: f.createdBy, fullName: f.fullName, gender: f.gender, dateOfBirth: f.dateOfBirth, heightCm: num(f.heightCm), complexion: f.complexion || null,
          maritalStatus: f.maritalStatus, children: Number(f.children || 0), religion: f.religion || 'islam', sect: f.sect || null, caste: f.caste,
          education: f.education, profession: f.profession, incomeRange: f.incomeRange || null, nativeCityId: Number(f.nativeCityId),
          nativeLocalityId: num(f.nativeLocalityId), currentCity: f.currentCity, currentCountry: f.currentCountry || 'Pakistan', houseType: f.houseType || null,
          fatherProfession: f.fatherProfession, motherProfession: f.motherProfession, brothers: num(f.brothers), sisters: num(f.sisters),
          marriedSiblings: num(f.marriedSiblings), familyType: f.familyType || null, about: f.about,
          lookingFor: { ageMin: num(f.ageMin), ageMax: num(f.ageMax), notes: f.lookNotes },
          guardianName: f.guardianName, guardianPhone: f.guardianPhone, agree: true,
        };
        setBusy(true);
        try {
          if (profileId) {
            const r = await fetch(`/api/rishta/profiles/${profileId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', data }) });
            const j = await r.json();
            if (!r.ok) throw new Error(j.message);
            setNotice(tf('saved'));
          } else {
            if (total > 0 && !payValid(pay)) throw new Error(tp('required'));
            const fd = new FormData();
            fd.append('data', JSON.stringify({ ...data, premium }));
            if (total > 0) appendPay(fd, pay);
            const r = await fetch('/api/rishta/profiles', { method: 'POST', body: fd });
            const j = await r.json();
            if (!r.ok) throw new Error(j.message);
            setReference(j.reference);
            window.scrollTo({ top: 0 });
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : tp('errorGeneric'));
        } finally {
          setBusy(false);
        }
      }}
    >
      <Section title={tf('basic')}>
        <Field id="createdBy" label={tf('createdBy')}>{sel('createdBy', 'createdBy', RISHTA_OPTIONS.createdBy, false)}</Field>
        <Field id="gender" label={tf('gender')}>{sel('gender', 'gender', RISHTA_OPTIONS.gender, false)}</Field>
        <Field id="fullName" label={tf('fullName')}><input id="fullName" value={f.fullName} onChange={set('fullName')} required minLength={2} className={input} /></Field>
        <Field id="dob" label={tf('dob')}><input id="dob" type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} required className={input} /></Field>
        <Field id="height" label={tf('heightCm')}><input id="height" type="number" min={120} max={220} value={f.heightCm} onChange={set('heightCm')} className={input} /></Field>
        <Field id="complexion" label={tf('complexion')}>{sel('complexion', 'complexion', RISHTA_OPTIONS.complexion, true)}</Field>
        <Field id="marital" label={tf('marital')}>{sel('marital', 'maritalStatus', RISHTA_OPTIONS.maritalStatus, false)}</Field>
        <Field id="children" label={tf('children')}><input id="children" type="number" min={0} max={15} value={f.children} onChange={set('children')} className={input} /></Field>
      </Section>

      <Section title={tf('religionTitle')}>
        <Field id="religion" label={tf('religion')}>{sel('religion', 'religion', RISHTA_OPTIONS.religion, false)}</Field>
        <Field id="sect" label={tf('sect')}>{sel('sect', 'sect', RISHTA_OPTIONS.sect, true)}</Field>
        <Field id="caste" label={tf('caste')}><input id="caste" value={f.caste} onChange={set('caste')} maxLength={60} className={input} /></Field>
      </Section>

      <Section title={tf('educationTitle')}>
        <Field id="education" label={tf('education')}>{sel('education', 'education', RISHTA_OPTIONS.education, false)}</Field>
        <Field id="profession" label={tf('profession')}><input id="profession" value={f.profession} onChange={set('profession')} maxLength={80} className={input} /></Field>
        <Field id="income" label={tf('income')}>{sel('income', 'incomeRange', RISHTA_OPTIONS.income, true)}</Field>
      </Section>

      <Section title={tf('locationTitle')}>
        <Field id="nativeCity" label={tf('nativeCity')}>
          <select id="nativeCity" value={f.nativeCityId} onChange={(e) => setF({ ...f, nativeCityId: e.target.value, nativeLocalityId: '' })} required className={input}>
            <option value="">{tp('select')}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        {city && city.localities.length > 0 && (
          <Field id="nativeArea" label={tf('nativeArea')}>
            <select id="nativeArea" value={f.nativeLocalityId} onChange={set('nativeLocalityId')} className={input}>
              <option value="">{tp('select')}</option>
              {city.localities.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field id="currentCity" label={tf('currentCity')}><input id="currentCity" value={f.currentCity} onChange={set('currentCity')} maxLength={60} className={input} /></Field>
        <Field id="currentCountry" label={tf('currentCountry')}><input id="currentCountry" value={f.currentCountry} onChange={set('currentCountry')} maxLength={60} className={input} /></Field>
        <Field id="house" label={tf('house')}>{sel('house', 'houseType', RISHTA_OPTIONS.houseType, true)}</Field>
      </Section>

      <Section title={tf('familyTitle')}>
        <Field id="father" label={tf('father')}><input id="father" value={f.fatherProfession} onChange={set('fatherProfession')} maxLength={80} className={input} /></Field>
        <Field id="mother" label={tf('mother')}><input id="mother" value={f.motherProfession} onChange={set('motherProfession')} maxLength={80} className={input} /></Field>
        <Field id="brothers" label={tf('brothers')}><input id="brothers" type="number" min={0} max={20} value={f.brothers} onChange={set('brothers')} className={input} /></Field>
        <Field id="sisters" label={tf('sisters')}><input id="sisters" type="number" min={0} max={20} value={f.sisters} onChange={set('sisters')} className={input} /></Field>
        <Field id="married" label={tf('married')}><input id="married" type="number" min={0} max={40} value={f.marriedSiblings} onChange={set('marriedSiblings')} className={input} /></Field>
        <Field id="familyType" label={tf('familyType')}>{sel('familyType', 'familyType', RISHTA_OPTIONS.familyType, true)}</Field>
      </Section>

      <Section title={tf('aboutTitle')}>
        <Field id="about" label={tf('about')} wide><textarea id="about" rows={4} maxLength={1500} value={f.about} onChange={set('about')} className={input} /></Field>
        <Field id="ageMin" label={tf('lookAgeMin')}><input id="ageMin" type="number" min={18} max={80} value={f.ageMin} onChange={set('ageMin')} className={input} /></Field>
        <Field id="ageMax" label={tf('lookAgeMax')}><input id="ageMax" type="number" min={18} max={80} value={f.ageMax} onChange={set('ageMax')} className={input} /></Field>
        <Field id="lookNotes" label={tf('lookNotes')} wide><textarea id="lookNotes" rows={2} maxLength={400} value={f.lookNotes} onChange={set('lookNotes')} className={input} /></Field>
      </Section>

      <Section title={tf('contactTitle')}>
        <Field id="gName" label={tf('guardianName')}><input id="gName" value={f.guardianName} onChange={set('guardianName')} required minLength={2} className={input} /></Field>
        <Field id="gPhone" label={tf('guardianPhone')}><input id="gPhone" type="tel" dir="ltr" value={f.guardianPhone} onChange={set('guardianPhone')} required placeholder="03001234567" className={input} /></Field>
        <p className="text-xs text-ink-muted md:col-span-2">{tf('guardianHint')}</p>
      </Section>

      {profileId && (
        <fieldset className="card p-4 md:p-5">
          <legend className="px-1 text-lg font-bold">{tf('photos')}</legend>
          <p className="text-sm text-ink-muted">{tf('photosHint')}</p>
          <ul className="mt-3 flex flex-wrap gap-3">
            {photos.map((p) => (
              <li key={p.id} className="w-28 text-center text-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/rishta/photo/${p.id}`} alt="" className="h-28 w-28 rounded-lg object-cover" />
                <span className={p.is_approved ? 'text-brand-dark' : 'text-amber-800'}>{p.is_approved ? tf('photoApproved') : tf('photoPending')}</span>
                <button
                  type="button"
                  className="mt-1 block w-full text-red-700 underline"
                  onClick={async () => {
                    await fetch(`/api/rishta/profiles/${profileId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove_photo', photoId: p.id }) });
                    void loadOwn();
                  }}
                >
                  {tf('removePhoto')}
                </button>
              </li>
            ))}
          </ul>
          {photos.length < 5 && (
            <label className="btn-outline mt-3 cursor-pointer">
              {tf('addPhoto')}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append('action', 'photo');
                  fd.append('photo', file);
                  const r = await fetch(`/api/rishta/profiles/${profileId}`, { method: 'POST', body: fd });
                  if (!r.ok) setError((await r.json()).message);
                  void loadOwn();
                }}
              />
            </label>
          )}
        </fieldset>
      )}

      {!profileId && (
        <fieldset className="card p-4 md:p-5">
          <legend className="px-1 text-lg font-bold">{tp('payTitle')}</legend>
          <p>{freeMode ? t('freeNow') : t('priceText', { price: formatPrice(plan.price, locale), days: plan.days })}</p>
          {plan.premium_price !== null && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={premium} onChange={(e) => setPremium(e.target.checked)} className="h-5 w-5 accent-pink-700" />
              {t('premium')} (+{formatPrice(plan.premium_price, locale)})
            </label>
          )}
          <p className="mt-2 text-lg font-bold">
            {tp('total')}: {formatPrice(total, locale)}
          </p>
          {total > 0 && (
            <div className="mt-3">
              <PaymentFields methods={methods} accounts={accounts} value={pay} onChange={setPay} />
            </div>
          )}
        </fieldset>
      )}

      <label className="flex min-h-[44px] items-center gap-2 text-sm">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-5 w-5 accent-pink-700" />
        {tf('agree')}
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-brand-light p-3 text-sm text-brand-dark">{notice}</p>}
      <button type="submit" className="btn bg-pink-700 text-white hover:bg-pink-800" disabled={busy}>
        {tf('save')}
      </button>
    </form>
  );
}
