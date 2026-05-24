// Murmure Studio — Mes tours (refonte de /guide/studio + /guide/tours unifiés)
function StudioTours() {
  const tours = [
    { city: 'Vence', title: 'Chapelle Matisse et Cité Épiscopale', scenes: 6, langs: ['fr','de','es','gb'], status: 'draft', date: '22 avr.', plays: 0, stars: null, progress: 67, current: true },
    { city: 'Nice', title: 'Nice Insolite — Légendes & Fantômes', scenes: 8, langs: ['fr','de','gb','es'], status: 'live', date: '2 avr.', plays: 287, stars: 4.8 },
    { city: 'Cimiez', title: 'De la Rome antique à Matisse', scenes: 7, langs: ['fr','de','gb','es'], status: 'live', date: '2 avr.', plays: 142, stars: 4.6 },
    { city: 'Grasse', title: 'Les Routes du Parfum', scenes: 7, langs: ['fr','gb','de'], status: 'live', date: '2 avr.', plays: 156, stars: 4.9 },
    { city: 'Cannes', title: 'Du Suquet à la Croisette', scenes: 6, langs: ['fr','gb','de','es'], status: 'live', date: '2 avr.', plays: 213, stars: 4.6 },
    { city: 'Grasse', title: 'Les Ruelles Parfumées', scenes: 3, langs: ['fr','de','es'], status: 'review', date: '1 avr.', plays: 0, stars: null, progress: 100 },
    { city: 'Saint-Paul-de-Vence', title: 'Village des Artistes', scenes: 7, langs: ['fr','gb','de','es'], status: 'live', date: '2 avr.', plays: 98, stars: 4.5 },
    { city: 'Antibes', title: 'Remparts, Picasso et Bord de Mer', scenes: 6, langs: ['fr','gb','de','es'], status: 'live', date: '2 avr.', plays: 76, stars: 4.4 },
    { city: 'Menton', title: "Jardins d'Éden entre France et Italie", scenes: 5, langs: ['fr','gb'], status: 'live', date: '2 avr.', plays: 54, stars: 4.7 },
  ];

  const STATUS = {
    live: { label: 'En ligne', color: TG.color.success, soft: '#E5EFE5' },
    draft: { label: 'Brouillon', color: TG.color.ocre, soft: TG.color.ocreSoft },
    review: { label: 'En relecture', color: TG.color.mer, soft: TG.color.merSoft },
  };

  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box' }}>
      <StudioHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <StudioSidebar active="tours"/>

        <div style={{ padding: '32px 40px 60px', minHeight: 1100, background: '#FCFAF6' }}>

          {/* Page header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 32 }}>
            <div>
              <TGEyebrow color={TG.color.grenadine}>Mes tours · 12 au total · 9 en ligne</TGEyebrow>
              <h1 style={{ fontFamily: TG.font.display, fontSize: 44, fontWeight: 400, margin: '4px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
                Votre <em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic' }}>catalogue</em>.
              </h1>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: TG.color.ink60, maxWidth: 600 }}>
                Tout ce que vous avez écrit, en cours et publié. Cliquez pour reprendre, dupliquer ou voir les retours.
              </div>
            </div>
            <button style={{ background: TG.color.grenadine, color: TG.color.paper, border: 'none', padding: '14px 22px', borderRadius: 999, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(196, 74, 110, 0.3)' }}>
              ＋ Nouveau tour
            </button>
          </div>

          {/* Filtres */}
          <div style={{ marginTop: 28, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <input placeholder="Chercher un tour…" style={{ width: '100%', padding: '10px 14px 10px 38px', fontSize: 13, border: `1px solid ${TG.color.line}`, borderRadius: 999, background: TG.color.paper, color: TG.color.ink, boxSizing: 'border-box', outline: 'none' }}/>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TG.color.ink40, fontSize: 14 }}>⌕</span>
            </div>
            {[
              { l: 'Tous', n: 12, on: true },
              { l: 'En ligne', n: 9 },
              { l: 'Brouillons', n: 2 },
              { l: 'En relecture', n: 1 },
            ].map((f, i) => (
              <button key={i} style={{
                padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: f.on ? TG.color.ink : TG.color.paper,
                color: f.on ? TG.color.paper : TG.color.ink80,
                border: `1px solid ${f.on ? TG.color.ink : TG.color.line}`,
              }}>{f.l} <span style={{ opacity: 0.6 }}>·</span> {f.n}</button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: TG.color.ink60 }}>
              <span>Tri&nbsp;:</span>
              <select style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${TG.color.line}`, background: TG.color.paper, fontSize: 12 }}>
                <option>Plus écoutés</option>
                <option>Récemment modifiés</option>
                <option>Alphabétique</option>
              </select>
            </div>
          </div>

          {/* Tours list */}
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tours.map((t, i) => {
              const fam = FAM[cityFamily(t.city)];
              const st = STATUS[t.status];
              return (
                <div key={i} style={{
                  background: TG.color.card,
                  border: `1px solid ${t.current ? TG.color.grenadine : TG.color.line}`,
                  boxShadow: t.current ? '0 6px 20px rgba(196,74,110,0.18)' : TG.shadow.card,
                  borderRadius: TG.radius.lg,
                  display: 'grid',
                  gridTemplateColumns: '6px 100px 1fr 200px 160px 120px',
                  alignItems: 'stretch',
                  overflow: 'hidden',
                  cursor: 'pointer',
                }}>
                  {/* Bande couleur ville */}
                  <div style={{ background: fam.color }}/>

                  {/* Photo placeholder */}
                  <div style={{ background: fam.soft, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <TGPin color={fam.color} size={26}/>
                    <div style={{ position: 'absolute', bottom: 6, right: 6, fontSize: 9, color: fam.color, fontWeight: 700, letterSpacing: '0.12em' }}>
                      {t.scenes} SC.
                    </div>
                  </div>

                  {/* Title block */}
                  <div style={{ padding: '16px 18px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: fam.color }}>{t.city}</span>
                      {t.current && <span style={{ fontSize: 10, padding: '2px 8px', background: TG.color.grenadine, color: TG.color.paper, borderRadius: 999, fontWeight: 700, letterSpacing: '0.08em' }}>EN COURS</span>}
                    </div>
                    <div style={{ fontFamily: TG.font.display, fontSize: 18, marginTop: 4, lineHeight: 1.2, color: TG.color.ink }}>{t.title}</div>
                    {/* Progress for drafts */}
                    {t.progress != null && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, maxWidth: 180, height: 4, background: TG.color.paperDeep, borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${t.progress}%`, height: '100%', background: t.status === 'draft' ? TG.color.ocre : TG.color.mer }}/>
                        </div>
                        <div style={{ fontSize: 11, color: TG.color.ink60, fontWeight: 600 }}>{t.progress}%</div>
                      </div>
                    )}
                    {t.progress == null && (
                      <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 6, fontFamily: TG.font.editorial, fontStyle: 'italic' }}>
                        Mis à jour le {t.date} · {t.langs.length} langues
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div style={{ padding: '16px 18px', borderLeft: `1px solid ${TG.color.lineSoft}`, display: 'flex', alignItems: 'center', gap: 18 }}>
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.ink40 }}>Écoutes</div>
                      <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 2 }}>{t.plays || '—'}</div>
                    </div>
                    {t.stars && (
                      <div>
                        <div style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.ink40 }}>Note</div>
                        <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 2, color: TG.color.ocre }}>★{t.stars}</div>
                      </div>
                    )}
                  </div>

                  {/* Status + langs */}
                  <div style={{ padding: '16px 18px', borderLeft: `1px solid ${TG.color.lineSoft}`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: st.soft, color: st.color, borderRadius: 999, fontSize: 11, fontWeight: 700, alignSelf: 'flex-start' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.color }}/>
                      {st.label}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {t.langs.map(l => (
                        <span key={l} style={{ fontSize: 10, padding: '2px 6px', background: TG.color.paperDeep, color: TG.color.ink60, borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em' }}>{l.toUpperCase()}</span>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <div style={{ padding: '16px', borderLeft: `1px solid ${TG.color.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {t.current ? (
                      <button style={{ background: TG.color.grenadine, color: TG.color.paper, border: 'none', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>Reprendre</button>
                    ) : t.status === 'live' ? (
                      <button style={{ background: 'transparent', color: TG.color.ink, border: `1px solid ${TG.color.line}`, padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%' }}>Modifier</button>
                    ) : (
                      <button style={{ background: TG.color.ink, color: TG.color.paper, border: 'none', padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', width: '100%' }}>Continuer</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty hint */}
          <div style={{ marginTop: 32, padding: 24, background: TG.color.paperDeep, borderRadius: TG.radius.lg, textAlign: 'center' }}>
            <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 14, color: TG.color.ink60 }}>
              « Un bon tour commence par un endroit qu'on aime trop pour le garder pour soi. »
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StudioTours = StudioTours;
