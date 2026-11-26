import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin/auth';
import { getSetting } from '@/lib/settings';
import { Checkbox, Field, Notice, PageHeader, Section } from '@/components/admin/ui';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { saveSettings } from './actions';

export const metadata = { title: 'Site settings' };

type Obj = Record<string, unknown>;
const get = (o: Obj | null, path: string): string => {
  const v = path.split('.').reduce<unknown>((acc, p) => (acc as Obj | undefined)?.[p], o ?? undefined);
  return typeof v === 'string' ? v : '';
};

function SettingForm({ settingKey, title, description, children }: { settingKey: string; title: string; description?: string; children: ReactNode }) {
  return (
    <div id={settingKey} className="scroll-mt-6">
      <Section title={title} description={description}>
        <form action={saveSettings} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="key" value={settingKey} />
          {children}
          <div className="md:col-span-2">
            <SubmitButton>Save {title.toLowerCase()}</SubmitButton>
          </div>
        </form>
      </Section>
    </div>
  );
}

function Text({ name, label, value, hint, urdu, type = 'text' }: { name: string; label: string; value: string; hint?: string; urdu?: boolean; type?: string }) {
  const id = `f-${name.replace(/\./g, '-')}`;
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <input id={id} name={name} type={type} defaultValue={value} className={urdu ? 'admin-input-ur' : 'admin-input'} dir={urdu ? 'rtl' : undefined} />
    </Field>
  );
}

// Heading + "Show on website" switch for one payment method (missing value = shown)
function PayToggle({ name, label, payments }: { name: string; label: string; payments: Obj | null }) {
  const enabled = ((payments?.[name] as Obj | undefined)?.enabled as boolean | undefined) !== false;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 md:col-span-2">
      <h3 className="font-bold">{label}</h3>
      <Checkbox name={`${name}.enabled`} id={`f-${name}-enabled`} label="Show on website" defaultChecked={enabled} />
    </div>
  );
}

export default async function SettingsPage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  await requireAdmin();
  const [contact, social, payments, offer, apps] = await Promise.all([
    getSetting<Obj>('public.contact'),
    getSetting<Obj>('public.social'),
    getSetting<Obj>('public.payment_accounts'),
    getSetting<Obj>('public.offer_bar'),
    getSetting<Obj>('public.app_links'),
  ]);

  return (
    <>
      <PageHeader title="Site settings" description="Details shown on the website and app: contact, social links, payment accounts and the offer bar." />
      <Notice saved={searchParams.saved} error={searchParams.error} />

      <SettingForm settingKey="public.contact" title="Contact details" description="Shown on the Contact page, footer and in Google search data.">
        <Text name="phone" label="Phone" value={get(contact, 'phone')} hint="e.g. 0300 1234567" type="tel" />
        <Text name="whatsapp" label="WhatsApp number" value={get(contact, 'whatsapp')} type="tel" />
        <Text name="email" label="Email" value={get(contact, 'email')} type="email" />
        <Text name="address" label="Address" value={get(contact, 'address')} />
      </SettingForm>

      <SettingForm settingKey="public.social" title="Social links" description="Full links starting with https://">
        <Text name="facebook" label="Facebook page" value={get(social, 'facebook')} type="url" />
        <Text name="whatsapp_group" label="WhatsApp group invite link" value={get(social, 'whatsapp_group')} type="url" />
        <Text name="whatsapp_channel" label="WhatsApp channel" value={get(social, 'whatsapp_channel')} type="url" />
        <Text name="instagram" label="Instagram" value={get(social, 'instagram')} type="url" />
        <Text name="youtube" label="YouTube" value={get(social, 'youtube')} type="url" />
      </SettingForm>

      <SettingForm
        settingKey="public.payment_accounts"
        title="Payment accounts"
        description="Choose which payment methods customers see. Untick “Show on website” to hide a method without deleting its number. A method with no number is always hidden."
      >
        <PayToggle name="jazzcash" label="JazzCash" payments={payments} />
        <Text name="jazzcash.title" label="JazzCash account title" value={get(payments, 'jazzcash.title')} />
        <Text name="jazzcash.number" label="JazzCash number" value={get(payments, 'jazzcash.number')} />
        <PayToggle name="easypaisa" label="Easypaisa" payments={payments} />
        <Text name="easypaisa.title" label="Easypaisa account title" value={get(payments, 'easypaisa.title')} />
        <Text name="easypaisa.number" label="Easypaisa number" value={get(payments, 'easypaisa.number')} />
        <PayToggle name="nayapay" label="NayaPay" payments={payments} />
        <Text name="nayapay.title" label="NayaPay account title" value={get(payments, 'nayapay.title')} />
        <Text name="nayapay.number" label="NayaPay number" value={get(payments, 'nayapay.number')} />
        <PayToggle name="bank" label="Bank transfer" payments={payments} />
        <Text name="bank.bank_name" label="Bank name" value={get(payments, 'bank.bank_name')} />
        <Text name="bank.title" label="Bank account title" value={get(payments, 'bank.title')} />
        <Text name="bank.account" label="Bank account number" value={get(payments, 'bank.account')} />
        <Text name="bank.iban" label="IBAN" value={get(payments, 'bank.iban')} />
      </SettingForm>

      <SettingForm settingKey="public.offer_bar" title="Offer bar" description="Thin message bar at the top of the website, e.g. a sale or announcement.">
        <div className="md:col-span-2">
          <Checkbox name="enabled" label="Show the offer bar" defaultChecked={offer?.enabled === true} />
        </div>
        <Text name="en" label="Message (English)" value={get(offer, 'en')} />
        <Text name="ur" label="Message (Urdu)" value={get(offer, 'ur')} urdu />
      </SettingForm>

      <SettingForm settingKey="public.app_links" title="App links" description="Add these when the app is published on the stores.">
        <Text name="play_store" label="Google Play link" value={get(apps, 'play_store')} type="url" />
        <Text name="app_store" label="App Store link" value={get(apps, 'app_store')} type="url" />
      </SettingForm>
    </>
  );
}
