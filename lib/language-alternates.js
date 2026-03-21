import { absoluteUrl } from "@/lib/site-url";

/**
 * Default `alternates` for English-only marketing URLs: `canonical`, `hreflang=en`, `x-default`.
 * When you ship a Japanese (or other) locale, pass `localized` so `link[rel=alternate]` includes it.
 *
 * @param {string} pathname - e.g. `/anki-alternatives`
 * @param {{ ja?: string } | undefined} [localized] - optional paths, e.g. `{ ja: '/ja/anki-alternatives' }`
 * @returns {import('next').Metadata['alternates']}
 */
export function defaultLanguageAlternates(pathname, localized) {
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const url = absoluteUrl(p);
  const languages = {
    en: url,
    "x-default": url,
  };
  if (localized?.ja) {
    const jp = localized.ja.startsWith("/") ? localized.ja : `/${localized.ja}`;
    languages.ja = absoluteUrl(jp);
  }
  return {
    canonical: p,
    languages,
  };
}
