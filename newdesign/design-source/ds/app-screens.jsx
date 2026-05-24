// TourGuide DS — App screens (mobile)
// Home, Catalogue, Tour detail, Player, Profil, Onboarding

// ───────────────────────────── Home
function AppHome() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans }}>
      <div style={{ padding: '18px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <TGPin size={18} color={TG.color.grenadine}/>
          <span style={{ fontFamily: TG.font.display, fontSize: 20 }}>TourGuide</span>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: TG.color.paperDeep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>A</div>
      </div>

      <div style={{ padding: '12px 20px 0' }}>
        <div style={{ fontSize: 13, color: TG.color.ink60 }}>Bonjour Anna 👋</div>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 30, fontWeight: 400, letterSpacing: '-0.02em', margin: '6px 0 0', lineHeight: 1.1 }}>
          On reprend<br/><span style={{ color: TG.color.ocre }}>à Grasse</span>&nbsp;?
        </h1>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <TGPlayer title="Centre historique" guide="Hélène Marceau" city="Grasse" cityColor={TG.color.ocre} current="12:04" total="25:56" progress={0.46}/>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <TGEyebrow>Explorer</TGEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
          {[
            { t: 'Carte', s: '7 villes', c: TG.color.mer, ic: '◉' },
            { t: 'Catalogue', s: '42 parcours', c: TG.color.ocre, ic: '☰' },
            { t: 'Mes tours', s: '3 offline', c: TG.color.olive, ic: '⤓' },
            { t: 'Créer', s: 'Nouveau', c: TG.color.grenadine, ic: '＋' },
          ].map((q, i) => (
            <div key={i} style={{
              background: q.c, color: TG.color.paper, borderRadius: TG.radius.lg, padding: 14,
              minHeight: 84, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 20 }}>{q.ic}</div>
              <div>
                <div style={{ fontFamily: TG.font.display, fontSize: 17 }}>{q.t}</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>{q.s}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '22px 20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div style={{ fontFamily: TG.font.display, fontSize: 18 }}>Nouveau près de vous</div>
          <span style={{ fontSize: 12, color: TG.color.grenadine, fontWeight: 600 }}>Voir tout →</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <TGTourCard tour={{ n: 1, city: 'Nice', cityColor: TG.color.mer, title: 'Vieille ville & Cours Saleya', tagline: 'Le marché sent la figue à 11h.', min: 34, poi: 7, price: 'Gratuit' }}/>
          <TGTourCard tour={{ n: 2, city: 'Grasse', cityColor: TG.color.ocre, title: 'Route des parfumeurs', min: 48, poi: 5, price: '2,99 €' }}/>
        </div>
      </div>

      <AppTabBar active="home"/>
    </div>
  );
}

// ───────────────────────────── Catalogue
function AppCatalogue() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans }}>
      <div style={{ padding: '18px 20px 0' }}>
        <TGEyebrow>Parcourir · 42 tours</TGEyebrow>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 32, fontWeight: 400, margin: '6px 0 0', letterSpacing: '-0.02em' }}>La carte</h1>
      </div>

      <div style={{ padding: '14px 16px 0' }}>
        <TGMap height={220} pins={[
          { x: 35, y: 55, color: TG.color.ocre },
          { x: 62, y: 48, color: TG.color.mer },
          { x: 50, y: 72, color: TG.color.grenadine },
          { x: 20, y: 40, color: TG.color.olive },
        ]}/>
      </div>

      <div style={{ padding: '14px 20px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <TGChip active>Tous</TGChip>
        <TGChip>Gratuit</TGChip>
        <TGChip color={TG.color.ocre}>Histoire</TGChip>
        <TGChip color={TG.color.olive}>Nature</TGChip>
        <TGChip color={TG.color.mer}>Gastro</TGChip>
      </div>

      <div style={{ padding: '14px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 1, city: 'Grasse', cityColor: TG.color.ocre, title: 'Centre historique', tagline: 'Il flotte comme un souvenir de mimosa.', min: 42, poi: 6, price: 'Gratuit' },
          { n: 2, city: 'Paris', cityColor: TG.color.ardoise, title: 'Quartier Latin', tagline: 'Les pavés du Boul\'Mich n\'ont pas bougé.', min: 58, poi: 9, price: '4,99 €' },
          { n: 3, city: 'Cannes', cityColor: TG.color.grenadine, title: 'Le Suquet', min: 26, poi: 4, price: 'Gratuit' },
          { n: 4, city: 'Nice', cityColor: TG.color.mer, title: 'Vieille ville', min: 34, poi: 7, price: '2,99 €' },
        ].map((t, i) => <TGTourCard key={i} tour={t}/>)}
      </div>

      <AppTabBar active="cat"/>
    </div>
  );
}

