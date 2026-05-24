// Murmure — Studio web · Refonte complète
// Header + Sidebar + Dashboard + Tours + Profil + Editor

// ─────────────────────────────────────────────────────────────────
// Atomes partagés
// ─────────────────────────────────────────────────────────────────

// Logo Murmure (header) — wordmark + icon
function MurmureLogo({ size = 26 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.22, overflow: 'hidden' }}>
        {window.MurmureIcon ? <MurmureIcon size={size}/> : <div style={{width:size,height:size,background:TG.color.grenadine}}/>}
      </div>
      <div style={{ fontFamily: TG.font.display, fontSize: size * 0.85, color: TG.color.ink, letterSpacing: '-0.01em', lineHeight: 1 }}>Murmure</div>
      <div style={{ fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.grenadine, marginLeft: 4 }}>Studio</div>
    </div>
  );
}

// Détermine la famille couleur d'une ville
function cityFamily(city) {
  if (!city) return 'ardoise';
  const db = {
    'nice': 'mer', 'cannes': 'mer', 'antibes': 'mer', 'menton': 'mer', 'villefranche-sur-mer': 'mer', 'éze': 'mer', 'eze': 'mer',
    'grasse': 'ocre', 'avignon': 'ocre', 'aix': 'ocre', 'arles': 'ocre',
    'autran': 'olive', 'gordes': 'olive', 'annecy': 'olive', 'saint-paul-de-vence': 'olive', 'vence': 'olive', 'cimiez': 'olive',
    'paris': 'ardoise', 'lyon': 'ardoise', 'lille': 'ardoise',
  };
  return db[city.toLowerCase().trim()] || 'ardoise';
}
const FAM = {
  mer: { color: TG.color.mer, soft: TG.color.merSoft, label: 'Mer' },
  ocre: { color: TG.color.ocre, soft: TG.color.ocreSoft, label: 'Ocre' },
  olive: { color: TG.color.olive, soft: TG.color.oliveSoft, label: 'Olive' },
  ardoise: { color: TG.color.ardoise, soft: TG.color.ardoiseSoft, label: 'Ardoise' },
};

// Header studio
function StudioHeader() {
  return (
    <div style={{ background: TG.color.paper, borderBottom: `1px solid ${TG.color.line}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <MurmureLogo size={26}/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 13 }}>
        <a style={{ color: TG.color.ink60, textDecoration: 'none', fontWeight: 500 }}>Catalogue public</a>
        <a style={{ color: TG.color.ink60, textDecoration: 'none', fontWeight: 500 }}>Aide</a>
        <div style={{ width: 1, height: 18, background: TG.color.line }}/>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: TG.color.grenadine, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>S</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Steffen</div>
          <span style={{ color: TG.color.ink40, fontSize: 11 }}>▾</span>
        </div>
      </div>
    </div>
  );
}

// Sidebar studio
function StudioSidebar({ active = 'dashboard' }) {
  const items = [
    { k: 'dashboard', label: 'Dashboard', ic: '⌂', n: null },
    { k: 'tours', label: 'Mes tours', ic: '◉', n: '12' },
    { k: 'create', label: 'Nouveau tour', ic: '＋', accent: true },
    { k: 'profile', label: 'Mon profil', ic: '◐', n: null },
    { k: 'revenus', label: 'Revenus', ic: '€', n: null },
    { k: 'reviews', label: 'Avis', ic: '★', n: '3', badge: true },
  ];
  return (
    <div style={{ width: 240, background: TG.color.paper, borderRight: `1px solid ${TG.color.line}`, padding: '24px 16px', boxSizing: 'border-box', minHeight: '100%' }}>
      {/* Profil header */}
      <div style={{ padding: '8px 12px 18px', borderBottom: `1px solid ${TG.color.lineSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: TG.color.ocre, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TG.font.display, fontSize: 18 }}>S</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: TG.color.ink }}>Steffen Guillaume</div>
            <div style={{ fontSize: 11, color: TG.color.ink60 }}>Guide · Côte d'Azur</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {items.map(it => {
          const on = it.k === active;
          return (
            <a key={it.k} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8,
              background: on ? TG.color.ink : (it.accent ? TG.color.grenadineSoft : 'transparent'),
              color: on ? TG.color.paper : (it.accent ? TG.color.grenadine : TG.color.ink80),
              fontSize: 13, fontWeight: on ? 600 : 500, marginBottom: 2, textDecoration: 'none', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 14, opacity: on ? 1 : 0.7 }}>{it.ic}</span>
              <span style={{ flex: 1 }}>{it.label}</span>
              {it.n && (
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700,
                  background: it.badge ? TG.color.grenadine : (on ? 'rgba(255,255,255,0.18)' : TG.color.paperDeep),
                  color: it.badge ? TG.color.paper : (on ? TG.color.paper : TG.color.ink60),
                }}>{it.n}</span>
              )}
            </a>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: '14px 12px', borderTop: `1px solid ${TG.color.lineSoft}`, fontSize: 12 }}>
        <a style={{ color: TG.color.ink60, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>↗</span> Voir l'app touriste
        </a>
        <a style={{ color: TG.color.ink60, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span>⏏</span> Se déconnecter
        </a>
      </div>
    </div>
  );
}

window.MurmureLogo = MurmureLogo;
window.StudioHeader = StudioHeader;
window.StudioSidebar = StudioSidebar;
window.cityFamily = cityFamily;
window.FAM = FAM;
