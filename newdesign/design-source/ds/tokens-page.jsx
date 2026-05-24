// TourGuide DS — Token preview page (foundation)
// Affiche la palette, typo, composants. Inclus dans le canvas final.

function TokensPage() {
  const cityColors = [
    ['Grenadine · marque', TG.color.grenadine, TG.color.grenadineSoft],
    ['Mer · Nice/Cannes', TG.color.mer, TG.color.merSoft],
    ['Ocre · Grasse', TG.color.ocre, TG.color.ocreSoft],
    ['Olivier · Autran', TG.color.olive, TG.color.oliveSoft],
    ['Ardoise · Paris', TG.color.ardoise, TG.color.ardoiseSoft],
  ];
  return (
    <div style={{ width: 1040, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 48, boxSizing: 'border-box' }}>
      <TGEyebrow>Design System · v1</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 56, fontWeight: 400, margin: '8px 0 28px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        Fondations.
      </h1>

      {/* Palette */}
      <div style={{ borderTop: `1px solid ${TG.color.line}`, paddingTop: 24 }}>
        <TGEyebrow color={TG.color.grenadine}>Couleurs</TGEyebrow>
        <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 16, color: TG.color.ink60, marginTop: 6 }}>
          Un papier chaud, une encre nuit, cinq accents « ville ».
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
          {[
            ['Paper', TG.color.paper, TG.color.ink],
            ['Paper Deep', TG.color.paperDeep, TG.color.ink],
            ['Ink', TG.color.ink, TG.color.paper],
          ].map(([n, c, fg], i) => (
            <div key={i} style={{ background: c, color: fg, padding: 16, borderRadius: TG.radius.md, border: `1px solid ${TG.color.line}`, height: 84 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{n}</div>
              <div style={{ fontSize: 11, fontFamily: TG.font.mono, opacity: 0.7, marginTop: 4 }}>{c}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 10 }}>
          {cityColors.map(([n, c, s], i) => (
            <div key={i} style={{ borderRadius: TG.radius.md, overflow: 'hidden', border: `1px solid ${TG.color.line}` }}>
              <div style={{ background: c, height: 54 }}/>
              <div style={{ background: s, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{n}</div>
                <div style={{ fontSize: 10, fontFamily: TG.font.mono, opacity: 0.7 }}>{c}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Type */}
      <div style={{ borderTop: `1px solid ${TG.color.line}`, paddingTop: 24, marginTop: 28 }}>
        <TGEyebrow color={TG.color.grenadine}>Typographie</TGEyebrow>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: TG.font.display, fontSize: 56, letterSpacing: '-0.03em', lineHeight: 1 }}>DM Serif Display</div>
          <div style={{ fontSize: 11, fontFamily: TG.font.mono, color: TG.color.ink40, marginTop: 6 }}>Titres, hero, cartes — pour donner de l'âme.</div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: TG.font.editorial, fontSize: 28, fontStyle: 'italic', color: TG.color.ink80 }}>« Fraunces italic » — touches éditoriales</div>
          <div style={{ fontSize: 11, fontFamily: TG.font.mono, color: TG.color.ink40, marginTop: 4 }}>Citations, numérotation № 01, taglines de tours.</div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontFamily: TG.font.sans, fontSize: 22, fontWeight: 600 }}>Manrope — UI et lecture</div>
          <div style={{ fontFamily: TG.font.sans, fontSize: 15, color: TG.color.ink80, marginTop: 6, maxWidth: 560, lineHeight: 1.55 }}>
            Body 15/1.55 pour les paragraphes. 600 pour les labels forts, 500 pour les secondaires.
            Évite les fontes système anonymes.
          </div>
        </div>
      </div>

      {/* Components */}
      <div style={{ borderTop: `1px solid ${TG.color.line}`, paddingTop: 24, marginTop: 28 }}>
        <TGEyebrow color={TG.color.grenadine}>Composants</TGEyebrow>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <TGButton variant="primary">Télécharger</TGButton>
          <TGButton variant="accent">Reprendre la visite</TGButton>
          <TGButton variant="ghost">Voir la carte →</TGButton>
          <TGButton variant="quiet" size="sm">Filtrer</TGButton>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <TGChip active>Tous</TGChip>
          <TGChip>Gratuit</TGChip>
          <TGChip color={TG.color.ocre}>Grasse</TGChip>
          <TGChip color={TG.color.mer}>Nice</TGChip>
          <TGChip color={TG.color.olive}>Nature</TGChip>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 18 }}>
          <TGPlayer title="Place aux Aires" guide="Hélène Marceau · Parfumeuse" city="Grasse" cityColor={TG.color.ocre} progress={0.42}/>
          <TGTourCard tour={{ n: 3, city: 'Nice', cityColor: TG.color.mer, title: 'Vieille ville & Cours Saleya', tagline: 'Le marché sent encore la figue à 11h.', min: 34, poi: 7, price: 'Gratuit' }}/>
        </div>
      </div>
    </div>
  );
}

window.TokensPage = TokensPage;
