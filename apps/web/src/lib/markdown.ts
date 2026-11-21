import { Marked, type Tokens } from 'marked';

// Markdown for pages and blog posts (written by admins).
// Raw HTML is removed, links are made safe, headings get ids for the table of contents.

export type TocItem = { id: string; text: string; level: number };

function slugId(text: string, used: Map<string, number>): string {
  const base =
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'section';
  const n = used.get(base) ?? 0;
  used.set(base, n + 1);
  return n ? `${base}-${n}` : base;
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderMarkdown(md: string, opts: { locale?: 'en' | 'ur' } = {}): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const used = new Map<string, number>();
  const marked = new Marked({ gfm: true, breaks: true });
  marked.use({
    renderer: {
      html: () => '', // no raw HTML from content
      heading({ tokens, depth }: Tokens.Heading) {
        const text = this.parser.parseInline(tokens);
        const plain = text.replace(/<[^>]+>/g, '');
        const id = slugId(plain, used);
        if (depth === 2 || depth === 3) toc.push({ id, text: plain, level: depth });
        return `<h${depth} id="${id}">${text}</h${depth}>`;
      },
      link({ href, title, tokens }: Tokens.Link) {
        const text = this.parser.parseInline(tokens);
        if (!/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(href)) return text;
        const external = /^https?:\/\//i.test(href) && !href.includes('apnaokara.pk');
        // Site links keep the reader's language: /contact -> /ur/contact
        if (opts.locale && /^\/(?!api\/|en(\/|$)|ur(\/|$))/.test(href)) href = `/${opts.locale}${href === '/' ? '' : href}`;
        return `<a href="${escape(href)}"${title ? ` title="${escape(title)}"` : ''}${external ? ' target="_blank" rel="noopener nofollow"' : ''}>${text}</a>`;
      },
      image({ href, title, text }: Tokens.Image) {
        if (!/^(https:\/\/|\/api\/files\/)/i.test(href)) return '';
        return `<img src="${escape(href)}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ''} loading="lazy" />`;
      },
    },
  });
  const html = marked.parse(md || '', { async: false }) as string;
  return { html, toc };
}

/** "### Question" + answer paragraphs -> FAQ list (used for FAQ page and FAQPage schema). */
export function faqFromMarkdown(md: string): { q: string; a: string }[] {
  const out: { q: string; a: string }[] = [];
  const parts = (md || '').split(/^###\s+/m).slice(1);
  for (const p of parts) {
    const [q, ...rest] = p.split('\n');
    const a = rest.join('\n').replace(/^#{1,2}\s.*$/gm, '').trim();
    if (q.trim() && a) out.push({ q: q.trim(), a: a.replace(/\s+/g, ' ') });
  }
  return out;
}

export function readingMinutes(md: string): number {
  return Math.max(1, Math.round((md || '').split(/\s+/).filter(Boolean).length / 200));
}
