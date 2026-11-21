'use server';

import { redirect } from 'next/navigation';
import { q, q1 } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { logActivity } from '@/lib/admin/log';
import { str } from '@/lib/admin/form';
import { SITE_URL } from '@/lib/seo';

/** Record the reminder, then open WhatsApp with a ready message (form opens in a new tab). */
export async function whatsappReminder(fd: FormData) {
  const admin = await requireAdmin(['moderator']);
  const id = str(fd, 'id');
  const l = await q1<{ reference: string; title: string; seller_name: string; whatsapp_phone: string | null; seller_phone: string; locale: string; expires_at: Date | null; status: string }>(
    'select reference, title, seller_name, whatsapp_phone, seller_phone, locale, expires_at, status from listings where id = $1',
    [id],
  );
  if (!l) redirect('/admin/reminders?error=Ad%20not%20found');
  const expired = !l.expires_at || l.expires_at <= new Date() || l.status === 'expired';
  const link = `${SITE_URL}/${l.locale === 'en' ? 'en' : 'ur'}/my-ad?ref=${l.reference}`;
  const text =
    l.locale === 'en'
      ? `Assalam o Alaikum ${l.seller_name}, this is Apna Okara. Your ad "${l.title}" (${l.reference}) ${expired ? 'has ended' : 'ends soon'}. Renew it here to keep getting buyers: ${link}`
      : `السلام علیکم ${l.seller_name}، اپنا اوکاڑہ سے۔ آپ کا اشتہار "${l.title}" (${l.reference}) ${expired ? 'ختم ہو گیا ہے' : 'جلد ختم ہو رہا ہے'}۔ مزید خریدار پانے کے لیے یہاں دوبارہ لگائیں: ${link}`;
  await q(`insert into listing_reminders (listing_id, channel, kind, sent_by) values ($1, 'whatsapp', $2, $3)`, [id, expired ? 'expired' : 'expiring', admin.id]);
  await logActivity(admin.id, 'listing.reminder', 'listings', id, { channel: 'whatsapp' });
  const phone = (l.whatsapp_phone || l.seller_phone).replace(/\D/g, '').replace(/^0/, '92');
  redirect(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
}
