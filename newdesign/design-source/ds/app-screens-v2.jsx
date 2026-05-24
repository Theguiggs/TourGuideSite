// TourGuide DS — App screens v2 : Recherche, Offline, Création, Paramètres, États vides, Onboarding 2/3

// ───────────────────────────── Recherche
function AppSearch() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans }}>
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 20, color: TG.color.ink60 }}>←</span>
        <div style={{ flex: 1, background: TG.color.paperDeep, borderRadius: TG.radius.md, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: TG.color.ink40 }}>⌕</span>
          <span style={{ fontSize: 14, color: TG.color.ink, fontWeight: 500 }}>parfum</span>
          <span style={{ marginLeft: 'auto', color: TG.color.ink40, fontSize: 12 }}>×</span>
        </div>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        <TGEyebrow>4 résultats</TGEyebrow>
      </div>

      <div style={{ padding: '10px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 1, city: 'Grasse', cityColor: TG.color.ocre, title: 'Route des parfumeurs', tagline: 'Mimosa, jasmin, rose centifolia.', min: 48, poi: 5, price: '2,99 €' },
          { n: 2, city: 'Grasse', cityColor: TG.color.ocre, title: 'Musée Fragonard', min: 22, poi: 3, price: 'Gratuit' },
        ].map((t, i) => <TGTourCard key={i} tour={t}/>)}
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <TGEyebrow color={TG.color.grenadine}>Suggestions</TGEyebrow>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {['Parfumerie', 'Hélène Marceau', 'Provence', 'Atelier'].map((s, i) => (
            <TGChip key={i}>{s}</TGChip>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <TGEyebrow>Recherches récentes</TGEyebrow>
        {['vieille ville nice', 'gratuit cannes', 'paris quartier latin'].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', borderBottom: `1px solid ${TG.color.line}` }}>
            <span style={{ color: TG.color.ink40, fontSize: 14 }}>↶</span>
            <div style={{ flex: 1, fontSize: 14 }}>{s}</div>
            <span style={{ color: TG.color.ink40, fontSize: 12 }}>×</span>
          </div>
        ))}
      </div>

      <div style={{ height: 24 }}/>
    </div>
  );
}

// ───────────────────────────── Offline / Téléchargements
function AppOffline() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans }}>
      <div style={{ padding: '18px 20px 0' }}>
        <TGEyebrow>Mes parcours · 3 hors-ligne</TGEyebrow>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 30, fontWeight: 400, margin: '6px 0 0', letterSpacing: '-0.02em' }}>
          Téléchargements
        </h1>
      </div>

      <div style={{ margin: '16px 16px 0', padding: 14, borderRadius: TG.radius.lg, background: TG.color.oliveSoft, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: TG.color.olive, color: TG.color.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⤓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: TG.color.ink }}>348 Mo utilisés</div>
          <div style={{ height: 4, background: TG.color.paper, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
            <div style={{ width: '34%', height: '100%', background: TG.color.olive }}/>
          </div>
          <div style={{ fontSize: 10, color: TG.color.ink60, marginTop: 4 }}>3 parcours · de 1,2 Go disponibles</div>
        </div>
      </div>

      <div style={{ padding: '20px 20px 8px' }}>
        <TGEyebrow>Disponibles hors-ligne</TGEyebrow>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 1, city: 'Grasse', cityColor: TG.color.ocre, title: 'Centre historique', min: 42, poi: 6, price: '184 Mo', tagline: 'Téléchargé il y a 3 jours' },
          { n: 2, city: 'Nice', cityColor: TG.color.mer, title: 'Vieille ville', min: 34, poi: 7, price: '92 Mo' },
          { n: 3, city: 'Cannes', cityColor: TG.color.grenadine, title: 'Le Suquet', min: 26, poi: 4, price: '72 Mo' },
        ].map((t, i) => <TGTourCard key={i} tour={t}/>)}
      </div>

      <div style={{ padding: '24px 20px 8px' }}>
        <TGEyebrow color={TG.color.grenadine}>Synchronisation</TGEyebrow>
      </div>
      <div style={{ margin: '0 16px', padding: 14, background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: TG.color.merSoft, color: TG.color.mer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>↻</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Wi-Fi uniquement</div>
          <div style={{ fontSize: 11, color: TG.color.ink60 }}>Économise vos données mobiles</div>
        </div>
        <div style={{ width: 38, height: 22, background: TG.color.olive, borderRadius: 11, position: 'relative' }}>
          <div style={{ position: 'absolute', right: 2, top: 2, width: 18, height: 18, borderRadius: '50%', background: TG.color.paper }}/>
        </div>
      </div>
      <div style={{ height: 16 }}/>
    </div>
  );
}

