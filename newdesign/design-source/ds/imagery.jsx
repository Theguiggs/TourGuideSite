// TourGuide DS — Imagerie : 3 pistes pour trancher
// Pas de photos pour l'instant — on présente trois traitements possibles côte-à-côte

function ImageryPage() {
  return (
    <div style={{ width: 1040, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 48, boxSizing: 'border-box' }}>
      <TGEyebrow color={TG.color.grenadine}>Imagerie · à trancher</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 56, fontWeight: 400, margin: '8px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        Trois pistes,<br/>un seul vainqueur.
      </h1>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 17, color: TG.color.ink60, maxWidth: 680 }}>
        Avant de produire 42 visuels, on choisit la grammaire. Voici trois traitements appliqués au même tour&nbsp;: « Centre historique de Grasse ».
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 32 }}>

        {/* Option A — Color-block + typo */}
        <Card label="A · Color-block typographique" reco="Production immédiate. Coût quasi nul. Identité forte.">
          <div style={{ background: TG.color.ocre, color: TG.color.paper, padding: 24, height: 280, borderRadius: TG.radius.lg, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }}/>
            <IconPin size={28} color={TG.color.paper}/>
            <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.22em', fontWeight: 700 }}>GRASSE</div>
              <div style={{ fontFamily: TG.font.display, fontSize: 32, lineHeight: 1.05, marginTop: 6 }}>Centre<br/>historique</div>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, marginTop: 8, opacity: 0.85 }}>« Souvenir de mimosa. »</div>
            </div>
          </div>
        </Card>

        {/* Option B — Illustration papier */}
        <Card label="B · Illustration papier" reco="Mémorable, très propriétaire. Demande un illustrateur.">
          <div style={{ background: TG.color.paperDeep, padding: 0, height: 280, borderRadius: TG.radius.lg, position: 'relative', overflow: 'hidden' }}>
            {/* Illustration vectorielle papier découpé */}
            <svg width="100%" height="100%" viewBox="0 0 240 280" preserveAspectRatio="xMidYMid slice">
              {/* ciel */}
              <rect width="240" height="280" fill={TG.color.paperSoft}/>
              <circle cx="190" cy="58" r="28" fill={TG.color.ocreSoft}/>
              {/* collines */}
              <path d="M0,180 Q60,140 120,160 T240,150 L240,280 L0,280Z" fill={TG.color.olive} opacity="0.5"/>
              <path d="M0,200 Q80,170 140,190 T240,180 L240,280 L0,280Z" fill={TG.color.olive}/>
              {/* maisons */}
              <rect x="50" y="140" width="34" height="50" fill={TG.color.ocre}/>
              <polygon points="50,140 67,120 84,140" fill={TG.color.grenadine}/>
              <rect x="92" y="130" width="28" height="60" fill={TG.color.paperDeep}/>
              <polygon points="92,130 106,114 120,130" fill={TG.color.ardoise}/>
              <rect x="128" y="148" width="38" height="42" fill={TG.color.paper}/>
              <polygon points="128,148 147,128 166,148" fill={TG.color.ocre}/>
              {/* cyprès */}
              <ellipse cx="30" cy="170" rx="6" ry="22" fill={TG.color.olive}/>
              <ellipse cx="200" cy="178" rx="5" ry="18" fill={TG.color.olive}/>
              {/* fenêtres */}
              <rect x="58" y="155" width="6" height="10" fill={TG.color.ink} opacity="0.4"/>
              <rect x="70" y="155" width="6" height="10" fill={TG.color.ink} opacity="0.4"/>
              <rect x="58" y="172" width="6" height="10" fill={TG.color.ink} opacity="0.4"/>
              <rect x="70" y="172" width="6" height="10" fill={TG.color.ink} opacity="0.4"/>
              {/* pin */}
              <g transform="translate(165 70)">
                <path d="M0,0 c-7,0 -12,5 -12,12 c0,9 12,18 12,18 s12,-9 12,-18 c0,-7 -5,-12 -12,-12 z" fill={TG.color.grenadine}/>
                <circle r="4" cx="0" cy="12" fill={TG.color.paper}/>
              </g>
            </svg>
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, color: TG.color.ink, background: TG.color.paper, padding: '8px 12px', borderRadius: TG.radius.md, fontFamily: TG.font.display, fontSize: 16 }}>
              Centre historique · Grasse
            </div>
          </div>
        </Card>

        {/* Option C — Photo argentique traitée */}
        <Card label="C · Photo argentique" reco="Émotionnel, chaleureux. Coût élevé, gestion des droits.">
          <div style={{ height: 280, borderRadius: TG.radius.lg, overflow: 'hidden', position: 'relative',
            background: `linear-gradient(135deg, #C8956A 0%, #8A5A3A 50%, #4D3220 100%)`,
          }}>
            {/* Faux grain */}
            <div style={{ position: 'absolute', inset: 0,
              backgroundImage: `radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.15) 1px, transparent 1px)`,
              backgroundSize: '4px 4px, 7px 7px',
            }}/>
            {/* Suggestion d'architecture */}
            <svg width="100%" height="100%" viewBox="0 0 240 280" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', inset: 0 }}>
              <path d="M0,200 L70,120 L70,280 L0,280Z" fill="rgba(0,0,0,0.4)"/>
              <path d="M70,120 L130,80 L130,280 L70,280Z" fill="rgba(0,0,0,0.25)"/>
              <path d="M130,140 L190,100 L240,140 L240,280 L130,280Z" fill="rgba(0,0,0,0.35)"/>
              <rect x="20" y="180" width="8" height="14" fill="rgba(255,220,150,0.6)"/>
              <rect x="44" y="190" width="6" height="12" fill="rgba(255,220,150,0.5)"/>
              <rect x="98" y="160" width="6" height="12" fill="rgba(255,220,150,0.7)"/>
            </svg>
            {/* Vignettage */}
            <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)' }}/>
            <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, color: TG.color.paper }}>
              <div style={{ fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, opacity: 0.85 }}>GRASSE · 1962</div>
              <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 6, lineHeight: 1.05 }}>Centre historique</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Reco */}
      <div style={{ marginTop: 36, padding: 28, borderRadius: TG.radius.lg, background: TG.color.grenadineSoft, border: `1.5px solid ${TG.color.grenadine}` }}>
        <TGEyebrow color={TG.color.grenadine}>Recommandation</TGEyebrow>
        <div style={{ fontFamily: TG.font.display, fontSize: 28, marginTop: 6, letterSpacing: '-0.02em' }}>
          A en standard, B pour les pages éditoriales.
        </div>
        <div style={{ fontSize: 14, color: TG.color.ink80, marginTop: 8, lineHeight: 1.55, maxWidth: 760 }}>
          Le color-block (A) couvre 90 % des besoins (cartes de tour, hero d'app, partage social) sans coût d'asset.
          On garde l'illustration papier (B) pour 4-6 pages héro web et la couverture des « éditions » saisonnières — chaque illustrateur·rice est crédité·e (signature éditoriale).
          On reporte la photo (C) à plus tard, ou on la cantonne aux portraits de guides — chaud, humain, mais lourd à industrialiser.
        </div>
      </div>
    </div>
  );
}

function Card({ label, reco, children }) {
  return (
    <div>
      {children}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.ink }}>{label}</div>
        <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4, lineHeight: 1.5 }}>{reco}</div>
      </div>
    </div>
  );
}

window.ImageryPage = ImageryPage;
