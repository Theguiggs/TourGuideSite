// TourGuide DS — Page Handoff dev
// Présentation visuelle du package que les devs reçoivent

function HandoffPage() {
  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 56, boxSizing: 'border-box' }}>
      <TGEyebrow color={TG.color.grenadine}>Handoff dev · v1.0.0</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 64, fontWeight: 400, margin: '8px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        Le package<br/>pour les devs.
      </h1>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 18, color: TG.color.ink60, maxWidth: 700 }}>
        Tout ce dont TourGuideWeb et TourGuideApp ont besoin pour migrer sur la nouvelle charte&nbsp;: tokens, composants typés, Tailwind preset, doc.
      </div>

      {/* Arborescence */}
      <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 28 }}>
        <div style={{ background: TG.color.ink, color: TG.color.paper, borderRadius: TG.radius.lg, padding: 24, fontFamily: TG.font.mono, fontSize: 12.5, lineHeight: 1.85 }}>
          <div style={{ color: TG.color.grenadine, fontWeight: 700, marginBottom: 12, letterSpacing: '0.1em', fontSize: 10 }}>@TOURGUIDE/DESIGN-SYSTEM · V1.1</div>
          <div>📦 <span style={{ opacity: 0.95 }}>handoff/</span></div>
          <div style={{ paddingLeft: 16 }}>├── package.json</div>
          <div style={{ paddingLeft: 16 }}>├── README.md <span style={{ opacity: 0.55 }}># + brief Studio v1.1</span></div>
          <div style={{ paddingLeft: 16 }}>├── index.ts</div>
          <div style={{ paddingLeft: 16, color: TG.color.ocre }}>├── tokens.css <span style={{ opacity: 0.55 }}># CSS variables</span></div>
          <div style={{ paddingLeft: 16, color: TG.color.ocre }}>├── tokens.ts <span style={{ opacity: 0.55 }}># TS tokens</span></div>
          <div style={{ paddingLeft: 16, color: TG.color.ocre }}>├── tailwind.preset.js</div>
          <div style={{ paddingLeft: 16, color: '#7BB7E0' }}>├── components/</div>
          <div style={{ paddingLeft: 36 }}>│    ├── Button.tsx</div>
          <div style={{ paddingLeft: 36 }}>│    ├── Card.tsx</div>
          <div style={{ paddingLeft: 36 }}>│    ├── Chip.tsx</div>
          <div style={{ paddingLeft: 36 }}>│    ├── Pin.tsx</div>
          <div style={{ paddingLeft: 36 }}>│    ├── Typography.tsx</div>
          <div style={{ paddingLeft: 36 }}>│    └── Player.tsx</div>
          <div style={{ paddingLeft: 16, color: '#A8D5BA' }}>└── studio/ <span style={{ opacity: 0.55 }}># NEW v1.1</span></div>
          <div style={{ paddingLeft: 36, color: '#A8D5BA' }}>     ├── Sidebar.tsx</div>
          <div style={{ paddingLeft: 36, color: '#A8D5BA' }}>     ├── KpiCard.tsx</div>
          <div style={{ paddingLeft: 36, color: '#A8D5BA' }}>     ├── TourCard.tsx</div>
          <div style={{ paddingLeft: 36, color: '#A8D5BA' }}>     ├── ScenesTimeline.tsx</div>
          <div style={{ paddingLeft: 36, color: '#A8D5BA' }}>     └── Editor.tsx</div>
          <div style={{ marginTop: 14, opacity: 0.55, fontSize: 11 }}>17 fichiers · ~38 Ko</div>
        </div>

        <div>
          <TGEyebrow>Ce que vos devs reçoivent</TGEyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 14 }}>
            {[
              { kind: 'Tokens', icon: '⊙', count: '60+', desc: 'Couleurs, typo, espacements, rayons, ombres — exposés en CSS variables ET en TS.' },
              { kind: 'Composants', icon: '◐', count: '9', desc: 'Button, Card, Chip, Pin, PinNegatif, Player, Eyebrow, PullQuote, NumberMark.' },
              { kind: 'Tailwind preset', icon: '◇', count: '1', desc: 'Toutes les valeurs DS sous forme de classes utilitaires.' },
              { kind: 'Documentation', icon: '✎', count: '5.7 Ko', desc: 'README avec règles d\'usage, table de migration, exemples.' },
            ].map((item, i) => (
              <div key={i} style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ color: TG.color.grenadine, fontFamily: TG.font.display, fontSize: 28, lineHeight: 1 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.ink60 }}>{item.kind}</div>
                    <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 2 }}>{item.count}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 8, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trois usages */}
      <div style={{ marginTop: 48 }}>
        <TGEyebrow>Trois manières de consommer</TGEyebrow>
        <div style={{ fontSize: 13, color: TG.color.ink60, marginTop: 4, maxWidth: 600 }}>
          Choisissez selon la stack du projet — tous les chemins mènent aux mêmes valeurs.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 22 }}>

          {/* CSS variables */}
          <div>
            <div style={{ fontFamily: TG.font.display, fontSize: 26, color: TG.color.ocre }}>01</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>CSS variables</div>
            <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4 }}>Pour Vue, Next sans Tailwind, ou intégrations one-shot.</div>
            <CodeBlock>{`/* layout.tsx */
import '@tourguide/design-system/css';

/* style.css */
.cta {
  background: var(--tg-color-grenadine);
  color: var(--tg-color-paper);
  border-radius: var(--tg-radius-pill);
  padding: var(--tg-space-3) var(--tg-space-5);
}`}</CodeBlock>
          </div>

          {/* Tailwind */}
          <div>
            <div style={{ fontFamily: TG.font.display, fontSize: 26, color: TG.color.mer }}>02</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>Tailwind preset</div>
            <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4 }}>Pour TourGuideWeb. Toutes les classes du DS d'un coup.</div>
            <CodeBlock>{`// tailwind.config.js
import tg from '@tourguide/design-system/tailwind';
export default { presets: [tg], content: [...] };

// React
<button className="bg-grenadine text-paper
  rounded-pill px-5 py-3 shadow-accent">
  Écouter
</button>`}</CodeBlock>
          </div>

          {/* React components */}
          <div>
            <div style={{ fontFamily: TG.font.display, fontSize: 26, color: TG.color.grenadine }}>03</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginTop: 4 }}>Composants React</div>
            <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 4 }}>Pour TourGuideApp et tous les nouveaux écrans.</div>
            <CodeBlock>{`import { Button, Pin, Player }
  from '@tourguide/design-system';

<Button variant="accent" size="lg">
  Démarrer le tour
</Button>

<Player mode="mini" title="Place du Cours"
  isPlaying position={42} duration={180}
  onPlayPause={togglePlay}/>`}</CodeBlock>
          </div>
        </div>
      </div>

      {/* API Catalog */}
      <div style={{ marginTop: 48 }}>
        <TGEyebrow color={TG.color.grenadine}>API · Catalogue des composants</TGEyebrow>
        <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, marginTop: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2.2fr 2fr 1.4fr', padding: '12px 18px', background: TG.color.paperDeep, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: TG.color.ink60 }}>
            <div>Composant</div><div>Props clés</div><div>Usage</div><div>Variantes</div>
          </div>
          {[
            ['<Button>', 'variant, size, iconLeft, fullWidth', 'Toute action utilisateur', '3 × 3 = 9'],
            ['<Card>', 'elevation, bleed', 'Surfaces de contenu', '4 elevations'],
            ['<Chip>', 'color, active, iconLeft', 'Tags, filtres, catégories', '5 couleurs × 2 états'],
            ['<Pin>', 'size, color, dot, label', 'Marqueur carte, icône inline', '—'],
            ['<PinNegatif>', 'size, bg, fg, rounded', 'App icon, favicon, splash', '—'],
            ['<Player>', 'mode, title, position, duration, isPlaying', 'Lecteur audio', 'mini · full'],
            ['<Eyebrow>', 'color', 'Surtitre éditorial', '—'],
            ['<PullQuote>', 'size', 'Citation italique', 'sm · md · lg'],
            ['<NumberMark>', 'n, color, size', 'Numérotation 01 · 02 · 03', '—'],
            ['<StudioSidebar>', 'active, badges', 'Nav latérale Studio web', '—'],
            ['<KpiCard>', 'label, value, delta, color', 'Stats dashboard', '5 couleurs ville'],
            ['<TourCard>', 'city, title, plays, rating, status', 'Liste « Mes tours »', 'live · brouillon · relecture'],
            ['<ScenesTimeline>', 'scenes, activeId, onReorder', 'Édition d’un tour /scenes', '—'],
            ['<Editor>', 'scene, onChange, onGenerateVoice', 'Bloc d’écriture scène', 'texte · audio · GPS'],
          ].map((row, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.4fr 2.2fr 2fr 1.4fr', padding: '14px 18px', borderTop: i === 0 ? 'none' : `1px solid ${TG.color.line}`, fontSize: 13, alignItems: 'center' }}>
              <div style={{ fontFamily: TG.font.mono, color: TG.color.grenadine, fontSize: 12.5 }}>{row[0]}</div>
              <div style={{ fontFamily: TG.font.mono, fontSize: 11.5, color: TG.color.ink80 }}>{row[1]}</div>
              <div style={{ color: TG.color.ink60 }}>{row[2]}</div>
              <div style={{ fontSize: 11.5, color: TG.color.ink60, fontFamily: TG.font.mono }}>{row[3]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Migration */}
      <div style={{ marginTop: 48 }}>
        <TGEyebrow color={TG.color.ocre}>Plan de migration · révisé v1.1</TGEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 18 }}>
          {[
            { n: 1, title: 'Installer', desc: 'pnpm add @tourguide/design-system. Importer tokens.css à la racine.', d: '½ jour' },
            { n: 2, title: 'Tokens', desc: 'Remplacer toutes les couleurs/sizes hardcodées par les variables CSS.', d: '2-3 j' },
            { n: 3, title: 'Composants UI', desc: 'Remplacer Button, Card, Player, Pin custom par les composants DS.', d: '4-5 j' },
            { n: 4, title: 'Studio v1.1', desc: 'Câbler les 7 écrans Studio sur les composants studio/* et l’API existante.', d: '8-10 j' },
          ].map((step, i) => (
            <div key={i} style={{ position: 'relative' }}>
              <TGNumber n={step.n} color={TG.color.grenadine}/>
              <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 4 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: TG.color.ink60, marginTop: 6, lineHeight: 1.5 }}>{step.desc}</div>
              <div style={{ fontFamily: TG.font.mono, fontSize: 11, color: TG.color.grenadine, marginTop: 10, fontWeight: 700 }}>≈ {step.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Studio v1.1 brief */}
      <div style={{ marginTop: 48, padding: 28, borderRadius: TG.radius.lg, background: TG.color.merSoft, border: `1.5px solid ${TG.color.mer}` }}>
        <TGEyebrow color={TG.color.mer}>Brief Studio web · v1.1 · NEW</TGEyebrow>
        <div style={{ fontFamily: TG.font.display, fontSize: 30, marginTop: 6, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          7 écrans Studio à livrer
        </div>
        <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 14, color: TG.color.ink80, marginTop: 4, maxWidth: 640 }}>
          Refonte complète du Studio web — chaque écran existe en maquette dans le canvas « 02 bis ». Réutilisez les composants Studio ci-dessus.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 18 }}>
          {[
            { n: '01', t: 'Dashboard', sub: 'Hero « Reprendre » + 4 KPIs + Top tours + Avis', route: '/studio' },
            { n: '02', t: 'Mes tours', sub: 'Cards bande couleur ville · filtres · tri', route: '/studio/tours' },
            { n: '03', t: 'Édition tour', sub: 'Timeline scènes + carte + éditeur + inspector', route: '/studio/tours/:id/scenes' },
            { n: '04', t: 'Revenus', sub: 'Hero olive + histogramme 12 mois + détail tour', route: '/studio/revenus' },
            { n: '05', t: 'Mon profil', sub: 'Form gauche + preview live droite', route: '/studio/profil' },
            { n: '06', t: 'Dashboard dense', sub: 'Variante alt · command-center type Linear', route: '/studio?layout=dense' },
            { n: '07', t: 'Dashboard dépouillé', sub: 'Variante alt · atelier éditorial', route: '/studio?layout=quiet' },
            { n: '08', t: 'Composants partagés', sub: 'Header + Sidebar + KpiCard + TourCard', route: 'studio/*' },
          ].map((s, i) => (
            <div key={i} style={{ background: TG.color.paper, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, padding: 14 }}>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', color: TG.color.mer, fontSize: 13 }}>№ {s.n}</div>
              <div style={{ fontFamily: TG.font.display, fontSize: 18, marginTop: 2, lineHeight: 1.15 }}>{s.t}</div>
              <div style={{ fontSize: 11.5, color: TG.color.ink60, marginTop: 4, lineHeight: 1.45 }}>{s.sub}</div>
              <div style={{ fontFamily: TG.font.mono, fontSize: 10, color: TG.color.mer, marginTop: 8 }}>{s.route}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, fontSize: 12, color: TG.color.ink80, lineHeight: 1.55, paddingTop: 14, borderTop: `1px solid ${TG.color.mer}33` }}>
          <strong>Notes pour l'implémentation ·</strong> Sidebar largeur fixe 240 px. Carte interactive sur écran d'édition = Mapbox GL ou MapLibre, style custom selon tokens (paper background, lines ink40, pins de couleur ville). Le « Tour en cours d'écriture » est un état global persistant (zustand ou contexte) accessible depuis le Dashboard. Éditeur de scène : ProseMirror ou Tiptap, pas de WYSIWYG bloat — gras / italique / lien / surlignage grenadine, c'est tout.
        </div>
      </div>

      {/* Règles */}
      <div style={{ marginTop: 48, padding: 28, borderRadius: TG.radius.lg, background: TG.color.grenadineSoft, border: `1.5px solid ${TG.color.grenadine}` }}>
        <TGEyebrow color={TG.color.grenadine}>Règles non-négociables</TGEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 14 }}>
          {[
            ['Ne jamais hardcoder', 'Si la valeur n\'est pas dans le DS, parlez à l\'équipe design avant d\'inventer.'],
            ['Pas de nouvelle nuance', 'Grenadine est UNE couleur, pas une famille. N\'utilisez ni #FF5722 ni #E94B40.'],
            ['Pas de fallback caché', 'Pas de `color: red`, pas de `font-family: Arial` en fallback. Toujours nos tokens.'],
            ['Major = breaking', 'Renommer une prop = bump major. Lisez le CHANGELOG avant d\'upgrader.'],
            ['Une seule source', 'Les tokens sont dans tokens.ts. Pas de duplication en SCSS, JSON ou ailleurs.'],
            ['Composer, pas forker', 'Besoin d\'un nouveau composant ? Composez avec les briques DS, ne forkez pas.'],
          ].map(([t, d], i) => (
            <div key={i}>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', color: TG.color.grenadine, fontSize: 13 }}>№ 0{i+1}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{t}</div>
              <div style={{ fontSize: 12, color: TG.color.ink80, marginTop: 4, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ children }) {
  return (
    <pre style={{
      background: TG.color.ink,
      color: TG.color.paper,
      borderRadius: TG.radius.md,
      padding: 16,
      fontFamily: TG.font.mono,
      fontSize: 11.5,
      lineHeight: 1.6,
      marginTop: 12,
      overflow: 'auto',
      whiteSpace: 'pre',
    }}>
      <code>{children}</code>
    </pre>
  );
}

window.HandoffPage = HandoffPage;
