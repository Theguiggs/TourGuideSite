/**
 * seed-alpes-maritimes.mjs — Seed 10 parcours publiés dans les Alpes-Maritimes
 * avec guides, reviews, stats, sessions et scènes POI géolocalisées.
 *
 * Usage: node scripts/seed-alpes-maritimes.mjs [--clean]
 *   --clean : supprime les données seed existantes avant de re-seeder
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = 'us-east-1';
const SEED_PREFIX = 'seed-am-';

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);

function table(name) { return `${name}-${APP_ID}-${ENV}`; }
const now = new Date().toISOString();
function put(tableName, item) {
  return dynamo.send(new PutCommand({ TableName: table(tableName), Item: { createdAt: now, updatedAt: now, __typename: tableName, ...item } }));
}

// ── Cleanup ─────────────────────────────────────────────
async function cleanExisting() {
  const tables = ['StudioScene', 'StudioSession', 'TourReview', 'TourStats', 'ModerationItem', 'GuideTour', 'GuideProfile'];
  let total = 0;
  for (const t of tables) {
    const fullName = table(t);
    let lastKey;
    const ids = [];
    do {
      const scan = await dynamo.send(new ScanCommand({ TableName: fullName, ProjectionExpression: 'id, guideId, title, tourTitle', ExclusiveStartKey: lastKey }));
      for (const item of scan.Items ?? []) {
        const matchesId = typeof item.id === 'string' && item.id.startsWith(SEED_PREFIX);
        const matchesGuide = typeof item.guideId === 'string' && item.guideId.startsWith(SEED_PREFIX);
        const matchesTitle = typeof item.title === 'string' && item.title.startsWith(SEED_PREFIX);
        const matchesTourTitle = typeof item.tourTitle === 'string' && item.tourTitle.startsWith(SEED_PREFIX);
        if (matchesId || matchesGuide || matchesTitle || matchesTourTitle) ids.push(item.id);
      }
      lastKey = scan.LastEvaluatedKey;
    } while (lastKey);
    for (let i = 0; i < ids.length; i += 25) {
      await dynamo.send(new BatchWriteCommand({ RequestItems: { [fullName]: ids.slice(i, i + 25).map(id => ({ DeleteRequest: { Key: { id } } })) } }));
    }
    if (ids.length) console.log(`  Cleaned ${t}: ${ids.length} items`);
    total += ids.length;
  }
  return total;
}

// ── Guides ──────────────────────────────────────────────
const guides = [
  { id: `${SEED_PREFIX}guide-nice`, userId: `${SEED_PREFIX}user-nice`, displayName: 'Isabelle Moretti', city: 'Nice', bio: 'Niçoise de naissance, historienne de formation. Je vous fais découvrir les secrets de ma ville depuis 12 ans, entre baroque et Méditerranée.', specialties: ['histoire', 'architecture', 'gastronomie'], languages: ['fr', 'en', 'it'], tourCount: 3, rating: 4.7 },
  { id: `${SEED_PREFIX}guide-cannes`, userId: `${SEED_PREFIX}user-cannes`, displayName: 'Thomas Bellini', city: 'Cannes', bio: 'Ancien journaliste cinéma, je raconte Cannes à travers ses festivals, ses palaces et ses ruelles cachées du Suquet.', specialties: ['cinéma', 'culture', 'architecture'], languages: ['fr', 'en'], tourCount: 2, rating: 4.8 },
  { id: `${SEED_PREFIX}guide-antibes`, userId: `${SEED_PREFIX}user-antibes`, displayName: 'Claire Duval', city: 'Antibes', bio: 'Plongeuse et passionnée de Picasso, guide certifiée du patrimoine maritime de la Côte d\'Azur.', specialties: ['art', 'mer', 'histoire'], languages: ['fr', 'en'], tourCount: 1, rating: 4.6 },
  { id: `${SEED_PREFIX}guide-menton`, userId: `${SEED_PREFIX}user-menton`, displayName: 'Luca Ferretti', city: 'Menton', bio: 'Franco-italien né à Menton, botaniste amateur. Mes visites sentent le citron et la fleur d\'oranger.', specialties: ['jardins', 'botanique', 'gastronomie'], languages: ['fr', 'it', 'en'], tourCount: 1, rating: 4.9 },
  { id: `${SEED_PREFIX}guide-vence`, userId: `${SEED_PREFIX}user-vence`, displayName: 'Marie-Anne Laporte', city: 'Vence', bio: 'Artiste peintre installée dans l\'arrière-pays niçois. Je partage l\'art et la lumière de Provence.', specialties: ['art', 'chapelle Matisse', 'villages'], languages: ['fr', 'en'], tourCount: 2, rating: 4.5 },
  { id: `${SEED_PREFIX}guide-grasse`, userId: `${SEED_PREFIX}user-grasse`, displayName: 'Jean-Paul Roux', city: 'Grasse', bio: 'Nez certifié, 20 ans dans la parfumerie grassoise. Sentez l\'histoire à chaque ruelle.', specialties: ['parfum', 'histoire', 'nature'], languages: ['fr', 'en', 'de'], tourCount: 1, rating: 4.8 },
];

// ── Tours with POIs ─────────────────────────────────────
const tours = [
  {
    id: `${SEED_PREFIX}tour-1`, guideIdx: 0, title: `${SEED_PREFIX}Nice Baroque — Du Vieux-Nice au Port`, city: 'Nice',
    description: 'Plongez dans le cœur battant du Vieux-Nice, là où les façades ocre et les églises baroques racontent cinq siècles d\'histoire. De la Place Masséna aux ruelles du marché du Cours Saleya, laissez-vous guider par les cloches, les accents et les odeurs de socca. Chaque point d\'intérêt est une invitation à lever les yeux et à découvrir un détail que même les locaux ne voient plus.',
    duration: 55, distance: 2.8,
    pois: [
      { title: 'Place Masséna', desc: 'Le cœur de Nice, entre architecture piémontaise et fontaine du Soleil. Les statues de Jaume Plensa illuminent la place la nuit.', lat: 43.6971, lng: 7.2706 },
      { title: 'Cours Saleya — Marché aux Fleurs', desc: 'Le marché le plus parfumé de la Côte d\'Azur. Fleurs, épices, socca et pissaladière depuis le XVIIIe siècle.', lat: 43.6953, lng: 7.2760 },
      { title: 'Cathédrale Sainte-Réparate', desc: 'Chef-d\'œuvre du baroque niçois (1650). Coupole vernissée et intérieur somptueux dédié à la sainte patronne de Nice.', lat: 43.6965, lng: 7.2759 },
      { title: 'Palais Lascaris', desc: 'Palais baroque du XVIIe siècle transformé en musée. Escalier monumental, fresques et collection d\'instruments de musique anciens.', lat: 43.6979, lng: 7.2770 },
      { title: 'Chapelle de la Miséricorde', desc: 'Considérée comme le plus beau monument baroque de Nice. Retables de Louis Bréa et Jean Miralhet.', lat: 43.6955, lng: 7.2745 },
      { title: 'Place Saint-François', desc: 'Ancien marché aux poissons. La fontaine aux dauphins et le Palais Communal rappellent l\'époque sarde.', lat: 43.6988, lng: 7.2771 },
      { title: 'Église Saint-Jacques — Le Gesù', desc: 'Première église baroque de Nice, inspirée du Gesù de Rome. Façade monumentale sur la rue Droite.', lat: 43.6975, lng: 7.2762 },
      { title: 'Port Lympia', desc: 'Le port historique de Nice creusé au XVIIIe siècle. Façades colorées, barques de pêcheurs et départ vers la Corse.', lat: 43.6945, lng: 7.2849 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-2`, guideIdx: 0, title: `${SEED_PREFIX}Promenade des Anglais — L'Épopée Bleu Azur`, city: 'Nice',
    description: 'Sept kilomètres de légende face à la Baie des Anges. Des palaces de la Belle Époque au Negresco, cette promenade audio vous raconte comment une communauté britannique a inventé le bord de mer le plus célèbre du monde. Laissez le bruit des vagues rythmer votre marche tandis que les anecdotes défilent.',
    duration: 40, distance: 4.2,
    pois: [
      { title: 'Hôtel Negresco', desc: 'Palace mythique de 1913, classé monument historique. Sa coupole rose est signée Gustave Eiffel. Le lustre du salon est un cadeau du Tsar Nicolas II.', lat: 43.6947, lng: 7.2555 },
      { title: 'Palais de la Méditerranée', desc: 'Façade Art déco de 1929 miraculeusement préservée. Le casino original a vu défiler les stars de Hollywood.', lat: 43.6932, lng: 7.2592 },
      { title: 'Jardin Albert 1er', desc: 'Le plus ancien jardin public de Nice (1852). L\'Arc de Venet et le Théâtre de Verdure animent ce poumon vert face à la mer.', lat: 43.6955, lng: 7.2662 },
      { title: 'Opéra de Nice', desc: 'Inauguré en 1885, l\'Opéra de Nice accueille les plus grands. Son architecture Second Empire rivalise avec les scènes parisiennes.', lat: 43.6953, lng: 7.2720 },
      { title: 'Mémorial du 14 Juillet', desc: 'Un lieu de recueillement face à la mer, rappelant les événements tragiques de 2016. La résilience de Nice incarnée.', lat: 43.6928, lng: 7.2488 },
      { title: 'Plage des Ponchettes', desc: 'Plage historique au pied du Vieux-Nice. Les galets de la Baie des Anges et la vue sur la Colline du Château.', lat: 43.6940, lng: 7.2787 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-3`, guideIdx: 0, title: `${SEED_PREFIX}Colline du Château — Panorama et Mystères`, city: 'Nice',
    description: 'Grimpez la colline où est née la ville de Nice il y a 2 400 ans. Entre cascades, ruines de la cathédrale et cimetière romantique, ce parcours vertical vous offre les plus beaux panoramas de la Côte d\'Azur. L\'audio révèlera les secrets des souterrains et l\'histoire des sièges qui ont façonné cette citadelle.',
    duration: 35, distance: 1.9,
    pois: [
      { title: 'Tour Bellanda', desc: 'Tour ronde du XIXe siècle où Berlioz composa le Roi Lear. Vue imprenable sur la Baie des Anges et l\'arrière-pays.', lat: 43.6942, lng: 7.2810 },
      { title: 'Cascade du Château', desc: 'Cascade artificielle de 1885 alimentée par le canal du Loup. Fraîcheur et romantisme au cœur de la colline.', lat: 43.6955, lng: 7.2822 },
      { title: 'Ruines de la Cathédrale', desc: 'Vestiges de la cathédrale Sainte-Marie détruite en 1706 par Louis XIV. Les fouilles révèlent 2 000 ans d\'occupation.', lat: 43.6960, lng: 7.2818 },
      { title: 'Cimetière du Château', desc: 'Nécropole romantique où reposent des figures de Nice — Garibaldi, les familles russes de la Belle Époque.', lat: 43.6968, lng: 7.2835 },
      { title: 'Plate-forme du Donjon', desc: 'Point culminant (92m). Panorama à 360° : les Alpes, la mer, le port, les toits du Vieux-Nice.', lat: 43.6958, lng: 7.2825 },
      { title: 'Mosaïques romaines', desc: 'Site archéologique avec mosaïques de l\'antique Cemenelum. Témoignage de la présence romaine sur la colline.', lat: 43.6963, lng: 7.2812 },
      { title: 'Escalier Lesage', desc: 'L\'escalier monumental de 213 marches creusé dans la roche. Chaque palier offre une vue différente sur la ville.', lat: 43.6950, lng: 7.2805 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-4`, guideIdx: 1, title: `${SEED_PREFIX}Cannes — Du Suquet à la Croisette`, city: 'Cannes',
    description: 'Commencez par le village de pêcheurs médiéval du Suquet, ses escaliers, sa tour et sa vue à couper le souffle. Puis descendez vers la Croisette, le Palais des Festivals et les marches les plus photographiées au monde. Entre glamour et authenticité, ce parcours vous dévoile les deux visages de Cannes.',
    duration: 50, distance: 3.1,
    pois: [
      { title: 'Tour du Suquet', desc: 'Tour carrée du XIe siècle dominant le vieux Cannes. Aujourd\'hui musée de la Castre avec vue panoramique sur la baie.', lat: 43.5510, lng: 7.0132 },
      { title: 'Église Notre-Dame d\'Espérance', desc: 'Église gothique provençal du XVIe siècle au sommet du Suquet. Son parvis offre le plus beau coucher de soleil de Cannes.', lat: 43.5507, lng: 7.0125 },
      { title: 'Rue Meynadier', desc: 'Rue piétonne commerçante de l\'ancien Cannes. Fromageries, pâtisseries et boutiques provençales authentiques.', lat: 43.5518, lng: 7.0118 },
      { title: 'Vieux Port', desc: 'Le port originel de Cannes. Bateaux de pêche côtoient les yachts. Le marché Forville juste derrière.', lat: 43.5515, lng: 7.0155 },
      { title: 'Palais des Festivals', desc: 'Le temple du 7e art. Les 24 marches rouges, les empreintes des stars, et l\'histoire du Festival depuis 1946.', lat: 43.5509, lng: 7.0178 },
      { title: 'La Croisette', desc: 'Le boulevard mythique de 2 km bordé de palaces — Carlton, Martinez, Majestic. Plages privées et boutiques de luxe.', lat: 43.5498, lng: 7.0250 },
      { title: 'Hôtel Carlton', desc: 'Palace Belle Époque de 1911, star du film "La Main au Collet" d\'Hitchcock. Ses coupoles jumelles sont le symbole de Cannes.', lat: 43.5499, lng: 7.0268 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-5`, guideIdx: 1, title: `${SEED_PREFIX}Îles de Lérins — Silence et Monastère`, city: 'Cannes',
    description: 'À 15 minutes de bateau de la Croisette, un autre monde. L\'île Saint-Honorat abrite un monastère du Ve siècle où les moines produisent du vin et de la liqueur. L\'île Sainte-Marguerite garde le Fort Royal où fut emprisonné le Masque de Fer. Cet audio guide transforme une excursion en voyage dans le temps.',
    duration: 65, distance: 3.5,
    pois: [
      { title: 'Embarcadère — Quai Laubeuf', desc: 'Point de départ vers les îles. 15 minutes de traversée avec vue sur l\'Esterel et les Alpes enneigées.', lat: 43.5485, lng: 7.0170 },
      { title: 'Fort Royal — Île Sainte-Marguerite', desc: 'Forteresse de Vauban. La cellule du Masque de Fer et le musée de la Mer avec ses épaves romaines.', lat: 43.5270, lng: 7.0460 },
      { title: 'Allée des Eucalyptus', desc: 'Sentier ombragé traversant la forêt de pins et d\'eucalyptus de Sainte-Marguerite. Cigales et parfums de résine.', lat: 43.5255, lng: 7.0440 },
      { title: 'Monastère de Lérins — Île Saint-Honorat', desc: 'Monastère fondé en 410 par Saint Honorat. Les moines cisterciens y produisent vin, liqueur et miel.', lat: 43.5080, lng: 7.0470 },
      { title: 'Tour-Donjon fortifié', desc: 'Tour monastique du XIe siècle en bord de mer. Refuge des moines contre les pirates sarrasins.', lat: 43.5070, lng: 7.0490 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-6`, guideIdx: 2, title: `${SEED_PREFIX}Antibes — Remparts, Picasso et Bord de Mer`, city: 'Antibes',
    description: 'Marchez sur les traces de Picasso dans la vieille ville fortifiée d\'Antibes. Du marché provençal au musée Picasso dans le Château Grimaldi, en passant par le port Vauban — le plus grand port de plaisance d\'Europe — chaque arrêt est une immersion dans l\'histoire millénaire de cette cité gréco-romaine devenue joyau de la Riviera.',
    duration: 50, distance: 2.6,
    pois: [
      { title: 'Port Vauban', desc: 'Plus grand port de plaisance d\'Europe. Le Fort Carré en sentinelle et les méga-yachts du Quai des Milliardaires.', lat: 43.5834, lng: 7.1261 },
      { title: 'Porte Marine', desc: 'Entrée monumentale de la vieille ville fortifiée. Les remparts de Vauban encerclent encore le cœur historique.', lat: 43.5806, lng: 7.1270 },
      { title: 'Marché Provençal', desc: 'Sous les halles couvertes du Cours Masséna : olives, tapenade, fromages de chèvre et fleurs coupées.', lat: 43.5800, lng: 7.1256 },
      { title: 'Musée Picasso — Château Grimaldi', desc: 'Picasso y installa son atelier en 1946. La collection permanente inclut "La Joie de Vivre" et des céramiques uniques.', lat: 43.5800, lng: 7.1285 },
      { title: 'Église de l\'Immaculée Conception', desc: 'Clocher-tour du XIIe siècle, ancien donjon reconverti. Retable de Louis Bréa à l\'intérieur.', lat: 43.5802, lng: 7.1278 },
      { title: 'Bastion Saint-André', desc: 'Bastion Vauban abritant le musée d\'archéologie. Amphores romaines et vestiges d\'Antipolis la grecque.', lat: 43.5790, lng: 7.1300 },
      { title: 'Plage de la Gravette', desc: 'Petite plage de sable fin au pied des remparts. L\'une des rares plages de sable de la Côte d\'Azur.', lat: 43.5812, lng: 7.1300 },
      { title: 'Jardin Thuret', desc: 'Jardin botanique de 3,5 hectares créé en 1857. Plus de 3 000 espèces dont les premiers eucalyptus de France.', lat: 43.5746, lng: 7.1200 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-7`, guideIdx: 3, title: `${SEED_PREFIX}Menton — Jardins d'Éden entre France et Italie`, city: 'Menton',
    description: 'Menton possède le microclimat le plus doux de France. Ce parcours vous mène à travers ses jardins exotiques légendaires — Val Rahmeh, Serre de la Madone, jardin Fontana Rosa — où poussent des espèces venues du monde entier. Entre citronniers et bougainvilliers, l\'audio vous raconte les botanistes excentriques qui ont créé ces paradis.',
    duration: 60, distance: 3.0,
    pois: [
      { title: 'Jardin Botanique Val Rahmeh', desc: 'Jardin tropical du Muséum national. Avocatiers, daturas, nénuphars géants et une collection de plantes médicinales.', lat: 43.7728, lng: 7.5050 },
      { title: 'Basilique Saint-Michel', desc: 'La plus grande église baroque de la Côte d\'Azur. Son parvis de galets offre une vue plongeante sur la mer.', lat: 43.7750, lng: 7.5087 },
      { title: 'Jardin Fontana Rosa', desc: 'Jardin hispano-mauresque créé par Blasco Ibáñez. Céramiques de Valence, bassins et colonnes entre les agrumes.', lat: 43.7768, lng: 7.5120 },
      { title: 'Marché couvert', desc: 'Halles de 1898 aux façades ornées de céramiques. Socca mentonnaise, barbajuan et citrons de Menton.', lat: 43.7758, lng: 7.5075 },
      { title: 'Serre de la Madone', desc: 'Jardin remarquable créé par Lawrence Johnston en 1924. Terrasses étagées, collection de plantes rares et fontaines cachées.', lat: 43.7700, lng: 7.4950 },
      { title: 'Promenade du Soleil', desc: 'Front de mer entre la vieille ville et Garavan. Palmiers, citronniers en pots et vue sur l\'Italie par temps clair.', lat: 43.7740, lng: 7.5110 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-8`, guideIdx: 4, title: `${SEED_PREFIX}Saint-Paul-de-Vence — Village des Artistes`, city: 'Saint-Paul-de-Vence',
    description: 'Chagall, Matisse, Prévert... tous sont tombés amoureux de ce village perché. Derrière ses remparts du XVIe siècle, les galeries d\'art côtoient les ateliers de céramique et les terrasses où Yves Montand jouait à la pétanque. Cet audio guide est une promenade entre art, histoire et lumière méditerranéenne.',
    duration: 40, distance: 1.4,
    pois: [
      { title: 'Porte Royale', desc: 'Entrée principale du village fortifié. Le canon de François 1er accueille les visiteurs depuis 1547.', lat: 43.6965, lng: 7.1210 },
      { title: 'Rue Grande', desc: 'Artère principale pavée bordée de galeries d\'art, ateliers de céramique et boutiques d\'artisans.', lat: 43.6960, lng: 7.1205 },
      { title: 'Place de la Grande Fontaine', desc: 'Fontaine en forme d\'urne du XIXe siècle. Cœur social du village où les peintres posaient leur chevalet.', lat: 43.6955, lng: 7.1200 },
      { title: 'Collégiale de la Conversion', desc: 'Église du XIIIe siècle avec un tableau attribué à Tintoret. Le clocher domine la vallée du Malvan.', lat: 43.6950, lng: 7.1195 },
      { title: 'Cimetière — Tombe de Chagall', desc: 'Marc Chagall repose ici depuis 1985. Vue sur les collines et la mer, dans la lumière qu\'il aimait peindre.', lat: 43.6945, lng: 7.1190 },
      { title: 'Fondation Maeght', desc: 'Musée d\'art moderne dans un écrin de Sert. Giacometti, Miró, Calder dans les jardins et les salles.', lat: 43.6980, lng: 7.1180 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-9`, guideIdx: 4, title: `${SEED_PREFIX}Vence — De la Chapelle Matisse aux Fontaines`, city: 'Vence',
    description: 'La Chapelle du Rosaire, chef-d\'œuvre de Matisse, est le point de départ de cette balade dans la cité épiscopale de Vence. Traversez la Place du Peyra, longez les fontaines Renaissance et perdez-vous dans des ruelles où le temps s\'est arrêté. L\'audio vous guidera jusqu\'aux points de vue où la mer et les Alpes se rejoignent.',
    duration: 35, distance: 1.8,
    pois: [
      { title: 'Chapelle du Rosaire — Matisse', desc: 'Chef-d\'œuvre absolu de Matisse (1951). Vitraux bleu-vert-jaune, céramiques murales et chemin de croix. L\'artiste la considérait comme son aboutissement.', lat: 43.7255, lng: 7.1100 },
      { title: 'Place du Peyra', desc: 'Cœur de la vieille ville avec sa fontaine en forme d\'urne (1822). Les platanes centenaires abritent le marché du mardi.', lat: 43.7228, lng: 7.1115 },
      { title: 'Cathédrale de la Nativité', desc: 'Cathédrale romane du XIe siècle bâtie sur un temple romain. Mosaïque de Chagall et stalles médiévales.', lat: 43.7230, lng: 7.1120 },
      { title: 'Porte du Peyra', desc: 'Porte fortifiée du XIIIe siècle, passage entre la ville haute et la vallée. Mâchicoulis et blasons sculptés.', lat: 43.7225, lng: 7.1112 },
      { title: 'Château de Villeneuve', desc: 'Château du XVIIe siècle reconverti en fondation d\'art. Expositions temporaires dans un cadre provençal intimiste.', lat: 43.7232, lng: 7.1108 },
    ],
  },
  {
    id: `${SEED_PREFIX}tour-10`, guideIdx: 5, title: `${SEED_PREFIX}Grasse — Les Routes du Parfum`, city: 'Grasse',
    description: 'Suivez le chemin des fleurs depuis les champs de jasmin de la plaine jusqu\'aux alambics des parfumeries centenaires. Ce parcours sensoriel vous plonge dans l\'art de la distillation, l\'histoire des grandes maisons — Fragonard, Molinard, Galimard — et les secrets des "nez" qui composent les fragrances les plus célèbres au monde. Respirez, écoutez, marchez.',
    duration: 50, distance: 2.3,
    pois: [
      { title: 'Place aux Aires', desc: 'Ancien marché aux herbes aromatiques. La fontaine à trois étages (1822) et les arcades médiévales rappellent l\'âge d\'or du commerce grassois.', lat: 43.6591, lng: 6.9243 },
      { title: 'Parfumerie Fragonard', desc: 'Maison fondée en 1926. Visite des alambics en cuivre, orgue à parfums et démonstration de la technique de l\'enfleurage à froid.', lat: 43.6587, lng: 6.9221 },
      { title: 'Musée International de la Parfumerie', desc: 'L\'histoire du parfum à travers 5 000 ans. Flacons antiques, machines d\'extraction et jardin de plantes aromatiques sur le toit.', lat: 43.6583, lng: 6.9215 },
      { title: 'Cathédrale Notre-Dame du Puy', desc: 'Cathédrale du XIIe siècle renfermant trois toiles de Rubens et un rare triptyque de Louis Bréa.', lat: 43.6593, lng: 6.9218 },
      { title: 'Parfumerie Molinard', desc: 'Fondée en 1849, la plus ancienne parfumerie de Grasse. Atelier de création de son propre parfum et collection de flacons Lalique.', lat: 43.6575, lng: 6.9210 },
      { title: 'Jardins du MIP — Domaine de Manon', desc: 'Champs de roses de mai, jasmin, tubéreuse et lavande. La matière première des parfumeurs, cultivée à flanc de colline.', lat: 43.6470, lng: 6.9340 },
      { title: 'Place du 24 Août', desc: 'Cœur de la vieille ville, entourée de maisons médiévales à arcades. Point de vue sur les toits de Grasse et la plaine du parfum.', lat: 43.6589, lng: 6.9232 },
    ],
  },
];

// ── Reviews ─────────────────────────────────────────────
const reviewPool = [
  { rating: 5, comment: 'Absolument magnifique ! L\'audio est immersif, on oublie le téléphone. Une vraie expérience.' },
  { rating: 5, comment: 'Le meilleur moyen de découvrir la ville. Le guide sait raconter des histoires captivantes.' },
  { rating: 4, comment: 'Très bien réalisé, parcours agréable. Quelques passages un peu longs mais globalement top.' },
  { rating: 5, comment: 'On sent la passion du guide. Les anecdotes sont incroyables, j\'ai appris plein de choses.' },
  { rating: 4, comment: 'Bonne visite, audio de qualité. J\'aurais aimé un peu plus de musique d\'ambiance.' },
  { rating: 5, comment: 'Recommandé à 100%. Fait en famille, même les enfants ont adoré.' },
  { rating: 3, comment: 'Correct mais pas exceptionnel. Le parcours est un peu long pour des personnes âgées.' },
  { rating: 5, comment: 'Un pur bonheur ! J\'ai refait la visite deux fois avec des amis différents.' },
  { rating: 4, comment: 'Très bonne découverte. Les points d\'intérêt sont bien choisis et bien documentés.' },
  { rating: 5, comment: 'Bravo ! On sent le travail de recherche historique. L\'audio est clair et passionnant.' },
];

// ── Seed Execution ──────────────────────────────────────
async function run() {
  const doClean = process.argv.includes('--clean');
  if (doClean) {
    console.log('Cleaning existing seed data...');
    const cleaned = await cleanExisting();
    console.log(`Cleaned ${cleaned} items.\n`);
  }

  console.log('=== Seed Alpes-Maritimes ===\n');

  // 1. Guides
  for (const g of guides) {
    await put('GuideProfile', {
      id: g.id, userId: g.userId, owner: `${g.userId}::${g.userId}`,
      displayName: g.displayName, city: g.city, bio: g.bio,
      profileStatus: 'active', specialties: g.specialties, languages: g.languages,
      tourCount: g.tourCount, rating: g.rating, verified: true,
    });
    console.log(`  Guide: ${g.displayName} (${g.city})`);
  }

  // 2. Tours + Sessions + Scenes + Reviews + Stats
  for (let i = 0; i < tours.length; i++) {
    const t = tours[i];
    const guide = guides[t.guideIdx];

    // GuideTour — with sessionId linking
    const sessionId = `${t.id}-session`;
    await put('GuideTour', {
      id: t.id, guideId: guide.id, owner: `${guide.userId}::${guide.userId}`,
      title: t.title, city: t.city, status: 'published',
      description: t.description, duration: t.duration, distance: t.distance,
      poiCount: t.pois.length, sessionId,
    });

    // StudioSession
    await put('StudioSession', {
      id: sessionId, guideId: guide.id, owner: `${guide.userId}::${guide.userId}`,
      tourId: t.id, title: t.title, status: 'published',
      language: 'fr', consentRGPD: true,
    });

    // StudioScenes — one per POI with real coords and audio keys
    for (let s = 0; s < t.pois.length; s++) {
      const poi = t.pois[s];
      await put('StudioScene', {
        id: `${t.id}-scene-${s}`, sessionId,
        owner: `${guide.userId}::${guide.userId}`,
        sceneIndex: s, title: poi.title, status: 'finalized',
        studioAudioKey: `guide-audio/${t.id}/scene_${s}.aac`,
        originalAudioKey: `guide-audio/${t.id}/scene_${s}_original.aac`,
        transcriptText: poi.desc,
        poiDescription: poi.desc,
        transcriptionStatus: 'completed',
        qualityScore: 'good', archived: false,
        photosRefs: [`guide-photos/${t.id}/poi_${s}.jpg`],
        latitude: poi.lat, longitude: poi.lng,
      });
    }

    // TourReviews
    const reviewCount = 3 + Math.floor(Math.random() * 3);
    let ratingSum = 0;
    for (let r = 0; r < reviewCount; r++) {
      const tmpl = reviewPool[(i * 3 + r) % reviewPool.length];
      ratingSum += tmpl.rating;
      await put('TourReview', {
        id: `${t.id}-review-${r}`, tourId: t.id,
        userId: `visitor-${randomUUID().substring(0, 8)}`,
        owner: `visitor::visitor`,
        rating: tmpl.rating, comment: tmpl.comment,
        visitedAt: Date.now() - (r + 1) * 86400000 * (3 + Math.floor(Math.random() * 10)),
        language: 'fr', status: 'visible',
      });
    }

    // TourStats
    const avgRating = Math.round((ratingSum / reviewCount) * 10) / 10;
    const completionCount = 15 + Math.floor(Math.random() * 180);
    await put('TourStats', {
      id: `${t.id}-stats`, tourId: t.id,
      averageRating: avgRating, reviewCount, completionCount,
    });

    console.log(`  Tour: ${t.title.replace(SEED_PREFIX, '')} (${t.city}) — ${t.pois.length} POIs, ${reviewCount} reviews, ★${avgRating}`);
  }

  console.log(`\n=== Done: ${guides.length} guides, ${tours.length} tours ===`);
}

run().catch(console.error);
