// Filters shared by the Payments page and its CSV download.

export type PaymentFilters = { tab: string; purpose: string; method: string; from: string; to: string; q: string };

export function readPaymentFilters(sp: Record<string, string | undefined>): PaymentFilters {
  const tab = ['pending', 'verified', 'rejected', 'free', 'all'].includes(sp.tab ?? '') ? sp.tab! : 'pending';
  return {
    tab,
    purpose: ['listing', 'renewal', 'featured', 'whatsapp_boost', 'banner', 'rishta'].includes(sp.purpose ?? '') ? sp.purpose! : '',
    method: ['jazzcash', 'easypaisa', 'nayapay', 'bank', 'free'].includes(sp.method ?? '') ? sp.method! : '',
    from: /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? '') ? sp.from! : '',
    to: /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? '') ? sp.to! : '',
    q: (sp.q ?? '').trim().slice(0, 60),
  };
}

export function paymentsWhere(f: PaymentFilters): { sql: string; params: unknown[] } {
  const w: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (f.tab !== 'all') w.push(`p.status = ${p(f.tab)}::payment_status`);
  if (f.purpose) w.push(`p.purpose = ${p(f.purpose)}`);
  if (f.method) w.push(`p.method = ${p(f.method)}::payment_method`);
  if (f.from) w.push(`p.created_at >= (${p(f.from)}::date at time zone 'Asia/Karachi')`);
  if (f.to) w.push(`p.created_at < ((${p(f.to)}::date + 1) at time zone 'Asia/Karachi')`);
  if (f.q) {
    const v = p(`%${f.q}%`);
    w.push(`(p.transaction_id ilike ${v} or l.reference ilike ${v} or l.seller_phone ilike ${v} or b.business_name ilike ${v} or p.paid_from ilike ${v})`);
  }
  return { sql: w.length ? `where ${w.join(' and ')}` : '', params };
}

export const PAYMENTS_FROM = `
  from payments p
  left join listings l on l.id = p.listing_id
  left join banners b on b.id = p.banner_id
  left join admin_users a on a.id = p.verified_by
  left join promo_codes pc on pc.id = p.promo_code_id`;
