// TourGuide DS — Icon set v1
// Trait 1.5px, coins arrondis, taille 24, viewBox 24x24
// Famille cohérente avec l'épingle (ADN) — toutes les courbes prolongent la silhouette de la pin

const _IconBase = ({ children, size = 24, color = 'currentColor', strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

// Navigation
const IconHome = (p) => <_IconBase {...p}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></_IconBase>;
const IconMap = (p) => <_IconBase {...p}><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14"/><path d="M15 6v14"/></_IconBase>;
const IconPin = (p) => <_IconBase {...p}><path d="M12 22s8-7 8-13a8 8 0 10-16 0c0 6 8 13 8 13z"/><circle cx="12" cy="9" r="2.5"/></_IconBase>;
const IconCompass = (p) => <_IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="M15 9l-2 6-4 0 2-6 4 0z"/></_IconBase>;
const IconUser = (p) => <_IconBase {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></_IconBase>;
const IconPlus = (p) => <_IconBase {...p}><path d="M12 5v14M5 12h14"/></_IconBase>;

// Action / lecture
const IconPlay = (p) => <_IconBase {...p}><path d="M7 5l12 7-12 7V5z" fill="currentColor"/></_IconBase>;
const IconPause = (p) => <_IconBase {...p}><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></_IconBase>;
const IconSkip15 = (p) => <_IconBase {...p}><path d="M3 12a9 9 0 1015-6.7L21 8"/><path d="M21 4v4h-4"/></_IconBase>;
const IconRewind15 = (p) => <_IconBase {...p}><path d="M21 12A9 9 0 106 5.3L3 8"/><path d="M3 4v4h4"/></_IconBase>;
const IconHeadphones = (p) => <_IconBase {...p}><path d="M3 14v-2a9 9 0 0118 0v2"/><rect x="3" y="14" width="5" height="7" rx="1.5"/><rect x="16" y="14" width="5" height="7" rx="1.5"/></_IconBase>;
const IconDownload = (p) => <_IconBase {...p}><path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></_IconBase>;
const IconWifi = (p) => <_IconBase {...p}><path d="M2 9a16 16 0 0120 0"/><path d="M5 13a11 11 0 0114 0"/><path d="M8.5 16.5a6 6 0 017 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></_IconBase>;
const IconWifiOff = (p) => <_IconBase {...p}><path d="M2 9a16 16 0 014-3"/><path d="M14 5a16 16 0 018 4"/><path d="M9 13a11 11 0 016-2"/><circle cx="12" cy="20" r="1" fill="currentColor"/><path d="M3 3l18 18"/></_IconBase>;

// Édition / état
const IconHeart = (p) => <_IconBase {...p}><path d="M12 21s-8-5-8-11a5 5 0 018-4 5 5 0 018 4c0 6-8 11-8 11z"/></_IconBase>;
const IconShare = (p) => <_IconBase {...p}><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8 11l8-4"/><path d="M8 13l8 4"/></_IconBase>;
const IconClock = (p) => <_IconBase {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></_IconBase>;
const IconStar = (p) => <_IconBase {...p}><path d="M12 3l2.5 6 6.5.5-5 4.5 1.5 6.5L12 17l-5.5 3.5L8 14 3 9.5 9.5 9z"/></_IconBase>;
const IconChevronRight = (p) => <_IconBase {...p}><path d="M9 5l7 7-7 7"/></_IconBase>;
const IconChevronDown = (p) => <_IconBase {...p}><path d="M5 9l7 7 7-7"/></_IconBase>;
const IconClose = (p) => <_IconBase {...p}><path d="M5 5l14 14M19 5L5 19"/></_IconBase>;
const IconSearch = (p) => <_IconBase {...p}><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></_IconBase>;
const IconFilter = (p) => <_IconBase {...p}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/></_IconBase>;

// ─────────────── Showcase page
function IconsPage() {
  const groups = [
    ['Navigation', [
      ['Accueil', IconHome], ['Carte', IconMap], ['Épingle', IconPin],
      ['Boussole', IconCompass], ['Profil', IconUser], ['Créer', IconPlus],
    ]],
    ['Lecture & audio', [
      ['Lire', IconPlay], ['Pause', IconPause], ['+15s', IconSkip15],
      ['−15s', IconRewind15], ['Casque', IconHeadphones], ['Télécharger', IconDownload],
    ]],
    ['État', [
      ['Wifi', IconWifi], ['Hors-ligne', IconWifiOff], ['Favori', IconHeart],
      ['Partager', IconShare], ['Horloge', IconClock], ['Étoile', IconStar],
    ]],
    ['UI', [
      ['Suivant', IconChevronRight], ['Déplier', IconChevronDown], ['Fermer', IconClose],
      ['Rechercher', IconSearch], ['Filtrer', IconFilter],
    ]],
  ];
  return (
    <div style={{ width: 1040, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 48, boxSizing: 'border-box' }}>
      <TGEyebrow color={TG.color.grenadine}>Iconographie · v1</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 56, fontWeight: 400, margin: '8px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        Le set d'icônes.
      </h1>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 17, color: TG.color.ink60, maxWidth: 620 }}>
        Trait 1.5&nbsp;px, coins arrondis, géométrie ouverte. L'épingle est le centre de gravité — chaque icône en prolonge l'esprit.
      </div>

      {/* Pin XL — la signature */}
      <div style={{ marginTop: 32, padding: '32px 36px', background: TG.color.grenadineSoft, borderRadius: TG.radius.xl, display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ width: 140, height: 140, background: TG.color.paper, borderRadius: TG.radius.lg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: TG.color.grenadine }}><IconPin size={88}/></div>
        </div>
        <div>
          <TGNumber n={1} color={TG.color.grenadine}/>
          <div style={{ fontFamily: TG.font.display, fontSize: 32, marginTop: 4 }}>L'épingle, l'ADN.</div>
          <div style={{ fontSize: 14, color: TG.color.ink60, marginTop: 8, maxWidth: 460, lineHeight: 1.55 }}>
            Reprise sur la carte, le player, l'app store icon, le favicon. Dilatable de 12&nbsp;px à 200&nbsp;px sans perdre son galbe.
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'flex-end' }}>
            {[16, 24, 32, 48, 72].map(s => (
              <div key={s} style={{ textAlign: 'center', color: TG.color.grenadine }}>
                <IconPin size={s}/>
                <div style={{ fontSize: 10, color: TG.color.ink40, fontFamily: TG.font.mono, marginTop: 4 }}>{s}px</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Groupes */}
      {groups.map(([title, items]) => (
        <div key={title} style={{ borderTop: `1px solid ${TG.color.line}`, paddingTop: 22, marginTop: 28 }}>
          <TGEyebrow>{title}</TGEyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginTop: 14 }}>
            {items.map(([label, Ic]) => (
              <div key={label} style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Ic size={28} color={TG.color.ink}/>
                <div style={{ fontSize: 11, color: TG.color.ink60 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Règles */}
      <div style={{ borderTop: `1px solid ${TG.color.line}`, paddingTop: 22, marginTop: 28 }}>
        <TGEyebrow color={TG.color.grenadine}>Règles</TGEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14 }}>
          {[
            ['Grille 24×24', 'Tout dans un viewBox 24×24, padding visuel 2px.'],
            ['Trait 1.5 px', 'À 24px. Monte à 2px pour ≥ 32px, 1px pour 16px.'],
            ['Coins arrondis', 'strokeLinecap & strokeLinejoin = round. Jamais d\'angle vif.'],
            ['Outline d\'abord', 'Filled uniquement pour Play (action principale) et états « actif ».'],
            ['Une seule épaisseur', 'Pas de mélange thin/regular/bold dans une même icône.'],
            ['Pas de couleur', 'currentColor systématiquement — la couleur vient du contexte.'],
          ].map(([t, d], i) => (
            <div key={i}>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', color: TG.color.grenadine, fontSize: 13 }}>№ 0{i+1}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{t}</div>
              <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4, lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  IconHome, IconMap, IconPin, IconCompass, IconUser, IconPlus,
  IconPlay, IconPause, IconSkip15, IconRewind15, IconHeadphones, IconDownload,
  IconWifi, IconWifiOff, IconHeart, IconShare, IconClock, IconStar,
  IconChevronRight, IconChevronDown, IconClose, IconSearch, IconFilter,
  IconsPage,
});
