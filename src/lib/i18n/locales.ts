/** Interface locales; audio availability is always supplied by the server. */
export const SITE_LOCALES = ['fr', 'en', 'es', 'de', 'it', 'nl'] as const;
export type InterfaceLocale = typeof SITE_LOCALES[number];

export const LOCALE_NAMES: Record<InterfaceLocale, string> = {
  fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch', it: 'Italiano', nl: 'Nederlands',
};

export const LOCALE_FORMATS: Record<InterfaceLocale, string> = {
  fr: 'fr-FR', en: 'en-GB', es: 'es-ES', de: 'de-DE', it: 'it-IT', nl: 'nl-NL',
};

export function isInterfaceLocale(value: unknown): value is InterfaceLocale {
  return typeof value === 'string' && (SITE_LOCALES as readonly string[]).includes(value);
}

/** Strict at route/dictionary boundaries; unsupported languages must not silently become French. */
export function requireInterfaceLocale(value: unknown): InterfaceLocale {
  if (!isInterfaceLocale(value)) throw new RangeError(`Unsupported interface locale: ${String(value)}`);
  return value;
}

export function formatMoney(cents: number, locale: InterfaceLocale, currency = 'EUR'): string {
  return new Intl.NumberFormat(LOCALE_FORMATS[locale], { style: 'currency', currency }).format(cents / 100);
}

export function formatNumber(value: number, locale: InterfaceLocale, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(LOCALE_FORMATS[locale], options).format(value);
}

export function formatDate(value: Date | number, locale: InterfaceLocale, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(LOCALE_FORMATS[locale], options).format(value);
}
