// TourGuide DS — Web screens (landing)
function WebLanding() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, width: '100%', minHeight: '100%' }}>
      {/* nav */}
      <div style={{ padding: '22px 56px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${TG.color.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TGPin size={20} color={TG.color.grenadine}/>
          <span style={{ fontFamily: TG.font.display, fontSize: 22 }}>TourGuide</span>
        </div>
        <div style={{ display: 'flex', gap: 28, fontSize: 13, color: TG.color.ink80 }}>
          <span>Les villes</span><span>Parcours</span><span>Guides</span><span>Pro</span>
        </div>
        <TGButton variant="primary" size="sm">Télécharger l'app</TGButton>
      </div>

      {/* hero */}
      <div style={{ padding: '56px 56px 40px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 40 }}>
        <div>
          <TGEyebrow color={TG.color.grenadine}>Édition Printemps · 2026</TGEyebrow>
          <h1 style={{ fontFamily: TG.font.display, fontSize: 84, fontWeight: 400, letterSpacing: '-0.035em', margin: '10px 0 0', lineHeight: 0.95 }}>
            Des villes<br/>
            <span style={{ color: TG.color.grenadine, fontStyle: 'italic', fontFamily: TG.font.editorial }}>racontées</span><br/>
            à voix basse.
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.55, color: TG.color.ink80, marginTop: 18, maxWidth: 460 }}>
            42 parcours audio narrés par des guides locaux.<br/>
            Téléchargez, marchez, écoutez — même hors-ligne.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
            <TGButton variant="accent" size="lg">⤓  App Store</TGButton>
            <TGButton variant="ghost" size="lg">Voir la carte</TGButton>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <TGMap height={360} pins={[
            { x: 22, y: 42, color: TG.color.ocre },     // Grasse
            { x: 35, y: 60, color: TG.color.grenadine },// Cannes
            { x: 48, y: 48, color: TG.color.mer },      // Nice
            { x: 75, y: 30, color: TG.color.ardoise },  // Paris
            { x: 60, y: 75, color: TG.color.olive },    // Autran
          ]}/>
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <TGChip color={TG.color.ocre}>Grasse · 6</TGChip>
            <TGChip color={TG.color.mer}>Nice · 8</TGChip>
            <TGChip color={TG.color.grenadine}>Cannes · 4</TGChip>
            <TGChip color={TG.color.ardoise}>Paris · 12</TGChip>
          </div>
        </div>
      </div>

      {/* featured tours */}
      <div style={{ padding: '40px 56px', background: TG.color.paperDeep }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <TGEyebrow>À l'affiche</TGEyebrow>
            <div style={{ fontFamily: TG.font.display, fontSize: 36, letterSpacing: '-0.02em', marginTop: 4 }}>Trois parcours, cette semaine.</div>
          </div>
          <span style={{ fontSize: 13, color: TG.color.grenadine, fontWeight: 600 }}>Voir les 42 →</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
          {[
            { n: 1, c: TG.color.ocre, city: 'Grasse', title: 'Route des parfumeurs', q: 'Il flotte, l\'hiver, comme un souvenir de mimosa.', guide: 'Hélène Marceau' },
            { n: 2, c: TG.color.mer, city: 'Nice', title: 'Vieille ville & Cours Saleya', q: 'Le marché sent la figue à onze heures.', guide: 'Marco Riva' },
            { n: 3, c: TG.color.ardoise, city: 'Paris', title: 'Quartier Latin', q: 'Les pavés du Boul\'Mich n\'ont pas bougé depuis 68.', guide: 'Jean Dreyfus' },
          ].map((t, i) => (
            <div key={i} style={{ background: TG.color.card, borderRadius: TG.radius.lg, overflow: 'hidden', border: `1px solid ${TG.color.line}` }}>
              <div style={{ background: t.c, height: 140, padding: 18, color: TG.color.paper, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <TGPin color={TG.color.paper} size={24}/>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: '0.22em', fontWeight: 700 }}>{t.city.toUpperCase()}</div>
                  <div style={{ fontFamily: TG.font.display, fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>{t.title}</div>
                </div>
              </div>
              <div style={{ padding: 18 }}>
                <TGNumber n={t.n}/>
                <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: TG.color.ink80, marginTop: 6, lineHeight: 1.4 }}>
                  « {t.q} »
                </div>
                <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 12 }}>Par {t.guide}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* footer band */}
      <div style={{ padding: '48px 56px', background: TG.color.ink, color: TG.color.paper }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 40 }}>
          <div>
            <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 20, opacity: 0.7 }}>Pour celles et ceux</div>
            <div style={{ fontFamily: TG.font.display, fontSize: 44, letterSpacing: '-0.02em', marginTop: 4 }}>qui marchent en écoutant.</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <TGButton variant="accent" size="lg">App Store</TGButton>
            <div style={{ padding: '16px 22px', border: `1.5px solid ${TG.color.paper}`, borderRadius: TG.radius.md, color: TG.color.paper, fontWeight: 600, fontSize: 15 }}>Google Play</div>
          </div>
        </div>
      </div>
    </div>
  );
}
window.WebLanding = WebLanding;
