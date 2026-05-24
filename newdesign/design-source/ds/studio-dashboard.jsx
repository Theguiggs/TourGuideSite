// Murmure Studio — Dashboard (page d'accueil après login)
function StudioDashboard() {
  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box' }}>
      <StudioHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <StudioSidebar active="dashboard"/>

        <div style={{ padding: '32px 40px 60px', minHeight: 1100, background: '#FCFAF6' }}>

          {/* Hero — Reprendre */}
          <div style={{ background: 'linear-gradient(135deg, #C44A6E 0%, #A53A5A 100%)', borderRadius: TG.radius.xl, padding: 32, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, opacity: 0.08, fontFamily: TG.font.display, fontSize: 280, color: TG.color.paper, lineHeight: 1 }}>“</div>
            <TGEyebrow color="rgba(255,255,255,0.7)">Bonjour Steffen · Reprendre où vous étiez</TGEyebrow>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginTop: 12 }}>
              <div>
                <div style={{ fontFamily: TG.font.display, fontSize: 36, color: TG.color.paper, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Vence — Chapelle Matisse<br/>et Cité Épiscopale</div>
                <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 8 }}>
                  Brouillon · 6 scènes · scène 4 en cours d'écriture
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <button style={{ background: TG.color.paper, color: TG.color.grenadine, border: 'none', padding: '12px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    ▶ Continuer la scène 4
                  </button>
                  <button style={{ background: 'rgba(255,255,255,0.15)', color: TG.color.paper, border: '1px solid rgba(255,255,255,0.3)', padding: '12px 22px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Aperçu du tour
                  </button>
                </div>
              </div>
              <div style={{ width: 200, padding: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 12, color: TG.color.paper }}>
                <div style={{ fontSize: 10, letterSpacing: '0.2em', opacity: 0.7, fontWeight: 700 }}>PROGRESSION</div>
                <div style={{ fontFamily: TG.font.display, fontSize: 32, marginTop: 4 }}>67%</div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: '67%', height: '100%', background: TG.color.paper }}/>
                </div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 8 }}>4 scènes sur 6 écrites · prêt à publier dans ~2h</div>
              </div>
            </div>
          </div>

          {/* KPIs ce mois */}
          <div style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <TGEyebrow>Avril 2026 · vos chiffres</TGEyebrow>
                <h2 style={{ fontFamily: TG.font.display, fontSize: 28, fontWeight: 400, margin: '4px 0 0', letterSpacing: '-0.02em' }}>Le mois en bref.</h2>
              </div>
              <a style={{ fontSize: 12, color: TG.color.ink60, textDecoration: 'none' }}>Voir tous les revenus →</a>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 18 }}>
              {[
                { lab: 'Écoutes', val: '1 247', delta: '+18%', col: TG.color.mer, icon: '◉' },
                { lab: 'Revenus nets', val: '342 €', delta: '+24%', col: TG.color.olive, icon: '€' },
                { lab: 'Note moyenne', val: '4,7', sub: '/ 5', delta: '+0,2', col: TG.color.ocre, icon: '★' },
                { lab: 'Avis ce mois', val: '23', delta: '3 nouveaux', col: TG.color.grenadine, icon: '✎' },
              ].map((k, i) => (
                <div key={i} style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: k.col, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{k.icon}</div>
                    <div style={{ fontSize: 11, color: TG.color.success, fontWeight: 700 }}>{k.delta}</div>
                  </div>
                  <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: TG.color.ink60, fontWeight: 700, marginTop: 16 }}>{k.lab}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                    <div style={{ fontFamily: TG.font.display, fontSize: 36, color: TG.color.ink, lineHeight: 1, letterSpacing: '-0.02em' }}>{k.val}</div>
                    {k.sub && <div style={{ fontSize: 14, color: TG.color.ink60 }}>{k.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Two-col : Top tours & Avis récents */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginTop: 32 }}>

            {/* Top tours */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <TGEyebrow color={TG.color.mer}>Tours qui marchent · 30 derniers jours</TGEyebrow>
              </div>
              <div style={{ marginTop: 12, background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, overflow: 'hidden' }}>
                {[
                  { city: 'Nice', cityFam: 'mer', title: 'Nice Insolite — Légendes & Fantômes', plays: 287, rev: '78 €', stars: '4,8', spark: [3,5,4,7,6,8,9,7,10,12,9,11] },
                  { city: 'Cannes', cityFam: 'mer', title: 'Du Suquet à la Croisette', plays: 213, rev: '64 €', stars: '4,6', spark: [4,4,5,3,5,6,7,6,8,7,9,8] },
                  { city: 'Grasse', cityFam: 'ocre', title: 'Les Routes du Parfum', plays: 156, rev: '47 €', stars: '4,9', spark: [2,3,3,4,4,5,5,6,5,7,6,7] },
                  { city: 'Saint-Paul-de-Vence', cityFam: 'olive', title: 'Village des Artistes', plays: 98, rev: '29 €', stars: '4,5', spark: [1,2,2,3,2,3,4,3,4,5,4,5] },
                ].map((t, i) => {
                  const f = FAM[t.cityFam];
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '4px 1fr 90px 90px 60px', gap: 14, padding: '14px 18px', alignItems: 'center', borderBottom: i < 3 ? `1px solid ${TG.color.lineSoft}` : 'none' }}>
                      <div style={{ width: 4, height: 36, background: f.color, borderRadius: 2 }}/>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: f.color }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.color }}/>
                          {t.city.toUpperCase()}
                        </div>
                        <div style={{ fontFamily: TG.font.display, fontSize: 16, marginTop: 2, lineHeight: 1.2 }}>{t.title}</div>
                      </div>
                      {/* sparkline */}
                      <svg width="80" height="24" viewBox="0 0 80 24">
                        <polyline
                          points={t.spark.map((v, j) => `${j * (80/(t.spark.length-1))},${24 - (v/12)*22}`).join(' ')}
                          fill="none" stroke={f.color} strokeWidth="1.5"
                        />
                      </svg>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: TG.font.display, fontSize: 18 }}>{t.plays}</div>
                        <div style={{ fontSize: 10, color: TG.color.ink40, fontFamily: TG.font.mono, letterSpacing: '0.08em' }}>écoutes</div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 13, color: TG.color.ocre, fontWeight: 700 }}>★{t.stars}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Avis récents */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <TGEyebrow color={TG.color.grenadine}>3 nouveaux avis</TGEyebrow>
                <a style={{ fontSize: 12, color: TG.color.ink60, textDecoration: 'none' }}>tous →</a>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { who: 'Camille D.', when: 'il y a 2h', stars: 5, on: 'Vieux Cannes secret', q: "« Je suis passée mille fois rue Saint-Antoine sans rien voir. Là, j'ai pleuré devant la maison de la dame aux pigeons. »" },
                  { who: 'Marco F.', when: 'hier', stars: 5, on: 'Routes du Parfum', q: "« Ma femme est tombée amoureuse de Grasse. On revient en juin. Merci. »" },
                  { who: 'Lila B.', when: 'il y a 3 j.', stars: 4, on: 'Nice Insolite', q: "« Excellent récit. Un peu rapide sur la Place Rossetti, j'aurais aimé plus. »" },
                ].map((a, i) => (
                  <div key={i} style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: TG.color.paperDeep, color: TG.color.ink60, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{a.who[0]}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600 }}>{a.who}</div>
                          <div style={{ fontSize: 10, color: TG.color.ink40 }}>{a.when} · {a.on}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: TG.color.ocre, fontWeight: 700 }}>{'★'.repeat(a.stars)}<span style={{ color: TG.color.ink20 }}>{'★'.repeat(5-a.stars)}</span></div>
                    </div>
                    <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink80, marginTop: 10, lineHeight: 1.5 }}>{a.q}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Suggestion d'amélioration */}
          <div style={{ marginTop: 32, background: TG.color.merSoft, border: `1.5px dashed ${TG.color.mer}`, borderRadius: TG.radius.lg, padding: 24, display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: TG.color.mer, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>💡</div>
            <div style={{ flex: 1 }}>
              <TGEyebrow color={TG.color.mer}>Suggestion · une action recommandée</TGEyebrow>
              <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 4, lineHeight: 1.2 }}>Votre tour <em style={{ fontFamily: TG.font.editorial }}>Nice Insolite</em> n'a pas de version anglaise.</div>
              <div style={{ fontSize: 13, color: TG.color.ink80, marginTop: 6, lineHeight: 1.5 }}>
                C'est votre tour le plus écouté (+287 écoutes ce mois). Une version EN pourrait doubler son audience — 60 % des visiteurs de Nice sont anglophones.
              </div>
            </div>
            <button style={{ background: TG.color.mer, color: TG.color.paper, border: 'none', padding: '12px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
              Démarrer la traduction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StudioDashboard = StudioDashboard;
