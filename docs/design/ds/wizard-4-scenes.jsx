// Wizard étape 4 — Scènes
// Sidebar liste de scènes + tabs langues + tabs sous-onglets (POI, Photos, Texte, Audio) + édition POI active

function WizardScenes() {
  const scenes = [
    { n: 1, t: 'Chapelle du Rosaire — Matisse', st: 'Enregistré', stCol: TG.color.ocre, stBg: TG.color.ocreSoft, on: true },
    { n: 2, t: 'Place du Peyra', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5', on: false },
    { n: 3, t: 'Cathédrale de la Na...', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5', on: false },
    { n: 4, t: 'Place du Grand Jard...', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5', on: false },
    { n: 5, t: 'Château de Villene...', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5', on: false },
    { n: 6, t: 'Porte du Peyra et R...', st: 'Finalisé', stCol: TG.color.success, stBg: '#E5EFE5', on: false },
  ];

  const sidebar = (
    <div style={{ padding: '24px 14px' }}>
      <div style={{ padding: '0 8px', fontSize: 10, color: TG.color.ink60, fontWeight: 700, letterSpacing: '0.16em', marginBottom: 10 }}>SCÈNES</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {scenes.map(s => (
          <div key={s.n} style={{
            display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10, padding: '10px 10px',
            borderRadius: 8, cursor: 'pointer',
            background: s.on ? TG.color.oliveSoft : 'transparent',
            border: s.on ? `1.5px solid ${TG.color.olive}` : '1.5px solid transparent',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: s.on ? TG.color.olive : TG.color.paperDeep,
              color: s.on ? TG.color.paper : TG.color.ink60,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 11, fontWeight: 700,
            }}>{s.n}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: s.on ? 700 : 500, color: s.on ? TG.color.olive : TG.color.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.t}</div>
              <div style={{ fontSize: 9, color: s.stCol, fontWeight: 700, letterSpacing: '0.1em', marginTop: 2 }}>{s.st.toUpperCase()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <WizardShell active="scenes" sidebar={sidebar}>
      {/* Tabs langues */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: `1px solid ${TG.color.line}`, paddingBottom: 0 }}>
        {[
          { l: '🇫🇷 Français', c: '6/6', on: true },
          { l: '🇩🇪 Deutsch', c: '6/6', on: false },
          { l: '🇪🇸 Español', c: '6/6', on: false },
          { l: '🇬🇧 English', c: '6/6', on: false },
        ].map((t, i) => (
          <div key={i} style={{
            padding: '8px 14px', fontSize: 12.5, fontWeight: t.on ? 700 : 500,
            color: t.on ? TG.color.grenadine : TG.color.ink60,
            borderBottom: t.on ? `2px solid ${TG.color.grenadine}` : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {t.l}
            <span style={{ fontSize: 10, color: t.on ? TG.color.grenadine : TG.color.ink40, fontFamily: TG.font.mono }}>{t.c}</span>
          </div>
        ))}
      </div>

      <a style={{ fontSize: 12, color: TG.color.ink60, textDecoration: 'none', display: 'inline-block', marginBottom: 8 }}>← Retour</a>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 26, fontWeight: 400, margin: 0, letterSpacing: '-0.015em' }}>Chapelle du Rosaire — Matisse</h1>
        <span style={{ fontSize: 9, padding: '2px 8px', background: TG.color.ocreSoft, color: TG.color.ocre, borderRadius: 999, fontWeight: 700, letterSpacing: '0.1em' }}>ENREGISTRÉ</span>
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 0, marginTop: 16, marginBottom: 18, borderBottom: `1px solid ${TG.color.line}` }}>
        {[
          { l: 'POI', i: '◉', on: true },
          { l: 'Photos', i: '◫', on: false, n: 1 },
          { l: 'Texte', i: '✎', on: false },
          { l: 'Audio', i: '🎙', on: false },
        ].map((t, i) => (
          <div key={i} style={{
            padding: '8px 14px', fontSize: 12.5, fontWeight: t.on ? 700 : 500,
            color: t.on ? TG.color.grenadine : TG.color.ink60,
            borderBottom: t.on ? `2px solid ${TG.color.grenadine}` : '2px solid transparent',
            marginBottom: -1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{t.i}</span> {t.l}{t.n != null && <span style={{ fontSize: 10, color: TG.color.ink40 }}>({t.n})</span>}
          </div>
        ))}
      </div>

      {/* POI form */}
      <div style={{ maxWidth: 760 }}>
        <WizField label="Titre de la scène">
          <WizInput value="Chapelle du Rosaire — Matisse"/>
        </WizField>

        <WizField label="Description du point d'intérêt">
          <textarea readOnly style={{
            width: '100%', minHeight: 70, padding: 12, fontSize: 13, lineHeight: 1.6,
            border: `1px solid ${TG.color.line}`, borderRadius: 8, background: TG.color.paper,
            color: TG.color.ink, fontFamily: TG.font.sans, resize: 'vertical', boxSizing: 'border-box',
          }} value="Chef-d'œuvre absolu de Matisse (1951), vitraux, céramiques et chemin de croix."/>
        </WizField>

        <WizField label="Localisation GPS">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <WizInput placeholder="Rechercher une adresse..." value=""/>
            <button style={{ background: TG.color.grenadine, color: TG.color.paper, border: 'none', padding: '0 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              ◉ Chercher
            </button>
          </div>
        </WizField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <WizField label="Latitude">
            <WizInput value="43.727566217822165"/>
          </WizField>
          <WizField label="Longitude">
            <WizInput value="7.112768039703385"/>
          </WizField>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: TG.color.ink60, marginTop: -8, marginBottom: 18 }}>
          <span style={{ color: TG.color.grenadine, fontSize: 10 }}>●</span>
          <span style={{ fontFamily: TG.font.mono }}>43.7276, 7.1128</span>
          <span style={{ color: TG.color.ink40 }}>· Avenue Henri-Isnard, Vence</span>
        </div>

        <button style={{ background: TG.color.grenadine, color: TG.color.paper, border: 'none', padding: '12px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          ✓ Enregistrer le POI
        </button>

        <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${TG.color.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <a style={{ color: TG.color.ink60, textDecoration: 'none' }}>← Itinéraire</a>
          <a style={{ color: TG.color.grenadine, textDecoration: 'none', fontWeight: 600 }}>Preview →</a>
        </div>
      </div>
    </WizardShell>
  );
}

window.WizardScenes = WizardScenes;
