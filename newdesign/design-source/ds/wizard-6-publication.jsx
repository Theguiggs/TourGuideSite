// Wizard étape 6 — Publication
// Statut + actions (Publier / Supprimer) + Journal d'échanges + Tableau langues

function WizardPublication() {
  const langs = [
    { code: 'FR', flag: '🇫🇷', name: 'FR (source)', status: 'Brouillon', stCol: TG.color.ocre, stBg: TG.color.ocreSoft, scenes: '6/6', audio: '6/6', words: 219, action: null },
    { code: 'DE', flag: '🇩🇪', name: 'DE', status: 'Soumis', stCol: TG.color.mer, stBg: TG.color.merSoft, scenes: '6/6', audio: '6/6', words: 221, action: 'Retirer' },
    { code: 'ES', flag: '🇪🇸', name: 'ES', status: 'Soumis', stCol: TG.color.mer, stBg: TG.color.merSoft, scenes: '6/6', audio: '6/6', words: 221, action: 'Retirer' },
    { code: 'EN', flag: '🇬🇧', name: 'EN', status: 'Soumis', stCol: TG.color.mer, stBg: TG.color.merSoft, scenes: '6/6', audio: '6/6', words: 221, action: 'Retirer' },
  ];

  return (
    <WizardShell active="publication">
      {/* Bandeau statut */}
      <div style={{ background: TG.color.ocreSoft, border: `1px solid ${TG.color.ocre}`, borderLeft: `4px solid ${TG.color.ocre}`, borderRadius: TG.radius.md, padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 10, padding: '3px 10px', background: TG.color.paper, color: TG.color.ocre, borderRadius: 999, fontWeight: 700, letterSpacing: '0.1em', flexShrink: 0 }}>BROUILLON</span>
        <span style={{ fontSize: 11, color: TG.color.ocre, fontFamily: TG.font.mono, fontWeight: 700 }}>V1</span>
        <span style={{ fontSize: 13, color: TG.color.ink80, fontFamily: TG.font.editorial, fontStyle: 'italic' }}>
          Votre parcours est en brouillon. Complétez les informations puis soumettez-le pour validation.
        </span>
      </div>

      {/* Actions */}
      <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${TG.color.lineSoft}`, fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: TG.color.ink60 }}>ACTIONS</div>

        <div style={{ padding: '14px 18px', background: TG.color.merSoft, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', borderBottom: `1px solid ${TG.color.lineSoft}` }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: TG.color.mer, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>↑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TG.color.mer }}>Publier</div>
            <div style={{ fontSize: 12, color: TG.color.ink80, marginTop: 2 }}>Envoyer à la modération pour publication</div>
          </div>
          <span style={{ color: TG.color.mer, fontSize: 16 }}>→</span>
        </div>

        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FAEBE8', color: TG.color.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🗑</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TG.color.danger }}>Supprimer ce brouillon</div>
            <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 2 }}>Supprime définitivement cette session et tout son contenu</div>
          </div>
        </div>
      </div>

      {/* Journal */}
      <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, marginBottom: 18, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${TG.color.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14 }}>💬</span>
            <strong style={{ fontSize: 13 }}>Journal d'échanges</strong>
            <span style={{ fontSize: 12, color: TG.color.ink60 }}>Messages avec la modération</span>
          </div>
          <span style={{ color: TG.color.ink60 }}>▼</span>
        </div>

        <div style={{ background: TG.color.paperDeep, padding: '14px 18px', borderBottom: `1px solid ${TG.color.lineSoft}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TG.color.ink }}>Journal d'échanges</div>
          <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 2 }}>0 messages</div>
        </div>

        <div style={{ padding: '40px 18px', textAlign: 'center', fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink60 }}>
          Aucun échange pour le moment.
        </div>

        <div style={{ padding: '12px 18px', borderTop: `1px solid ${TG.color.lineSoft}`, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
          <input placeholder="Écrire un message..." readOnly style={{
            padding: '10px 14px', fontSize: 13, border: `1px solid ${TG.color.line}`, borderRadius: 999,
            background: TG.color.paper, color: TG.color.ink60, fontFamily: TG.font.sans, boxSizing: 'border-box',
          }}/>
          <button disabled style={{
            background: TG.color.paperDeep, color: TG.color.ink40, border: 'none', padding: '0 22px',
            borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'not-allowed',
          }}>Envoyer</button>
        </div>
      </div>

      {/* Langues */}
      <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${TG.color.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14 }}>🌐</span>
            <strong style={{ fontSize: 13 }}>Langues</strong>
            <span style={{ fontSize: 12, color: TG.color.ink60 }}>4 langues (FR + 3)</span>
          </div>
          <span style={{ color: TG.color.ink60 }}>▼</span>
        </div>

        <div>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr 0.7fr 0.7fr 0.8fr', padding: '10px 18px', fontSize: 10, color: TG.color.ink60, fontWeight: 700, letterSpacing: '0.14em', borderBottom: `1px solid ${TG.color.lineSoft}`, background: TG.color.paperDeep }}>
            <div>LANGUE</div>
            <div>STATUT</div>
            <div>SCÈNES</div>
            <div>AUDIO</div>
            <div>MOTS</div>
            <div></div>
          </div>
          {langs.map((l, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr 0.7fr 0.7fr 0.8fr', padding: '12px 18px', borderBottom: i < langs.length - 1 ? `1px solid ${TG.color.lineSoft}` : 'none', alignItems: 'center', fontSize: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>{l.flag}</span>
                <span style={{ fontWeight: 600 }}>{l.name}</span>
              </div>
              <div>
                <span style={{ fontSize: 10, padding: '3px 10px', background: l.stBg, color: l.stCol, borderRadius: 999, fontWeight: 700, letterSpacing: '0.08em' }}>{l.status}</span>
              </div>
              <div style={{ fontFamily: TG.font.mono, fontSize: 12 }}>{l.scenes}</div>
              <div style={{ fontFamily: TG.font.mono, fontSize: 12 }}>{l.audio}</div>
              <div style={{ fontFamily: TG.font.mono, fontSize: 12 }}>{l.words}</div>
              <div style={{ textAlign: 'right' }}>
                {l.action && (
                  <button style={{ background: TG.color.ocre, color: TG.color.paper, border: 'none', padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{l.action}</button>
                )}
              </div>
            </div>
          ))}
          <div style={{ padding: '12px 18px', textAlign: 'center', borderTop: `1px solid ${TG.color.lineSoft}` }}>
            <button style={{ background: 'transparent', border: `1.5px dashed ${TG.color.line}`, padding: '8px 18px', borderRadius: 999, fontSize: 12, color: TG.color.grenadine, fontWeight: 700, cursor: 'pointer' }}>＋ Ajouter une langue</button>
          </div>
        </div>
      </div>

      <StepNav prev prevLabel="Preview"/>
    </WizardShell>
  );
}

window.WizardPublication = WizardPublication;
