// Murmure — App icons (alignées sur le nouveau nom)
// 6 pistes qui combinent voix + lieu + intimité

function MurmureIconGrid() {
  const SIZE = 220;

  const variants = [
    {
      id: 1,
      name: 'Pin + onde douce',
      desc: 'L\'épingle traversée d\'une seule onde fine. Garde l\'ADN carte mais ajoute la voix. Le plus continu avec la charte actuelle.',
      el: <V1 size={SIZE}/>,
    },
    {
      id: 2,
      name: 'Lèvres murmurées',
      desc: 'Forme abstraite de lèvres + rond doux. Référence directe au geste de chuchoter. Très intime.',
      el: <V2 size={SIZE}/>,
    },
    {
      id: 3,
      name: 'Onde vocale concentrique',
      desc: 'Trois ondes qui s\'élargissent depuis un point. Pure synthèse audio, sans pin. Très iconique.',
      el: <V3 size={SIZE}/>,
    },
    {
      id: 4,
      name: 'Bulle de souffle',
      desc: 'Une bulle phylactère arrondie sur fond chaud. Référence à la parole silencieuse, à l\'intime.',
      el: <V4 size={SIZE}/>,
    },
    {
      id: 5,
      name: 'M typographique',
      desc: 'Le M de Murmure en DM Serif Display, éditorial pur. Très brand, moins descriptif.',
      el: <V5 size={SIZE}/>,
    },
    {
      id: 6,
      name: 'Pin évidée + ondes',
      desc: 'L\'icône précédente (Pin négatif) mais avec deux ondes qui s\'échappent vers le haut. Évolution douce.',
      el: <V6 size={SIZE}/>,
    },
  ];

  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 56, boxSizing: 'border-box' }}>
      <TGEyebrow color={TG.color.grenadine}>Murmure · App icon · 6 pistes alignées sur le nom</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 56, fontWeight: 400, margin: '8px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        Une icône qui<br/><em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic' }}>chuchote</em>.
      </h1>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 17, color: TG.color.ink60, maxWidth: 720 }}>
        L'ancien Pin négatif disait « voici un lieu ». La nouvelle icône doit dire « voici une voix qui parle de ce lieu ». Plus intime, plus douce, plus aérienne.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 28, marginTop: 36 }}>
        {variants.map(v => (
          <div key={v.id}>
            <div style={{ width: SIZE, height: SIZE, margin: '0 auto', borderRadius: 50, overflow: 'hidden', boxShadow: '0 12px 28px rgba(16,42,67,0.12), 0 0 0 1px rgba(16,42,67,0.06)' }}>
              {v.el}
            </div>
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

      {/* Springboard comparé */}
      <div style={{ marginTop: 56, padding: 36, borderRadius: TG.radius.xl, background: 'linear-gradient(135deg, #2c4a6e 0%, #4a3a5e 100%)' }}>
        <TGEyebrow color="rgba(255,255,255,0.7)">Sur le springboard, parmi les autres apps</TGEyebrow>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 22, justifyItems: 'center' }}>
          {variants.map(v => (
            <div key={v.id} style={{ textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
                <div style={{ transform: `scale(${72/SIZE})`, transformOrigin: 'top left', width: SIZE, height: SIZE }}>
                  <div style={{ width: SIZE, height: SIZE, borderRadius: 50, overflow: 'hidden' }}>
                    {React.cloneElement(v.el, { size: SIZE })}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#fff', marginTop: 6, fontWeight: 600 }}>Murmure</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommandation */}
      <div style={{ marginTop: 36, padding: 24, background: TG.color.grenadineSoft, border: `1.5px solid ${TG.color.grenadine}`, borderRadius: TG.radius.lg }}>
        <TGEyebrow color={TG.color.grenadine}>Ma recommandation</TGEyebrow>
        <div style={{ fontFamily: TG.font.display, fontSize: 24, marginTop: 6, lineHeight: 1.2 }}>
          № 06 — Pin évidée + ondes
        </div>
        <div style={{ fontSize: 14, color: TG.color.ink80, marginTop: 8, lineHeight: 1.55, maxWidth: 720 }}>
          C'est l'évolution la plus douce depuis l'icône actuelle : on garde l'ADN épingle (donc la cohérence avec tout le DS construit), et on ajoute deux ondes fines qui transforment « lieu marqué » en « lieu qui parle ». Lisible à 16&nbsp;px, mémorable, et raconte exactement ce que fait Murmure.
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Variantes ───────────────────────────

// V1 — Pin grenadine + une onde fine qui passe à travers
function V1({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.paper, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* onde horizontale qui traverse */}
        <path d="M20,118 Q60,108 110,118 T200,118" stroke={TG.color.grenadine} strokeWidth="2.5" fill="none" opacity="0.45"/>
        <path d="M30,134 Q70,126 110,134 T190,134" stroke={TG.color.grenadine} strokeWidth="1.8" fill="none" opacity="0.25"/>
        {/* pin */}
        <path d="M110 38 c-30 0 -54 24 -54 54 c0 38 54 78 54 78 s54 -40 54 -78 c0 -30 -24 -54 -54 -54 z"
              fill={TG.color.grenadine}/>
        <circle cx="110" cy="92" r="20" fill={TG.color.paper}/>
      </svg>
    </div>
  );
}

// V2 — Lèvres murmurées (très abstraites)
function V2({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.paperDeep, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* deux courbes douces évoquant des lèvres */}
        <path d="M50,110 Q110,80 170,110 Q110,138 50,110 Z" fill={TG.color.grenadine}/>
        <path d="M70,108 Q110,96 150,108" stroke={TG.color.paper} strokeWidth="2" fill="none" opacity="0.7"/>
        {/* petit point — l'âme du chuchotement */}
        <circle cx="110" cy="148" r="4" fill={TG.color.grenadine}/>
      </svg>
    </div>
  );
}

// V3 — Onde vocale concentrique pure
function V3({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.grenadine, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* point source */}
        <circle cx="110" cy="110" r="10" fill={TG.color.paper}/>
        {/* ondes concentriques */}
        <circle cx="110" cy="110" r="32" fill="none" stroke={TG.color.paper} strokeWidth="3" opacity="0.85"/>
        <circle cx="110" cy="110" r="56" fill="none" stroke={TG.color.paper} strokeWidth="2.5" opacity="0.55"/>
        <circle cx="110" cy="110" r="80" fill="none" stroke={TG.color.paper} strokeWidth="2" opacity="0.3"/>
      </svg>
    </div>
  );
}

// V4 — Bulle de souffle (phylactère doux)
function V4({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.ocre, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* bulle phylactère arrondie */}
        <path d="M60,60 Q60,40 80,40 L160,40 Q180,40 180,60 L180,130 Q180,150 160,150 L120,150 L100,180 L100,150 L80,150 Q60,150 60,130 Z"
              fill={TG.color.paper}/>
        {/* trois petits points — silence éloquent */}
        <circle cx="100" cy="95" r="6" fill={TG.color.ocre}/>
        <circle cx="120" cy="95" r="6" fill={TG.color.ocre}/>
        <circle cx="140" cy="95" r="6" fill={TG.color.ocre}/>
      </svg>
    </div>
  );
}

// V5 — M typographique (DM Serif)
function V5({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.paper, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 22, left: 0, right: 0, textAlign: 'center', fontSize: 11, letterSpacing: '0.36em', color: TG.color.ink40, fontWeight: 700 }}>MURMURE</div>
      <div style={{ fontFamily: TG.font.display, fontSize: 168, lineHeight: 1, color: TG.color.grenadine, marginTop: 12 }}>
        M
      </div>
      <div style={{ position: 'absolute', bottom: 26, left: 0, right: 0, textAlign: 'center' }}>
        <div style={{ width: 28, height: 2, background: TG.color.grenadine, margin: '0 auto'}}/>
      </div>
    </div>
  );
}

