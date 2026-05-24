// TourGuide Design System — v1
// Direction: Cartographic Color-block + voix éditoriale
// Tokens exposés globalement sous TG.*

window.TG = {
  // ── Foundation colors ────────────────────────────────
  color: {
    // surfaces (papier)
    paper:     '#FBF7F1',   // base
    paperDeep: '#F4EEE1',   // alt bg, bloc
    paperSoft: '#F8F3EA',   // card sur paper
    card:      '#FFFFFF',   // card neutre
    // encre
    ink:       '#102A43',   // text primaire
    ink80:     '#234866',
    ink60:     '#5A7389',
    ink40:     '#8B9AAB',
    ink20:     'rgba(16,42,67,0.12)',
    line:      'rgba(16,42,67,0.12)',
    lineSoft:  'rgba(16,42,67,0.06)',
    // accents ville (color-block)
    mer:       '#2B6CB0',   // Nice · Cannes littoral
    merSoft:   '#E4EEF7',
    ocre:      '#D17A22',   // Grasse · Provence
    ocreSoft:  '#FBEEDE',
    olive:     '#5B8C5A',   // nature · Autran
    oliveSoft: '#E8EFE6',
    grenadine: '#C44A6E',   // marque — accent principal
    grenadineSoft: '#F8E4EA',
    ardoise:   '#4A5A75',   // Paris
    ardoiseSoft: '#E6E9EF',
    // sémantique
    success:   '#5B8C5A',
    warn:      '#D17A22',
    danger:    '#C44A6E',
  },
  // ── Typography ──────────────────────────────────────
  font: {
    display: '"DM Serif Display", Georgia, serif',
    editorial: '"Fraunces", Georgia, serif', // touches éditoriales (citations, numérotation)
    sans: '"Manrope", -apple-system, system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, monospace',
  },
  // ── Scale ───────────────────────────────────────────
  size: {
    display1: 72,  // landing hero
    display2: 48,  // page title web
    h1: 32,        // app title
    h2: 24,
    h3: 20,
    body: 15,
    small: 13,
    micro: 11,
    eyebrow: 10.5, // overline, letterspaced
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  space:  { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 },
  shadow: {
    soft: '0 1px 2px rgba(16,42,67,0.06), 0 4px 12px rgba(16,42,67,0.06)',
    card: '0 2px 4px rgba(16,42,67,0.04), 0 8px 24px rgba(16,42,67,0.08)',
    pop:  '0 4px 8px rgba(16,42,67,0.08), 0 20px 40px rgba(16,42,67,0.12)',
  },
};

// ── Primitives exposés ─────────────────────────────────
// Pin de carte — marqueur signature
function TGPin({ color = TG.color.grenadine, size = 24, label }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={size} height={size * 1.2} viewBox="0 0 24 29">
        <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 17 12 17s12-8 12-17c0-6.6-5.4-12-12-12z" fill={color}/>
        <circle cx="12" cy="12" r="4.5" fill={TG.color.paper}/>
      </svg>
      {label && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-65%)',
          fontSize: 8, fontWeight: 700, color: TG.color.paper,
        }}>{label}</div>
      )}
    </div>
  );
}

// Bouton
function TGButton({ variant = 'primary', size = 'md', children, icon, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none',
    fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.01em',
    fontFamily: TG.font.sans,
  };
  const sizes = {
    sm: { padding: '8px 14px', fontSize: 13, borderRadius: TG.radius.md },
    md: { padding: '12px 18px', fontSize: 14, borderRadius: TG.radius.md },
    lg: { padding: '16px 22px', fontSize: 15, borderRadius: TG.radius.md },
  };
  const variants = {
    primary:  { background: TG.color.ink,       color: TG.color.paper },
    accent:   { background: TG.color.grenadine, color: TG.color.paper },
    ghost:    { background: 'transparent', color: TG.color.ink, border: `1.5px solid ${TG.color.ink}` },
    quiet:    { background: TG.color.paperDeep, color: TG.color.ink },
  };
  return (
    <button style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {icon}<span>{children}</span>
    </button>
  );
}

// Chip
function TGChip({ active, color, children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, padding: '7px 14px', borderRadius: TG.radius.pill,
      background: active ? (color || TG.color.ink) : 'transparent',
      color: active ? TG.color.paper : TG.color.ink80,
      border: `1px solid ${active ? (color || TG.color.ink) : TG.color.line}`,
      fontFamily: TG.font.sans, whiteSpace: 'nowrap',
    }}>{children}</div>
  );
}

// Eyebrow label (editorial touch)
function TGEyebrow({ children, color }) {
  return (
    <div style={{
      fontSize: 10.5, letterSpacing: '0.22em', textTransform: 'uppercase',
      color: color || TG.color.ink40, fontWeight: 600, fontFamily: TG.font.sans,
    }}>{children}</div>
  );
}

