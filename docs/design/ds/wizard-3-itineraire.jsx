// Wizard étape 3 — Itinéraire
// Carte large + liste de POIs ordonnés (numéros), bouton "Ouvrir en mode carte"

function WizardItineraire() {
  const pois = [
    { n: 1, t: 'Chapelle du Rosaire — Matisse', col: TG.color.grenadine, x: 28, y: 22 },
    { n: 2, t: 'Place du Peyra', col: TG.color.mer, x: 42, y: 52 },
    { n: 3, t: 'Cathédrale de la Nativité', col: TG.color.mer, x: 48, y: 56 },
    { n: 4, t: 'Place du Grand Jardin', col: TG.color.mer, x: 44, y: 64 },
    { n: 5, t: 'Château de Villeneuve', col: TG.color.grenadine, x: 38, y: 70 },
    { n: 6, t: 'Porte du Peyra et Remparts', col: TG.color.mer, x: 36, y: 60 },
  ];

  return (
    <WizardShell active="itineraire">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 28, fontWeight: 400, margin: 0, letterSpacing: '-0.015em' }}>Itinéraire</h1>
        <button style={{ background: TG.color.grenadine, color: TG.color.paper, border: 'none', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          ◉ Ouvrir en mode carte
        </button>
      </div>
      <div style={{ fontSize: 12, color: TG.color.ink60, marginBottom: 16 }}>
        <strong style={{ color: TG.color.ink }}>6</strong> POIs · <strong style={{ color: TG.color.ink }}>6</strong> géolocalisés · <strong style={{ color: TG.color.olive }}>6</strong> validés
      </div>

      {/* Carte */}
      <div style={{ position: 'relative', borderRadius: TG.radius.lg, overflow: 'hidden', border: `1px solid ${TG.color.line}`, marginBottom: 24 }}>
        <TGMap height={380} pins={[]}/>
        {/* Trace pointillée */}
        <svg width="100%" height="380" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 1000 380">
          {pois.map((p, i) => i > 0 && (
            <line key={i} x1={pois[i-1].x * 10} y1={pois[i-1].y * 3.8} x2={p.x * 10} y2={p.y * 3.8}
              stroke={TG.color.ink} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4"/>
          ))}
        </svg>
        {pois.map(p => (
          <div key={p.n} style={{
            position: 'absolute', top: `${p.y}%`, left: `${p.x}%`, transform: 'translate(-50%, -100%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: p.col, color: TG.color.paper,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 12, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)', border: `2px solid ${TG.color.paper}`,
            }}>{p.n}</div>
            <div style={{ width: 2, height: 6, background: p.col, marginTop: -1 }}/>
          </div>
        ))}
        <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 10, color: TG.color.ink60, background: TG.color.paper, padding: '4px 8px', borderRadius: 6, fontFamily: TG.font.mono, letterSpacing: '0.06em' }}>
          VENCE · 43,72° N · 7,11° E
        </div>
        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button style={{ width: 28, height: 28, background: TG.color.paper, border: `1px solid ${TG.color.line}`, borderRadius: 6, fontSize: 14, cursor: 'pointer', color: TG.color.ink }}>＋</button>
          <button style={{ width: 28, height: 28, background: TG.color.paper, border: `1px solid ${TG.color.line}`, borderRadius: 6, fontSize: 14, cursor: 'pointer', color: TG.color.ink }}>−</button>
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 12, fontSize: 10, color: TG.color.ink60, fontStyle: 'italic' }}>
          Double-clic = ajouter un point · Glisser pour repositionner
        </div>
      </div>

      {/* POIs list */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: TG.color.ink, margin: 0 }}>Points d'intérêt</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pois.map(p => (
          <div key={p.n} style={{
            background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md,
            padding: '12px 16px', display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 12, alignItems: 'center',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: p.col, color: TG.color.paper,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 12, fontWeight: 700,
            }}>{p.n}</div>
            <div style={{ fontSize: 14, color: TG.color.ink, fontWeight: 500 }}>{p.t}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button title="Drag" style={iconBtn}>⋮⋮</button>
              <button title="Éditer" style={iconBtn}>✎</button>
              <button title="Voir" style={iconBtn}>◉</button>
              <button title="Supprimer" style={{ ...iconBtn, color: TG.color.danger }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <StepNav prev next prevLabel="Général" nextLabel="Scènes"/>
    </WizardShell>
  );
}
const iconBtn = {
  width: 28, height: 28, borderRadius: 6, background: 'transparent', border: 'none',
  cursor: 'pointer', color: TG.color.ink60, fontSize: 12,
};

window.WizardItineraire = WizardItineraire;
