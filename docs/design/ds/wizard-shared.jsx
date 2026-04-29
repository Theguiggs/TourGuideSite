// Wizard de création / édition d'un tour — layout partagé pour les 6 étapes
// Réutilisé par : Accueil, Général, Itinéraire, Scènes, Preview, Publication

const WIZARD_TABS = [
  { k: 'accueil', label: 'Accueil' },
  { k: 'general', label: 'Général' },
  { k: 'itineraire', label: 'Itinéraire' },
  { k: 'scenes', label: 'Scènes' },
  { k: 'preview', label: 'Preview' },
  { k: 'publication', label: 'Publication' },
];

function WizardShell({ active, children, sidebar, breadcrumb = 'Vence — Chapelle Matisse et Cité Épiscopale', status = 'Brouillon', lang = 'FR' }) {
  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box' }}>
      <StudioHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <StudioSidebar active="tours"/>

        <div style={{ background: '#FCFAF6', minHeight: 1100 }}>
          {/* Breadcrumb */}
          <div style={{ padding: '14px 32px 0', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: TG.color.ink60 }}>
            <a style={{ color: TG.color.ink60, textDecoration: 'none' }}>← Sessions</a>
            <span style={{ color: TG.color.ink40 }}>›</span>
            <span style={{ fontFamily: TG.font.display, fontSize: 16, color: TG.color.ink, lineHeight: 1 }}>Vence</span>
            <span style={{ color: TG.color.ink40 }}>—</span>
            <span style={{ fontFamily: TG.font.display, fontSize: 16, color: TG.color.ink, fontWeight: 600 }}>Chapelle Matisse et Cité Épiscopale</span>
            <span style={{ marginLeft: 8, fontSize: 10, padding: '3px 10px', background: TG.color.ocreSoft, color: TG.color.ocre, borderRadius: 999, fontWeight: 700, letterSpacing: '0.08em' }}>BROUILLON</span>
            <span style={{ fontSize: 10, padding: '3px 10px', background: TG.color.paperDeep, color: TG.color.ink60, borderRadius: 999, fontWeight: 700, letterSpacing: '0.08em' }}>{lang}</span>
          </div>

          {/* Tabs */}
          <div style={{ padding: '12px 32px 0', display: 'flex', gap: 4, borderBottom: `1px solid ${TG.color.line}`, marginTop: 12 }}>
            {WIZARD_TABS.map((t, i) => {
              const on = t.k === active;
              return (
                <div key={t.k} style={{
                  padding: '12px 16px', fontSize: 13, fontWeight: on ? 700 : 500,
                  color: on ? TG.color.grenadine : TG.color.ink60, cursor: 'pointer',
                  borderBottom: on ? `2px solid ${TG.color.grenadine}` : '2px solid transparent',
                  marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontFamily: TG.font.mono, fontSize: 10, color: on ? TG.color.grenadine : TG.color.ink40, opacity: 0.7 }}>0{i+1}</span>
                  {t.label}
                </div>
              );
            })}
          </div>

          {/* Body */}
          <div style={{ display: 'grid', gridTemplateColumns: sidebar ? '260px 1fr' : '1fr', minHeight: 950 }}>
            {sidebar ? (
              <div style={{ borderRight: `1px solid ${TG.color.line}`, background: TG.color.paper }}>
                {sidebar}
              </div>
            ) : null}
            <div style={{ padding: '24px 32px 60px' }}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step nav (boutons précédent / suivant en bas de chaque étape)
function StepNav({ prev, next, prevLabel, nextLabel, primary = 'next' }) {
  return (
    <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${TG.color.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {prev ? (
        <button style={{ background: 'transparent', border: 'none', color: TG.color.ink60, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '8px 0' }}>
          ← {prevLabel}
        </button>
      ) : <div/>}
      {next ? (
        <button style={{
          background: TG.color.grenadine, color: TG.color.paper, border: 'none',
          padding: '12px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {nextLabel} →
        </button>
      ) : null}
    </div>
  );
}

// Hint card (used in multiple steps)
function HintCard({ color = TG.color.mer, icon = '♪', children }) {
  return (
    <div style={{ padding: 14, background: color === TG.color.mer ? TG.color.merSoft : TG.color.oliveSoft, borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: color, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{icon}</div>
      <div style={{ fontSize: 12, color: TG.color.ink80, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

window.WizardShell = WizardShell;
window.WIZARD_TABS = WIZARD_TABS;
window.StepNav = StepNav;
window.HintCard = HintCard;