// Number tag editorial (« № 03 »)
function TGNumber({ n, color }) {
  return (
    <span style={{
      fontFamily: TG.font.editorial, fontStyle: 'italic',
      fontSize: 14, color: color || TG.color.ink40,
    }}>№&nbsp;{String(n).padStart(2, '0')}</span>
  );
}

// Map backdrop
function TGMap({ height = 200, pins = [{ x: 49, y: 52, color: TG.color.grenadine }] }) {
  return (
    <div style={{
      height, borderRadius: TG.radius.lg, background: TG.color.paperDeep,
      backgroundImage: `radial-gradient(${TG.color.ink40}44 1px, transparent 1px)`,
      backgroundSize: '12px 12px', position: 'relative', overflow: 'hidden',
      border: `1px solid ${TG.color.line}`,
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} preserveAspectRatio="none" viewBox="0 0 400 200">
        <path d="M0,120 Q100,80 200,110 T400,90" stroke={TG.color.ink40} strokeWidth="1.5" fill="none" strokeDasharray="4 4" opacity="0.6"/>
        <path d="M60,0 Q80,100 140,200" stroke={TG.color.ink40} strokeWidth="1" fill="none" opacity="0.4"/>
        <path d="M280,0 Q250,80 300,200" stroke={TG.color.ink40} strokeWidth="1" fill="none" opacity="0.4"/>
      </svg>
      {pins.map((p, i) => (
        <div key={i} style={{ position: 'absolute', top: `${p.y}%`, left: `${p.x}%`, transform: 'translate(-50%,-100%)' }}>
          <TGPin color={p.color} size={p.size || 22}/>
        </div>
      ))}
    </div>
  );
}

// Mini player block — rend audio visible
function TGPlayer({ title, guide, city, cityColor = TG.color.grenadine, current = '04:32', total = '10:48', progress = 0.42 }) {
  return (
    <div style={{ background: TG.color.card, borderRadius: TG.radius.lg, padding: 16, border: `1px solid ${TG.color.line}`, boxShadow: TG.shadow.card }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: TG.radius.md, background: cityColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><TGPin color={TG.color.paper} size={22}/></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: cityColor, fontWeight: 700 }}>{city?.toUpperCase()}</div>
          <div style={{ fontFamily: TG.font.display, fontSize: 17, color: TG.color.ink, lineHeight: 1.15, marginTop: 2 }}>{title}</div>
          {guide && <div style={{ fontSize: 11, color: TG.color.ink60 }}>{guide}</div>}
        </div>
        <button style={{
          width: 44, height: 44, borderRadius: '50%', background: TG.color.ink,
          color: TG.color.paper, border: 'none', fontSize: 16,
        }}>▶</button>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ height: 3, background: TG.color.paperDeep, borderRadius: 2, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, width: `${progress*100}%`, background: cityColor, borderRadius: 2 }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: TG.color.ink40, fontFamily: TG.font.mono }}>
          <span>{current}</span><span>{total}</span>
        </div>
      </div>
    </div>
  );
}

// Tour card — base, réutilisable
function TGTourCard({ tour }) {
  const cityColor = tour.cityColor || TG.color.grenadine;
  return (
    <div style={{
      display: 'flex', gap: 12, padding: 12, borderRadius: TG.radius.lg,
      border: `1px solid ${TG.color.line}`, background: TG.color.card,
    }}>
      <div style={{
        width: 76, borderRadius: TG.radius.md, background: cityColor,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: TG.color.paper, flexShrink: 0, padding: 8,
      }}>
        <TGPin color={TG.color.paper} size={20}/>
        <div style={{ fontSize: 9, letterSpacing: '0.12em', fontWeight: 700, marginTop: 4 }}>{tour.city.toUpperCase()}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <TGNumber n={tour.n || 1}/>
          <div style={{ fontSize: 11, fontWeight: 700, color: tour.price === 'Gratuit' ? TG.color.olive : TG.color.ink }}>{tour.price}</div>
        </div>
        <div style={{ fontFamily: TG.font.display, fontSize: 18, letterSpacing: '-0.01em', marginTop: 2, color: TG.color.ink, lineHeight: 1.15 }}>
          {tour.title}
        </div>
        {tour.tagline && (
          <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink60, marginTop: 4, lineHeight: 1.4 }}>
            « {tour.tagline} »
          </div>
        )}
        <div style={{ fontSize: 11, color: TG.color.ink40, marginTop: 6, display: 'flex', gap: 8 }}>
          <span>{tour.min} min</span><span>·</span><span>{tour.poi} arrêts</span><span>·</span><span>{tour.lang || 'FR·EN'}</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TGPin, TGButton, TGChip, TGEyebrow, TGNumber, TGMap, TGPlayer, TGTourCard });
