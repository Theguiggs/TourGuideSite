// Murmure — App icon final · № 06 Pin évidée + ondes
// Toutes les déclinaisons : couleurs, dark mode iOS, mono, splash, favicon, notification

// Atome de base — réutilisable partout
function MurmureIcon({ size = 220, bg = TG.color.grenadine, fg = TG.color.paper, withWaves = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 220 220">
      <defs>
        <mask id={`mask-${bg.replace('#','')}-${fg.replace('#','')}-${size}`}>
          <rect width="220" height="220" fill="#fff"/>
          <path d="M110 78 c-26 0 -46 20 -46 46 c0 32 46 72 46 72 s46 -40 46 -72 c0 -26 -20 -46 -46 -46 z" fill="#000"/>
          <circle cx="110" cy="124" r="16" fill="#fff"/>
        </mask>
      </defs>
      <rect width="220" height="220" fill={bg} mask={`url(#mask-${bg.replace('#','')}-${fg.replace('#','')}-${size})`}/>
      <path d="M110 78 c-26 0 -46 20 -46 46 c0 32 46 72 46 72 s46 -40 46 -72 c0 -26 -20 -46 -46 -46 z" fill={fg}/>
      <circle cx="110" cy="124" r="16" fill={bg}/>
      {withWaves && (
        <>
          <path d="M76,52 Q110,42 144,52" stroke={fg} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.95"/>
          <path d="M62,32 Q110,18 158,32" stroke={fg} strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.6"/>
        </>
      )}
    </svg>
  );
}

// Tuile — pour présenter une déclinaison
function MIconTile({ label, sub, size = 200, bg, fg }) {
  return (
    <div>
      <div style={{ width: size, height: size, borderRadius: size * 0.225, overflow: 'hidden', boxShadow: '0 12px 28px rgba(16,42,67,0.14), 0 0 0 1px rgba(16,42,67,0.06)' }}>
        <MurmureIcon size={size} bg={bg} fg={fg}/>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.grenadine }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
      </div>
    </div>
  );
}

