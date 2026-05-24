// TourGuide DS — App icons (iOS/Android launcher)
// 8 pistes graphiques sur la même grille
// Format de référence : 1024×1024 (App Store), arrondi automatique iOS

function AppIconGrid() {
  const SIZE = 220; // taille d'affichage
  const variants = [
    { id: 1, name: 'Pin classique',     desc: 'Épingle grenadine sur papier crème. Lecture instantanée, fidèle au logo.', el: <V1 size={SIZE}/> },
    { id: 2, name: 'Pin sur carte',     desc: 'Épingle ocre posée sur fragment de carte. Raconte ce que fait l\'app.', el: <V2 size={SIZE}/> },
    { id: 3, name: 'Onde + pin',        desc: 'Épingle traversée d\'une onde audio. Fusionne les deux ADN : carte + voix.', el: <V3 size={SIZE}/> },
    { id: 4, name: 'Color-block 4 villes', desc: 'Quatre quadrants couleur, pin centrale en blanc. Affirme la dimension multi-ville.', el: <V4 size={SIZE}/> },
    { id: 5, name: 'Pin négatif',       desc: 'Pin évidée sur fond grenadine. Plus moderne, plus iconique.', el: <V5 size={SIZE}/> },
    { id: 6, name: 'Monogramme T·G',    desc: 'Initiales en DM Serif sur fond papier. Plus éditorial, plus marque.', el: <V6 size={SIZE}/> },
    { id: 7, name: 'Pin + N°',          desc: 'Pin avec numéro, comme une étape. Réfère au système de tours numérotés.', el: <V7 size={SIZE}/> },
    { id: 8, name: 'Carte abstraite',   desc: 'Réseau de routes formant un T. Plus abstrait, fonctionne mieux en petit.', el: <V8 size={SIZE}/> },
  ];

  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 56, boxSizing: 'border-box' }}>
      <TGEyebrow color={TG.color.grenadine}>App icon · 8 pistes</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 56, fontWeight: 400, margin: '8px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        L'icône qu'on tape<br/>tous les matins.
      </h1>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 17, color: TG.color.ink60, maxWidth: 720 }}>
        Toutes les pistes sont rendues à 220&nbsp;px puis prévisualisées à 60&nbsp;px (taille springboard) pour vérifier la lisibilité au format réel.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, marginTop: 36 }}>
        {variants.map(v => (
          <div key={v.id}>
            <div style={{ position: 'relative', width: SIZE, height: SIZE, margin: '0 auto', borderRadius: 50, overflow: 'hidden', boxShadow: '0 12px 28px rgba(16,42,67,0.12), 0 0 0 1px rgba(16,42,67,0.06)' }}>
              {v.el}
            </div>
            {/* mini preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <div style={{ width: 60, height: 60, borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.12)', flexShrink: 0 }}>
                <div style={{ transform: `scale(${60/SIZE})`, transformOrigin: 'top left', width: SIZE, height: SIZE }}>
                  <div style={{ width: SIZE, height: SIZE, borderRadius: 50, overflow: 'hidden' }}>
                    {React.cloneElement(v.el, { size: SIZE })}
                  </div>
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.18em', fontWeight: 700, color: TG.color.grenadine }}>№ 0{v.id}</div>
                <div style={{ fontFamily: TG.font.display, fontSize: 18, marginTop: 2 }}>{v.name}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 8, lineHeight: 1.5 }}>{v.desc}</div>
          </div>
        ))}
      </div>

      {/* Mock springboard */}
      <div style={{ marginTop: 56, padding: 36, borderRadius: TG.radius.xl, background: 'linear-gradient(135deg, #2c4a6e 0%, #4a3a5e 100%)' }}>
        <TGEyebrow color="rgba(255,255,255,0.7)">Aperçu sur springboard iOS</TGEyebrow>
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 18, justifyItems: 'center' }}>
          {variants.map(v => (
            <div key={v.id} style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                <div style={{ transform: `scale(${72/SIZE})`, transformOrigin: 'top left', width: SIZE, height: SIZE }}>
                  <div style={{ width: SIZE, height: SIZE, borderRadius: 50, overflow: 'hidden' }}>
                    {React.cloneElement(v.el, { size: SIZE })}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#fff', marginTop: 6, fontWeight: 500 }}>TourGuide</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Variantes ───────────────────────────
// Toutes prennent { size } et remplissent un carré size×size

// V1 — Pin grenadine sur papier
function V1({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.paper, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        <path d="M110 38 c-30 0 -54 24 -54 54 c0 38 54 78 54 78 s54 -40 54 -78 c0 -30 -24 -54 -54 -54 z"
              fill={TG.color.grenadine}/>
        <circle cx="110" cy="92" r="20" fill={TG.color.paper}/>
      </svg>
    </div>
  );
}

// V2 — Pin ocre sur carte
function V2({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.paperDeep, position: 'relative', overflow: 'hidden' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* grille */}
        <defs>
          <pattern id="dots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill={TG.color.ink40} opacity="0.45"/>
          </pattern>
        </defs>
        <rect width="220" height="220" fill="url(#dots)"/>
        {/* routes */}
        <path d="M0,140 Q70,110 130,130 T220,115" stroke={TG.color.ink40} strokeWidth="3" fill="none" strokeDasharray="6 6" opacity="0.55"/>
        <path d="M50,0 Q70,110 40,220" stroke={TG.color.ink40} strokeWidth="2.5" fill="none" opacity="0.45"/>
        <path d="M170,0 Q150,90 180,220" stroke={TG.color.ink40} strokeWidth="2.5" fill="none" opacity="0.45"/>
        {/* pin */}
        <g transform="translate(110 60)">
          <ellipse cx="0" cy="105" rx="24" ry="6" fill={TG.color.ink} opacity="0.18"/>
          <path d="M0 0 c-30 0 -54 24 -54 54 c0 38 54 78 54 78 s54 -40 54 -78 c0 -30 -24 -54 -54 -54 z"
                fill={TG.color.ocre}/>
          <circle cx="0" cy="54" r="20" fill={TG.color.paper}/>
        </g>
      </svg>
    </div>
  );
}

// V3 — Onde + pin (audio + carte)
function V3({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.ink, position: 'relative', overflow: 'hidden' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* onde concentrique */}
        <circle cx="110" cy="110" r="40" fill="none" stroke={TG.color.grenadine} strokeWidth="3" opacity="0.5"/>
        <circle cx="110" cy="110" r="60" fill="none" stroke={TG.color.grenadine} strokeWidth="2" opacity="0.35"/>
        <circle cx="110" cy="110" r="82" fill="none" stroke={TG.color.grenadine} strokeWidth="1.5" opacity="0.22"/>
        {/* pin grenadine */}
        <g transform="translate(110 70)">
          <path d="M0 0 c-26 0 -46 20 -46 46 c0 32 46 70 46 70 s46 -38 46 -70 c0 -26 -20 -46 -46 -46 z"
                fill={TG.color.grenadine}/>
          <circle cx="0" cy="46" r="17" fill={TG.color.paper}/>
        </g>
      </svg>
    </div>
  );
}

// V4 — Color-block 4 villes
function V4({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' }}>
        <div style={{ background: TG.color.ocre }}/>
        <div style={{ background: TG.color.mer }}/>
        <div style={{ background: TG.color.olive }}/>
        <div style={{ background: TG.color.grenadine }}/>
      </div>
      {/* pin blanche centrale, débordante */}
      <svg width={size} height={size} viewBox="0 0 220 220" style={{ position: 'absolute', inset: 0 }}>
        <g transform="translate(110 64)">
          <path d="M0 0 c-32 0 -56 24 -56 56 c0 40 56 82 56 82 s56 -42 56 -82 c0 -32 -24 -56 -56 -56 z"
                fill={TG.color.paper}/>
          <circle cx="0" cy="56" r="21" fill={TG.color.ink}/>
        </g>
      </svg>
    </div>
  );
}

// V5 — Pin évidée (négatif) sur grenadine
function V5({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.grenadine, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        <defs>
          <mask id="cut">
            <rect width="220" height="220" fill="#fff"/>
            <path d="M110 38 c-30 0 -54 24 -54 54 c0 38 54 78 54 78 s54 -40 54 -78 c0 -30 -24 -54 -54 -54 z" fill="#000"/>
            <circle cx="110" cy="92" r="18" fill="#fff"/>
          </mask>
        </defs>
        <rect width="220" height="220" fill={TG.color.grenadine} mask="url(#cut)"/>
        {/* fond papier qui apparaît dans le trou */}
        <g style={{ mixBlendMode: 'normal' }}>
          <path d="M110 38 c-30 0 -54 24 -54 54 c0 38 54 78 54 78 s54 -40 54 -78 c0 -30 -24 -54 -54 -54 z" fill={TG.color.paper}/>
          <circle cx="110" cy="92" r="18" fill={TG.color.grenadine}/>
        </g>
      </svg>
    </div>
  );
}

// V6 — Monogramme T·G éditorial
function V6({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.paper, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 22, left: 0, right: 0, textAlign: 'center', fontSize: 11, letterSpacing: '0.32em', color: TG.color.ink40, fontWeight: 700 }}>TOURGUIDE</div>
      <div style={{ fontFamily: TG.font.display, fontSize: 132, lineHeight: 1, color: TG.color.ink, position: 'relative' }}>
        T<span style={{ color: TG.color.grenadine, fontFamily: TG.font.editorial, fontStyle: 'italic' }}>g</span>
      </div>
      <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ width: 28, height: 2, background: TG.color.grenadine, margin: '0 auto' }}/>
      </div>
    </div>
  );
}