// ───────────────────────────── Tour detail
function AppTourDetail() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans }}>
      <div style={{ background: TG.color.ocre, color: TG.color.paper, padding: '16px 20px 28px' }}>
        <div style={{ fontSize: 18, cursor: 'pointer' }}>← retour</div>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TGPin color={TG.color.paper} size={18}/>
          <div style={{ fontSize: 10.5, letterSpacing: '0.22em', fontWeight: 700 }}>GRASSE · PROVENCE</div>
        </div>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 32, fontWeight: 400, margin: '10px 0 0', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Centre historique<br/>de Grasse
        </h1>
        <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 14, marginTop: 10, opacity: 0.9 }}>
          « Il flotte, l'hiver, comme un souvenir de mimosa. »
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 16, fontSize: 12, opacity: 0.95 }}>
          <span>◷ 42 min</span>
          <span>◉ 6 arrêts</span>
          <span>⤓ 184 Mo</span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', marginTop: -14 }}>
        <div style={{ background: TG.color.card, borderRadius: TG.radius.lg, padding: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: TG.shadow.card, border: `1px solid ${TG.color.line}` }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: TG.color.ocreSoft, color: TG.color.ocre, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TG.font.display, fontSize: 20 }}>H</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: TG.color.ink40 }}>Votre guide</div>
            <div style={{ fontFamily: TG.font.display, fontSize: 16 }}>Hélène Marceau</div>
            <div style={{ fontSize: 11, color: TG.color.ink60 }}>Parfumeuse · 3e génération</div>
          </div>
          <TGButton variant="quiet" size="sm">Écouter ▶</TGButton>
        </div>
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <TGEyebrow>Le parcours · 6 arrêts</TGEyebrow>
        <div style={{ marginTop: 12, position: 'relative', paddingLeft: 24 }}>
          <div style={{ position: 'absolute', left: 10, top: 8, bottom: 8, width: 2, background: TG.color.ocreSoft }}/>
          {[
            ['Place aux Aires', '4 min'],
            ['Rue Droite & parfumerie', '7 min'],
            ['Musée Fragonard', '9 min'],
            ['Cathédrale Notre-Dame', '6 min'],
            ['Jardin des Plantes', '8 min'],
            ['Point de vue final', '8 min'],
          ].map(([t, m], i) => (
            <div key={i} style={{ padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: 0, width: 22, height: 22, borderRadius: '50%', background: TG.color.ocre, color: TG.color.paper, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i+1}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{t}</div>
              <div style={{ fontSize: 11, color: TG.color.ink40, fontFamily: TG.font.mono }}>{m}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px 24px' }}>
        <TGButton variant="accent" size="lg" style={{ width: '100%', justifyContent: 'center' }}>▶  Commencer la visite · Gratuit</TGButton>
        <div style={{ textAlign: 'center', fontSize: 11, color: TG.color.ink40, marginTop: 10 }}>
          Télécharge 184 Mo · Disponible hors-ligne
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── Player (pleine page) — papier + carte + panneau ocre
function AppPlayer() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 20, color: TG.color.ink60 }}>⌄</span>
        <div style={{ fontSize: 10.5, letterSpacing: '0.22em', fontWeight: 700, color: TG.color.ocre }}>EN ÉCOUTE · 3/6</div>
        <span style={{ fontSize: 18, color: TG.color.ink60 }}>⋯</span>
      </div>

      {/* Map region — geographic context */}
      <div style={{ margin: '4px 16px 0', position: 'relative' }}>
        <TGMap height={200} pins={[
          { x: 30, y: 62, color: TG.color.ink40 },   // arrêt précédent (terminé)
          { x: 52, y: 45, color: TG.color.ocre },    // arrêt en cours (bigger)
          { x: 74, y: 58, color: TG.color.ink20 },   // suivant
        ]}/>
        {/* Halo pulsant sur l'arrêt actif */}
        <div style={{
          position: 'absolute', left: '52%', top: '45%',
          width: 64, height: 64, borderRadius: '50%',
          background: TG.color.ocre, opacity: 0.15,
          transform: 'translate(-50%,-100%)', pointerEvents: 'none',
        }}/>
        {/* Badge distance */}
        <div style={{
          position: 'absolute', right: 12, bottom: 12,
          background: TG.color.card, border: `1px solid ${TG.color.line}`,
          padding: '6px 10px', borderRadius: TG.radius.pill,
          fontSize: 11, fontWeight: 600, color: TG.color.ink,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ color: TG.color.olive }}>●</span> Vous êtes ici
        </div>
      </div>

      {/* Arrêt — texte */}
      <div style={{ padding: '18px 24px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: TG.color.ocre, color: TG.color.paper, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</div>
          <TGEyebrow color={TG.color.ocre}>Grasse · Arrêt 03</TGEyebrow>
        </div>
        <div style={{ fontFamily: TG.font.display, fontSize: 30, marginTop: 8, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Musée Fragonard
        </div>
        <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 14, color: TG.color.ink60, marginTop: 6 }}>
          « L'histoire d'un parfumeur, en trois ruelles. »
        </div>
      </div>

      {/* Panneau ocre — contrôles player */}
      <div style={{ marginTop: 'auto' }}/>
      <div style={{
        margin: '16px 12px 12px', background: TG.color.ocre, color: TG.color.paper,
        borderRadius: TG.radius.xl, padding: '18px 20px 20px',
      }}>
        {/* guide */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: TG.color.paper, color: TG.color.ocre, fontFamily: TG.font.display, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>H</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Hélène Marceau</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>Parfumeuse · 3e génération</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>1× ⌄</div>
        </div>

        {/* waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 36 }}>
          {Array.from({ length: 44 }).map((_, i) => {
            const h = 6 + Math.abs(Math.sin(i * 0.9)) * 22 + (i % 4) * 2;
            const active = i / 44 < 0.45;
            return <div key={i} style={{ flex: 1, height: h, background: active ? TG.color.paper : 'rgba(255,255,255,0.3)', borderRadius: 2 }}/>;
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 6, fontFamily: TG.font.mono, opacity: 0.9 }}>
          <span>03:12</span><span>−03:52</span>
        </div>

        {/* controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 28, marginTop: 14 }}>
          <span style={{ fontSize: 22, opacity: 0.85 }}>↺ 15</span>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: TG.color.paper, color: TG.color.ocre, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>❙❙</div>
          <span style={{ fontSize: 22, opacity: 0.85 }}>15 ↻</span>
        </div>
      </div>

      {/* Directions next stop */}
      <div style={{
        margin: '0 12px 16px', background: TG.color.card, border: `1px solid ${TG.color.line}`,
        borderRadius: TG.radius.md, padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: TG.color.ocreSoft, color: TG.color.ocre, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>↗</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: TG.color.ink40, letterSpacing: '0.14em', fontWeight: 700 }}>PROCHAIN ARRÊT · 4</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginTop: 1 }}>Cathédrale Notre-Dame · 140 m</div>
        </div>
        <span style={{ color: TG.color.ink40 }}>→</span>
      </div>
    </div>
  );
}

// ───────────────────────────── Profil
function AppProfil() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans }}>
      <div style={{ padding: '18px 20px 0' }}>
        <TGEyebrow>Compte</TGEyebrow>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 30, fontWeight: 400, margin: '6px 0 0' }}>Bonjour, Anna</h1>
      </div>

      <div style={{
        margin: '18px 16px 0', borderRadius: TG.radius.xl, padding: 20,
        background: TG.color.grenadine, color: TG.color.paper, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }}/>
        <div style={{ fontSize: 10, letterSpacing: '0.25em', opacity: 0.85 }}>PASSEPORT TOURGUIDE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
          <div style={{ width: 54, height: 54, borderRadius: 14, background: TG.color.paper, color: TG.color.grenadine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: TG.font.display, fontSize: 22 }}>A</div>
          <div>
            <div style={{ fontFamily: TG.font.display, fontSize: 22 }}>Anna Marceau</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Membre depuis mars 2026</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
          {[['12', 'parcours'], ['4', 'villes'], ['87', 'km']].map(([n, s], i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontFamily: TG.font.display, fontSize: 22 }}>{n}</div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', opacity: 0.85, textTransform: 'uppercase' }}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        margin: '14px 16px 0', padding: 14, borderRadius: TG.radius.md,
        border: `2px solid ${TG.color.olive}`, background: TG.color.card,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: TG.color.olive, fontWeight: 700 }}>PREMIUM ACTIF</div>
          <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 2 }}>Renouvellement 12 mars 2027</div>
        </div>
        <span style={{ color: TG.color.olive, fontSize: 18 }}>→</span>
      </div>

      <div style={{ padding: '18px 16px 24px' }}>
        {[
          ['Mes parcours', '12 téléchargés', TG.color.mer],
          ['Hors-ligne', '348 Mo', TG.color.ocre],
          ['Langues', 'FR · EN', TG.color.olive],
          ['Notifications', 'Activées', TG.color.grenadine],
          ['Aide & contact', null, TG.color.ink60],
        ].map(([l, s, c], i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 0', borderBottom: `1px solid ${TG.color.line}`,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: c, opacity: 0.15, flexShrink: 0 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{l}</div>
              {s && <div style={{ fontSize: 11, color: TG.color.ink40 }}>{s}</div>}
            </div>
            <span style={{ color: TG.color.ink40 }}>→</span>
          </div>
        ))}
      </div>

      <AppTabBar active="profil"/>
    </div>
  );
}

