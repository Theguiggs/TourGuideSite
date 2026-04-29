// Murmure Studio — 2 variantes du Dashboard pour comparer

// VARIANTE A — Dense, "command center" type Linear/Notion
function StudioDashboardDense() {
  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box' }}>
      <StudioHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <StudioSidebar active="dashboard"/>

        <div style={{ padding: '24px 32px 50px', minHeight: 1100, background: '#FCFAF6' }}>
          {/* Top bar dense */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: TG.color.ink60, letterSpacing: '0.12em', fontWeight: 600 }}>DASHBOARD · {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}</div>
              <div style={{ fontFamily: TG.font.display, fontSize: 26, marginTop: 2, lineHeight: 1 }}>Bonjour Steffen.</div>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button style={{ fontSize: 11, padding: '6px 12px', borderRadius: 6, background: TG.color.paper, border: `1px solid ${TG.color.line}`, fontWeight: 600, color: TG.color.ink }}>Avr 2026 ▾</button>
              <button style={{ fontSize: 11, padding: '6px 12px', borderRadius: 6, background: TG.color.ink, color: TG.color.paper, border: 'none', fontWeight: 700 }}>＋ Nouveau tour</button>
            </div>
          </div>

          {/* Resume strip — compact */}
          <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderLeft: `4px solid ${TG.color.grenadine}`, borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: TG.color.grenadine, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TGPin color={TG.color.paper} size={18}/></div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TG.color.grenadine, letterSpacing: '0.14em' }}>EN COURS · VENCE</div>
                <div style={{ fontFamily: TG.font.display, fontSize: 16, marginTop: 1 }}>Chapelle Matisse et Cité Épiscopale · scène 4 / 6</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 100, height: 4, background: TG.color.paperDeep, borderRadius: 2 }}>
                <div style={{ width: '67%', height: '100%', background: TG.color.grenadine, borderRadius: 2 }}/>
              </div>
              <span style={{ fontSize: 12, color: TG.color.ink60, fontWeight: 600 }}>67%</span>
              <button style={{ background: TG.color.grenadine, color: TG.color.paper, border: 'none', padding: '8px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Reprendre →</button>
            </div>
          </div>

          {/* KPIs strip — 6 cols super compactes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 14 }}>
            {[
              { l: 'Écoutes', v: '1 247', d: '+18%', col: TG.color.mer },
              { l: 'Revenus', v: '342€', d: '+24%', col: TG.color.olive },
              { l: 'Note', v: '4,7', d: '+0,2', col: TG.color.ocre },
              { l: 'Avis', v: '23', d: '+3', col: TG.color.grenadine },
              { l: 'Tours', v: '12', d: '9 live', col: TG.color.ardoise },
              { l: 'En cours', v: '2', d: 'brouillon', col: TG.color.ocre },
            ].map((k, i) => (
              <div key={i} style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: 8, padding: 14 }}>
                <div style={{ fontSize: 10, color: TG.color.ink60, fontWeight: 700, letterSpacing: '0.12em' }}>{k.l.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <div style={{ fontFamily: TG.font.display, fontSize: 22, lineHeight: 1, color: k.col }}>{k.v}</div>
                </div>
                <div style={{ fontSize: 10, color: TG.color.ink60, marginTop: 4 }}>{k.d}</div>
              </div>
            ))}
          </div>

          {/* 3-col body : table + activity + actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>

            {/* Table top tours */}
            <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: 8 }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${TG.color.lineSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: TG.color.ink, letterSpacing: '0.12em' }}>TOUS LES TOURS · 12</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['Tous', 'Live', 'Brouillon'].map((f, i) => (
                    <button key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: i === 0 ? TG.color.ink : 'transparent', color: i === 0 ? TG.color.paper : TG.color.ink60, border: 'none', fontWeight: 600 }}>{f}</button>
                  ))}
                </div>
              </div>
              <div>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '4px 1fr 70px 70px 80px', gap: 10, padding: '8px 16px', fontSize: 10, color: TG.color.ink40, fontWeight: 700, letterSpacing: '0.12em', borderBottom: `1px solid ${TG.color.lineSoft}` }}>
                  <div/>
                  <div>TOUR</div>
                  <div style={{ textAlign: 'right' }}>ÉCOUTES</div>
                  <div style={{ textAlign: 'right' }}>NOTE</div>
                  <div style={{ textAlign: 'right' }}>STATUT</div>
                </div>
                {[
                  { c: 'Nice', cf: 'mer', t: 'Nice Insolite', p: 287, s: '4,8', st: 'Live' },
                  { c: 'Cannes', cf: 'mer', t: 'Du Suquet à la Croisette', p: 213, s: '4,6', st: 'Live' },
                  { c: 'Grasse', cf: 'ocre', t: 'Routes du Parfum', p: 156, s: '4,9', st: 'Live' },
                  { c: 'Vence', cf: 'olive', t: 'Chapelle Matisse', p: '—', s: '—', st: 'Brouillon' },
                  { c: 'Cimiez', cf: 'olive', t: 'De la Rome antique à Matisse', p: 142, s: '4,6', st: 'Live' },
                  { c: 'Saint-Paul', cf: 'olive', t: 'Village des Artistes', p: 98, s: '4,5', st: 'Live' },
                ].map((r, i) => {
                  const f = FAM[r.cf];
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '4px 1fr 70px 70px 80px', gap: 10, padding: '10px 16px', alignItems: 'center', borderBottom: i < 5 ? `1px solid ${TG.color.lineSoft}` : 'none', cursor: 'pointer', fontSize: 13 }}>
                      <div style={{ width: 4, height: 24, background: f.color, borderRadius: 2 }}/>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', color: f.color, marginRight: 8 }}>{r.c.toUpperCase()}</span>
                        <span style={{ fontWeight: 500 }}>{r.t}</span>
                      </div>
                      <div style={{ textAlign: 'right', fontFamily: TG.font.mono, fontSize: 12 }}>{r.p}</div>
                      <div style={{ textAlign: 'right', color: TG.color.ocre, fontWeight: 600 }}>{r.s !== '—' ? `★${r.s}` : '—'}</div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: r.st === 'Live' ? '#E5EFE5' : TG.color.ocreSoft, color: r.st === 'Live' ? TG.color.success : TG.color.ocre, fontWeight: 700 }}>{r.st}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Activity stream */}
            <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: 8 }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${TG.color.lineSoft}`, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em' }}>ACTIVITÉ · 7 DERNIERS JOURS</div>
              <div style={{ padding: '8px 16px' }}>
                {[
                  { t: '2h', who: 'Camille D.', what: 'a noté', tour: 'Vieux Cannes secret', meta: '5★', col: TG.color.success },
                  { t: '5h', who: 'Marco F.', what: 'a écouté', tour: 'Routes du Parfum', meta: 'compl.', col: TG.color.mer },
                  { t: '8h', who: 'Système', what: 'paiement', tour: 'avril', meta: '342€', col: TG.color.olive },
                  { t: '1j', who: 'Lila B.', what: 'a noté', tour: 'Nice Insolite', meta: '4★', col: TG.color.ocre },
                  { t: '2j', who: 'Vous', what: 'a publié', tour: 'Cimiez', meta: 'live', col: TG.color.success },
                  { t: '3j', who: '23 voyageurs', what: 'écoutes', tour: 'Cannes', meta: '+', col: TG.color.mer },
                ].map((a, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr auto', gap: 8, padding: '8px 0', fontSize: 12, alignItems: 'center', borderBottom: i < 5 ? `1px solid ${TG.color.lineSoft}` : 'none' }}>
                    <span style={{ fontSize: 10, color: TG.color.ink40, fontFamily: TG.font.mono }}>{a.t}</span>
                    <div style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ color: TG.color.ink }}>{a.who}</strong> {a.what} <span style={{ color: TG.color.ink60 }}>{a.tour}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: a.col }}>{a.meta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// VARIANTE B — Dépouillé, "atelier" éditorial pur
function StudioDashboardDepouille() {
  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box' }}>
      <StudioHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <StudioSidebar active="dashboard"/>

        <div style={{ padding: '60px 80px 80px', minHeight: 1100, background: TG.color.paper, position: 'relative' }}>
          {/* Decoration */}
          <div style={{ position: 'absolute', top: 40, right: 60, fontFamily: TG.font.display, fontSize: 380, color: TG.color.grenadineSoft, lineHeight: 0.8, pointerEvents: 'none', userSelect: 'none' }}>“</div>

          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, color: TG.color.ink60, letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase' }}>Lundi 27 avril · matin</div>
            <h1 style={{ fontFamily: TG.font.display, fontSize: 64, fontWeight: 400, margin: '12px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
              Bonjour <em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic' }}>Steffen</em>.
            </h1>
            <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 22, color: TG.color.ink60, maxWidth: 720, lineHeight: 1.4 }}>
              23 nouveaux avis ce week-end. Une visiteuse a pleuré devant la maison de la dame aux pigeons.
            </div>

            {/* The single thing */}
            <div style={{ marginTop: 56, padding: '40px 0 0', borderTop: `1px solid ${TG.color.line}`, maxWidth: 720 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: TG.color.grenadine, fontWeight: 700 }}>À reprendre · brouillon</div>
              <div style={{ fontFamily: TG.font.display, fontSize: 38, marginTop: 10, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                Vence — Chapelle Matisse, scène 4
              </div>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 16, color: TG.color.ink60, marginTop: 8 }}>
                « Vous voici sur la Place du Grand Jardin. Tournez maintenant le dos à la vieille ville et marchez vers le nord… »
              </div>
              <button style={{ marginTop: 24, background: TG.color.grenadine, color: TG.color.paper, border: 'none', padding: '14px 28px', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Reprendre l'écriture →
              </button>
            </div>

            {/* Stats inline minimales */}
            <div style={{ marginTop: 80, display: 'flex', gap: 60, paddingTop: 36, borderTop: `1px solid ${TG.color.line}`, maxWidth: 720 }}>
              {[
                ['1 247', 'écoutes en avril', TG.color.mer],
                ['342 €', 'à recevoir le 5 mai', TG.color.olive],
                ['4,7', 'note moyenne', TG.color.ocre],
              ].map(([n, l, c], i) => (
                <div key={i}>
                  <div style={{ fontFamily: TG.font.display, fontSize: 44, lineHeight: 1, letterSpacing: '-0.02em', color: c }}>{n}</div>
                  <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink60, marginTop: 6 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Latest review */}
            <div style={{ marginTop: 80, paddingTop: 36, borderTop: `1px solid ${TG.color.line}`, maxWidth: 720 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: TG.color.ink60, fontWeight: 700 }}>L'avis qui vous a touché ·  il y a 2h</div>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 24, lineHeight: 1.45, color: TG.color.ink, marginTop: 14 }}>
                « Je suis passée mille fois rue Saint-Antoine sans rien voir. Là, j'ai pleuré devant la maison de la dame aux pigeons. »
              </div>
              <div style={{ fontSize: 13, color: TG.color.ink60, marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>— Camille D., sur <strong>Vieux Cannes secret</strong></span>
                <span style={{ color: TG.color.ocre, fontWeight: 700 }}>★★★★★</span>
              </div>
              <a style={{ display: 'inline-block', marginTop: 16, fontSize: 13, color: TG.color.grenadine, textDecoration: 'none', fontWeight: 600 }}>Voir les 22 autres avis →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StudioDashboardDense = StudioDashboardDense;
window.StudioDashboardDepouille = StudioDashboardDepouille;
