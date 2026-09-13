import { ImageResponse } from 'next/og';
import { tg } from '@murmure/design-system/tokens';

export function publicImage(locale: 'fr' | 'en', creator = false) {
  const text = creator
    ? locale === 'en' ? 'Give your city a voice.' : 'Donnez de la voix à votre ville.'
    : locale === 'en' ? 'Discover cities with audio tours.' : 'Découvrez les villes en visite audio.';
  return new ImageResponse(<div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: tg.colors.paper, color: tg.colors.ink }}>
    <div style={{ display: 'flex', fontSize: 48, color: tg.colors.grenadine, marginBottom: 40 }}>Murmure</div>
    <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.1, maxWidth: 1000 }}>{text}</div>
  </div>, { width: 1200, height: 630 });
}
