// Murmure Studio — Édition d'un tour (l'écran /scenes)
// Timeline éditoriale : carte + scènes + éditeur scène active

function StudioEditor() {
  const scenes = [
    { n: 1, title: 'Place Saint-François', city: 'Vence', cf: 'olive', dur: '2:14', words: 412, status: 'done', x: 22, y: 58 },
    { n: 2, title: 'Cathédrale et son trésor', city: 'Vence', cf: 'olive', dur: '3:42', words: 678, status: 'done', x: 35, y: 48 },
    { n: 3, title: 'Le secret du Frêne', city: 'Vence', cf: 'olive', dur: '1:58', words: 348, status: 'done', x: 48, y: 52 },
    { n: 4, title: 'Vers la Chapelle Matisse', city: 'Vence', cf: 'olive', dur: null, words: 142, status: 'editing', x: 62, y: 38 },
    { n: 5, title: 'Chapelle du Rosaire', city: 'Vence', cf: 'olive', dur: null, words: 0, status: 'todo', x: 75, y: 30 },
    { n: 6, title: 'Retour vers la place', city: 'Vence', cf: 'olive', dur: null, words: 0, status: 'todo', x: 80, y: 50 },
  ];
  const fam = FAM.olive;

  return (
    <div style={{ width: 1440, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, boxSizing: 'border-box' }}>
      <StudioHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
        <StudioSidebar active="tours"/>

        <div style={{ background: '#FCFAF6', minHeight: 1200 }}>
          {/* Tour bar */}
          <div style={{ background: TG.color.paper, padding: '20px 32px', borderBottom: `1px solid ${TG.color.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: TG.color.ink60, display: 'flex', alignItems: 'center', gap: 6 }}>
                <a style={{ color: TG.color.ink60, textDecoration: 'none' }}>Mes tours</a>
                <span style={{ color: TG.color.ink40 }}>›</span>
                <span style={{ color: TG.color.ink, fontWeight: 600 }}>Vence — Chapelle Matisse</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: fam.color }}>VENCE · OLIVE</span>
                <span style={{ fontSize: 10, padding: '3px 10px', background: TG.color.ocreSoft, color: TG.color.ocre, borderRadius: 999, fontWeight: 700, letterSpacing: '0.08em' }}>BROUILLON</span>
              </div>
              <h1 style={{ fontFamily: TG.font.display, fontSize: 32, fontWeight: 400, margin: '6px 0 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                Chapelle Matisse et Cité Épiscopale
              </h1>
              <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4 }}>
                6 scènes · 4 écrites · ~1h12 estimées · français · auto-sauvegardé il y a 12s
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button style={{ background: 'transparent', color: TG.color.ink60, border: `1px solid ${TG.color.line}`, padding: '10px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Aperçu app</button>
              <button style={{ background: TG.color.ink, color: TG.color.paper, border: 'none', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Soumettre à relecture</button>
            </div>
          </div>

          {/* Body : carte + scènes + éditeur */}
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 360px', height: 'calc(100% - 120px)', minHeight: 1080 }}>

            {/* Left — scènes timeline */}
            <div style={{ borderRight: `1px solid ${TG.color.line}`, background: TG.color.paper, padding: '20px 14px', overflow: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 12px' }}>
                <TGEyebrow color={fam.color}>Scènes · 6</TGEyebrow>
                <button style={{ fontSize: 11, color: TG.color.grenadine, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>＋ Ajouter</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
                {/* Vertical thread */}
                <div style={{ position: 'absolute', left: 32, top: 14, bottom: 14, width: 2, background: TG.color.lineSoft, zIndex: 0 }}/>

                {scenes.map((s, i) => {
                  const isActive = s.status === 'editing';
                  return (
                    <div key={s.n} style={{
                      display: 'grid', gridTemplateColumns: '40px 1fr 28px', gap: 8, alignItems: 'center',
                      background: isActive ? TG.color.grenadineSoft : 'transparent',
                      border: isActive ? `1.5px solid ${TG.color.grenadine}` : `1.5px solid transparent`,
                      borderRadius: 10, padding: '10px 8px', position: 'relative', zIndex: 1, cursor: 'pointer',
                    }}>
                      {/* Number / status dot */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: s.status === 'done' ? fam.color : (isActive ? TG.color.grenadine : TG.color.paperDeep),
                          color: s.status === 'done' || isActive ? TG.color.paper : TG.color.ink40,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 16,
                          border: s.status === 'todo' ? `1.5px dashed ${TG.color.ink40}` : 'none',
                        }}>
                          {s.status === 'done' ? '✓' : s.n}
                        </div>
                      </div>

                      {/* Title + meta */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: TG.font.display, fontSize: 14, lineHeight: 1.2, color: TG.color.ink, fontWeight: isActive ? 600 : 400 }}>{s.title}</div>
                        <div style={{ fontSize: 10, color: TG.color.ink60, marginTop: 2, fontFamily: TG.font.mono, letterSpacing: '0.04em' }}>
                          {s.dur ? `${s.dur} · ${s.words} mots` : s.words ? `${s.words} mots · brouillon` : 'à écrire'}
                        </div>
                      </div>

                      {/* Drag handle */}
                      <div style={{ color: TG.color.ink40, cursor: 'grab', fontSize: 14, lineHeight: 1 }}>⋮⋮</div>
                    </div>
                  );
                })}
              </div>

              {/* Progress */}
              <div style={{ marginTop: 16, padding: 14, background: TG.color.paperDeep, borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: TG.color.ink60, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' }}>Progression</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
                  <div style={{ fontFamily: TG.font.display, fontSize: 24, color: TG.color.grenadine, fontWeight: 600 }}>67</div>
                  <div style={{ fontSize: 13, color: TG.color.ink60 }}>%</div>
                </div>
                <div style={{ height: 4, background: TG.color.paper, borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: '67%', height: '100%', background: TG.color.grenadine }}/>
                </div>
                <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 6 }}>Encore 2 scènes à écrire pour pouvoir publier</div>
              </div>
            </div>

            {/* Center — Map + editor */}
            <div style={{ overflow: 'auto', padding: '20px 24px' }}>
              {/* Map preview */}
              <div style={{ marginBottom: 16 }}>
                <TGEyebrow color={fam.color}>Itinéraire · Vence</TGEyebrow>
                <div style={{ position: 'relative', marginTop: 10, borderRadius: TG.radius.lg, overflow: 'hidden' }}>
                  <TGMap height={200} pins={scenes.map(s => ({ x: s.x, y: s.y, color: s.status === 'editing' ? TG.color.grenadine : (s.status === 'done' ? fam.color : TG.color.ink40) }))}/>
                  {/* numbered overlay */}
                  <svg width="100%" height="200" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} preserveAspectRatio="none" viewBox="0 0 400 200">
                    {scenes.map((s, i) => i > 0 && (
                      <line key={i}
                        x1={scenes[i-1].x * 4} y1={scenes[i-1].y * 2}
                        x2={s.x * 4} y2={s.y * 2}
                        stroke={fam.color} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.5"/>
                    ))}
                  </svg>
                  {scenes.map(s => (
                    <div key={s.n} style={{
                      position: 'absolute', top: `${s.y}%`, left: `${s.x}%`,
                      transform: 'translate(-50%, -50%)',
                      width: 22, height: 22, borderRadius: '50%',
                      background: s.status === 'editing' ? TG.color.grenadine : (s.status === 'done' ? fam.color : TG.color.paper),
                      border: s.status === 'todo' ? `1.5px dashed ${TG.color.ink60}` : 'none',
                      color: s.status === 'todo' ? TG.color.ink60 : TG.color.paper,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 11, fontWeight: 700,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    }}>{s.n}</div>
                  ))}
                </div>
              </div>

              {/* Active scene editor */}
              <div style={{ background: TG.color.card, border: `1.5px solid ${TG.color.grenadine}`, borderRadius: TG.radius.lg, overflow: 'hidden', boxShadow: '0 6px 20px rgba(196,74,110,0.12)' }}>
                {/* Header scene */}
                <div style={{ padding: '14px 22px', borderBottom: `1px solid ${TG.color.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', color: TG.color.grenadine }}>SCÈNE 4 · EN COURS D'ÉCRITURE</div>
                    <input value="Vers la Chapelle Matisse" readOnly style={{
                      width: 480, marginTop: 4, padding: '6px 0', fontFamily: TG.font.display, fontSize: 22,
                      border: 'none', outline: 'none', background: 'transparent', color: TG.color.ink, letterSpacing: '-0.01em',
                    }}/>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ width: 34, height: 34, borderRadius: 8, background: TG.color.paperDeep, border: 'none', fontSize: 14, cursor: 'pointer', color: TG.color.ink60 }} title="Dupliquer">⎘</button>
                    <button style={{ width: 34, height: 34, borderRadius: 8, background: TG.color.paperDeep, border: 'none', fontSize: 14, cursor: 'pointer', color: TG.color.ink60 }} title="Supprimer">×</button>
                  </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, padding: '0 22px', borderBottom: `1px solid ${TG.color.lineSoft}` }}>
                  {[
                    { l: '✎ Texte', on: true, n: '142 mots' },
                    { l: '🎙 Audio', on: false, n: 'à générer' },
                    { l: '◉ Position GPS', on: false, n: '✓' },
                    { l: '◫ Photos', on: false, n: '0' },
                    { l: '↪ Déclenchement', on: false, n: 'GPS' },
                  ].map((t, i) => (
                    <button key={i} style={{
                      padding: '12px 14px', background: 'transparent', border: 'none',
                      borderBottom: t.on ? `2px solid ${TG.color.grenadine}` : '2px solid transparent',
                      color: t.on ? TG.color.grenadine : TG.color.ink60,
                      fontSize: 12, fontWeight: t.on ? 700 : 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                      {t.l} <span style={{ fontSize: 10, color: t.on ? TG.color.grenadine : TG.color.ink40, opacity: 0.7 }}>· {t.n}</span>
                    </button>
                  ))}
                </div>

                {/* Editor */}
                <div style={{ padding: '20px 22px 24px', background: '#FFFCF8', minHeight: 360 }}>
                  <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: TG.color.ink60, fontWeight: 700, marginBottom: 12 }}>Récit · ce que les voyageurs entendront</div>

                  {/* Faux ProseMirror */}
                  <div style={{ fontFamily: TG.font.editorial, fontSize: 17, lineHeight: 1.7, color: TG.color.ink }}>
                    <p style={{ margin: 0 }}>
                      Vous voici sur la <strong>Place du Grand Jardin</strong>. Tournez maintenant le dos à la vieille ville et marchez vers le nord, le long de l'avenue Henri-Isnard. C'est ici que commence la véritable <em style={{ fontStyle: 'italic' }}>aventure Matisse</em>.
                    </p>
                    <p style={{ margin: '14px 0 0' }}>
                      Le peintre, déjà septuagénaire, s'installe à Vence en 1943. Dans un manuscrit qu'il enverra plus tard à un ami new-yorkais, il écrit que la lumière y est <span style={{ background: TG.color.grenadineSoft, padding: '1px 4px', borderRadius: 3, color: TG.color.grenadine, fontStyle: 'italic' }}>« plus douce qu'à Nice, presque tendre »</span>.
                    </p>
                    {/* Cursor */}
                    <p style={{ margin: '14px 0 0', color: TG.color.ink40 }}>
                      Suivez l'avenue sur trois cents mètres environ. Vous verrez bientôt apparaître, sur votre droite,<span style={{ borderRight: `2px solid ${TG.color.grenadine}`, marginLeft: 2, animation: 'blink 1s infinite' }}>&nbsp;</span>
                    </p>
                  </div>
                </div>

                {/* Toolbar */}
                <div style={{ padding: '12px 22px', background: TG.color.paperDeep, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: TG.color.ink60 }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <span><strong style={{ color: TG.color.ink }}>142</strong> mots · ~58 s d'audio estimé</span>
                    <span style={{ color: TG.color.ink40 }}>·</span>
                    <span style={{ color: TG.color.success }}>✓ Sauvegardé il y a 12 s</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ background: 'transparent', border: `1px solid ${TG.color.line}`, padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: TG.color.ink80, fontWeight: 600 }}>✨ Améliorer le ton</button>
                    <button style={{ background: TG.color.grenadine, color: TG.color.paper, border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>🎙 Générer la voix</button>
                  </div>
                </div>
              </div>

              {/* Tone hint */}
              <div style={{ marginTop: 16, padding: 14, background: TG.color.merSoft, borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: TG.color.mer, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>♪</div>
                <div style={{ fontSize: 12, color: TG.color.ink80, lineHeight: 1.5 }}>
                  <strong style={{ color: TG.color.mer }}>Conseil de ton.</strong> Pensez à un voyageur qui marche seul. Préférez « vous voyez » à « observez », « tournez » à « bifurquez ». Les phrases courtes laissent de la place aux pas.
                </div>
              </div>
            </div>

            {/* Right — Inspector */}
            <div style={{ borderLeft: `1px solid ${TG.color.line}`, background: TG.color.paper, padding: '20px 22px', overflow: 'auto' }}>
              <TGEyebrow>Réglages de la scène</TGEyebrow>

              {/* GPS */}
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80 }}>Position GPS</label>
                <div style={{ marginTop: 6, padding: 10, border: `1px solid ${TG.color.line}`, borderRadius: 8, background: TG.color.paper }}>
                  <div style={{ fontFamily: TG.font.mono, fontSize: 11, color: TG.color.ink80 }}>43.7236° N, 7.1116° E</div>
                  <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 2 }}>Avenue Henri-Isnard, Vence</div>
                  <button style={{ marginTop: 8, fontSize: 11, padding: '4px 10px', background: TG.color.paperDeep, border: 'none', borderRadius: 6, color: TG.color.ink80, fontWeight: 600, cursor: 'pointer' }}>Repositionner</button>
                </div>
              </div>

              {/* Trigger */}
              <div style={{ marginTop: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80 }}>Déclenchement</label>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { l: 'Approche GPS', on: true, sub: 'Démarre dans un rayon de 30 m' },
                    { l: 'Manuel', on: false, sub: 'Le voyageur tape pour démarrer' },
                  ].map((o, i) => (
                    <div key={i} style={{
                      padding: 12, borderRadius: 8, cursor: 'pointer',
                      background: o.on ? fam.soft : TG.color.paper,
                      border: `1.5px solid ${o.on ? fam.color : TG.color.line}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${o.on ? fam.color : TG.color.ink40}`, background: o.on ? fam.color : 'transparent', position: 'relative' }}>
                          {o.on && <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: TG.color.paper }}/>}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: o.on ? fam.color : TG.color.ink80 }}>{o.l}</span>
                      </div>
                      <div style={{ fontSize: 11, color: TG.color.ink60, marginLeft: 24, marginTop: 2 }}>{o.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice */}
              <div style={{ marginTop: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80 }}>Voix de narration</label>
                <select style={{ marginTop: 6, width: '100%', padding: '10px 12px', fontSize: 13, border: `1px solid ${TG.color.line}`, borderRadius: 8, background: TG.color.paper, color: TG.color.ink, boxSizing: 'border-box' }}>
                  <option>Hortense · française · chaleureuse</option>
                  <option>Antoine · français · grave</option>
                  <option>Camille · française · jeune</option>
                </select>
                <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 6, fontStyle: 'italic' }}>Voix générée par IA · vous pouvez la remplacer par votre propre enregistrement.</div>
              </div>

              {/* Photos */}
              <div style={{ marginTop: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink80 }}>Photos d'illustration <span style={{ color: TG.color.ink40, fontWeight: 400 }}>· 0 / 4</span></label>
                <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} style={{ aspectRatio: '1/1', background: TG.color.paperDeep, border: `1.5px dashed ${TG.color.line}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TG.color.ink40, fontSize: 18, cursor: 'pointer' }}>＋</div>
                  ))}
                </div>
              </div>

              {/* Danger */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${TG.color.lineSoft}` }}>
                <button style={{ width: '100%', padding: '8px 12px', fontSize: 12, color: TG.color.danger, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>× Supprimer cette scène</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.StudioEditor = StudioEditor;