// ───────────────────────────── Onboarding (écran 1/3)
function AppOnboarding() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans, padding: '40px 24px 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TGEyebrow>01 / 03</TGEyebrow>
        <div style={{ fontSize: 12, color: TG.color.ink40 }}>Passer</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'relative', margin: '0 auto 28px' }}>
          <TGMap height={240} pins={[
            { x: 30, y: 50, color: TG.color.ocre }, { x: 65, y: 40, color: TG.color.mer },
            { x: 50, y: 72, color: TG.color.grenadine }, { x: 80, y: 65, color: TG.color.olive },
          ]}/>
        </div>

        <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: TG.color.grenadine }}>
          Bienvenue sur TourGuide.
        </div>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 36, fontWeight: 400, letterSpacing: '-0.025em', margin: '10px 0 0', lineHeight: 1.05 }}>
          Choisissez<br/>une épingle.
        </h1>
        <p style={{ fontSize: 14, color: TG.color.ink60, marginTop: 14, lineHeight: 1.55 }}>
          7 villes, 42 parcours audio narrés par des guides locaux. Téléchargeable, hors-ligne, prêt à l'emploi.
        </p>
      </div>

      <div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ width: 24, height: 4, borderRadius: 2, background: TG.color.grenadine }}/>
          <div style={{ width: 8, height: 4, borderRadius: 2, background: TG.color.ink20 }}/>
          <div style={{ width: 8, height: 4, borderRadius: 2, background: TG.color.ink20 }}/>
        </div>
        <TGButton variant="accent" size="lg" style={{ width: '100%', justifyContent: 'center' }}>Commencer →</TGButton>
      </div>
    </div>
  );
}

// ───────────────────────────── Tab bar
function AppTabBar({ active }) {
  const items = [
    { k: 'home', label: 'Accueil', ic: '⌂' },
    { k: 'cat', label: 'Carte', ic: '◉' },
    { k: 'creer', label: 'Créer', ic: '＋' },
    { k: 'profil', label: 'Compte', ic: '◐' },
  ];
  return (
    <div style={{
      marginTop: 20,
      background: TG.color.paper, borderTop: `1px solid ${TG.color.line}`,
      display: 'flex', padding: '10px 8px 12px',
    }}>
      {items.map(it => {
        const on = it.k === active;
        return (
          <div key={it.k} style={{ flex: 1, textAlign: 'center', color: on ? TG.color.grenadine : TG.color.ink40 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12, margin: '0 auto',
              background: on ? TG.color.grenadineSoft : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
            }}>{it.ic}</div>
            <div style={{ fontSize: 10, marginTop: 2, fontWeight: on ? 700 : 500 }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { AppHome, AppCatalogue, AppTourDetail, AppPlayer, AppProfil, AppOnboarding });
