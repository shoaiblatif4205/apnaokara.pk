// Links into the app (apnaokara.pk website links, apnaokara:// links and push
// notifications) are turned into app screens here. Website addresses look like
// /ur/ad/honda-cd-70-AO-10001; the app screen is /ad/AO-10001.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    let p = path;
    const scheme = p.match(/^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(.*)$/i);
    if (scheme) {
      // https://apnaokara.pk/ur/ad/...  -> /ur/ad/...   |   apnaokara://ad/AO-1 -> /ad/AO-1
      p = /^https?$/i.test(scheme[1]) ? scheme[3] || '/' : `/${scheme[2]}${scheme[3]}`;
    }
    const [pathname] = p.split(/[?#]/);
    const clean = (pathname.replace(/^\/(en|ur)(?=\/|$)/, '') || '/').replace(/\/+$/, '') || '/';
    const ad = clean.match(/^\/ad\/(?:.*-)?(AO-\d+)$/i);
    if (ad) return `/ad/${ad[1].toUpperCase()}`;
    if (/^\/post-ad$|^\/post$/.test(clean)) return '/post';
    if (/^\/my-ads?$/.test(clean)) return '/my-ads';
    if (/^\/saved$/.test(clean)) return '/saved';
    if (/^\/alerts$/.test(clean)) return '/alerts';
    if (/^\/search$/.test(clean)) return '/search';
    if (/^\/blog(\/|$)/.test(clean)) return '/blog';
    const r = clean.match(/^\/rishta\/(R-\d+)$/i);
    if (r) return `/rishta/${r[1].toUpperCase()}`;
    if (/^\/rishta(\/|$)/.test(clean)) return '/rishta';
    return '/';
  } catch {
    return '/';
  }
}