// ───────────────────────────── Création (UGC) — étape 1
function AppCreate() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans }}>
      <div style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 18, color: TG.color.ink60 }}>×</span>
        <TGEyebrow>Étape 1 / 4</TGEyebrow>
        <div style={{ fontSize: 13, color: TG.color.grenadine, fontWeight: 600 }}>Suivant</div>
      </div>

      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 14, color: TG.color.grenadine }}>Nouveau parcours</div>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 30, fontWeight: 400, margin: '6px 0 0', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Donnez-lui<br/>un titre.
        </h1>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{ background: TG.color.card, border: `2px solid ${TG.color.ink}`, borderRadius: TG.radius.md, padding: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: TG.color.ink40, fontWeight: 700 }}>TITRE</div>
          <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 6, color: TG.color.ink }}>Le vieux Cannes secret</div>
          <div style={{ height: 1.5, background: TG.color.ink, marginTop: 4 }}/>
        </div>
        <div style={{ fontSize: 11, color: TG.color.ink40, marginTop: 6, textAlign: 'right' }}>22 / 60</div>
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <div style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, padding: 14, minHeight: 90 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', color: TG.color.ink40, fontWeight: 700 }}>PITCH</div>
          <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 14, marginTop: 6, color: TG.color.ink60 }}>
            Une phrase qui donne envie d'écouter…
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <TGEyebrow>Ville</TGEyebrow>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <TGChip color={TG.color.grenadine} active>Cannes</TGChip>
          <TGChip>Nice</TGChip>
          <TGChip>Grasse</TGChip>
          <TGChip>Paris</TGChip>
          <TGChip>+ Autre</TGChip>
        </div>
      </div>

      <div style={{ padding: '24px 20px 0' }}>
        <TGEyebrow>Catégorie</TGEyebrow>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          <TGChip>Histoire</TGChip>
          <TGChip color={TG.color.olive} active>Nature</TGChip>
          <TGChip>Gastronomie</TGChip>
          <TGChip>Architecture</TGChip>
          <TGChip>Insolite</TGChip>
        </div>
      </div>

      <div style={{ padding: '32px 20px 24px' }}>
        <TGButton variant="primary" size="lg" style={{ width: '100%', justifyContent: 'center' }}>Continuer →</TGButton>
      </div>
    </div>
  );
}

