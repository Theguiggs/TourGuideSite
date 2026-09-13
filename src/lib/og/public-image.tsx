import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
import { ImageResponse } from 'next/og';
import { tg } from '@murmure/design-system/tokens';

export function publicImage(locale: InterfaceLocale, creator = false) {
  const text = creator
    ? translate(locale, 'Donnez de la voix à votre ville.', 'Give your city a voice.')
    : translate(locale, 'Découvrez les villes en visite audio.', 'Discover cities with audio tours.');
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: tg.colors.paper, color: tg.colors.ink }}>
    <div style={{ display: 'flex', fontSize: 48, color: tg.colors.grenadine, marginBottom: 40 }}>Murmure</div>
    <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.1, maxWidth: 1000 }}>{text}</div>
  </div>, { width: 1200, height: 630 });
}
