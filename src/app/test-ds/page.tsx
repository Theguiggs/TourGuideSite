// Story 1.1 — Test consumer DS depuis TourGuideWeb
// Story 1.3 — Déplacé depuis `app/_test-ds/` (racine, hors router Next) vers
// `src/app/test-ds/` (vrai routable Next 16).
// Note: dossiers commençant par `_` sont PRIVÉS dans App Router → 404.
// Ajout d'un 3ᵉ bloc qui démontre les classes Tailwind (preset DS via `@config`).
//
// Démontre les TROIS surfaces :
//   1) `@tourguide/design-system`         → tokens-only (sûr Web + RN)
//   2) `@tourguide/design-system/web`     → composants React DOM
//   3) Tailwind preset                    → classes utilitaires (`bg-paper`, …)
import { tg } from '@tourguide/design-system';
import { Button, Card, Eyebrow } from '@tourguide/design-system/web';

export default function TestDsPage() {
  return (
    <main style={{ background: tg.colors.paper, padding: tg.space[6], minHeight: '100vh' }}>
      {/* Bloc 1 : tokens depuis l'entry par défaut */}
      <div
        style={{
          background: tg.colors.grenadine,
          color: tg.colors.paper,
          padding: tg.space[5],
          borderRadius: tg.radius.lg,
          boxShadow: tg.shadow.accent,
        }}
      >
        <p style={{ fontFamily: tg.fonts.display, fontSize: 30, margin: 0 }}>
          POC Design System OK
        </p>
        <p
          style={{
            fontFamily: tg.fonts.editorial,
            fontStyle: 'italic',
            fontSize: 16,
            marginTop: tg.space[2],
          }}
        >
          Le monde a une voix.
        </p>
      </div>

      {/* Bloc 2 : composants depuis le sub-export /web */}
      <div style={{ marginTop: tg.space[8] }}>
        <Card>
          <Card.Body>
            <Eyebrow style={{ color: tg.colors.grenadine }}>Story 1.1 · Sub-exports</Eyebrow>
            <h2
              style={{
                fontFamily: tg.fonts.display,
                fontSize: 24,
                margin: `${tg.space[2]}px 0 ${tg.space[4]}px`,
                color: tg.colors.ink,
              }}
            >
              Composants Web chargés depuis /web
            </h2>
            <div style={{ display: 'flex', gap: tg.space[3], flexWrap: 'wrap' }}>
              <Button variant="accent" size="md">Action principale</Button>
              <Button variant="primary" size="md">Action standard</Button>
              <Button variant="ghost" size="md">Action secondaire</Button>
            </div>
          </Card.Body>
        </Card>
      </div>

      {/* Bloc 3 : Story 1.3 · classes Tailwind depuis le preset DS */}
      <div className="bg-paper text-ink p-6 mt-8">
        <div className="bg-grenadine text-paper p-5 rounded-lg shadow-accent">
          <p className="font-display text-3xl">POC DS Mobile OK</p>
          <p className="font-editorial italic text-base mt-2">Le monde a une voix.</p>
        </div>
        <div className="bg-card text-ink p-6 rounded-lg shadow-md mt-6 border border-line">
          <h3 className="font-display text-h2">Tailwind classes OK</h3>
          <p className="font-editorial italic text-body-lg text-ink/60 mt-2">
            Le monde a une voix.
          </p>
          <code className="font-mono text-meta block mt-4">tg.colors.grenadine</code>
        </div>
      </div>
    </main>
  );
}
