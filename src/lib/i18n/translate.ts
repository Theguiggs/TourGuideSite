import rawCopy from './interface-copy.json';
import { LOCALE_FORMATS, SITE_LOCALES, requireInterfaceLocale, type InterfaceLocale } from './locales';
import { localizePublicPath } from './public-routes';

export const INTERFACE_COPY: Readonly<Record<string, Readonly<Record<InterfaceLocale, string>>>> = rawCopy;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(INTERFACE_COPY).filter(([key]) => /\{\d+\}/.test(key)).map(([key, copy]) => {
  const ids: string[] = [];
  let pattern = '', offset = 0;
  for (const match of key.matchAll(/\{(\d+)\}/g)) {
    pattern += escape(key.slice(offset, match.index)) + '([\\s\\S]*?)';
    ids.push(match[1]); offset = match.index! + match[0].length;
  }
  return { regex: new RegExp(`^${pattern}${escape(key.slice(offset))}$`), ids, copy, specificity: key.replace(/\{\d+\}/g, '').length };
}).sort((a, b) => b.specificity - a.specificity);

/** Existing FR/EN wording is preserved; other languages are selected before rendering. */
export function translate(locale: InterfaceLocale, fr: string, en: string): string {
  requireInterfaceLocale(locale);
  if (locale === 'fr') return fr;
  if (locale === 'en') return en;
  if (en.startsWith('/')) return localizePublicPath(en, locale);
  if (/^[a-z]{2}[-_][A-Z]{2}$/.test(en)) return en.includes('_') ? LOCALE_FORMATS[locale].replace('-', '_') : LOCALE_FORMATS[locale];
  const copy = INTERFACE_COPY[en];
  if (copy) return copy[locale];
  if (fr === en) return en;
  for (const pattern of patterns) {
    const match = pattern.regex.exec(en);
    if (!match) continue;
    const values = Object.fromEntries(pattern.ids.map((id, index) => [id, match[index + 1]]));
    return pattern.copy[locale].replace(/\{(\d+)\}/g, (token, id: string) => values[id] ?? token);
  }
  throw new Error(`Missing interface translation: ${en}`);
}

type Widen<T> = T extends string ? string : T extends (...args: infer A) => infer R ? (...args: A) => Widen<R>
  : T extends object ? { [K in keyof T]: Widen<T[K]> } : T;

function translatedValue(fr: unknown, en: unknown, locale: InterfaceLocale): unknown {
  if (typeof fr === 'string' && typeof en === 'string') return translate(locale, fr, en);
  if (typeof fr === 'function' && typeof en === 'function') return (...args: unknown[]) => translatedValue(fr(...args), en(...args), locale);
  if (Array.isArray(fr) && Array.isArray(en)) return en.map((value, index) => translatedValue(fr[index], value, locale));
  if (fr && en && typeof fr === 'object' && typeof en === 'object') {
    const first = fr as Record<string, unknown>;
    return Object.fromEntries(Object.entries(en).map(([key, value]) => [key, translatedValue(first[key], value, locale)]));
  }
  return en;
}

export function localizeValue<T>(locale: InterfaceLocale, fr: T, en: T): Widen<T> {
  return (locale === 'fr' ? fr : locale === 'en' ? en : translatedValue(fr, en, locale)) as Widen<T>;
}

/** Converts existing paired dictionaries without duplicating component logic. */
export function extendCopy<T extends { fr: unknown; en: unknown }>(copy: T): Record<InterfaceLocale, Widen<T['fr'] | T['en']>> {
  return Object.fromEntries(SITE_LOCALES.map(locale => [locale, locale === 'fr' ? copy.fr : locale === 'en' ? copy.en
    : translatedValue(copy.fr, copy.en, locale)])) as Record<InterfaceLocale, Widen<T['fr'] | T['en']>>;
}