// ───────────────────────────── Paramètres
function AppSettings() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans }}>
      <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18, color: TG.color.ink60 }}>←</span>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 22, fontWeight: 400, margin: 0 }}>Paramètres</h1>
      </div>

      <Section label="Compte" color={TG.color.grenadine}>
        <Row label="Email" value="anna@gmail.com"/>
        <Row label="Mot de passe" value="Modifier"/>
        <Row label="Premium" value="Actif" valueColor={TG.color.olive}/>
      </Section>

      <Section label="Lecture" color={TG.color.ocre}>
        <Row label="Vitesse" value="1× normal"/>
        <Row label="Téléchargement Wi-Fi" value="Activé"/>
        <Row label="Démarrage automatique" value="À l'arrivée"/>
      </Section>

      <Section label="Langues" color={TG.color.mer}>
        <Row label="Application" value="Français"/>
        <Row label="Audio préféré" value="FR · EN"/>
      </Section>

      <Section label="À propos" color={TG.color.olive}>
        <Row label="Version" value="2.4.1"/>
        <Row label="CGU & confidentialité" value="→"/>
        <Row label="Aide & contact" value="→"/>
      </Section>

      <div style={{ padding: '24px 20px' }}>
        <TGButton variant="ghost" size="md" style={{ width: '100%', justifyContent: 'center', color: TG.color.danger, borderColor: TG.color.danger }}>
          Se déconnecter
        </TGButton>
      </div>
    </div>
  );
}
function Section({ label, color, children }) {
  return (
    <div style={{ padding: '22px 20px 0' }}>
      <TGEyebrow color={color}>{label}</TGEyebrow>
      <div style={{ marginTop: 10, background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
function Row({ label, value, valueColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 14px', borderBottom: `1px solid ${TG.color.line}` }}>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 12, color: valueColor || TG.color.ink60, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// ───────────────────────────── États vides / erreurs
function AppEmptyOffline() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans, padding: '40px 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: TG.color.grenadineSoft, color: TG.color.grenadine, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>⚠</div>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: TG.color.grenadine, marginTop: 22 }}>Pas de réseau.</div>
      <h2 style={{ fontFamily: TG.font.display, fontSize: 28, fontWeight: 400, margin: '8px 0 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        On continue<br/>hors-ligne&nbsp;?
      </h2>
      <p style={{ fontSize: 14, color: TG.color.ink60, marginTop: 12, lineHeight: 1.55, maxWidth: 280 }}>
        Vos 3 parcours téléchargés sont prêts. La carte mondiale et la création nécessitent une connexion.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
        <TGButton variant="primary">Mes téléchargements</TGButton>
        <TGButton variant="ghost">Réessayer</TGButton>
      </div>
    </div>
  );
}

function AppEmptyGPS() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans, padding: '40px 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ width: 96, height: 96, borderRadius: 28, background: TG.color.merSoft, color: TG.color.mer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
        <TGPin color={TG.color.mer} size={44}/>
      </div>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: TG.color.mer, marginTop: 22 }}>Localisation désactivée.</div>
      <h2 style={{ fontFamily: TG.font.display, fontSize: 28, fontWeight: 400, margin: '8px 0 0', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        On a besoin<br/>de votre épingle.
      </h2>
      <p style={{ fontSize: 14, color: TG.color.ink60, marginTop: 12, lineHeight: 1.55, maxWidth: 280 }}>
        TourGuide active automatiquement les commentaires audio quand vous arrivez à un arrêt.
      </p>
      <TGButton variant="accent" size="lg" style={{ marginTop: 28 }}>Activer la localisation</TGButton>
      <div style={{ fontSize: 12, color: TG.color.ink40, marginTop: 12 }}>Continuer en mode manuel</div>
    </div>
  );
}

// ───────────────────────────── Onboarding 2/3 (offline)
function AppOnboarding2() {
  return (
    <div style={{ background: TG.color.paper, color: TG.color.ink, minHeight: '100%', fontFamily: TG.font.sans, padding: '40px 24px 28px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TGEyebrow>02 / 03</TGEyebrow>
        <div style={{ fontSize: 12, color: TG.color.ink40 }}>Passer</div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ position: 'relative', margin: '0 auto 28px', width: '100%' }}>
          {/* mini-illustration : casque + onde */}
          <div style={{ background: TG.color.olive, borderRadius: TG.radius.xl, padding: 36, color: TG.color.paper, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
              <div style={{ fontSize: 64 }}>◓</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {Array.from({ length: 14 }).map((_, i) => {
                  const h = 8 + Math.abs(Math.sin(i * 0.7)) * 38;
                  return <div key={i} style={{ width: 4, height: h, background: TG.color.paper, borderRadius: 2, opacity: 0.4 + (i / 14) * 0.6 }}/>;
                })}
              </div>
            </div>
            <div style={{ position: 'absolute', top: 14, right: 16, fontSize: 10, letterSpacing: '0.18em', fontWeight: 700, opacity: 0.85 }}>OFFLINE</div>
          </div>
        </div>

        <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 15, color: TG.color.olive }}>
          Sans données mobiles.
        </div>
        <h1 style={{ fontFamily: TG.font.display, fontSize: 36, fontWeight: 400, letterSpacing: '-0.025em', margin: '10px 0 0', lineHeight: 1.05 }}>
          Téléchargez,<br/>écoutez partout.
        </h1>
        <p style={{ fontSize: 14, color: TG.color.ink60, marginTop: 14, lineHeight: 1.55 }}>
          Une fois téléchargé, un parcours fonctionne sans réseau ni GPS Internet. Idéal en voyage à l'étranger.
        </p>
      </div>

      <div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ width: 8, height: 4, borderRadius: 2, background: TG.color.ink20 }}/>
          <div style={{ width: 24, height: 4, borderRadius: 2, background: TG.color.olive }}/>
          <div style={{ width: 8, height: 4, borderRadius: 2, background: TG.color.ink20 }}/>
        </div>
        <TGButton variant="primary" size="lg" style={{ width: '100%', justifyContent: 'center' }}>Suivant →</TGButton>
      </div>
    </div>
  );
}

Object.assign(window, { AppSearch, AppOffline, AppCreate, AppSettings, AppEmptyOffline, AppEmptyGPS, AppOnboarding2 });