function MurmureIconFinalPage() {
  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 56, boxSizing: 'border-box' }}>
      <TGEyebrow color={TG.color.grenadine}>Murmure · Icon final · № 06</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 56, fontWeight: 400, margin: '8px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        L'épingle qui<br/><em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic' }}>parle</em>.
      </h1>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 17, color: TG.color.ink60, maxWidth: 700 }}>
        Une seule géométrie : une épingle évidée d'où s'échappent deux ondes. Toutes les déclinaisons en découlent.
      </div>

      {/* Hero */}
      <div style={{ marginTop: 36, padding: 40, borderRadius: TG.radius.xl, background: TG.color.paperDeep, display: 'flex', alignItems: 'center', gap: 40 }}>
        <div style={{ width: 320, height: 320, borderRadius: 72, overflow: 'hidden', boxShadow: '0 24px 60px rgba(193,38,42,0.25), 0 0 0 1px rgba(16,42,67,0.05)' }}>
          <MurmureIcon size={320}/>
        </div>
        <div style={{ flex: 1 }}>
          <TGNumber n={1} color={TG.color.grenadine}/>
          <div style={{ fontFamily: TG.font.display, fontSize: 38, marginTop: 4, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Version primaire.
          </div>
          <div style={{ fontSize: 14, color: TG.color.ink60, marginTop: 12, lineHeight: 1.6, maxWidth: 420 }}>
            Grenadine&nbsp;<span style={{ fontFamily: TG.font.mono, fontSize: 12 }}>#C1262A</span> en fond, papier&nbsp;<span style={{ fontFamily: TG.font.mono, fontSize: 12 }}>#F4ECDD</span> pour la pin évidée et les deux ondes.
            C'est elle qui apparaît sur l'App&nbsp;Store, Google&nbsp;Play, le springboard par défaut, les communications presse.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            <TGChip>1024 × 1024</TGChip>
            <TGChip>SVG vectoriel</TGChip>
            <TGChip>2 ondes</TGChip>
            <TGChip>Pas de texte</TGChip>
          </div>
        </div>
      </div>

      {/* Tailles */}
      <div style={{ marginTop: 40 }}>
        <TGEyebrow>Échelle · de 16 px à 180 px</TGEyebrow>
        <div style={{ fontSize: 13, color: TG.color.ink60, marginTop: 4, maxWidth: 600 }}>
          Les ondes restent lisibles jusqu'à 24&nbsp;px. En-dessous, elles deviennent un halo et c'est très bien.
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginTop: 18, padding: '24px 28px', background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg }}>
          {[16, 24, 32, 48, 60, 72, 120, 180].map(s => (
            <div key={s} style={{ textAlign: 'center' }}>
              <div style={{ width: s, height: s, borderRadius: s * 0.225, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                <MurmureIcon size={s}/>
              </div>
              <div style={{ fontSize: 10, color: TG.color.ink40, fontFamily: TG.font.mono, marginTop: 6 }}>{s}px</div>
            </div>
          ))}
        </div>
      </div>

      {/* Variantes ville */}
      <div style={{ marginTop: 40 }}>
        <TGEyebrow color={TG.color.ocre}>Variantes ville · usage marketing</TGEyebrow>
        <div style={{ fontSize: 13, color: TG.color.ink60, marginTop: 4, maxWidth: 600 }}>
          Pour les éditions saisonnières et pages dédiées à une ville. L'icône App Store reste celle en grenadine.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginTop: 18 }}>
          <MIconTile label="Grenadine · primaire" sub="Sud, art de vivre" bg={TG.color.grenadine} fg={TG.color.paper}/>
          <MIconTile label="Mer · côte" sub="Méditerranée" bg={TG.color.mer} fg={TG.color.paper}/>
          <MIconTile label="Ocre · arrière-pays" sub="Provence terres chaudes" bg={TG.color.ocre} fg={TG.color.paper}/>
          <MIconTile label="Olive · nature" sub="Sentiers forêt" bg={TG.color.olive} fg={TG.color.paper}/>
        </div>
      </div>

      {/* iOS variants */}
      <div style={{ marginTop: 40 }}>
        <TGEyebrow color={TG.color.mer}>iOS 18 · Light / Dark / Tinted / Mono</TGEyebrow>
        <div style={{ fontSize: 13, color: TG.color.ink60, marginTop: 4, maxWidth: 620 }}>
          Apple impose 3 variantes alternatives depuis iOS 18 — on fournit les trois.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, marginTop: 18 }}>
          <MIconTile label="Light · default" bg={TG.color.grenadine} fg={TG.color.paper}/>
          <MIconTile label="Dark mode" sub="Pin paper sur grenadine sombre" bg="#5B0F12" fg="#F4ECDD"/>
          <div>
            <div style={{ width: 200, height: 200, borderRadius: 200 * 0.225, overflow: 'hidden', boxShadow: '0 12px 28px rgba(16,42,67,0.14), 0 0 0 1px rgba(16,42,67,0.06)', background: '#1A1A1A', position: 'relative' }}>
              <svg width="200" height="200" viewBox="0 0 220 220">
                <path d="M110 78 c-26 0 -46 20 -46 46 c0 32 46 72 46 72 s46 -40 46 -72 c0 -26 -20 -46 -46 -46 z" fill="#9CA3AF"/>
                <circle cx="110" cy="124" r="16" fill="#1A1A1A"/>
                <path d="M76,52 Q110,42 144,52" stroke="#9CA3AF" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.95"/>
                <path d="M62,32 Q110,18 158,32" stroke="#9CA3AF" strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.6"/>
              </svg>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.grenadine }}>Tinted</div>
              <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4 }}>Forme grise pleine, teinte système</div>
            </div>
          </div>
          <MIconTile label="Mono" sub="Encre pleine, fond papier" bg={TG.color.paper} fg={TG.color.ink}/>
        </div>
      </div>

      {/* Splash + Favicon + Notif */}
      <div style={{ marginTop: 40 }}>
        <TGEyebrow>Web · Splash · Notifications</TGEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 24, marginTop: 18 }}>

          {/* Splash */}
          <div>
            <div style={{ width: '100%', aspectRatio: '9 / 14', background: TG.color.grenadine, borderRadius: 32, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 140, height: 140, borderRadius: 32, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.25)' }}>
                <MurmureIcon size={140} bg={TG.color.paper} fg={TG.color.grenadine}/>
              </div>
              <div style={{ fontFamily: TG.font.display, fontSize: 32, color: TG.color.paper, marginTop: 24, letterSpacing: '-0.02em' }}>Murmure</div>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 14, color: TG.color.paper, opacity: 0.85, marginTop: 4 }}>Les villes vous parlent.</div>
              <div style={{ position: 'absolute', bottom: 24, left: 0, right: 0, textAlign: 'center', fontSize: 9, letterSpacing: '0.32em', color: TG.color.paper, opacity: 0.55, fontWeight: 700 }}>VERSION 1.0</div>
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.grenadine, marginTop: 12 }}>Splash screen</div>
            <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4 }}>iOS LaunchScreen · Android Splash API.</div>
          </div>

          {/* Favicon */}
          <div>
            <div style={{ background: TG.color.paperDeep, padding: 0, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ background: '#E8E2D3', padding: '10px 12px 0' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }}/>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }}/>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }}/>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  <div style={{ background: TG.color.paper, borderRadius: '6px 6px 0 0', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, maxWidth: 180 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, overflow: 'hidden' }}><MurmureIcon size={16}/></div>
                    <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Murmure</div>
                    <span style={{ fontSize: 12, color: TG.color.ink40 }}>×</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '6px 6px 0 0', padding: '8px 12px', fontSize: 11, color: TG.color.ink40 }}>+</div>
                </div>
              </div>
              <div style={{ background: TG.color.paper, padding: '14px 12px', height: 100 }}>
                <div style={{ height: 6, width: '60%', background: TG.color.paperDeep, borderRadius: 3 }}/>
                <div style={{ height: 6, width: '85%', background: TG.color.paperDeep, borderRadius: 3, marginTop: 6 }}/>
                <div style={{ height: 6, width: '40%', background: TG.color.paperDeep, borderRadius: 3, marginTop: 6 }}/>
              </div>
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.grenadine, marginTop: 12 }}>Favicon</div>
            <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4 }}>16, 32, 192, 512&nbsp;px. SVG en priorité.</div>
          </div>

          {/* Notification */}
          <div>
            <div style={{ background: 'rgba(245, 240, 232, 0.95)', backdropFilter: 'blur(20px)', borderRadius: 22, padding: 14 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <MurmureIcon size={44}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: TG.color.ink }}>Murmure</div>
                    <div style={{ fontSize: 10, color: TG.color.ink40 }}>maintenant</div>
                  </div>
                  <div style={{ fontSize: 12, color: TG.color.ink, fontWeight: 600, marginTop: 2 }}>Vous arrivez Place Saint-François</div>
                  <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 1, lineHeight: 1.4 }}>Le murmure démarre dans 30 s. Tapez pour écouter.</div>
                </div>
              </div>
            </div>
            <div style={{ height: 12 }}/>
            <div style={{ background: 'rgba(245, 240, 232, 0.95)', backdropFilter: 'blur(20px)', borderRadius: 22, padding: 14 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                  <MurmureIcon size={44}/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Téléchargement terminé</div>
                  <div style={{ fontSize: 11, color: TG.color.ink60, marginTop: 2 }}>« Vieux Cannes secret » · 92 Mo · prêt hors-ligne</div>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.grenadine, marginTop: 12 }}>Notifications push</div>
            <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4 }}>Icône système · 44&nbsp;px arrondis 10.</div>
          </div>
        </div>
      </div>

      {/* Springboard */}
      <div style={{ marginTop: 40, padding: 32, borderRadius: TG.radius.xl, background: 'linear-gradient(135deg, #2c4a6e 0%, #4a3a5e 100%)' }}>
        <TGEyebrow color="rgba(255,255,255,0.75)">Sur le springboard, parmi les autres apps</TGEyebrow>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 22, justifyItems: 'center' }}>
          {[
            { lab: 'Messages', bg: '#34C759', char: '💬' },
            { lab: 'Plans',    bg: '#007AFF', char: '◐' },
            { lab: 'Murmure',  bg: TG.color.grenadine, isReal: true },
            { lab: 'Photos',   bg: '#FFD60A', char: '✿' },
            { lab: 'Notes',    bg: '#FF9F0A', char: 'N' },
            { lab: 'Musique',  bg: '#FF2D55', char: '♪' },
          ].map((it, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ width: 76, height: 76, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: it.bg, color: '#fff', fontSize: 32 }}>
                {it.isReal ? <MurmureIcon size={76}/> : it.char}
              </div>
              <div style={{ fontSize: 11, color: '#fff', marginTop: 8, fontWeight: it.isReal ? 700 : 500, opacity: it.isReal ? 1 : 0.85 }}>{it.lab}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 24, textAlign: 'center', fontFamily: TG.font.editorial, fontStyle: 'italic' }}>
          Elle se distingue sans crier — la grenadine accroche l'œil, les ondes lui donnent du souffle.
        </div>
      </div>
    </div>
  );
}

window.MurmureIconFinalPage = MurmureIconFinalPage;
window.MurmureIcon = MurmureIcon;
