// Wizard étape 5 — Preview
// Toggle vue Studio / Catalogue, carte récap, "Écouter tout", liste de scènes lisibles

function WizardPreview() {
  const scenes = [
    { n: 1, t: 'Chapelle du Rosaire — Matisse', poi: "Chef-d'œuvre absolu de Matisse (1951), vitraux, céramiques et chemin de croix.", excerpt: "Bienvenue dans cette visite de Vence. Notre parcours commence ici, devant Chapelle du Rosaire — Matisse. Chef-d'œuvre absolu de Matisse (1951), vitraux,...", img: true },
    { n: 2, t: 'Place du Peyra', poi: "Cœur de la vieille ville, fontaine en forme d'urne et platanes centenaires.", excerpt: "Nous voici maintenant devant Place du Peyra, notre 2e étape. Cœur de la vieille ville,...", img: false },
    { n: 3, t: 'Cathédrale de la Nativité', poi: "Romane du XIe siècle, mosaïque de Chagall et stalles médiévales.", excerpt: "Nous voici maintenant devant Cathédrale de la Nativité, notre 3e étape. Romane du XIe siècle,...", img: false },
  ];

  return (
    <WizardShell active="preview">
      <a style={{ fontSize: 12, color: TG.color.grenadine, textDecoration: 'none', display: 'inline-block', marginBottom: 10 }}>← Retour à la session</a>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 24, fontWeight: 400, margin: 0, letterSpacing: '-0.015em' }}>
          Preview <span style={{ color: TG.color.ink60 }}>—</span> Vence — Chapelle Matisse et Cité Épiscopale
        </h1>
      </div>

      {/* Vue toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, padding: 4, background: TG.color.paperDeep, borderRadius: 999, width: 'fit-content' }}>
        {[
          { l: 'Vue Studio', on: true },
          { l: 'Vue Catalogue (touriste)', on: false },
        ].map((t, i) => (
          <div key={i} style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 999, cursor: 'pointer',
            background: t.on ? TG.color.ink : 'transparent',
            color: t.on ? TG.color.paper : TG.color.ink60,
          }}>{t.l}</div>
        ))}
      </div>

      {/* Carte */}
      <div style={{ position: 'relative', borderRadius: TG.radius.lg, overflow: 'hidden', border: `1px solid ${TG.color.line}`, marginBottom: 18 }}>
        <TGMap height={260} pins={[
          { x: 28, y: 22, color: TG.color.grenadine },
          { x: 42, y: 52, color: TG.color.mer },
          { x: 48, y: 56, color: TG.color.mer },
          { x: 44, y: 64, color: TG.color.mer },
          { x: 38, y: 70, color: TG.color.grenadine },
          { x: 36, y: 60, color: TG.color.mer },
        ]}/>
        {[1,2,3,4,5,6].map(n => {
          const pts = [{x:28,y:22},{x:42,y:52},{x:48,y:56},{x:44,y:64},{x:38,y:70},{x:36,y:60}];
          const p = pts[n-1];
          return (
            <div key={n} style={{
              position: 'absolute', top: `${p.y}%`, left: `${p.x}%`, transform: 'translate(-50%, -50%)',
              width: 22, height: 22, borderRadius: '50%', background: TG.color.mer, color: TG.color.paper,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 11, fontWeight: 700,
              border: `2px solid ${TG.color.paper}`, boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
            }}>{n}</div>
          );
        })}
      </div>

      {/* Écouter tout */}
      <button style={{
        width: '100%', padding: '16px', borderRadius: 999, background: TG.color.grenadine, color: TG.color.paper,
        border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        ▶ Écouter tout
      </button>

      {/* Scenes preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scenes.map(s => (
          <div key={s.n} style={{
            background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md,
            padding: '14px 16px', display: 'grid', gridTemplateColumns: '32px 1fr 36px', gap: 14, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: TG.color.mer, color: TG.color.paper,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 12, fontWeight: 700, marginTop: 2,
            }}>{s.n}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: TG.font.display, fontSize: 16, color: TG.color.ink, lineHeight: 1.2 }}>{s.t}</span>
                <span style={{ fontSize: 9, padding: '2px 8px', background: '#E5EFE5', color: TG.color.success, borderRadius: 999, fontWeight: 700, letterSpacing: '0.1em' }}>✓ BONNE</span>
              </div>
              <div style={{ fontSize: 13, color: TG.color.ink60, marginTop: 4, lineHeight: 1.5 }}>{s.poi}</div>
              {s.img && (
                <div style={{ marginTop: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 88, height: 64, borderRadius: 6, overflow: 'hidden',
                    background: `linear-gradient(135deg, ${TG.color.olive} 0%, ${TG.color.merSoft} 100%)`,
                    position: 'relative',
                  }}>
                    <svg width="88" height="64" style={{ position: 'absolute', inset: 0 }}>
                      <defs>
                        <pattern id={`mp${s.n}`} x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
                          <rect width="14" height="14" fill={TG.color.olive}/>
                          <path d="M7 2 Q 11 7, 7 12 Q 3 7, 7 2 Z" fill={TG.color.merSoft}/>
                          <circle cx="7" cy="7" r="1.4" fill={TG.color.ocre}/>
                        </pattern>
                      </defs>
                      <rect width="88" height="64" fill={`url(#mp${s.n})`}/>
                    </svg>
                  </div>
                </div>
              )}
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink80, marginTop: 6, lineHeight: 1.55 }}>
                « {s.excerpt} »
              </div>
              <a style={{ display: 'inline-block', marginTop: 8, fontSize: 11, color: TG.color.grenadine, textDecoration: 'none', fontWeight: 600 }}>↻ retravailler les scènes</a>
            </div>
            <button title="Lire" style={{
              width: 28, height: 28, borderRadius: '50%', background: TG.color.ink, color: TG.color.paper,
              border: 'none', cursor: 'pointer', fontSize: 11, marginTop: 2,
            }}>▶</button>
          </div>
        ))}
      </div>

      <StepNav prev next prevLabel="Scènes" nextLabel="Publication"/>
    </WizardShell>
  );
}

window.WizardPreview = WizardPreview;
