// Transactional email through Brevo (free plan: 300 emails a day).
// Needs BREVO_API_KEY in Vercel. The sender address must be verified in Brevo
// (Brevo -> Senders); default is the Apna Okara Gmail.

export function emailConfigured(): boolean {
  return !!process.env.BREVO_API_KEY;
}

export async function sendEmail(opts: { to: string; subject: string; html: string; text: string }): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  if (!key) throw new Error('BREVO_API_KEY is not set');
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: process.env.EMAIL_SENDER_NAME || 'Apna Okara', email: process.env.EMAIL_SENDER || 'apnaokarapk@gmail.com' },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      textContent: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Email not sent (${res.status}): ${body.slice(0, 200)}`);
  }
}
