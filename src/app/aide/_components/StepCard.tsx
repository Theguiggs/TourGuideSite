import { tg } from '@murmure/design-system/tokens';
import { Card, NumberMark } from '@murmure/design-system/web';
import type { HelpStep } from '../_content';

/**
 * Story 4.6 — Carte d'étape de la page d'aide.
 *
 * Rend un <article id={step.id}> ciblable par ancre depuis la home
 * (« Comment ça marche »). `scrollMarginTop` évite que le titre passe sous
 * le Header sticky (h-16 = 64px).
 */
export default function StepCard({ step, locale = 'fr' }: { step: HelpStep; locale?: 'fr' | 'en' }) {
  return (
    <article id={step.id} style={{ scrollMarginTop: '88px' }}>
      <Card variant="flat">
        <Card.Header
          style={{
            borderBottom: 'none',
            paddingBottom: 0,
            display: 'flex',
            alignItems: 'center',
            gap: tg.space[3],
          }}
        >
          <NumberMark n={step.n} color={tg.colors.grenadine} />
          <h3
            className="font-display"
            style={{
              color: tg.colors.ink,
              fontSize: tg.fontSize.h5,
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {step.title}
          </h3>
        </Card.Header>
        <Card.Body>
          <p
            className="font-sans"
            style={{
              color: tg.colors.ink80,
              fontSize: tg.fontSize.bodyLg,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {step.body}
          </p>
          {step.tip && (
            <p
              className="font-sans"
              style={{
                color: tg.colors.ink60,
                fontSize: tg.fontSize.body,
                lineHeight: 1.55,
                marginTop: tg.space[4],
                marginBottom: 0,
                paddingLeft: tg.space[3],
                borderLeft: `3px solid ${tg.colors.grenadine}`,
              }}
            >
              <span style={{ fontWeight: 600 }}>{locale === 'en' ? 'Tip - ' : 'Astuce — '}</span>
              {step.tip}
            </p>
          )}
        </Card.Body>
      </Card>
    </article>
  );
}