// V7 — Pin avec numéro 1 (étape)
function V7({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.merSoft, position: 'relative', overflow: 'hidden' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* trace de parcours en arrière-plan */}
        <path d="M30,170 Q70,150 110,90 T200,40" stroke={TG.color.mer} strokeWidth="3" fill="none" strokeDasharray="5 5" opacity="0.4"/>
        <circle cx="30" cy="170" r="6" fill={TG.color.mer} opacity="0.5"/>
        <circle cx="200" cy="40" r="6" fill={TG.color.mer} opacity="0.5"/>
        <g transform="translate(110 50)">
          <path d="M0 0 c-32 0 -56 24 -56 56 c0 42 56 86 56 86 s56 -44 56 -86 c0 -32 -24 -56 -56 -56 z"
                fill={TG.color.mer}/>
          <circle cx="0" cy="56" r="24" fill={TG.color.paper}/>
          <text x="0" y="64" textAnchor="middle" fontFamily="DM Serif Display, Georgia, serif" fontSize="32" fill={TG.color.mer}>1</text>
        </g>
      </svg>
    </div>
  );
}

// V8 — Carte abstraite formant un T
function V8({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.olive, position: 'relative', overflow: 'hidden' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* routes formant un T stylisé */}
        <path d="M40,60 L180,60" stroke={TG.color.paper} strokeWidth="22" strokeLinecap="round" fill="none"/>
        <path d="M110,60 L110,180" stroke={TG.color.paper} strokeWidth="22" strokeLinecap="round" fill="none"/>
        {/* points-épingles aux extrémités */}
        <circle cx="40" cy="60" r="14" fill={TG.color.grenadine}/>
        <circle cx="180" cy="60" r="14" fill={TG.color.ocre}/>
        <circle cx="110" cy="180" r="16" fill={TG.color.paper}/>
        <circle cx="110" cy="180" r="6" fill={TG.color.olive}/>
      </svg>
    </div>
  );
}

window.AppIconGrid = AppIconGrid;