// V6 — Pin évidée + ondes (évolution recommandée)
function V6({ size = 220 }) {
  return (
    <div style={{ width: size, height: size, background: TG.color.grenadine, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 220 220">
        {/* pin évidée */}
        <defs>
          <mask id="cut6">
            <rect width="220" height="220" fill="#fff"/>
            <path d="M110 78 c-26 0 -46 20 -46 46 c0 32 46 72 46 72 s46 -40 46 -72 c0 -26 -20 -46 -46 -46 z" fill="#000"/>
            <circle cx="110" cy="124" r="16" fill="#fff"/>
          </mask>
        </defs>
        {/* fond grenadine percé par la pin */}
        <rect width="220" height="220" fill={TG.color.grenadine} mask="url(#cut6)"/>
        {/* couleur papier qui apparaît dans le trou de la pin */}
        <path d="M110 78 c-26 0 -46 20 -46 46 c0 32 46 72 46 72 s46 -40 46 -72 c0 -26 -20 -46 -46 -46 z" fill={TG.color.paper}/>
        <circle cx="110" cy="124" r="16" fill={TG.color.grenadine}/>
        {/* ondes qui s'échappent par le haut */}
        <path d="M76,52 Q110,42 144,52" stroke={TG.color.paper} strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.95"/>
        <path d="M62,32 Q110,18 158,32" stroke={TG.color.paper} strokeWidth="2.8" fill="none" strokeLinecap="round" opacity="0.6"/>
      </svg>
    </div>
  );
}

window.MurmureIconGrid = MurmureIconGrid;
