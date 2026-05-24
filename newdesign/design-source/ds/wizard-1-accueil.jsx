// Wizard étape 1 — Accueil
// Vue d'ensemble : 6 scènes en cards, transcription, état d'avancement
// (ce que les screenshots appellent "Accueil")

function WizardAccueil() {
  const scenes = [
    { n: 1, t: 'Chapelle du Rosaire — Matisse', st: 'Enregistré', stCol: TG.color.ocre, stBg: TG.color.ocreSoft,
      excerpt: "Bienvenue dans cette visite de Vence. Notre parcours commence ici, devant Chapelle du Rosaire — Matisse. Chef-d'œuvre absolu de Matisse (1951), vitraux, céramiques et chemin de croix. Dirigeons-nous maintenant vers notre prochain arrêt : Place du Peyra." },
    { n: 2, t: 'Place du Peyra', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5',
      excerpt: "Nous voici maintenant devant Place du Peyra, notre 2e étape. Cœur de la vieille ville, fontaine en forme d'urne et platanes centenaires. Dirigeons-nous vers notre prochain arrêt : Cathédrale de la Nativité." },
    { n: 3, t: 'Cathédrale de la Nativité', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5',
      excerpt: "Nous voici maintenant devant Cathédrale de la Nativité, notre 3e étape. Romane du XIe siècle, mosaïque de Chagall et stalles médiévales. Dirigeons-nous vers notre prochain arrêt : Place du Grand Jardin." },
    { n: 4, t: 'Place du Grand Jardin', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5',
      excerpt: "Place principale de Vence, marché du vendredi, jet d'eau monumental, terrasses ombragées. Dirigeons-nous vers notre prochain arrêt." },
    { n: 5, t: 'Château de Villeneuve', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5',
      excerpt: "Forteresse seigneuriale du XVIIe siècle qui abrite aujourd'hui la fondation Émile-Hugues, dédiée à l'art moderne." },
    { n: 6, t: 'Porte du Peyra et Remparts', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5',
      excerpt: "Vestige des fortifications médiévales, dernier point avant la sortie de la cité épiscopale. Notre parcours s'achève ici." },
  ];

  return (
    <WizardShell active="accueil">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 6 }}>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 28, fontWeight: 400, margin: 0, letterSpacing: '-0.015em' }}>6 scènes</h1>
        <a style={{ fontSize: 12, color: TG.color.grenadine, textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 600 }}>↗ Voir dans Mes Parcours</a>
      </div>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink60, marginBottom: 18 }}>
        Vue d'ensemble du tour. Cliquez sur une scène pour l'éditer ou allez à l'onglet <strong>Scènes</strong> pour le mode édition.
      </div>

      {/* Quota transcription */}
      <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: TG.color.ink, borderBottom: `2px solid ${TG.color.grenadine}`, paddingBottom: 1 }}>Quota transcription</span>
            <span style={{ fontSize: 11, color: TG.color.ink60 }}>· avril</span>
          </div>
          <span style={{ fontFamily: TG.font.mono, fontSize: 12, color: TG.color.ink80, fontWeight: 600 }}>8.5 / 120 min</span>
        </div>
        <div style={{ height: 6, background: TG.color.paperDeep, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: '7.1%', height: '100%', background: TG.color.grenadine, borderRadius: 3 }}/>
        </div>
        <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 6 }}>Encore <strong style={{ color: TG.color.ink }}>111,5 min</strong> de transcription audio disponibles ce mois-ci.</div>
      </div>

      {/* Scenes list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {scenes.map(s => (
          <div key={s.n} style={{
            background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md,
            padding: '14px 18px', display: 'grid', gridTemplateColumns: '36px 1fr 36px', gap: 14, alignItems: 'flex-start',
            cursor: 'pointer',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: TG.color.paperDeep,
              color: TG.color.ink60, fontFamily: TG.font.editorial, fontStyle: 'italic', fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
            }}>{s.n}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: TG.font.display, fontSize: 16, color: TG.color.ink, lineHeight: 1.2 }}>{s.t}</span>
                <span style={{ fontSize: 9, padding: '2px 8px', background: s.stBg, color: s.stCol, borderRadius: 999, fontWeight: 700, letterSpacing: '0.1em' }}>{s.st.toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 10, color: TG.color.grenadine, fontWeight: 700, letterSpacing: '0.14em', marginTop: 6, textTransform: 'uppercase' }}>Texte transcrit</div>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink80, marginTop: 4, lineHeight: 1.55 }}>
                {s.excerpt}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 28, marginTop: 2 }}>
              <button title="Lire l'audio" style={{
                width: 28, height: 28, borderRadius: '50%', background: TG.color.ink, color: TG.color.paper,
                border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>▶</button>
            </div>
          </div>
        ))}
      </div>

      <StepNav next prev prevLabel="Sessions" nextLabel="Général"/>
    </WizardShell>
  );
}

window.WizardAccueil = WizardAccueil;
