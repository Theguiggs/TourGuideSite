// Murmure Studio — Mon Profil (refonte avec preview live)
function StudioProfile() {
  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box' }}>
      <StudioHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <StudioSidebar active="profile"/>

        <div style={{ padding: '32px 40px 60px', minHeight: 1200, background: '#FCFAF6' }}>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <TGEyebrow color={TG.color.grenadine}>Mon profil · public</TGEyebrow>
              <h1 style={{ fontFamily: TG.font.display, fontSize: 44, fontWeight: 400, margin: '4px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
                Comment vous <em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic' }}>apparaissez</em>.
              </h1>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: TG.color.ink60, maxWidth: 540 }}>
                Ce profil est visible des voyageurs qui écoutent vos tours. Soignez-le — c'est votre signature.
              </div>
            </div>
            <button style={{ background: TG.color.ink, color: TG.color.paper, border: 'none', padding: '12px 22px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Enregistrer les modifications
            </button>
          </div>

          {/* 2-col : form / preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24, marginTop: 28 }}>

            {/* Form */}
            <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, padding: 32 }}>
              <TGEyebrow>Informations</TGEyebrow>

              {/* Avatar */}
              <div style={{ marginTop: 18, display: 'flex', gap: 18, alignItems: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: TG.color.ocre, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TG.font.display, fontSize: 32, position: 'relative' }}>
                  S
                  <div style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: TG.color.paper, border: `2px solid ${TG.color.card}`, color: TG.color.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, cursor: 'pointer' }}>✎</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Photo de profil</div>
                  <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 2 }}>Carrée, format JPG ou PNG, 400 px minimum.</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button style={{ fontSize: 12, padding: '6px 12px', background: TG.color.ink, color: TG.color.paper, border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Importer</button>
                    <button style={{ fontSize: 12, padding: '6px 12px', background: 'transparent', color: TG.color.ink60, border: 'none', cursor: 'pointer' }}>Retirer</button>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div style={{ marginTop: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Nom d'auteur</span>
                  <span style={{ color: TG.color.ink40, fontWeight: 400 }}>17 / 50</span>
                </label>
                <input value="Steffen Guillaume" readOnly style={{ marginTop: 6, width: '100%', padding: '12px 14px', fontSize: 16, fontFamily: TG.font.display, border: `1px solid ${TG.color.line}`, borderRadius: 8, background: TG.color.paper, color: TG.color.ink, boxSizing: 'border-box' }}/>
                <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 4, fontStyle: 'italic' }}>C'est ce que les voyageurs voient en haut de chaque tour.</div>
              </div>

              {/* Bio */}
              <div style={{ marginTop: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80, display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biographie</span>
                  <span style={{ color: TG.color.ink40, fontWeight: 400 }}>0 / 500</span>
                </label>
                <textarea
                  placeholder="Quelques lignes pour que les voyageurs vous connaissent. Pourquoi vous racontez ces lieux ? Qu'est-ce qui vous y attache ?"
                  rows={4}
                  style={{
                    marginTop: 6, width: '100%', padding: '12px 14px', fontSize: 14,
                    fontFamily: TG.font.editorial, fontStyle: 'italic',
                    border: `1px solid ${TG.color.line}`, borderRadius: 8,
                    background: TG.color.paper, color: TG.color.ink, boxSizing: 'border-box',
                    resize: 'vertical', lineHeight: 1.5,
                  }}
                />
              </div>

              {/* City + family */}
              <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80 }}>Ville d'attache</label>
                  <input value="Grasse" readOnly style={{ marginTop: 6, width: '100%', padding: '12px 14px', fontSize: 14, border: `2px solid ${TG.color.ocre}`, borderRadius: 8, background: TG.color.paper, color: TG.color.ink, boxSizing: 'border-box' }}/>
                  <div style={{ marginTop: 6, fontSize: 11, color: TG.color.ocre, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: TG.color.ocre }}/>
                    Famille Ocre · terres chaudes du sud
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80 }}>Année de début</label>
                  <input value="2018" readOnly style={{ marginTop: 6, width: '100%', padding: '12px 14px', fontSize: 14, border: `1px solid ${TG.color.line}`, borderRadius: 8, background: TG.color.paper, color: TG.color.ink, boxSizing: 'border-box' }}/>
                </div>
              </div>

              {/* Specialties as chips */}
              <div style={{ marginTop: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80 }}>Spécialités</label>
                <div style={{ marginTop: 8, padding: '10px 12px', border: `1px solid ${TG.color.line}`, borderRadius: 8, background: TG.color.paper, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 44 }}>
                  {['Parfumerie', 'Histoire locale', 'Architecture', 'Routes du parfum'].map(s => (
                    <span key={s} style={{ background: TG.color.ocreSoft, color: TG.color.ocre, padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {s}
                      <span style={{ opacity: 0.6, cursor: 'pointer' }}>×</span>
                    </span>
                  ))}
                  <input placeholder="Ajouter…" style={{ flex: 1, minWidth: 100, border: 'none', outline: 'none', fontSize: 12, background: 'transparent' }}/>
                </div>
              </div>

              {/* Languages */}
              <div style={{ marginTop: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80 }}>Langues parlées</label>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { c: 'fr', l: 'Français', on: true, native: true },
                    { c: 'gb', l: 'Anglais', on: true },
                    { c: 'it', l: 'Italien', on: true },
                    { c: 'es', l: 'Espagnol', on: false },
                    { c: 'de', l: 'Allemand', on: false },
                    { c: 'pt', l: 'Portugais', on: false },
                  ].map(lg => (
                    <button key={lg.c} style={{
                      padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: lg.on ? TG.color.ink : TG.color.paper,
                      color: lg.on ? TG.color.paper : TG.color.ink60,
                      border: `1px solid ${lg.on ? TG.color.ink : TG.color.line}`,
                    }}>
                      {lg.l} {lg.native && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>NATIF</span>}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Preview live */}
            <div>
              <div style={{ position: 'sticky', top: 32 }}>
                <TGEyebrow color={TG.color.mer}>Aperçu côté voyageur</TGEyebrow>
                <div style={{ fontSize: 12, color: TG.color.ink40, marginTop: 4, fontStyle: 'italic' }}>Ce que voient les utilisateurs Murmure quand ils écoutent un de vos tours.</div>

                {/* Phone-ish preview */}
                <div style={{ marginTop: 14, background: TG.color.ink, borderRadius: 32, padding: 12 }}>
                  <div style={{ background: TG.color.paper, borderRadius: 22, overflow: 'hidden' }}>
                    {/* Status bar fake */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', fontSize: 11, fontWeight: 700, color: TG.color.ink }}>
                      <span>9:41</span><span>●●●●</span>
                    </div>

                    {/* Hero — auteur */}
                    <div style={{ padding: '20px 22px 24px', borderBottom: `1px solid ${TG.color.lineSoft}` }}>
                      <TGEyebrow>L'auteur</TGEyebrow>
                      <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '50%', background: TG.color.ocre, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TG.font.display, fontSize: 32, flexShrink: 0 }}>S</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: TG.font.display, fontSize: 22, lineHeight: 1.1, color: TG.color.ink }}>Steffen Guillaume</div>
                          <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.ocre, marginTop: 4 }}>Grasse · depuis 2018</div>
                          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                            <span style={{ fontSize: 10, padding: '2px 8px', background: TG.color.ocreSoft, color: TG.color.ocre, borderRadius: 999, fontWeight: 700 }}>Parfumerie</span>
                            <span style={{ fontSize: 10, padding: '2px 8px', background: TG.color.ocreSoft, color: TG.color.ocre, borderRadius: 999, fontWeight: 700 }}>Histoire</span>
                            <span style={{ fontSize: 10, padding: '2px 8px', background: TG.color.ocreSoft, color: TG.color.ocre, borderRadius: 999, fontWeight: 700 }}>+2</span>
                          </div>
                        </div>
                      </div>
                      {/* Bio placeholder */}
                      <div style={{ marginTop: 16, padding: 14, background: TG.color.paperDeep, borderRadius: 8, borderLeft: `3px solid ${TG.color.ocre}` }}>
                        <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink40, lineHeight: 1.5 }}>
                          « Votre biographie apparaîtra ici. Quelques lignes suffisent — les voyageurs lisent les guides qu'ils sentent humains. »
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ padding: 22, borderBottom: `1px solid ${TG.color.lineSoft}`, display: 'flex', justifyContent: 'space-around' }}>
                      {[['12', 'tours'], ['1 247', 'écoutes'], ['4,7★', 'note moyenne']].map(([n, l], i) => (
                        <div key={i} style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: TG.font.display, fontSize: 20, lineHeight: 1 }}>{n}</div>
                          <div style={{ fontSize: 10, color: TG.color.ink60, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4, fontWeight: 700 }}>{l}</div>
                        </div>
                      ))}
                    </div>

                    {/* Tours by author */}
                    <div style={{ padding: '18px 22px 22px' }}>
                      <TGEyebrow>Ses tours · 12</TGEyebrow>
                      {[
                        { c: 'Grasse', cf: 'ocre', t: 'Les Routes du Parfum' },
                        { c: 'Cannes', cf: 'mer', t: 'Du Suquet à la Croisette' },
                      ].map((t, i) => {
                        const f = FAM[t.cf];
                        return (
                          <div key={i} style={{ marginTop: 10, padding: '10px 12px', background: TG.color.card, border: `1px solid ${TG.color.lineSoft}`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 6, background: f.soft, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TGPin color={f.color} size={18}/></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 9, letterSpacing: '0.16em', fontWeight: 700, color: f.color }}>{t.c.toUpperCase()}</div>
                              <div style={{ fontFamily: TG.font.display, fontSize: 14, color: TG.color.ink, marginTop: 1 }}>{t.t}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: TG.color.ink40, marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
                  La preview se met à jour en direct quand vous éditez à gauche.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StudioProfile = StudioProfile;
