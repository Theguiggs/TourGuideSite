import { tg } from '@murmure/design-system/tokens';
import type { FaqItem } from '../_content';

/**
 * Story 4.6 — FAQ en <details>/<summary> natif.
 *
 * Pas d'accordéon dans le DS Murmure : on utilise l'élément natif, accessible
 * au clavier et fonctionnel sans JavaScript. Stylé via tokens.
 */
export default function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div
      style={{
        borderTop: `1px solid ${tg.colors.line}`,
      }}
    >
      {items.map((item) => (
        <details
          key={item.q}
          style={{
            borderBottom: `1px solid ${tg.colors.line}`,
          }}
        >
          <summary
            className="font-sans"
            style={{
              cursor: 'pointer',
              listStyle: 'none',
              padding: `${tg.space[4]}px 0`,
              color: tg.colors.ink,
              fontSize: tg.fontSize.bodyLg,
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: tg.space[4],
            }}
          >
            {item.q}
            <span
              aria-hidden="true"
              style={{ color: tg.colors.grenadine, fontSize: tg.fontSize.h5, lineHeight: 1 }}
            >
              +
            </span>
          </summary>
          <p
            className="font-sans"
            style={{
              color: tg.colors.ink80,
              fontSize: tg.fontSize.body,
              lineHeight: 1.6,
              margin: 0,
              paddingBottom: tg.space[4],
              maxWidth: '52rem',
            }}
          >
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}
