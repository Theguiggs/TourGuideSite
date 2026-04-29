// Murmure Studio — Revenus
function StudioRevenus() {
  // Data fictive 12 mois
  const months = ['Mai 25','Jun','Jul','Août','Sep','Oct','Nov','Déc','Jan 26','Fév','Mars','Avr'];
  const monthly = [142, 188, 312, 487, 421, 298, 187, 156, 178, 224, 286, 342];
  const max = Math.max(...monthly);

  const tours = [
    { city: 'Nice', cf: 'mer', t: 'Nice Insolite — Légendes & Fantômes', plays: 287, share: 86, pct: 25 },
    { city: 'Cannes', cf: 'mer', t: 'Du Suquet à la Croisette', plays: 213, share: 64, pct: 19 },
    { city: 'Grasse', cf: 'ocre', t: 'Les Routes du Parfum', plays: 156, share: 47, pct: 14 },
    { city: 'Cimiez', cf: 'olive', t: 'De la Rome antique à Matisse', plays: 142, share: 43, pct: 12 },
    { city: 'Saint-Paul-de-Vence', cf: 'olive', t: 'Village des Artistes', plays: 98, share: 29, pct: 9 },
    { city: 'Antibes', cf: 'mer', t: 'Remparts, Picasso & Bord de Mer', plays: 76, share: 23, pct: 7 },
    { city: 'Menton', cf: 'mer', t: "Jardins d'Éden", plays: 54, share: 16, pct: 5 },
    { city: '5 autres tours', cf: 'ardoise', t: 'Cumul des autres', plays: 221, share: 86, pct: 9 },
  ];

  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box' }}>
      <StudioHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <StudioSidebar active="revenus"/>

        <div style={{ padding: '32px 40px 60px', minHeight: 1300, background: '#FCFAF6' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <TGEyebrow color={TG.color.olive}>Revenus · les 12 derniers mois</TGEyebrow>
              <h1 style={{ fontFamily: TG.font.display, fontSize: 44, fontWeight: 400, margin: '4px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
                Vos <em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic' }}>recettes</em>.
              </h1>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: TG.color.ink60, maxWidth: 540 }}>
                Vous touchez 70 % de chaque écoute payante. Les versements sont mensuels, le 5 du mois suivant.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={{ background: 'transparent', color: TG.color.ink, border: `1px solid ${TG.color.line}`, padding: '12px 18px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                ↓ Relevé CSV
              </button>
              <button style={{ background: TG.color.ink, color: TG.color.paper, border: 'none', padding: '12px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Coordonnées bancaires
              </button>
            </div>
          </div>

          {/* Big numbers row */}
          <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16 }}>
            {/* This month — hero */}
            <div style={{ background: 'linear-gradient(135deg, #5B8C5A 0%, #3F6B3E 100%)', borderRadius: TG.radius.xl, padding: 28, color: TG.color.paper, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.08, fontFamily: TG.font.display, fontSize: 220, color: TG.color.paper, lineHeight: 1 }}>€</div>
              <TGEyebrow color="rgba(255,255,255,0.7)">À recevoir le 5 mai</TGEyebrow>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
                <div style={{ fontFamily: TG.font.display, fontSize: 64, lineHeight: 1, letterSpacing: '-0.025em' }}>342</div>
                <div style={{ fontFamily: TG.font.display, fontSize: 28, opacity: 0.85 }}>,00 €</div>
              </div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 8 }}>1 247 écoutes payantes en avril · part de 70 %</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 18, fontSize: 12, opacity: 0.85 }}>
                <span>📈 +24 % vs mars</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>Meilleur mois depuis 6 mois</span>
              </div>
            </div>

            <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, padding: 22 }}>
              <TGEyebrow>Cumul 2026</TGEyebrow>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                <div style={{ fontFamily: TG.font.display, fontSize: 38, lineHeight: 1 }}>1 030</div>
                <div style={{ fontSize: 16, color: TG.color.ink60 }}>€</div>
              </div>
              <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 6 }}>4 mois · moyenne 257 €</div>
              <div style={{ height: 1, background: TG.color.lineSoft, margin: '14px 0' }}/>
              <div style={{ fontSize: 11, color: TG.color.ink40, fontStyle: 'italic' }}>Objectif annuel personnalisé : <strong style={{ color: TG.color.ink }}>4 000 €</strong></div>
              <div style={{ height: 4, background: TG.color.paperDeep, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ width: '26%', height: '100%', background: TG.color.olive }}/>
              </div>
              <div style={{ fontSize: 10, color: TG.color.ink60, marginTop: 4 }}>26 % atteint · 2 970 € restants</div>
            </div>

            <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, padding: 22 }}>
              <TGEyebrow>Total cumulé</TGEyebrow>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                <div style={{ fontFamily: TG.font.display, fontSize: 38, lineHeight: 1 }}>3 421</div>
                <div style={{ fontSize: 16, color: TG.color.ink60 }}>€</div>
              </div>
              <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 6 }}>Depuis l'inscription · mai 2024</div>
              <div style={{ height: 1, background: TG.color.lineSoft, margin: '14px 0' }}/>
              <div style={{ fontSize: 11, color: TG.color.ink40, fontStyle: 'italic' }}>23 mois d'activité · 7 845 écoutes</div>
              <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 6 }}>Revenu moyen / écoute : <strong style={{ color: TG.color.ink, fontFamily: TG.font.mono }}>0,44 €</strong></div>
            </div>
          </div>

          {/* Chart 12 mois */}
          <div style={{ marginTop: 28, background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <TGEyebrow color={TG.color.olive}>Évolution · 12 mois glissants</TGEyebrow>
              <div style={{ display: 'flex', gap: 6 }}>
                {['12 mois', '6 mois', '30 j.'].map((p, i) => (
                  <button key={i} style={{ padding: '6px 12px', fontSize: 11, borderRadius: 999, background: i === 0 ? TG.color.ink : TG.color.paper, color: i === 0 ? TG.color.paper : TG.color.ink60, border: `1px solid ${i === 0 ? TG.color.ink : TG.color.line}`, fontWeight: 600, cursor: 'pointer' }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ height: 240, marginTop: 24, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '20px 4px 0', borderTop: `1px dashed ${TG.color.lineSoft}`, borderBottom: `1px solid ${TG.color.lineSoft}`, position: 'relative' }}>
              {/* gridlines */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: TG.color.lineSoft }}/>
              {monthly.map((v, i) => {
                const h = (v / max) * 200;
                const isCurrent = i === monthly.length - 1;
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontFamily: TG.font.mono, fontSize: 10, color: isCurrent ? TG.color.olive : TG.color.ink40, fontWeight: isCurrent ? 700 : 500, height: 14 }}>
                      {isCurrent && `${v}€`}
                    </div>
                    <div style={{
                      width: '100%', maxWidth: 48, height: h, borderRadius: '6px 6px 0 0',
                      background: isCurrent ? TG.color.olive : `${TG.color.olive}33`,
                      border: isCurrent ? 'none' : `1px solid ${TG.color.olive}55`,
                      borderBottom: 'none',
                      position: 'relative',
                    }}>
                      {isCurrent && <div style={{ position: 'absolute', top: -2, left: 0, right: 0, height: 3, background: TG.color.olive, borderRadius: '4px 4px 0 0' }}/>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {months.map((m, i) => (
                <div key={i} style={{ flex: 1, fontSize: 10, color: TG.color.ink40, textAlign: 'center', fontWeight: i === months.length - 1 ? 700 : 500 }}>
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Par tour + breakdown */}
          <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20 }}>

            {/* Par tour */}
            <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, padding: 28 }}>
              <TGEyebrow color={TG.color.mer}>Détail par tour · avril 2026</TGEyebrow>
              <div style={{ marginTop: 14 }}>
                {tours.map((t, i) => {
                  const f = FAM[t.cf];
                  return (
                    <div key={i} style={{ padding: '12px 0', display: 'grid', gridTemplateColumns: '4px 1fr 80px 90px 60px', gap: 14, alignItems: 'center', borderBottom: i < tours.length - 1 ? `1px solid ${TG.color.lineSoft}` : 'none' }}>
                      <div style={{ width: 4, height: 28, background: f.color, borderRadius: 2 }}/>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', color: f.color }}>{t.city.toUpperCase()}</div>
                        <div style={{ fontFamily: TG.font.display, fontSize: 14, lineHeight: 1.2, marginTop: 1 }}>{t.t}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: TG.font.mono, fontSize: 13, color: TG.color.ink60 }}>{t.plays}</div>
                        <div style={{ fontSize: 9, color: TG.color.ink40, letterSpacing: '0.1em' }}>écoutes</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: TG.font.display, fontSize: 18, color: TG.color.olive, fontWeight: 600 }}>{t.share}€</div>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: TG.font.mono, fontSize: 11, color: TG.color.ink40 }}>{t.pct}%</div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, padding: '12px 16px', background: TG.color.oliveSoft, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: TG.color.ink80, fontWeight: 600 }}>Total avril</span>
                <span style={{ fontFamily: TG.font.display, fontSize: 22, color: TG.color.olive, fontWeight: 600 }}>342,00 €</span>
              </div>
            </div>

            {/* Breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Calcul */}
              <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, padding: 22 }}>
                <TGEyebrow color={TG.color.ocre}>Comment c'est calculé</TGEyebrow>
                <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: TG.color.ink60 }}>Écoutes complétées en avril</span>
                    <span style={{ fontFamily: TG.font.mono, fontWeight: 700 }}>1 247</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: TG.color.ink60 }}>× revenu brut moyen</span>
                    <span style={{ fontFamily: TG.font.mono, fontWeight: 700 }}>0,39 €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${TG.color.lineSoft}` }}>
                    <span style={{ color: TG.color.ink60 }}>= revenu brut total</span>
                    <span style={{ fontFamily: TG.font.mono, fontWeight: 700 }}>489,00 €</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: TG.color.ink60 }}>× votre part</span>
                    <span style={{ fontFamily: TG.font.mono, fontWeight: 700, color: TG.color.olive }}>70 %</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: `2px solid ${TG.color.ink}`, marginTop: 4 }}>
                    <span style={{ fontWeight: 700 }}>Vous recevrez</span>
                    <span style={{ fontFamily: TG.font.display, fontSize: 18, color: TG.color.olive, fontWeight: 600 }}>342,00 €</span>
                  </div>
                </div>
              </div>

              {/* Versement */}
              <div style={{ background: TG.color.merSoft, borderRadius: TG.radius.lg, padding: 22 }}>
                <TGEyebrow color={TG.color.mer}>Prochain versement</TGEyebrow>
                <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 8, lineHeight: 1.2, color: TG.color.ink }}>
                  5 mai 2026<br/>
                  <em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 18, color: TG.color.mer }}>dans 8 jours</em>
                </div>
                <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 8, fontStyle: 'italic' }}>
                  Virement automatique sur IBAN •••• 4287 · BNP Paribas Antibes
                </div>
                <div style={{ height: 1, background: TG.color.line, margin: '14px 0' }}/>
                <div style={{ fontSize: 11, color: TG.color.ink60 }}>
                  Reçu fiscal disponible le 6 mai · TVA non applicable, art. 293 B du CGI.
                </div>
              </div>

            </div>
          </div>

          {/* Footer note */}
          <div style={{ marginTop: 24, padding: 18, background: TG.color.paperDeep, borderRadius: TG.radius.md, fontSize: 12, color: TG.color.ink60, textAlign: 'center', fontStyle: 'italic' }}>
            Murmure prélève 30 % par écoute payante (couvre l'hébergement, les paiements, l'app et le marketing). 0 % sur les écoutes gratuites.
          </div>

        </div>
      </div>
    </div>
  );
}

window.StudioRevenus = StudioRevenus;
