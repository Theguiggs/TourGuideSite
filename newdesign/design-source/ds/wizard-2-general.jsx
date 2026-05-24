// Wizard étape 2 — Général
// Méta du tour : photo de couverture, titre, ville, description, langue, difficulté, durée, distance, thèmes, session terrain

function WizardGeneral() {
  const themes = [
    { l: 'Histoire', on: false },
    { l: 'Gastronomie', on: true },
    { l: 'Art', on: false },
    { l: 'Nature', on: false },
    { l: 'Architecture', on: false },
    { l: 'Culture', on: false },
    { l: 'Insolite', on: true },
    { l: 'Romantique', on: false },
    { l: 'Famille', on: false },
    { l: 'Sportif', on: false },
  ];

  return (
    <WizardShell active="general">
      <div style={{ maxWidth: 760 }}>
        {/* Photo de couverture */}
        <Field label="Photo de couverture">
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{
              width: 200, height: 132, borderRadius: TG.radius.md, overflow: 'hidden',
              background: `linear-gradient(135deg, ${TG.color.olive} 0%, ${TG.color.merSoft} 100%)`,
              position: 'relative',
            }}>
              {/* Faux pattern type vitrail Matisse */}
              <svg width="200" height="132" style={{ position: 'absolute', inset: 0 }}>
                <defs>
                  <pattern id="matisse" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
                    <rect width="22" height="22" fill={TG.color.olive}/>
                    <path d="M11 4 Q 16 11, 11 18 Q 6 11, 11 4 Z" fill={TG.color.merSoft}/>
                    <circle cx="11" cy="11" r="2" fill={TG.color.ocre}/>
                  </pattern>
                </defs>
                <rect width="200" height="132" fill="url(#matisse)"/>
                <rect width="200" height="132" fill={TG.color.ink} opacity="0.15"/>
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button style={btnGhost}>Changer</button>
              <button style={{ ...btnGhost, color: TG.color.danger }}>Supprimer</button>
              <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 4, fontStyle: 'italic', maxWidth: 200 }}>
                JPG ou PNG · 1200 × 800 minimum · 2 Mo max.
              </div>
            </div>
          </div>
        </Field>

        {/* Titre + Ville */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <Field label="Titre du tour" required>
            <Input value="Vence — Chapelle Matisse et Cité Épiscopale"/>
          </Field>
          <Field label="Ville" required>
            <div style={{ position: 'relative' }}>
              <Input value="Vence"/>
              <span style={{
                position: 'absolute', top: 11, right: 12, fontSize: 9, padding: '2px 8px',
                background: TG.color.oliveSoft, color: TG.color.olive, borderRadius: 999, fontWeight: 700, letterSpacing: '0.08em',
              }}>OLIVE</span>
            </div>
            <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 4, fontStyle: 'italic' }}>
              Couleur attribuée automatiquement selon la ville.
            </div>
          </Field>
        </div>

        {/* Description */}
        <Field label="Description longue" hint="383 / 2000">
          <textarea readOnly style={{
            width: '100%', minHeight: 100, padding: 12, fontSize: 13, lineHeight: 1.6,
            border: `1px solid ${TG.color.line}`, borderRadius: 8, background: TG.color.paper,
            color: TG.color.ink, fontFamily: TG.font.sans, resize: 'vertical', boxSizing: 'border-box',
          }} value="La Chapelle du Rosaire, chef-d'œuvre absolu de Matisse, est le point de départ de cette balade dans la cité épiscopale millénaire de Vence. Traversez la Place du Peyra, longez les fontaines, découvrez la cathédrale romane ornée d'une mosaïque de Chagall et perdez-vous dans des ruelles où le temps s'est arrêté. Un parcours doux, méditatif, ponctué d'arrêts gourmands."/>
        </Field>

        {/* 4 cols : Langue / Difficulté / Durée / Distance */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <Field label="Langue">
            <Select value="🇫🇷 Français"/>
          </Field>
          <Field label="Difficulté">
            <Select value="Facile — accessible à tous"/>
          </Field>
          <Field label="Durée (min)">
            <Input value="51"/>
          </Field>
          <Field label="Distance (km)">
            <Input value="2,6"/>
          </Field>
        </div>

        {/* Thèmes */}
        <Field label="Thèmes">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {themes.map(t => (
              <button key={t.l} style={{
                padding: '6px 12px', fontSize: 12, borderRadius: 999, cursor: 'pointer',
                background: t.on ? TG.color.grenadine : TG.color.paper,
                color: t.on ? TG.color.paper : TG.color.ink80,
                border: t.on ? `1.5px solid ${TG.color.grenadine}` : `1.5px solid ${TG.color.line}`,
                fontWeight: t.on ? 700 : 500,
              }}>{t.l}</button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 8, fontStyle: 'italic' }}>
            Maximum 3 thèmes. Ils servent à la recherche dans le catalogue.
          </div>
        </Field>

        {/* Session terrain */}
        <div style={{ marginTop: 24, background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${TG.color.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: TG.color.merSoft }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: TG.color.mer, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>◉</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: TG.color.ink }}>Session terrain · 6 scènes · 02/04/2026</div>
                <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 1 }}>Capture audio in-situ — à l'origine du tour</div>
              </div>
            </div>
            <span style={{ color: TG.color.ink60, fontSize: 13 }}>▼</span>
          </div>
          <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 16px', fontSize: 13 }}>
            <span style={{ color: TG.color.ink60 }}>Scènes</span>
            <span style={{ color: TG.color.ink, fontWeight: 600 }}>6</span>
            <span style={{ color: TG.color.ink60 }}>Statut</span>
            <span style={{ color: TG.color.ink, fontWeight: 600 }}>Draft</span>
            <span style={{ color: TG.color.ink60 }}>Créée le</span>
            <span style={{ color: TG.color.ink, fontWeight: 600 }}>02/04/2026</span>
          </div>
        </div>

        <StepNav prev next prevLabel="Accueil" nextLabel="Itinéraire"/>
      </div>
    </WizardShell>
  );
}

// Helpers
function Field({ label, required, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80, letterSpacing: '0.02em' }}>
          {label}{required && <span style={{ color: TG.color.grenadine, marginLeft: 2 }}>*</span>}
        </label>
        {hint && <span style={{ fontSize: 11, color: TG.color.ink40, fontFamily: TG.font.mono }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}
function Input({ value, placeholder }) {
  return <input readOnly value={value} placeholder={placeholder} style={{
    width: '100%', padding: '10px 12px', fontSize: 13, border: `1px solid ${TG.color.line}`,
    borderRadius: 8, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box',
  }}/>;
}
function Select({ value }) {
  return (
    <div style={{ position: 'relative' }}>
      <Input value={value}/>
      <span style={{ position: 'absolute', top: 12, right: 12, color: TG.color.ink40, fontSize: 10, pointerEvents: 'none' }}>▼</span>
    </div>
  );
}
const btnGhost = {
  background: 'transparent', border: 'none', color: TG.color.grenadine, fontSize: 12, fontWeight: 600,
  cursor: 'pointer', textAlign: 'left', padding: '4px 0', textDecoration: 'underline', textUnderlineOffset: 3,
};

window.WizardGeneral = WizardGeneral;
window.WizField = Field;
window.WizInput = Input;
window.WizSelect = Select;
