'use client';
import { useMemo } from 'react';
import { useStudioLocale } from '@/lib/i18n/studio-locale';
import { adminText, ADMIN_COPY } from './copy';
import { LOCALE_FORMATS } from '@/lib/i18n/locales';
import { languageLabel } from '@/lib/i18n/languages';

export function useAdminCopy() {
  const { locale } = useStudioLocale();
  return useMemo(() => Object.assign(
    (key: string, ...values: Array<string | number>) => adminText(locale, key, ...values),
    {
      locale,
      language: (code: string) => languageLabel(code, locale),
      date: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => new Date(value).toLocaleString(LOCALE_FORMATS[locale], options ?? {year: 'numeric', month: '2-digit', day: '2-digit'}),
      number: (value: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(LOCALE_FORMATS[locale], options).format(value),
      error: (message: string | null | undefined) => {
        if (!message || locale === 'fr') return message;
        const copy = ADMIN_COPY[message] ?? Object.values(ADMIN_COPY).find(copy => Object.values(copy).includes(message));
        if (copy) return copy[locale];
        const code = message.match(/\[\d{3,5}\]/)?.[0];
        return `${adminText(locale, 'Action refusée par le serveur.')}${code ? ` ${code}` : ''}`;
      },
    },
  ), [locale]);
}
