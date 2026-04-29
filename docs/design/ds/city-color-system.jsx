// Murmure — Règle d'attribution des couleurs ville + Picker Studio

// ─────────────────────────────────────────────────────────────────
// (A) Règle dans la charte — page éditoriale
// ─────────────────────────────────────────────────────────────────
function CityColorRulePage() {
  const families = [
    {
      key: 'mer', label: 'Mer', color: TG.color.mer, soft: TG.color.merSoft,
      sem: 'Côte, port, plages, eau dominante',
      cities: ['Nice', 'Cannes', 'Antibes', 'Marseille', 'La Rochelle', 'Saint-Malo', 'Biarritz'],
    },
    {
      key: 'ocre', label: 'Ocre', color: TG.color.ocre, soft: TG.color.ocreSoft,
      sem: 'Terres chaudes, pierre dorée, sud intérieur',
      cities: ['Grasse', 'Avignon', 'Aix', 'Arles', 'Toulouse', 'Roussillon', 'Nîmes'],
    },
    {
      key: 'olive', label: 'Olive', color: TG.color.olive, soft: TG.color.oliveSoft,
      sem: 'Nature, sentiers, montagne, parc, forêt',
      cities: ['Autran', 'Gordes', 'Annecy', 'Vercors', 'Cévennes', 'Verdon'],
    },
    {
      key: 'ardoise', label: 'Ardoise', color: TG.color.ardoise, soft: TG.color.ardoiseSoft,
      sem: 'Pierre froide, Nord, urbain dense, capitale',
      cities: ['Paris', 'Lyon', 'Lille', 'Reims', 'Rouen', 'Strasbourg'],
    },
  ];

  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 56, boxSizing: 'border-box' }}>
      <TGEyebrow color={TG.color.grenadine}>Système de couleurs · Règle ville</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 56, fontWeight: 400, margin: '8px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        Quatre familles,<br/><em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic' }}>pas cinquante villes</em>.
      </h1>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 17, color: TG.color.ink60, maxWidth: 760, lineHeight: 1.5 }}>
        Une ville n'a pas de couleur en soi. Elle hérite d'une <strong>famille thématique</strong> qui décrit son paysage dominant. Quatre familles couvrent 95 % du catalogue. La grenadine reste la couleur marque — jamais associée à une ville.
      </div>

      {/* Les 4 familles */}
      <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {families.map(f => (
          <div key={f.key} style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, overflow: 'hidden' }}>
            <div style={{ background: f.color, padding: '24px 24px 20px', position: 'relative' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>Famille</div>
              <div style={{ fontFamily: TG.font.display, fontSize: 32, color: TG.color.paper, marginTop: 4, lineHeight: 1 }}>{f.label}</div>
              <div style={{ fontSize: 11, fontFamily: TG.font.mono, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>{f.color}</div>
              {/* mini pin */}
              <div style={{ position: 'absolute', top: 18, right: 22 }}>
                <TGPin color={TG.color.paper} size={28}/>
              </div>
            </div>
            <div style={{ padding: '16px 24px 22px' }}>
              <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink60, lineHeight: 1.5 }}>
                {f.sem}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
                {f.cities.map(c => (
                  <span key={c} style={{
                    fontSize: 12, padding: '4px 10px', borderRadius: 999,
                    background: f.soft, color: f.color, fontWeight: 600,
                  }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Critères de décision */}
      <div style={{ marginTop: 40 }}>
        <TGEyebrow color={TG.color.ocre}>Comment décider</TGEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginTop: 14 }}>
          {[
            ['1', 'La dominante visuelle', 'On regarde une photo du lieu en plan large. La couleur du paysage gagne — pas la frontière administrative. Cannes = mer. Grasse, à 30 min, = ocre.'],
            ['2', 'Le rythme de la liste', 'Si quatre tours mer s\'enchaînent sur Home, on intercale un ocre. La couleur ville sert aussi de respiration typographique.'],
            ['3', 'L\'exception auteur', 'Le guide peut surcharger dans le Studio (un tour street-art à Marseille peut passer en grenadine). C\'est l\'exception, pas la règle.'],
          ].map(([n, t, d], i) => (
            <div key={i} style={{ background: TG.color.paperDeep, padding: 24, borderRadius: TG.radius.lg }}>
              <TGNumber n={n} color={TG.color.grenadine}/>
              <div style={{ fontFamily: TG.font.display, fontSize: 22, marginTop: 6, lineHeight: 1.15 }}>{t}</div>
              <div style={{ fontSize: 13, color: TG.color.ink80, marginTop: 8, lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cas limites */}
      <div style={{ marginTop: 36, padding: 28, background: TG.color.grenadineSoft, border: `1.5px dashed ${TG.color.grenadine}`, borderRadius: TG.radius.lg }}>
        <TGEyebrow color={TG.color.grenadine}>5ᵉ famille — cas exceptionnel</TGEyebrow>
        <div style={{ fontSize: 14, color: TG.color.ink80, marginTop: 8, lineHeight: 1.6, maxWidth: 820 }}>
          On crée une 5ᵉ famille seulement si&nbsp;: <strong>(1)</strong> la ville représente plus de 15&nbsp;% du catalogue, <strong>(2)</strong> aucune des 4 familles ne lui correspond visuellement, <strong>(3)</strong> la couleur passe le test springboard sans casser l'harmonie. Toute proposition passe par une review design.
        </div>
      </div>

      {/* Mauvais usages */}
      <div style={{ marginTop: 36 }}>
        <TGEyebrow>À éviter</TGEyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginTop: 14 }}>
          {[
            ['Une couleur par ville', 'Système qui ne scale pas. À 30 villes, plus aucune cohérence visuelle.'],
            ['Mélanger 3+ familles dans une même liste', 'Préférer 2 familles maximum dans un viewport. Sinon le rythme se perd.'],
            ['Utiliser grenadine pour une ville', 'Grenadine = marque. Réservé aux CTA, états actifs, "en cours d\'écoute".'],
          ].map(([t, d], i) => (
            <div key={i} style={{ background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.md, padding: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: TG.color.danger }}>✗ {t}</div>
              <div style={{ fontSize: 12, color: TG.color.ink60, marginTop: 6, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// (B) Picker dans le Studio — composant interactif
// ─────────────────────────────────────────────────────────────────

// Base de données ville → famille suggérée
const CITY_DB = {
  // mer
  'nice': 'mer', 'cannes': 'mer', 'antibes': 'mer', 'marseille': 'mer', 'la rochelle': 'mer',
  'saint-malo': 'mer', 'biarritz': 'mer', 'sète': 'mer', 'menton': 'mer',
  // ocre
  'grasse': 'ocre', 'avignon': 'ocre', 'aix-en-provence': 'ocre', 'aix': 'ocre',
  'arles': 'ocre', 'toulouse': 'ocre', 'roussillon': 'ocre', 'nîmes': 'ocre',
  'montpellier': 'ocre', 'orange': 'ocre',
  // olive
  'autran': 'olive', 'gordes': 'olive', 'annecy': 'olive', 'chamonix': 'olive',
  'grenoble': 'olive', 'pyrénées': 'olive', 'verdon': 'olive', 'cévennes': 'olive',
  // ardoise
  'paris': 'ardoise', 'lyon': 'ardoise', 'lille': 'ardoise', 'reims': 'ardoise',
  'rouen': 'ardoise', 'strasbourg': 'ardoise', 'nantes': 'ardoise', 'bordeaux': 'ardoise',
};

const FAMILY_META = {
  mer: { label: 'Mer', color: TG.color.mer, soft: TG.color.merSoft, hint: 'Côte, port, eau' },
  ocre: { label: 'Ocre', color: TG.color.ocre, soft: TG.color.ocreSoft, hint: 'Terres chaudes, pierre' },
  olive: { label: 'Olive', color: TG.color.olive, soft: TG.color.oliveSoft, hint: 'Nature, sentier' },
  ardoise: { label: 'Ardoise', color: TG.color.ardoise, soft: TG.color.ardoiseSoft, hint: 'Pierre froide, urbain' },
  grenadine: { label: 'Grenadine', color: TG.color.grenadine, soft: TG.color.grenadineSoft, hint: 'Marque · exception' },
};

function CityPickerStudio() {
  const [city, setCity] = React.useState('Cannes');
  const [override, setOverride] = React.useState(null); // null = auto, sinon family key
  const [draft, setDraft] = React.useState('');

  const suggested = React.useMemo(() => {
    const key = city.toLowerCase().trim();
    return CITY_DB[key] || null;
  }, [city]);

  const active = override || suggested || 'ardoise';
  const meta = FAMILY_META[active];
  const isOverride = override && override !== suggested;

  return (
    <div style={{ width: 1280, background: TG.color.paper, color: TG.color.ink, fontFamily: TG.font.sans, padding: 56, boxSizing: 'border-box' }}>
      <TGEyebrow color={TG.color.grenadine}>Studio Murmure · Picker ville</TGEyebrow>
      <h1 style={{ fontFamily: TG.font.display, fontSize: 48, fontWeight: 400, margin: '8px 0 6px', letterSpacing: '-0.025em', lineHeight: 1 }}>
        Le guide tape sa ville,<br/><em style={{ fontFamily: TG.font.editorial, fontStyle: 'italic' }}>la couleur suit</em>.
      </h1>
      <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 16, color: TG.color.ink60, maxWidth: 720, lineHeight: 1.5 }}>
        Le système suggère automatiquement la famille de couleur. Le guide peut surcharger en un clic — c'est l'exception.
      </div>

      {/* Studio mockup */}
      <div style={{ marginTop: 32, background: TG.color.card, border: `1px solid ${TG.color.line}`, borderRadius: TG.radius.lg, overflow: 'hidden', boxShadow: TG.shadow.card }}>
        {/* Studio chrome */}
        <div style={{ background: TG.color.paperDeep, padding: '14px 24px', borderBottom: `1px solid ${TG.color.line}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: TG.color.ink60 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, overflow: 'hidden' }}>
              {window.MurmureIcon ? <MurmureIcon size={22}/> : <div style={{width:22,height:22,background:TG.color.grenadine}}/>}
            </div>
            <span style={{ fontWeight: 600, color: TG.color.ink }}>Studio</span>
            <span>·</span>
            <span>Mes tours</span>
            <span style={{ color: TG.color.ink40 }}>›</span>
            <span>Vieux Cannes secret</span>
            <span style={{ color: TG.color.ink40 }}>›</span>
            <span style={{ color: TG.color.ink, fontWeight: 600 }}>Réglages</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ fontSize: 13, padding: '8px 14px', borderRadius: 8, background: 'transparent', color: TG.color.ink60, border: `1px solid ${TG.color.line}`, fontWeight: 600 }}>Aperçu</button>
            <button style={{ fontSize: 13, padding: '8px 14px', borderRadius: 8, background: TG.color.ink, color: TG.color.paper, border: 'none', fontWeight: 600 }}>Publier</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', minHeight: 580 }}>

          {/* Left — form */}
          <div style={{ padding: 28, borderRight: `1px solid ${TG.color.line}`, background: '#FCFAF6' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: TG.color.ink60, fontWeight: 700 }}>Identité du tour</div>

            {/* Title */}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 12, color: TG.color.ink60, fontWeight: 600 }}>Titre</label>
              <input value="Vieux Cannes secret" readOnly style={{
                marginTop: 6, width: '100%', padding: '12px 14px', fontSize: 16, fontFamily: TG.font.display,
                border: `1px solid ${TG.color.line}`, borderRadius: 8, background: TG.color.paper, color: TG.color.ink, boxSizing: 'border-box',
              }}/>
            </div>

            {/* City input */}
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 12, color: TG.color.ink60, fontWeight: 600 }}>Ville principale</label>
              <input value={city} onChange={e => { setCity(e.target.value); setOverride(null); }} style={{
                marginTop: 6, width: '100%', padding: '12px 14px', fontSize: 14,
                border: `2px solid ${meta.color}`, borderRadius: 8, background: TG.color.paper, color: TG.color.ink, boxSizing: 'border-box', outline: 'none',
              }}/>

              {/* Suggestion */}
              {suggested && !isOverride && (
                <div style={{ marginTop: 10, fontSize: 12, color: TG.color.ink60, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }}/>
                  Suggéré&nbsp;: <strong style={{ color: meta.color }}>{meta.label}</strong> · {meta.hint}
                </div>
              )}
              {!suggested && (
                <div style={{ marginTop: 10, fontSize: 12, color: TG.color.ink60, fontStyle: 'italic' }}>
                  Ville non répertoriée — choisissez une famille ci-dessous.
                </div>
              )}
              {isOverride && (
                <div style={{ marginTop: 10, fontSize: 12, color: TG.color.grenadine, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⚐</span> Couleur surchargée manuellement.
                  <button onClick={() => setOverride(null)} style={{ background: 'none', border: 'none', color: TG.color.ink60, textDecoration: 'underline', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                    revenir au défaut
                  </button>
                </div>
              )}
            </div>

            {/* Family picker */}
            <div style={{ marginTop: 22 }}>
              <label style={{ fontSize: 12, color: TG.color.ink60, fontWeight: 600 }}>
                Famille de couleur
                <span style={{ fontWeight: 400, marginLeft: 6, color: TG.color.ink40 }}>(optionnel — surcharge)</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 8 }}>
                {Object.entries(FAMILY_META).map(([k, m]) => {
                  const isActive = k === active;
                  const isAuto = k === suggested && !override;
                  return (
                    <button
                      key={k}
                      onClick={() => setOverride(k === suggested ? null : k)}
                      style={{
                        padding: '10px 4px', borderRadius: 8, cursor: 'pointer',
                        background: isActive ? m.color : m.soft,
                        color: isActive ? TG.color.paper : m.color,
                        border: isActive ? `2px solid ${m.color}` : `2px solid transparent`,
                        fontSize: 11, fontWeight: 700, position: 'relative',
                      }}
                    >
                      {m.label}
                      {isAuto && (
                        <span style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, borderRadius: '50%', background: TG.color.ink, color: TG.color.paper, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: TG.color.ink40, marginTop: 8, fontStyle: 'italic' }}>
                ✓ = suggéré automatiquement par la ville. Cliquez ailleurs pour surcharger.
              </div>
            </div>

            {/* Test villes */}
            <div style={{ marginTop: 22, padding: 14, background: TG.color.paperDeep, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: TG.color.ink60, marginBottom: 8 }}>Essayez :</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {['Cannes', 'Paris', 'Avignon', 'Annecy', 'Toulouse', 'Marseille'].map(c => (
                  <button key={c} onClick={() => { setCity(c); setOverride(null); }} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 999,
                    background: TG.color.paper, color: TG.color.ink60, border: `1px solid ${TG.color.line}`,
                    cursor: 'pointer',
                  }}>{c}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Right — preview */}
          <div style={{ padding: 32, background: TG.color.paper }}>
            <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: TG.color.ink60, fontWeight: 700 }}>Aperçu app</div>
            <div style={{ fontSize: 12, color: TG.color.ink40, marginTop: 4 }}>Voici comment le tour apparaît dans l'app touriste.</div>

            {/* Tour card preview */}
            <div style={{ marginTop: 20, maxWidth: 380 }}>
              <div style={{ background: TG.color.card, borderRadius: TG.radius.lg, overflow: 'hidden', boxShadow: TG.shadow.card, border: `1px solid ${TG.color.line}` }}>
                <div style={{ background: meta.color, padding: '20px 22px 18px', position: 'relative' }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.2em', fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>{city.toUpperCase()}</div>
                  <div style={{ fontFamily: TG.font.display, fontSize: 26, color: TG.color.paper, marginTop: 4, lineHeight: 1.1 }}>Vieux Cannes secret</div>
                  <div style={{ position: 'absolute', top: 16, right: 18 }}>
                    <TGPin color={TG.color.paper} size={24}/>
                  </div>
                </div>
                <div style={{ padding: '16px 22px 18px' }}>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12, color: TG.color.ink60 }}>
                    <span><strong style={{ color: TG.color.ink }}>1h12</strong> · 8 arrêts</span>
                    <span style={{ color: TG.color.ink40 }}>·</span>
                    <span>2,99 €</span>
                  </div>
                  <div style={{ height: 1, background: TG.color.line, margin: '14px 0' }}/>
                  <div style={{ fontFamily: TG.font.editorial, fontStyle: 'italic', fontSize: 13, color: TG.color.ink80, lineHeight: 1.5 }}>
                    « Derrière les façades roses, la ville d'avant le festival. »
                  </div>
                </div>
              </div>
            </div>

            {/* Pin + chip + bouton previews */}
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 11, color: TG.color.ink40, fontStyle: 'italic' }}>Et partout ailleurs dans l'app :</div>
              <div style={{ marginTop: 12, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: meta.soft, borderRadius: 999 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color }}/>
                  <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{city}</span>
                </div>
                <TGPin color={meta.color} size={28}/>
                <button style={{ background: meta.color, color: TG.color.paper, border: 'none', padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Écouter ce tour
                </button>
                <div style={{ fontSize: 12, fontFamily: TG.font.mono, color: TG.color.ink40 }}>{meta.color}</div>
              </div>
            </div>

            {/* Map preview */}
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 11, color: TG.color.ink40, fontStyle: 'italic' }}>Sur la carte :</div>
              <div style={{ marginTop: 8 }}>
                <TGMap height={140} pins={[
                  { x: 25, y: 60, color: meta.color }, { x: 42, y: 45, color: meta.color },
                  { x: 60, y: 55, color: meta.color }, { x: 78, y: 38, color: meta.color },
                ]}/>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 24, fontSize: 12, color: TG.color.ink40, fontStyle: 'italic', textAlign: 'center' }}>
        Tapez une autre ville ou cliquez sur un chip à gauche — toute la preview se met à jour en direct.
      </div>
    </div>
  );
}

window.CityColorRulePage = CityColorRulePage;
window.CityPickerStudio = CityPickerStudio;
