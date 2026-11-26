// Android App Links: lets apnaokara.pk ad links open straight in the Apna Okara app.
// Served at /.well-known/assetlinks.json (see next.config.mjs).
// ANDROID_CERT_SHA256 (Vercel env): the app's signing fingerprint from `eas credentials`
// or Play Console -> App integrity. Several can be given, comma separated. Until it is set
// the list is empty and links simply open in the browser.
export const dynamic = 'force-dynamic';

export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  const body = prints.length
    ? [{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: 'pk.apnaokara.app', sha256_cert_fingerprints: prints } }]
    : [];
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
