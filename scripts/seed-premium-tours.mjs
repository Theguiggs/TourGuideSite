/**
 * seed-premium-tours.mjs — 5 visites premium Côte d'Azur
 * avec narrations riches (~45-55 min dialogue), photos, thème fun.
 *
 * Auteur : Steffen Guillaume (steffen.guillaume@gmail.com)
 *
 * Tours:
 *   1. Crimes & Scandales de la Riviera (THÈME FUN) — Nice
 *   2. Monaco — Dynastie, Casino et Démesure
 *   3. Èze — Le Vertige du Nid d'Aigle
 *   4. Villefranche — Cocteau et la Rade Secrète
 *   5. Cap Ferrat — La Presqu'île des Milliardaires
 *
 * Usage: node scripts/seed-premium-tours.mjs [--clean]
 *   --clean : supprime les données premium existantes avant de re-seeder
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = 'us-east-1';
const SEED_PREFIX = 'seed-pm-';

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
        if (matchesId || matchesGuide) ids.push(item.id);
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

// ══════════════════════════════════════════════════════════
// GUIDES
// ══════════════════════════════════════════════════════════

const guides = [
  {
    id: `${SEED_PREFIX}guide-crimes`, userId: `${SEED_PREFIX}user-crimes`,
    displayName: 'Victor Lemaire', city: 'Nice',
    bio: 'Ancien commissaire de police à Nice, reconverti conteur du crime. 30 ans d\'enquêtes sur la Riviera, des braquages du Carlton aux arnaques de la Belle Époque. Je vous emmène sur les scènes de crime les plus célèbres de la Côte d\'Azur — avec humour, suspense et un zeste de mauvaise foi.',
    specialties: ['crimes', 'histoire', 'insolite', 'humour'],
    languages: ['fr', 'en'], tourCount: 1, rating: 4.9,
  },
  {
    id: `${SEED_PREFIX}guide-monaco`, userId: `${SEED_PREFIX}user-monaco`,
    displayName: 'Elena Castellano', city: 'Monaco',
    bio: 'Historienne monégasque, spécialiste de la dynastie Grimaldi. Je raconte Monaco au-delà des clichés — 800 ans de coups d\'État, de mariages stratégiques et de paris fous qui ont transformé un rocher méditerranéen en symbole mondial du luxe.',
    specialties: ['histoire', 'royauté', 'architecture', 'casino'],
    languages: ['fr', 'en', 'it'], tourCount: 1, rating: 4.8,
  },
  // Réutilisation des guides existants seed-am pour tours 3, 4, 5
  // Tour 3 (Èze) → Isabelle Moretti (seed-am-guide-nice)
  // Tour 4 (Villefranche) → Claire Duval (seed-am-guide-antibes)
  // Tour 5 (Cap Ferrat) → Thomas Bellini (seed-am-guide-cannes)
  // On crée des copies locales pour l'autonomie du seed
  {
    id: `${SEED_PREFIX}guide-eze`, userId: `${SEED_PREFIX}user-eze`,
    displayName: 'Isabelle Moretti', city: 'Èze',
    bio: 'Niçoise de naissance, historienne de formation, amoureuse d\'Èze depuis l\'enfance. Ce village perché entre ciel et mer est mon jardin secret — je vous y emmène par les chemins que même les locaux ont oubliés.',
    specialties: ['histoire', 'philosophie', 'botanique', 'panoramas'],
    languages: ['fr', 'en', 'it'], tourCount: 1, rating: 4.7,
  },
  {
    id: `${SEED_PREFIX}guide-villefranche`, userId: `${SEED_PREFIX}user-villefranche`,
    displayName: 'Claire Duval', city: 'Villefranche-sur-Mer',
    bio: 'Passionnée de Cocteau et du patrimoine maritime. La rade de Villefranche est l\'une des plus belles du monde — et la plus secrète. Je vous raconte les artistes, les marins et les espions qui ont fait son histoire.',
    specialties: ['art', 'mer', 'Cocteau', 'histoire maritime'],
    languages: ['fr', 'en'], tourCount: 1, rating: 4.6,
  },
  {
    id: `${SEED_PREFIX}guide-capferrat`, userId: `${SEED_PREFIX}user-capferrat`,
    displayName: 'Thomas Bellini', city: 'Saint-Jean-Cap-Ferrat',
    bio: 'Guide certifié de la presqu\'île de Cap Ferrat. Derrière les grilles des villas et les haies de lauriers se cachent les histoires les plus folles de la Riviera — Rothschild, Cocteau, Somerset Maugham et les milliardaires russes.',
    specialties: ['architecture', 'jardins', 'luxe', 'histoire'],
    languages: ['fr', 'en', 'it'], tourCount: 1, rating: 4.8,
  },
];

// ══════════════════════════════════════════════════════════
// TOURS
// ══════════════════════════════════════════════════════════

const tours = [
  // ─── TOUR 1 : CRIMES & SCANDALES DE LA RIVIERA (THÈME FUN) ───
  {
    id: `${SEED_PREFIX}tour-crimes`, guideIdx: 0,
    title: `${SEED_PREFIX}Crimes & Scandales de la Riviera`,
    city: 'Nice', duration: 55, distance: 3.2,
    theme: 'fun',
    description: 'Oubliez les cartes postales. La Côte d\'Azur a toujours attiré les voyous autant que les milliardaires. Du braquage légendaire du Carlton aux empoisonnements de la noblesse niçoise, en passant par les faux-monnayeurs du Vieux-Nice et les espions de la Belle Époque, ce parcours vous plonge dans le côté obscur de la Riviera — avec humour et suspense. Votre guide ? Un ancien commissaire de police qui a tout vu. Mettez vos écouteurs, ouvrez grand les yeux, et méfiez-vous des apparences.',
    pois: [
      {
        title: 'Jardin Albert 1er — Le Briefing',
        lat: 43.6955, lng: 7.2662,
        desc: 'Point de départ de notre enquête criminelle à travers Nice.',
        transcript: `Bienvenue, cher enquêteur. Je suis Victor Lemaire, ancien commissaire de police de Nice, et pendant les trente prochaines années de ma carrière — pardon, les cinquante-cinq prochaines minutes de cette visite — je vais vous raconter ce que les offices de tourisme préfèrent taire.

Vous êtes dans le Jardin Albert 1er, le poumon vert de Nice, inauguré en 1852. Charmant, n'est-ce pas ? Des palmiers, des fontaines, des familles qui pique-niquent. Eh bien, sachez que ce jardin a été le théâtre de pas moins de trois affaires de pickpockets organisés entre 1920 et 1935. Des bandes venues de Marseille opéraient ici avec une précision chirurgicale, ciblant les riches hivernants britanniques.

Mais ce n'est que l'apéritif. La Côte d'Azur, voyez-vous, est un paradoxe ambulant. C'est le lieu le plus glamour de la Méditerranée, et en même temps un terrain de jeu pour les escrocs, les faussaires et les criminels de haut vol depuis le XVIIIe siècle. Pourquoi ? Parce que là où il y a de l'argent, il y a des gens qui veulent le prendre. Et à Nice, de l'argent, il y en a toujours eu.

Aujourd'hui, nous allons traverser dix scènes de crime — certaines sanglantes, d'autres élégantes, toutes vraies. Je vous raconterai des histoires de braquages audacieux, d'empoisonnements aristocratiques, de contrebande, d'espionnage et d'arnaques si brillantes qu'on ne peut s'empêcher d'admirer le génie des coupables. Même si, en tant qu'ancien flic, je ne devrais pas dire ça.

Règle numéro un de cette visite : ne jugez jamais un lieu par sa beauté. Les plus belles façades cachent souvent les pires secrets. Règle numéro deux : si quelqu'un vous suit pendant la visite, c'est probablement un autre touriste. Probablement.

Allez, en route. Notre première vraie scène de crime est l'Opéra de Nice, à cinq minutes d'ici. Suivez-moi — et gardez vos poches bien fermées.`,
      },
      {
        title: 'Opéra de Nice — L\'Incendie de 1881',
        lat: 43.6953, lng: 7.2720,
        desc: 'Le mystérieux incendie qui détruisit le théâtre municipal et tua 63 personnes.',
        transcript: `Arrêtez-vous devant cette belle façade Second Empire. L'Opéra de Nice, inauguré en 1885. Magnifique, non ? Sauf que cet opéra est le deuxième. Le premier a brûlé. Et c'est là que commence notre histoire.

Le 23 mars 1881, à 22h30, pendant une représentation de "Lucia di Lammermoor" de Donizetti, un incendie se déclare dans les cintres du théâtre municipal. En quelques minutes, le bâtiment entier est en flammes. Soixante-trois personnes meurent cette nuit-là, piégées dans les étages supérieurs. Les galeries populaires, là-haut, n'avaient qu'une seule sortie. Une seule.

L'enquête officielle a conclu à un accident — une lampe à gaz défectueuse. Mais à Nice, personne n'y a jamais vraiment cru. Pourquoi ? Parce que le théâtre était assuré pour une somme considérable par son directeur, un certain Aimé Gilly, qui avait des dettes colossales. Gilly a été blanchi, faute de preuves. Mais les Niçois ont leur mémoire, et cent quarante ans plus tard, on murmure encore.

Ce qui est certain, c'est que cette tragédie a changé les normes de sécurité dans tous les théâtres de France. Les sorties de secours obligatoires, les rideaux de fer, l'éclairage de sécurité — tout ça vient de cette nuit de 1881 à Nice.

Le nouvel opéra, celui que vous voyez, a été construit par l'architecte François Aune. Il est somptueux — 1 064 places, un plafond peint par Emmanuel Costa, et surtout, huit sorties de secours. On apprend de ses drames.

Regardez la façade : les médaillons représentent Verdi, Beethoven, Rossini et Meyerbeer. Mais moi, quand je passe devant, je pense toujours aux soixante-trois. C'est le métier qui veut ça.

Direction le Cours Saleya maintenant, à deux cents mètres. Vous allez adorer — c'est une histoire de fleurs, de mafia et de marché noir.`,
      },
      {
        title: 'Cours Saleya — La Guerre des Fleurs',
        lat: 43.6953, lng: 7.2760,
        desc: 'Quand le marché aux fleurs cachait le plus grand réseau de contrebande de la Riviera.',
        transcript: `Le Cours Saleya. Le marché le plus photogénique de la Côte d'Azur. Des roses, des œillets, de la lavande, des tournesols — un festival de couleurs et de parfums. Instagram adore. Mais laissez-moi vous raconter ce que les photos ne montrent pas.

Pendant la Seconde Guerre mondiale, ce marché était la plaque tournante du marché noir de tout le Sud-Est. Sous les étals de fleurs, on échangeait des tickets de rationnement, de l'huile d'olive au prix de l'or, du tabac américain et des faux papiers d'identité. Les fleuristes étaient les meilleurs passeurs de la ville — qui soupçonnerait une vendeuse de mimosa ?

Mais l'histoire la plus folle, c'est celle de la "Guerre des Fleurs" de 1952. Deux familles de grossistes — les Berenguier et les Castellano — se disputaient le contrôle du marché aux fleurs de Nice, qui était alors le deuxième plus important d'Europe après celui d'Aalsmeer en Hollande. L'enjeu ? Des millions de francs de roses et d'œillets exportés chaque jour vers Paris, Londres et Bruxelles.

La rivalité a dégénéré le 14 février 1952 — oui, le jour de la Saint-Valentin, on ne peut pas inventer ça — quand un camion de roses destiné aux Castellano a mystérieusement disparu entre Antibes et Nice. Le camion a été retrouvé vide sur la route de la Grande Corniche, les dix mille roses volatilisées. Personne n'a jamais été arrêté. Mon prédécesseur, le commissaire Raoul Vitalis, a classé l'affaire faute de preuves. Mais tout le monde savait.

La guerre s'est calmée quand le marché de gros a déménagé à Nice-Ouest en 1965. Aujourd'hui, le Cours Saleya est un marché de détail pour touristes et locaux. Mais si vous regardez bien les fondations des immeubles côté mer, vous verrez des caves voûtées du XVIIIe siècle. C'est là que transitait la marchandise — fleurs le jour, contrebande la nuit.

Maintenant, montez avec moi dans les ruelles du Vieux-Nice. On va parler poison.`,
      },
      {
        title: 'Palais Lascaris — Les Empoisonneuses de la Noblesse',
        lat: 43.6979, lng: 7.2770,
        desc: 'Le palais baroque où la noblesse niçoise réglait ses comptes à l\'arsenic.',
        transcript: `Levez les yeux. Ce palais baroque du XVIIe siècle, c'est le Palais Lascaris, résidence des Comtes Lascaris-Vintimille, l'une des familles les plus puissantes de Nice. Aujourd'hui c'est un musée — instruments de musique anciens, fresques au plafond, escalier monumental. Très joli, très civilisé.

Sauf que dans ces murs, on empoisonnait.

La mode de l'empoisonnement a frappé Nice comme elle a frappé Paris. À la cour de Louis XIV, l'Affaire des Poisons a secoué Versailles entre 1677 et 1682. Mais ce que les livres d'histoire oublient souvent, c'est que le phénomène avait son équivalent niçois. Nice, à l'époque, n'était pas française — elle appartenait au Duché de Savoie. Et la noblesse savoyarde avait ses propres intrigues.

En 1688, Lucrezia Lascaris-Vintimille, épouse du comte Giovanni Battista, meurt subitement à l'âge de trente-deux ans. Officiellement, d'une "fièvre maligne". Officieusement, ses servantes ont murmuré que la contessa avait été empoisonnée par sa belle-sœur, Margherita, qui convoitait une partie de l'héritage familial. Aucune preuve, aucun procès — à l'époque, quand une noble dame mourait, on ne posait pas trop de questions.

Les archives du palais mentionnent aussi un épisode en 1712 où un pharmacien du quartier, Antonio Raiberti, a été arrêté pour avoir vendu de l'"acqua tofana" — un poison à l'arsenic indétectable, mis au point en Italie au XVIIe siècle. Raiberti aurait fourni plusieurs familles de la noblesse niçoise. Il a été condamné aux galères, ce qui, croyez-moi, était pire que la prison.

Montez l'escalier monumental si le musée est ouvert. Regardez les fresques — des dieux de l'Olympe, des allégories de la vertu. Ironique, quand on sait ce qui se tramait dans les salons juste en dessous.

En sortant, prenez la ruelle à gauche. Direction la Place Rossetti — et une histoire beaucoup plus récente.`,
      },
      {
        title: 'Place Rossetti — L\'Arnaque du Glacier',
        lat: 43.6968, lng: 7.2755,
        desc: 'L\'incroyable escroquerie à la glace qui a défrayé la chronique en 1998.',
        transcript: `Place Rossetti. La Cathédrale Sainte-Réparate d'un côté, les terrasses de glaces de l'autre. C'est ici que se trouve Fenocchio, le glacier le plus célèbre de Nice, avec ses cent saveurs — de la lavande au cactus en passant par la bière et la tomate-basilic. Mais ce n'est pas de Fenocchio que je vais vous parler. C'est de son voisin, celui qui n'existe plus.

En 1998, un entrepreneur venu de Lyon — appelons-le Monsieur D., parce que son dossier judiciaire est toujours accessible — ouvre un glacier sur cette même place. Façade impeccable, décoration soignée, cent vingt saveurs au comptoir. Il affiche des prix 30% moins chers que la concurrence et fait un carton immédiat. Les touristes font la queue. Les Niçois aussi.

Le problème ? Monsieur D. ne fabriquait pas ses glaces. Il les achetait en vrac à un grossiste industriel de Turin, les reconditionnait dans des bacs artisanaux, et les vendait comme "glaces artisanales faites maison". L'étiquetage était faux, les origines étaient fausses, et la marge était astronomique.

L'arnaque a duré trois ans. C'est un inspecteur de la DGCCRF — la répression des fraudes — qui a fait tomber l'affaire en 2001, après une dénonciation anonyme. On soupçonne un concurrent, mais on n'a jamais su lequel. Monsieur D. a écopé de 18 mois de prison avec sursis et 150 000 francs d'amende. Son glacier a fermé le lendemain.

La morale ? À Nice, ne trichez pas avec la glace. C'est sacré. On peut vous pardonner beaucoup de choses ici — la fraude fiscale, le stationnement en double file, même la pissaladière mal faite. Mais la fausse glace artisanale ? Jamais.

Allez vous en acheter une vraie chez Fenocchio si vous avez envie. Moi, je recommande la fleur d'oranger. Puis on monte vers la Colline du Château — et là, ça devient sérieux.`,
      },
      {
        title: 'Colline du Château — Les Espions de la Belle Époque',
        lat: 43.6958, lng: 7.2825,
        desc: 'Le réseau d\'espionnage international qui opérait depuis la colline.',
        transcript: `Vous voici sur la Colline du Château, à 92 mètres au-dessus de la mer. Panorama spectaculaire — la Baie des Anges à gauche, le port Lympia à droite, les Alpes en toile de fond. Mais sous vos pieds, il y a des tunnels. Et dans ces tunnels, il y avait des espions.

Pendant la Belle Époque, Nice était la capitale européenne de l'espionnage. Pas Paris, pas Vienne, pas Berlin — Nice. Pourquoi ? Parce que Nice était un carrefour international. L'aristocratie russe y passait l'hiver, les industriels britanniques y avaient leurs villas, les diplomates italiens traversaient la frontière chaque semaine. C'était le lieu idéal pour écouter, observer et rapporter.

Le réseau le plus fascinant était celui du colonel Alfred Redl, chef du contre-espionnage austro-hongrois, qui était en réalité un agent double travaillant pour la Russie. Redl a séjourné à Nice à plusieurs reprises entre 1903 et 1912, utilisant les hôtels de la Promenade comme boîtes aux lettres. Il transmettait les plans de mobilisation de l'armée austro-hongroise à son contact russe, un certain Batioushine, lors de promenades sur cette colline. Les tunnels de l'ancienne citadelle — détruite par Louis XIV en 1706 — servaient de points de rendez-vous discrets.

Redl a été démasqué en 1913 et s'est suicidé. Mais son réseau à Nice a survécu et a continué à fonctionner pendant la Première Guerre mondiale, cette fois au service de la France. Les renseignements français ont utilisé exactement les mêmes tunnels, les mêmes hôtels et les mêmes méthodes que Redl avait mis en place pour les Russes. L'espionnage est un métier où l'on recycle beaucoup.

Pendant la Seconde Guerre mondiale, Nice est devenue un centre de la Résistance. Les souterrains de la colline ont abrité des postes de radio clandestins. Le réseau "Ajax", dirigé par le capitaine Léon Brull, émettait depuis un tunnel dont l'entrée se trouvait près de la cascade que vous apercevez en contrebas.

Aujourd'hui, la plupart des tunnels sont fermés au public. Mais si vous regardez bien, vous verrez des grilles métalliques dans la roche — ce sont les anciennes bouches d'aération. Elles n'aèrent plus rien, mais elles sont toujours là, comme des cicatrices dans la pierre.

Descendons vers le port. L'histoire suivante implique un sous-marin.`,
      },
      {
        title: 'Port Lympia — Le Sous-Marin de la Contrebande',
        lat: 43.6945, lng: 7.2849,
        desc: 'L\'incroyable histoire du sous-marin utilisé pour la contrebande de cigarettes.',
        transcript: `Le Port Lympia. Creusé au XVIIIe siècle, c'est le port historique de Nice. Façades colorées, bateaux de pêche, ferries vers la Corse. Très pittoresque. Mais sous ces eaux calmes, il s'est passé des choses invraisemblables.

En 1972, les douanes françaises ont intercepté dans la rade de Nice un mini sous-marin artisanal. Vous avez bien entendu : un sous-marin. Construit par un mécanicien de Menton, financé par un réseau de contrebandiers corses, ce sous-marin de huit mètres de long était utilisé pour transporter des cigarettes américaines depuis l'Italie. Le principe était simple mais génial : le sous-marin naviguait de nuit, en semi-immersion, entre Vintimille et Nice, évitant les patrouilles des douanes qui surveillaient la surface.

L'engin pouvait transporter deux tonnes de cigarettes par voyage. Au prix du marché noir, ça représentait l'équivalent de 200 000 francs par traversée — une fortune à l'époque. Le réseau a fonctionné pendant dix-huit mois avant d'être repéré par un pêcheur qui a vu un "gros poisson métallique" émerger à trois heures du matin.

L'affaire a fait la une de Nice-Matin pendant une semaine. Le mécanicien de Menton — un certain Giuseppe Ferrante — a été condamné à cinq ans de prison. En sortant, il a ouvert un garage automobile à Antibes. Il paraît qu'il réparait très bien les moteurs. Quand on sait construire un sous-marin, un carburateur, c'est de la rigolade.

Ce port a aussi été le décor d'une autre affaire célèbre : le vol du yacht "Doña Sol" en 1984. Un équipage fantôme — trois hommes jamais identifiés — a pris le contrôle d'un voilier de luxe en pleine nuit et a disparu en direction de la Sardaigne. Le voilier a été retrouvé abandonné en Corse un mois plus tard, vidé de tout son contenu. Les propriétaires, un couple de diamantaires belges, avaient laissé à bord pour deux millions de francs de bijoux. Aucune arrestation.

Le port est aussi le point de départ des ferries vers la Corse et la Sardaigne. Si vous y montez un jour, vérifiez que le capitaine n'est pas un ancien contrebandier. Je plaisante. À moitié.

On continue vers la Place Garibaldi.`,
      },
      {
        title: 'Place Garibaldi — Le Complot Républicain',
        lat: 43.6998, lng: 7.2802,
        desc: 'La conspiration qui a failli faire de Nice une république indépendante.',
        transcript: `Place Garibaldi. La plus belle place piémontaise de Nice — arcades ocre, façades symétriques, statue de Garibaldi au centre. Giuseppe Garibaldi, le héros de l'unification italienne, est né ici en 1807, au numéro 3 de ce qui s'appelait alors la "Place d'Armes".

Mais l'histoire que je vais vous raconter n'est pas celle de Garibaldi. C'est celle d'un complot bien plus obscur : la tentative de créer une "République Libre de Nice" en 1871.

Contexte : nous sommes juste après la guerre franco-prussienne. La France a perdu, Napoléon III est en exil, la Commune de Paris fait rage. Nice, qui n'est française que depuis onze ans — le rattachement date de 1860 — profite du chaos pour tenter sa chance. Un groupe de notables niçois, menés par un certain Joseph Durandy, avocat et ancien membre du parlement sarde, se réunit secrètement dans un appartement au-dessus des arcades — exactement là, au deuxième étage de l'immeuble que vous voyez à droite de la statue.

Le plan ? Proclamer l'indépendance de Nice pendant que Paris brûle. Créer une république libre, neutre, sur le modèle de Monaco — mais en version démocratique. Durandy avait même rédigé une constitution de quarante-sept articles et obtenu le soutien discret du consul italien.

Le complot a échoué le 4 avril 1871, quand le préfet des Alpes-Maritimes, informé par un indicateur, a fait arrêter Durandy et ses complices à 4 heures du matin. Ils étaient sept. Ils ont tous été jugés à Aix-en-Provence et condamnés à des peines symboliques — le gouvernement français ne voulait pas faire de martyrs. Durandy a été libéré en 1872 et a repris son cabinet d'avocat comme si de rien n'était.

Aujourd'hui, cette place porte le nom de Garibaldi, qui rêvait d'une Nice italienne. Durandy rêvait d'une Nice libre. Aucun des deux n'a eu ce qu'il voulait — Nice est restée française. Mais si vous écoutez bien le vent dans les arcades, vous entendrez peut-être l'écho de quarante-sept articles de constitution qui n'ont jamais vu le jour.

Deux scènes de crime encore. Suivez-moi vers le Negresco.`,
      },
      {
        title: 'Hôtel Negresco — Le Casse du Siècle (Raté)',
        lat: 43.6947, lng: 7.2555,
        desc: 'La tentative de braquage la plus absurde de l\'histoire hôtelière française.',
        transcript: `Le Negresco. Le palace le plus iconique de la Côte d'Azur, classé monument historique. Sa coupole rose est signée Gustave Eiffel, son lustre de 16 000 cristaux est un cadeau du Tsar Nicolas II, et sa collection d'art vaut plus que certains musées nationaux. C'est ici qu'ont séjourné les Beatles, Coco Chanel, Salvador Dalí et à peu près tous les chefs d'État du monde occidental.

C'est aussi ici qu'a eu lieu la tentative de braquage la plus pathétique de l'histoire de la Riviera.

Le 15 août 1989, à 14h — en plein milieu de l'après-midi, en plein mois d'août — deux hommes masqués entrent dans le hall du Negresco par la porte principale. Armés de pistolets factices — des répliques en plastique achetées dans un magasin de jouets de l'Avenue Jean Médecin — ils se dirigent vers la réception et exigent "tout l'argent de l'hôtel".

Le concierge, un certain Monsieur Albertini, vétéran de vingt-cinq ans au Negresco, les regarde avec un calme olympien et leur répond : "Messieurs, nous sommes un palace. Nos clients paient par chèque ou par carte. Il n'y a pas de liquide ici." Ce qui était vrai. Les braqueurs, manifestement pas des habitués des palaces, restent interdits. L'un d'eux demande alors à accéder aux coffres des clients. Albertini répond que les coffres sont individuels, à code personnel, et qu'il ne peut pas les ouvrir.

Pendant ce temps, un touriste japonais entre dans le hall, voit les hommes masqués, les prend pour une animation et commence à les photographier. Un deuxième touriste, américain celui-là, applaudit. Les braqueurs, complètement déstabilisés, s'enfuient par la porte de service. Ils sont arrêtés vingt minutes plus tard dans un bar de la rue Masséna, où ils buvaient un pastis pour se remettre de leurs émotions.

Le commissaire qui a traité l'affaire — c'était moi, d'ailleurs — les a interrogés pendant trois heures. Leur plan était de revendre le contenu des coffres à un receleur de Marseille. Ils ne savaient même pas que les coffres étaient à code individuel. L'un d'eux a déclaré : "On a vu 'Ocean's Eleven' et on s'est dit que ça avait l'air facile." Le film venait de sortir en vidéo.

Dix-huit mois de prison ferme chacun. Et une légende au Negresco — Monsieur Albertini a été promu directeur adjoint l'année suivante. Le calme sous la pression, ça paie.

Dernière escale de notre parcours criminel. On rejoint la Promenade pour le verdict final.`,
      },
      {
        title: 'Promenade des Anglais — Le Verdict',
        lat: 43.6938, lng: 7.2600,
        desc: 'Épilogue : pourquoi la Côte d\'Azur attire le crime autant que le soleil.',
        transcript: `Nous y voilà. Retour sur la Promenade des Anglais, là où tout a commencé il y a cinquante-cinq minutes. La mer est toujours bleue, les galets toujours ronds, les palmiers toujours verts. Rien n'a changé. Et pourtant, vous ne regarderez plus jamais cette ville de la même façon.

En trente ans de carrière à Nice, j'ai traité des centaines d'affaires. Des grandes et des petites, des tragiques et des comiques. Et si j'ai appris une chose, c'est que le crime, ici, a toujours eu une saveur particulière. Il y a quelque chose dans l'air de la Riviera — le mélange de luxe et de nonchalance, de beauté et d'impunité — qui pousse les gens à tenter leur chance.

Nice est à la frontière. Frontière entre la France et l'Italie, entre le vieux monde et le nouveau, entre la légalité et l'ombre. Pendant des siècles, cette ville a changé de pays comme de chemise — savoyarde, française, italienne, re-française. À chaque changement, les lois changeaient, les polices changeaient, mais les réseaux, eux, restaient. C'est le secret de la Riviera : les institutions passent, les réseaux demeurent.

Mais ne vous méprenez pas. Nice n'est pas une ville dangereuse. C'est une ville vivante, complexe, avec une mémoire longue et un goût prononcé pour le panache. Même ses criminels ont du style — un sous-marin artisanal pour passer des cigarettes, c'est quand même plus classe qu'un camion banalisé.

Alors voilà mon verdict, après cinquante-cinq minutes d'instruction : la Côte d'Azur est coupable. Coupable de beauté avec circonstances aggravantes. Coupable d'avoir inspiré les rêves les plus fous — y compris ceux des voyous. Et coupable de m'avoir gardé trente ans dans ses filets, moi qui voulais être muté à Lyon.

Merci de m'avoir suivi dans cette enquête. Si vous avez aimé, laissez un avis — c'est mon seul salaire maintenant que je suis à la retraite. Et si vous croisez un type en imperméable qui rôde autour du Negresco, ne vous inquiétez pas. C'est probablement juste un touriste qui a vu trop de films noirs.

Commissaire Lemaire, terminé. Bonne soirée, et méfiez-vous des apparences.`,
      },
    ],
  },

  // ─── TOUR 2 : MONACO — DYNASTIE, CASINO ET DÉMESURE ───
  {
    id: `${SEED_PREFIX}tour-monaco`, guideIdx: 1,
    title: `${SEED_PREFIX}Monaco — Dynastie, Casino et Démesure`,
    city: 'Monaco', duration: 55, distance: 3.0,
    description: 'Huit cents ans de Grimaldi sur un rocher de deux kilomètres carrés. Monaco est le plus petit État du monde après le Vatican, mais son histoire est digne d\'un roman-feuilleton : coups d\'État, mariages hollywoodiens, fortunes englouties au Casino et F1 dans les rues. Ce parcours vous mène du Palais princier au Casino de Monte-Carlo, en passant par le musée Océanographique et le port aux méga-yachts. Votre guide, Elena Castellano, historienne monégasque, vous raconte la face cachée de la principauté — celle que les communiqués officiels ne montrent pas.',
    pois: [
      {
        title: 'Place du Palais — Le Coup de 1297',
        lat: 43.7314, lng: 7.4187,
        desc: 'Là où François Grimaldi, déguisé en moine, a pris Monaco par la ruse.',
        transcript: `Bienvenue à Monaco. Je suis Elena Castellano, historienne, et je suis née ici — sur ce rocher. Ce qui fait de moi une Monégasque de souche, une espèce plus rare que le lynx des Alpes.

Vous êtes sur la Place du Palais, devant la résidence officielle de la famille Grimaldi. Chaque jour à 11h55, la relève de la garde attire les touristes. C'est pittoresque, c'est photogénique, et c'est surtout un rappel que cette famille règne ici depuis 1297. Sept cent vingt-neuf ans. C'est plus long que les Bourbons, plus long que les Habsbourg, plus long que pratiquement toutes les dynasties européennes.

Et tout a commencé par un coup de force. Le 8 janvier 1297, François Grimaldi — "Malizia", le Rusé — se déguise en moine franciscain et frappe à la porte de la forteresse génoise qui contrôle le rocher. Les gardes ouvrent. François sort une épée de sous sa bure et s'empare de la place avec une poignée de partisans cachés dans l'ombre. C'est pour cette raison que les armoiries de Monaco montrent deux moines armés d'épées.

Le palais que vous voyez a été construit au XIIIe siècle et rénové au XIXe. La cour d'honneur, les appartements d'État et la Chapelle Palatine se visitent en été. Mais le vrai spectacle, c'est cette vue — la Méditerranée à 60 mètres en contrebas, le port à vos pieds, et au loin, la côte italienne. C'est pour cette vue que les Grimaldi se sont battus pendant sept siècles.

Suivez-moi vers la Cathédrale — c'est là que reposent les princes et que se sont célébrés les mariages les plus médiatisés du XXe siècle.`,
      },
      {
        title: 'Cathédrale de Monaco — Mariages et Tragédies',
        lat: 43.7305, lng: 7.4220,
        desc: 'De Grace Kelly à Charlène, les mariages et les drames de la dynastie.',
        transcript: `La Cathédrale Notre-Dame-Immaculée, construite en 1875 en pierre blanche de La Turbie. C'est ici que sont enterrés tous les princes de Monaco depuis le XIXe siècle. Et c'est ici que Grace Kelly est devenue Princesse de Monaco le 19 avril 1956.

Ce mariage a été le premier mariage royal retransmis en direct à la télévision. Trente millions de téléspectateurs dans neuf pays. Grace Patricia Kelly, star d'Hollywood, Oscar de la meilleure actrice en 1955, épouse le Prince Rainier III de Monaco. Le conte de fées absolu.

Sauf que derrière le conte de fées, il y avait un calcul politique froid. Monaco, en 1955, était au bord de la crise. Le Casino perdait de l'argent, les touristes préféraient Saint-Tropez, et la France menaçait d'annexer la principauté si elle ne payait pas ses impôts. Rainier avait besoin d'un coup d'éclat médiatique pour relancer Monaco. Grace Kelly était ce coup d'éclat.

Le plan a fonctionné au-delà de toute espérance. Après le mariage, le tourisme a explosé, le Casino a retrouvé sa clientèle, et Monaco est devenu synonyme de glamour dans le monde entier. Grace a payé le prix de ce succès — elle a renoncé à sa carrière, à sa liberté, et finalement à sa vie, sur les lacets de la route entre La Turbie et Monaco, le 14 septembre 1982.

Sa tombe est ici, dans le chœur de la cathédrale, à côté de celle de Rainier. Un bouquet de fleurs fraîches y est déposé chaque jour. Le geste le plus constant de tout Monaco — dans un pays où tout change tout le temps.

Descendons vers le Musée Océanographique. Le commandant Cousteau nous y attend — enfin, son fantôme.`,
      },
      {
        title: 'Musée Océanographique — Cousteau et les Abysses',
        lat: 43.7310, lng: 7.4258,
        desc: 'Le musée perché sur la falaise où Cousteau a régné pendant 30 ans.',
        transcript: `Ce bâtiment monumental, accroché à la falaise à 85 mètres au-dessus de la mer, est le Musée Océanographique de Monaco. Inauguré en 1910 par le Prince Albert 1er — "le Prince navigateur" — c'est l'un des plus anciens musées marins du monde.

Mais l'homme qui a fait sa légende, c'est Jacques-Yves Cousteau. Le commandant au bonnet rouge a dirigé ce musée de 1957 à 1988 — trente et un ans. C'est d'ici qu'il a lancé ses expéditions, tourné ses documentaires et mené son combat pour les océans. La Calypso, son navire mythique, était amarrée juste en dessous, dans le port.

Le Prince Albert 1er était lui-même un océanographe passionné. Il a mené vingt-huit campagnes scientifiques entre 1885 et 1915, explorant les abysses de l'Atlantique et de la Méditerranée. Il a découvert des espèces inconnues, cartographié les fonds marins et constitué une collection de 100 000 spécimens.

Le musée abrite aujourd'hui un aquarium spectaculaire avec 6 000 espèces, un lagon aux requins et une collection de squelettes de cétacés suspendue au plafond de la grande salle. Mais ce qui m'émeut le plus, c'est le bureau de Cousteau au dernier étage — conservé en l'état, avec sa machine à écrire, ses cartes marines et la vue vertigineuse sur la mer qu'il aimait contempler.

Cousteau et Monaco, c'est une histoire d'amour compliquée. Le commandant est parti en 1988, officiellement pour "divergences avec la direction". En réalité, il s'opposait à un projet d'extension du port qui aurait détruit des fonds marins. Le Prince Rainier a choisi le port. Cousteau est parti. L'extension a été construite. Et Monaco a perdu son plus célèbre résident.

Continuons vers le Port Hercule — là où les yachts de 100 mètres côtoient les pizzerias.`,
      },
      {
        title: 'Port Hercule — F1 et Milliardaires',
        lat: 43.7350, lng: 7.4210,
        desc: 'Le port où se croisent les méga-yachts et le circuit de Formule 1.',
        transcript: `Le Port Hercule. Premier port naturel de Monaco, agrandi et modernisé au fil des siècles. Aujourd'hui, il accueille des yachts de 100 mètres, des voitures de course à 300 km/h, et des touristes qui prennent des selfies devant les deux.

Le Grand Prix de Monaco, c'est ici. Chaque année fin mai, les rues que vous voyez deviennent un circuit de Formule 1. Le virage de la piscine est juste là, le tunnel est derrière vous, et l'épingle du Fairmont — le virage le plus lent de tout le calendrier F1, à 50 km/h — est en haut de la côte. Le Grand Prix de Monaco existe depuis 1929. C'est la course la plus prestigieuse, la plus dangereuse et la plus anachronique du championnat — un circuit de ville sur lequel on ne peut pas dépasser, dans un pays où l'on vient normalement pour ralentir.

Ayrton Senna a gagné ici six fois. Le record. En 1988, il avait 50 secondes d'avance et a mis sa McLaren dans le rail au virage du Portier, à six tours de la fin. Il est rentré dans son appartement de Fontvieille, a fermé les volets, et personne ne l'a vu pendant deux jours. Même les génies craquent à Monaco.

Le port lui-même est un spectacle permanent. Les yachts les plus chers du monde sont amarrés ici : le "Eclipse" de Roman Abramovich (170 mètres, 1,5 milliard de dollars), le "Azzam" du roi d'Abu Dhabi (180 mètres), et des dizaines d'autres dont les propriétaires préfèrent rester anonymes. Pendant le Grand Prix, les places sur le pont des yachts se louent 10 000 euros par personne pour le week-end. Sans la nourriture.

Ce port raconte tout Monaco : l'excès, le luxe, la vitesse et le spectacle permanent. C'est le pays où les voitures de course passent devant les yachts de milliardaires — et où personne ne trouve ça bizarre.

Montons vers Monte-Carlo. Le Casino nous attend.`,
      },
      {
        title: 'Casino de Monte-Carlo — Fortunes et Ruines',
        lat: 43.7397, lng: 7.4285,
        desc: 'Le casino qui a sauvé Monaco de la faillite et ruiné des milliers de joueurs.',
        transcript: `Le Casino de Monte-Carlo. Chef-d'œuvre de Charles Garnier — le même architecte que l'Opéra de Paris — inauguré en 1863. C'est le bâtiment le plus photographié de Monaco, et probablement le casino le plus célèbre du monde. James Bond y a joué. Mata Hari y a espionné. Des fortunes s'y sont faites et défaites en une nuit.

Mais l'histoire du Casino est d'abord une histoire de survie. En 1856, Monaco était au bord de la faillite. Le Prince Charles III avait perdu Menton et Roquebrune — 80% du territoire — vendus à la France. Il ne restait que le Rocher et un village de pêcheurs. Le trésor princier était vide.

Le salut est venu d'un homme : François Blanc, surnommé "le Magicien de Monte-Carlo". Blanc a obtenu la concession du casino en 1863, a construit ce palais, a créé la Société des Bains de Mer, et a inventé Monte-Carlo de toutes pièces. Avant Blanc, Monte-Carlo n'existait pas — c'était une colline couverte d'oliviers. Après Blanc, c'était la destination la plus glamour d'Europe.

Le principe était simple et génial : les Monégasques n'ont pas le droit de jouer au casino. Seuls les étrangers peuvent perdre leur argent ici. Et comme les impôts sur les gains du casino suffisaient à financer tout le budget de la principauté, Charles III a supprimé l'impôt sur le revenu pour les résidents. Pas d'impôts à Monaco — c'est grâce au casino. C'est toujours le cas aujourd'hui.

Les histoires de joueurs ruinés sont légion. Charles Deville Wells, en 1891, a "fait sauter la banque" en gagnant un million de francs à la roulette en une nuit. Il est devenu célèbre dans le monde entier. Puis il est revenu, a tout reperdu, et a fini en prison pour escroquerie. La banque reprend toujours ce qu'elle a donné.

Entrez dans le hall si vous le souhaitez — l'accès à l'atrium est gratuit. Les salles de jeu sont payantes (17 euros). Mais franchement, le plus beau spectacle, c'est la façade au coucher du soleil. Et c'est gratuit.

Allons voir l'Hôtel de Paris juste en face — un palace qui a sa propre cave à vin de 350 000 bouteilles.`,
      },
      {
        title: 'Hôtel de Paris — Le Palace des Palaces',
        lat: 43.7393, lng: 7.4278,
        desc: 'L\'hôtel où les rois et les stars ont dormi, mangé et tout dépensé.',
        transcript: `L'Hôtel de Paris Monte-Carlo. Ouvert en 1864, un an après le Casino. C'est François Blanc qui l'a voulu — il fallait un palace pour loger les joueurs fortunés qui venaient tenter leur chance.

Cet hôtel a accueilli tout ce que la planète compte de riches, de puissants et de célèbres. Winston Churchill y avait sa suite attitrée — la 318 — où il peignait des aquarelles entre deux cigares. Le roi Farouk d'Égypte y a vécu en exil pendant des années, y dépensant ce qui restait de la fortune des pharaons. Maria Callas y retrouvait Aristote Onassis pour des dîners qui duraient jusqu'à l'aube.

Le restaurant de l'hôtel, le Louis XV, est le premier restaurant d'hôtel à avoir obtenu trois étoiles Michelin, en 1990, sous la direction d'Alain Ducasse. Ducasse avait 33 ans. Aujourd'hui encore, c'est l'un des temples de la gastronomie française. Le menu dégustation coûte 380 euros — sans le vin.

Mais le trésor caché de l'Hôtel de Paris, c'est sa cave à vin. 350 000 bouteilles, certaines datant du XIXe siècle, stockées dans des tunnels creusés dans le rocher sous l'hôtel. On dit que c'est la plus belle cave à vin privée du monde. Elle a survécu à deux guerres mondiales — pendant l'occupation allemande, le directeur de l'hôtel a fait murer l'entrée de la cave et l'a camouflée derrière des étagères de conserves. Les Allemands ont bu la bière du bar, mais n'ont jamais trouvé les grands crus.

Regardez le genou de la statue équestre de Louis XIV dans le hall — il est usé et brillant. La tradition veut que le toucher porte chance au casino. Des millions de mains l'ont frotté depuis 1864. Si ça marchait, le casino serait en faillite depuis longtemps. Mais la superstition a la vie dure, surtout à Monaco.

Deux dernières étapes. Direction le Jardin Japonais, puis le Larvotto pour conclure.`,
      },
      {
        title: 'Jardin Japonais — Zen au Pays du Bling',
        lat: 43.7422, lng: 7.4340,
        desc: 'Un jardin zen de 7 000 m² — le contraste le plus surréaliste de Monaco.',
        transcript: `Après les casinos, les yachts et les palaces, voici le Jardin Japonais de Monaco. Sept mille mètres carrés de sérénité zen, créés en 1994 par Yasuo Beppu, un architecte paysagiste de Tokyo. Étangs de carpes koï, ponts de bois, cascades, bambous et pins taillés selon l'art topiaire japonais.

C'est le lieu le plus improbable de Monaco. Au milieu d'un pays dédié à l'excès, au luxe et à la vitesse, quelqu'un a eu l'idée de construire un jardin où l'on vient pour ne rien faire. Pour écouter l'eau. Pour regarder les poissons. Pour respirer. C'est le Prince Rainier III qui l'a voulu, vers la fin de sa vie, comme un contrepoint au Monaco qu'il avait lui-même créé.

Le jardin suit les principes du wabi-sabi — la beauté de l'imperfection, de l'inachevé, du passage du temps. Les pierres sont disposées selon des règles millénaires, chaque arbre est taillé pour évoquer le vent, et le sable ratissé en cercles concentriques représente l'océan.

Il y a une leçon ici, si vous voulez l'entendre. Monaco est un pays qui a tout misé sur l'accumulation — d'argent, de béton, de voitures, de luxe. Et au milieu de tout ça, ce jardin dit exactement le contraire : que la richesse vraie, c'est l'espace vide, la pierre brute, le silence entre les notes. Que le luxe suprême, c'est le temps qu'on ne monnaie pas.

Prenez cinq minutes ici. Asseyez-vous sur un des bancs de pierre. Écoutez les carpes koï briser la surface de l'eau. Et dites-vous que quelque part dans ce pays de la démesure, quelqu'un a compris que le plus précieux, c'est ce qu'on ne peut pas acheter.

Dernière escale au Larvotto pour l'épilogue.`,
      },
      {
        title: 'Plage du Larvotto — Monaco Sans Filtre',
        lat: 43.7445, lng: 7.4380,
        desc: 'Épilogue sur la plage publique : le vrai visage de Monaco.',
        transcript: `Nous terminons au Larvotto, la seule plage publique de Monaco. Des galets, une eau turquoise, des parasols et — surprise — des gens normaux. Des familles monégasques, des travailleurs en pause déjeuner, des adolescents qui font des selfies. Le Larvotto, c'est le Monaco que les magazines ne montrent pas. Le Monaco quotidien.

Parce que derrière les clichés, Monaco est aussi un village. Un village de 38 000 habitants sur deux kilomètres carrés — la densité la plus élevée du monde. Tout le monde se connaît. Le boulanger connaît le prince. Le chauffeur de bus a été à l'école avec le ministre. Les Monégasques de souche ne sont que 9 000 — moins que la population d'un arrondissement de Lyon.

Monaco est un paradoxe vivant. C'est le pays le plus riche du monde par habitant, et en même temps un lieu où les familles monégasques vivent dans des appartements modestes, souvent les mêmes depuis trois générations, pendant que les tours de verre poussent autour d'elles. C'est un pays sans impôts mais où un studio coûte 50 000 euros le mètre carré. C'est une monarchie absolue où le prince assiste aux matchs de foot de l'AS Monaco comme n'importe quel supporter.

Ce parcours vous a montré les deux Monaco : celui des Grimaldi, du Casino et des yachts, et celui des jardins zen, des musées marins et d'une communauté qui, malgré l'or et le béton, reste attachée à son rocher comme les moines de Lérins à leur île.

Huit cents ans que les Grimaldi tiennent ce rocher. Contre la France, contre l'Espagne, contre Napoléon, contre la faillite, contre le temps. Il y a quelque chose d'admirable dans cette obstination — et quelque chose de profondément méditerranéen. On s'accroche, on s'adapte, on survit. Et on construit un casino quand l'argent manque.

Merci de m'avoir suivie. Si Monaco vous a surpris — en bien ou en mal — c'est que j'ai fait mon travail. Arrivederci.`,
      },
    ],
  },

  // ─── TOUR 3 : ÈZE — LE VERTIGE DU NID D'AIGLE ───
  {
    id: `${SEED_PREFIX}tour-eze`, guideIdx: 2,
    title: `${SEED_PREFIX}Èze — Le Vertige du Nid d'Aigle`,
    city: 'Èze', duration: 48, distance: 1.6,
    description: 'Perché à 427 mètres au-dessus de la Méditerranée, Èze est un vertige. Ce village médiéval accroché à la roche domine le Cap Ferrat, Monaco et la côte italienne. De la Porte des Maures au Jardin Exotique, en passant par le sentier Nietzsche et la parfumerie Fragonard, cette visite de 48 minutes vous révèle un lieu où l\'histoire, la philosophie et la botanique se mêlent dans une lumière qui a inspiré Walt Disney, Nietzsche et Bono.',
    pois: [
      {
        title: 'Porte des Maures — Le Seuil du Vertige',
        lat: 43.7276, lng: 7.3612,
        desc: 'L\'unique entrée du village médiéval, gardée depuis le XIVe siècle.',
        transcript: `Bienvenue à Èze. Je suis Isabelle Moretti, et ce village est mon obsession depuis trente ans. Vous êtes devant la Porte des Maures, la seule entrée historique du village. Une porte fortifiée du XIVe siècle, étroite comme un goulot, conçue pour empêcher les envahisseurs de passer.

Et des envahisseurs, il y en a eu. Èze a été pillé par les Sarrasins au Xe siècle, assiégé par les Turcs en 1543, bombardé par Louis XIV en 1706 et occupé par les Italiens en 1942. Chaque fois, le village a été détruit. Chaque fois, il a été reconstruit. Le nom "Porte des Maures" est un souvenir de l'occupation sarrasine — dix siècles, et on n'a toujours pas changé le nom. À Èze, la mémoire est longue.

Regardez au-dessus de la porte : vous verrez une meurtrière. Un seul archer posté là pouvait défendre l'entrée contre une armée entière. Le passage est si étroit que deux personnes ne peuvent pas y marcher de front. C'est voulu — c'est de l'architecture militaire médiévale dans sa forme la plus pure.

En franchissant cette porte, vous entrez dans un autre monde. Les ruelles sont pavées de pierre, les maisons s'accrochent à la falaise, et le ciel se découpe en fines tranches entre les murs. Il n'y a pas de voitures ici — il n'y a jamais eu de voitures. Les ânes étaient le seul moyen de transport jusqu'en 1952.

Préparez vos jambes. Ça monte. Ça monte beaucoup. Mais chaque mètre de dénivelé vous rapproche d'une vue que vous n'oublierez jamais. En route.`,
      },
      {
        title: 'Rue principale — L\'Escalier du Temps',
        lat: 43.7280, lng: 7.3618,
        desc: 'La montée sinueuse à travers les maisons médiévales et les galeries d\'art.',
        transcript: `Vous montez maintenant par la rue principale d'Èze. Ce n'est pas vraiment une rue — c'est un escalier déguisé en ruelle. Chaque pas vous fait grimper de quelques centimètres, et au bout de dix minutes, vous aurez monté l'équivalent d'un immeuble de huit étages.

Les maisons qui vous entourent datent du XIVe au XVIIe siècle. Elles sont construites directement dans la roche — les murs arrière sont la falaise elle-même. C'est une technique de construction commune dans les villages perchés de Provence, mais à Èze, elle atteint un degré d'intégration minérale unique. Le village ne se pose pas sur la montagne ; il en fait partie.

Vous remarquerez que les fenêtres sont petites et rares. Ce n'est pas de l'austérité — c'est de la défense. Chaque fenêtre est une faille potentielle dans la muraille naturelle du village. Alors on les faisait petites, hautes et orientées vers l'intérieur. La beauté du panorama, les habitants s'en fichaient — ils vivaient avec la peur des invasions.

Aujourd'hui, ces mêmes maisons abritent des galeries d'art, des ateliers de céramique et des boutiques d'artisanat. L'ironie est délicieuse : des forteresses médiévales reconverties en vitrines pour touristes. Mais ne jugez pas trop vite — les artisans d'Èze sont souvent d'authentiques créateurs. Cherchez les ateliers de verrerie soufflée et les céramistes qui travaillent encore avec des techniques provençales du XVIIIe siècle.

Regardez le sol sous vos pieds. Les pavés sont polis par des siècles de pas. Chaque dalle a été portée à dos d'âne depuis la carrière de La Turbie, à trois kilomètres d'ici. Quand on pense au travail que ça représente, on comprend pourquoi les gens d'Èze étaient si déterminés à défendre leur village — ils l'avaient construit pierre par pierre, à la sueur de leur front.

Continuons à monter. La Chapelle des Pénitents Blancs est juste au-dessus.`,
      },
      {
        title: 'Chapelle des Pénitents Blancs — Dévotion et Mystère',
        lat: 43.7283, lng: 7.3625,
        desc: 'La confrérie secrète qui protégeait les morts et les vivants d\'Èze.',
        transcript: `Cette petite chapelle à la façade blanche est celle des Pénitents Blancs, une confrérie religieuse laïque fondée au XIVe siècle. Les Pénitents Blancs étaient une société semi-secrète — pas vraiment une secte, pas tout à fait une association caritative, quelque chose entre les deux.

Leur mission officielle : accompagner les mourants, enterrer les morts, prier pour les âmes du purgatoire. Leur mission officieuse : maintenir l'ordre social dans un village isolé où l'Église et l'État étaient souvent absents. Les Pénitents étaient les notables, les médiateurs, les juges officieux d'Èze. Quand deux familles se disputaient un mur mitoyen, ce n'est pas le seigneur qui tranchait — c'étaient les Pénitents.

Ils portaient une robe blanche, une cagoule qui cachait le visage — oui, comme le Ku Klux Klan, mais six siècles avant et sans aucun rapport — et un cilice sous la robe. La cagoule avait une fonction précise : l'anonymat. Un Pénitent agissait au nom de la confrérie, pas en son nom propre. Cela évitait les vendettas personnelles dans un village où tout le monde se connaissait.

La chapelle a été restaurée au XXe siècle. L'intérieur est sobre — un crucifix, des bancs de bois, un plafond peint de bleu étoilé qui représente le ciel. C'est l'un des rares lieux d'Èze qui n'a pas été transformé en galerie d'art ou en boutique de souvenirs. Un miracle en soi.

Les Pénitents Blancs ont disparu en 1792, supprimés par la Révolution. Mais leur chapelle est toujours là, blanche et silencieuse, au milieu du flux touristique. Un rappel que ce village était autrefois un lieu de foi, de peur et de solidarité — pas un décor pour photos Instagram.

En montant encore, vous arriverez à l'église Notre-Dame. Le panorama commence à se dévoiler.`,
      },
      {
        title: 'Église Notre-Dame de l\'Assomption — Baroque Perché',
        lat: 43.7288, lng: 7.3635,
        desc: 'L\'église néoclassique qui a remplacé la chapelle médiévale détruite par Louis XIV.',
        transcript: `L'Église Notre-Dame de l'Assomption, construite au XVIIIe siècle en remplacement de l'ancienne chapelle médiévale détruite — comme tant d'autres choses à Èze — par les armées de Louis XIV en 1706. Le Roi-Soleil n'aimait pas les villages fortifiés qu'il ne contrôlait pas. Il a détruit la forteresse d'Èze, rasé les remparts et fait sauter la chapelle. Charmant personnage.

L'église actuelle est un mélange de baroque et de néoclassique. La façade est sobre — pierre ocre, fronton triangulaire, clocher carré. L'intérieur est plus riche qu'on ne s'y attend : un retable doré, une statue de la Vierge attribuée à un atelier niçois du XVIIe siècle, et une Pieta en bois polychrome qui vaut le détour.

Mais le vrai trésor de cette église, c'est sa position. Elle est construite sur le point le plus élevé du village habité, juste en dessous des ruines du château. De son parvis, vous avez une vue à 180 degrés sur la côte — le Cap Ferrat en contrebas, Monaco à l'est, et par temps très clair, la Corse à l'horizon. C'est l'une des plus belles vues de la Côte d'Azur, et elle est gratuite.

Une anecdote : Walt Disney a visité Èze en 1935, pendant un voyage en Europe. On dit que le village perché, avec ses ruelles tortueuses, ses tours et sa position vertigineuse, a inspiré le château de la Belle au Bois Dormant. La légende est invérifiable, mais quand vous voyez Èze depuis la route en contrebas, avec le soleil couchant qui dore les pierres, vous comprenez que Disney n'avait pas besoin d'inventer grand-chose.

Le Jardin Exotique est au sommet. Dernière montée — la récompense est spectaculaire.`,
      },
      {
        title: 'Jardin Exotique — Le Sommet du Monde',
        lat: 43.7290, lng: 7.3640,
        desc: 'Collection de cactus géants dans les ruines du château, panorama à 360°.',
        transcript: `Vous y êtes. Le sommet d'Èze. Le Jardin Exotique, installé dans les ruines de la forteresse médiévale détruite en 1706. À 427 mètres au-dessus de la mer, c'est l'un des points de vue les plus spectaculaires de la Méditerranée.

Le jardin a été créé en 1949 par André Gianton, un ingénieur agronome passionné de plantes succulentes. Il a eu l'idée géniale de planter des cactus et des plantes grasses dans les ruines du château — les murs effondrés protégeaient les plantes du mistral, la pierre accumulait la chaleur du soleil, et le drainage naturel de la roche empêchait les racines de pourrir.

Aujourd'hui, le jardin abrite plus de 400 espèces de plantes du monde entier : des cactus candélabres du Mexique de trois mètres de haut, des aloès d'Afrique du Sud, des agaves d'Amérique centrale, des euphorbes de Madagascar. C'est un jardin botanique déguisé en ruine romantique.

Mais oubliez les plantes un instant. Regardez autour de vous. Par temps clair — et aujourd'hui le ciel est avec nous — vous pouvez voir la Corse à 180 kilomètres au sud. Le Cap Ferrat est juste en dessous, comme une main verte qui s'avance dans la mer. Monaco est à l'est, ses tours de verre scintillant au soleil. Et derrière vous, les Alpes, encore enneigées au printemps.

Nietzsche a marché ici. Le philosophe allemand a vécu à Nice entre 1883 et 1888, et il montait régulièrement à Èze par le sentier qui porte aujourd'hui son nom. C'est en faisant cette ascension qu'il aurait conçu la troisième partie de "Ainsi parlait Zarathoustra". Le surhomme est né sur ce chemin — entre la mer et le ciel, entre l'effort et l'extase.

Prenez votre temps ici. Asseyez-vous sur un des murets de pierre, regardez la mer, et respirez. Vous êtes à l'endroit exact où la montagne rencontre le ciel. C'est rare de pouvoir dire ça littéralement.

Quand vous serez prêt, on descend par le sentier Nietzsche.`,
      },
      {
        title: 'Sentier Nietzsche — La Descente Philosophique',
        lat: 43.7272, lng: 7.3605,
        desc: 'Le chemin abrupt que Nietzsche empruntait depuis la mer, source d\'inspiration pour Zarathoustra.',
        transcript: `Le sentier Nietzsche. Un chemin de 1,5 kilomètre qui dévale du village d'Èze jusqu'à la gare d'Èze-sur-Mer, au bord de la Méditerranée. Dénivelé : 400 mètres. Durée : 45 minutes en descente, une heure et demie en montée — si vos genoux tiennent le coup.

Friedrich Nietzsche, le philosophe allemand, a séjourné à Nice de 1883 à 1888, fuyant les hivers allemands et cherchant la lumière. Il logeait dans une pension de la rue Ségurane, dans le Vieux-Nice, et montait régulièrement à Èze par ce sentier. À pied. Sans bâtons de marche, sans chaussures de randonnée, probablement en costume et chapeau. Les philosophes du XIXe siècle étaient faits d'un autre bois.

C'est sur ce sentier, dans l'effort de la montée, que Nietzsche a conçu certaines des idées les plus puissantes de la philosophie occidentale. L'éternel retour, le surhomme, la volonté de puissance — ces concepts sont nés entre ces rochers, dans la chaleur et la lumière de la Côte d'Azur.

Il a écrit dans "Ecce Homo" : "La montée me donne des idées." C'est une phrase simple, mais elle résume tout. La pensée, pour Nietzsche, n'était pas un exercice de bureau. C'était un acte physique, lié au mouvement, au souffle, à la douleur des muscles. Marcher et penser étaient la même chose.

Le sentier est balisé — suivez les panneaux rouges. Il traverse une végétation de maquis méditerranéen : pins d'Alep, chênes kermès, cistes, euphorbes et romarins. En avril, les cistes sont en fleur — blancs et roses, éphémères, s'ouvrant le matin et fanant le soir. Nietzsche aurait aimé cette métaphore.

Attention : le sentier est raide et glissant par endroits. Des chaussures fermées sont indispensables. Et si vous montez plutôt que de descendre, emportez de l'eau. Nietzsche, lui, emportait du papier et un crayon. Chacun ses priorités.

Derniers arrêts : la parfumerie Fragonard, en bas du village, puis l'épilogue.`,
      },
      {
        title: 'Parfumerie Fragonard — Les Sens d\'Èze',
        lat: 43.7265, lng: 7.3595,
        desc: 'L\'usine-boutique où le parfum rencontre le panorama.',
        transcript: `La Parfumerie Fragonard d'Èze. Installée dans une ancienne usine à flanc de colline, avec une vue vertigineuse sur la mer et le Cap Ferrat. C'est l'un des trois sites Fragonard de la Côte d'Azur — les deux autres sont à Grasse, la capitale du parfum.

La visite de l'usine est gratuite. On vous montrera les alambics en cuivre, les cuves de macération, les orgues à parfums — ces meubles semi-circulaires où le "nez" dispose des centaines de flacons d'essences pures pour composer ses créations. Le processus de création d'un parfum peut prendre des années. Le nez travaille avec plus de 3 000 matières premières — naturelles et synthétiques — et doit mémoriser chacune d'entre elles.

Ce qui rend cette parfumerie particulière, c'est sa position. Vous sentez le jasmin et la rose à l'intérieur, et quand vous sortez sur la terrasse, vous sentez le romarin, le pin et l'iode de la mer. La Côte d'Azur est un parfum à ciel ouvert — c'est pour ça que les parfumeurs se sont installés ici il y a trois siècles.

Grasse, à 40 kilomètres d'ici, est devenue la capitale mondiale du parfum grâce à un accident de l'histoire. Au XVIe siècle, les tanneurs grassois cherchaient un moyen de masquer l'odeur nauséabonde de leurs cuirs. Ils ont commencé à parfumer les gants — les "gants parfumés" sont devenus un accessoire de luxe dans toute l'Europe. Les tanneurs sont devenus gantiers-parfumeurs, puis parfumeurs tout court. L'industrie du parfum est née de l'industrie du cuir. De la puanteur est née la beauté — il y a pire comme métaphore.

Si vous voulez ramener un souvenir olfactif de la Côte d'Azur, c'est ici. Mais méfiez-vous : un bon parfum, comme un bon village, se mérite. Il faut prendre le temps de le sentir, de le laisser évoluer, de le porter avant de juger. Les premières impressions sont souvent trompeuses — en parfumerie comme en voyage.

Dernière escale pour conclure.`,
      },
      {
        title: 'Belvédère de la Moyenne Corniche — Épilogue',
        lat: 43.7260, lng: 7.3580,
        desc: 'Vue finale sur Èze et la Méditerranée.',
        transcript: `Nous terminons ici, au belvédère de la Moyenne Corniche, avec Èze au-dessus de nous et la Méditerranée en contrebas. C'est le point de vue que les cartes postales préfèrent — le village perché dans toute sa splendeur, accroché à la roche comme un nid d'aigle, entre le bleu du ciel et le bleu de la mer.

Èze est un lieu qui résiste à la description. Les mots sont toujours en deçà de ce que les yeux voient. Nietzsche, qui maîtrisait pourtant le langage comme peu de gens avant ou après lui, n'a jamais consacré un chapitre entier à Èze — juste des allusions, des phrases isolées, comme si le lieu était trop intense pour être capturé dans un texte suivi.

Ce que je voudrais que vous reteniez de cette visite, c'est que Èze n'est pas un musée. C'est un village vivant. Il y a des gens qui habitent ici toute l'année — pas beaucoup, une centaine de résidents permanents — qui font leurs courses, qui promènent leurs chiens, qui se plaignent des touristes et qui, le soir, quand les autocars sont repartis, retrouvent le silence millénaire de leur rocher.

Ce silence, c'est le vrai luxe d'Èze. Pas les boutiques, pas les galeries, pas même la vue — le silence. Un silence qui a la texture de la pierre chaude, le parfum du romarin et la profondeur de la Méditerranée. Un silence que Nietzsche écoutait en montant son sentier, et qui lui soufflait des idées que le monde n'a pas fini de méditer.

Merci de m'avoir suivie jusqu'au sommet et d'être redescendue. Si Èze vous a donné le vertige — celui des hauteurs ou celui de la beauté — alors c'est que le village a fait son travail.

À bientôt sur un autre sentier. Isabelle Moretti, au revoir.`,
      },
    ],
  },

  // ─── TOUR 4 : VILLEFRANCHE — COCTEAU ET LA RADE SECRÈTE ───
  {
    id: `${SEED_PREFIX}tour-villefranche`, guideIdx: 3,
    title: `${SEED_PREFIX}Villefranche — Cocteau et la Rade Secrète`,
    city: 'Villefranche-sur-Mer', duration: 50, distance: 2.1,
    description: 'L\'une des plus belles rades du monde, et pourtant l\'une des plus secrètes. Villefranche-sur-Mer est un secret bien gardé entre Nice et Monaco — un port de pêcheurs que Cocteau a immortalisé, une citadelle qui a résisté à tous les envahisseurs, et une rue souterraine du XIIIe siècle qui servait de refuge pendant les bombardements. Ce parcours de 50 minutes vous révèle un lieu où l\'art, la guerre et la mer se mêlent depuis deux mille ans.',
    pois: [
      {
        title: 'Port de la Santé — L\'Arrivée',
        lat: 43.7040, lng: 7.3115,
        desc: 'Le petit port de pêcheurs où les barques colorées dansent sur l\'eau.',
        transcript: `Bienvenue à Villefranche-sur-Mer. Je suis Claire Duval, et cet endroit est ma passion. Vous êtes au Port de la Santé, le petit port de pêcheurs qui fait face à la rade. Regardez ces barques — les pointus provençaux — bleues, vertes, rouges, qui dansent sur l'eau turquoise. C'est l'image la plus méditerranéenne qui soit.

La rade de Villefranche est considérée comme l'une des plus belles rades naturelles du monde, avec Rio, Sydney et Hong Kong. Elle est si profonde — jusqu'à 95 mètres — que les plus grands navires de guerre ont pu y mouiller depuis l'Antiquité. Les galères romaines, les flottes génoises, la US Sixth Fleet pendant la Guerre Froide — tous ont jeté l'ancre ici.

Le nom "Villefranche" — Ville Franche — signifie "ville libre". C'est Charles II d'Anjou qui a fondé la cité en 1295 et lui a accordé des franchises fiscales pour attirer les habitants. Pas d'impôts, pas de droits de douane, pas de corvées. Un paradis fiscal médiéval, sept siècles avant Monaco. L'ironie, c'est que Monaco est juste de l'autre côté de la colline.

Ce port a une particularité : il est protégé du mistral et de la tramontane par le Mont Boron d'un côté et le Cap Ferrat de l'autre. L'eau est si calme que les locaux l'appellent "le lac". C'est grâce à cette protection naturelle que Villefranche a toujours été un port stratégique — et que ses eaux sont d'un turquoise irréel. Le fond sablonneux reflète la lumière, et l'absence de courant empêche les sédiments de troubler l'eau.

Marchons vers la Chapelle Saint-Pierre. C'est là que Cocteau nous attend.`,
      },
      {
        title: 'Chapelle Saint-Pierre — Le Chef-d\'Œuvre de Cocteau',
        lat: 43.7050, lng: 7.3118,
        desc: 'La chapelle de pêcheurs entièrement décorée par Jean Cocteau en 1957.',
        transcript: `Cette petite chapelle au bord de l'eau, c'est le chef-d'œuvre de Jean Cocteau. Poète, cinéaste, dessinateur, dramaturge — Cocteau était tout cela à la fois, et c'est à Villefranche qu'il a trouvé son dernier terrain d'expression : la fresque murale.

En 1957, Cocteau a obtenu l'autorisation de décorer cette ancienne chapelle de pêcheurs, abandonnée depuis des années et utilisée comme entrepôt à filets. Il a travaillé ici pendant plusieurs semaines, seul ou presque, dessinant directement sur les murs à la craie puis recouvrant de peinture. Les fresques représentent des scènes de la vie de Saint Pierre — patron des pêcheurs — mêlées à des images de gitanes, d'anges et de la vie quotidienne de Villefranche.

Le style est immédiatement reconnaissable : lignes pures, couleurs pastels, visages géométriques qui rappellent le cubisme sans en être. Cocteau ne peignait pas comme Picasso ou Matisse — il dessinait comme un poète, avec des traits qui sont des vers et des couleurs qui sont des rimes.

Cocteau avait découvert Villefranche en 1924, quand il y était venu pour décrocher de l'opium. La beauté de la rade, la simplicité des pêcheurs et la lumière de la Côte d'Azur l'ont saisi. Il est revenu régulièrement pendant trente ans, séjournant à l'Hôtel Welcome sur le port — la façade jaune que vous voyez juste à côté.

La chapelle est ouverte au public (entrée payante, quelques euros). L'intérieur est petit — cinq minutes suffisent pour tout voir. Mais ces cinq minutes valent le détour. C'est l'un des rares lieux au monde où l'on peut entrer littéralement dans l'univers d'un artiste et le sentir tout autour de soi.

Maintenant, suivez-moi dans le lieu le plus mystérieux de Villefranche — la Rue Obscure.`,
      },
      {
        title: 'Rue Obscure — Le Passage Secret du XIIIe Siècle',
        lat: 43.7048, lng: 7.3112,
        desc: 'Rue couverte souterraine de 130 mètres, refuge lors des bombardements.',
        transcript: `La Rue Obscure. Cent trente mètres de passage couvert, entièrement souterrain, datant du XIIIe siècle. C'est l'un des plus anciens passages couverts d'Europe, et certainement le plus atmosphérique.

Entrez. Vos yeux vont mettre quelques secondes à s'adapter à l'obscurité. Les voûtes en ogive sont basses — attention à la tête si vous mesurez plus de 1,80 mètre. Le sol est pavé de dalles irrégulières, polies par sept siècles de pas. L'air est frais, même en plein été — les murs de pierre font office de climatisation naturelle.

Cette rue a été construite pour protéger les habitants des intempéries et des attaques. Villefranche, exposée à la mer, subissait régulièrement des tempêtes violentes et des raids de pirates barbaresques. La Rue Obscure permettait de circuler à l'abri, de stocker des provisions et, en cas d'attaque, de se réfugier dans un dédale que les envahisseurs ne connaissaient pas.

Pendant la Seconde Guerre mondiale, la Rue Obscure a retrouvé sa fonction de refuge. Les habitants de Villefranche s'y cachaient lors des bombardements alliés de 1944. Les murs portent encore les traces de cette époque — des inscriptions gravées dans la pierre, des dates, des initiales. Cherchez-les en passant la main sur les murs, vous les sentirez sous vos doigts.

La rue débouche sur une série d'escaliers qui montent vers la ville haute. En sortant, le contraste entre l'obscurité du passage et la lumière méditerranéenne est saisissant — comme si vous passiez du Moyen Âge au XXIe siècle en trois marches.

C'est ça, Villefranche : un lieu où les siècles se superposent sans jamais s'effacer. On marche dans le XIIIe et on débouche dans le XXIe, et la mer est toujours là, identique, indifférente au temps qui passe.

Direction la Citadelle — la forteresse qui garde la rade.`,
      },
      {
        title: 'Citadelle Saint-Elme — La Forteresse de la Rade',
        lat: 43.7055, lng: 7.3100,
        desc: 'Forteresse du XVIe siècle devenue centre culturel, avec vue sur la rade.',
        transcript: `La Citadelle Saint-Elme. Construite en 1557 par le Duc de Savoie Emmanuel-Philibert pour défendre la rade contre les attaques turques et françaises. C'est un chef-d'œuvre d'architecture militaire de la Renaissance — murs de cinq mètres d'épaisseur, bastions en étoile, douves sèches et chemins de ronde.

La citadelle n'a jamais été prise par la force. Elle a été assiégée par les Français en 1691 et en 1706, mais les défenseurs ont résisté chaque fois. En 1706, c'est Louis XIV — encore lui — qui a fini par négocier la reddition. Et même alors, les conditions étaient honorables : la garnison est sortie avec les honneurs de la guerre, drapeaux déployés.

Aujourd'hui, la citadelle abrite quatre musées et un théâtre de plein air. Le musée Volti présente les sculptures sensuelles d'Antoniucci Volti — des nus féminins en bronze et en cuivre. La collection Roux expose des figurines médiévales en céramique. Et les jardins de la citadelle offrent une vue panoramique sur la rade, le Cap Ferrat et la ville.

L'entrée est gratuite. Prenez le temps de monter sur les remparts. La vue depuis le bastion nord-est est l'une des plus belles de Villefranche — la rade entière se déploie devant vous, avec les pointus colorés en premier plan et les montagnes en toile de fond.

Un détail : la cour intérieure de la citadelle sert de lieu de concert en été. Les notes de musique rebondissent sur les murs de pierre et montent vers le ciel étoilé. Si vous avez la chance d'être ici un soir de concert, ne manquez pas ça. La musique dans une forteresse, sous les étoiles, face à la mer — c'est une expérience que vous ne trouverez nulle part ailleurs.

On continue vers l'église Saint-Michel, juste au-dessus.`,
      },
      {
        title: 'Église Saint-Michel — Baroque et Christ Gisant',
        lat: 43.7052, lng: 7.3108,
        desc: 'Église baroque abritant un Christ gisant sculpté et des orgues remarquables.',
        transcript: `L'Église Saint-Michel, construite au XVIe siècle dans le style baroque italien. La façade est sobre — pierre ocre, pilastres, fronton classique. Mais l'intérieur est une surprise : riche, doré, foisonnant de détails.

Le trésor de cette église, c'est le Christ gisant. Une sculpture en bois polychrome du XVIIe siècle, représentant le Christ mort, allongé dans une niche vitrée à gauche du chœur. La sculpture est d'un réalisme troublant — les veines des mains, les côtes saillantes, l'expression du visage figée dans une paix douloureuse. Les historiens d'art ne s'accordent pas sur l'auteur, mais la qualité de l'exécution suggère un atelier majeur, probablement génois.

Les orgues sont remarquables aussi. Construites au XVIIIe siècle par un facteur italien, elles ont été restaurées en 2008 et retrouvées dans un état proche de leur sonorité d'origine. Des concerts d'orgue sont donnés régulièrement — la résonance dans cette petite église est exceptionnelle.

Mais ce que j'aime le plus dans cette église, c'est la lumière. Les vitraux sont simples — pas de grandes compositions figuratives comme dans les cathédrales gothiques — mais ils filtrent la lumière méditerranéenne de manière à créer des taches dorées qui se déplacent sur les murs au fil de la journée. Le matin, la lumière est du côté est, sur le Christ gisant. L'après-midi, elle passe à l'ouest, sur les orgues. C'est comme si l'église avait été conçue pour être un cadran solaire intérieur.

Villefranche est un lieu discret. Elle ne crie pas, elle ne pose pas. Elle attend que vous la découvriez, et quand vous la découvrez, elle vous offre des moments comme celui-ci — une sculpture bouleversante dans une église modeste, baignée d'une lumière qui n'appartient qu'à la Méditerranée.

Descendons vers la plage pour les deux dernières escales.`,
      },
      {
        title: 'Plage des Marinières — Les Eaux Turquoise',
        lat: 43.7035, lng: 7.3130,
        desc: 'La plage de galets aux eaux cristallines, face à la rade.',
        transcript: `La Plage des Marinières. Galets ronds, eau turquoise, pas de transats de luxe — juste la Méditerranée dans sa version la plus pure. C'est la plage publique de Villefranche, et elle est considérée comme l'une des plus belles de la Côte d'Azur.

La couleur de l'eau ici est extraordinaire. Un turquoise profond, presque irréel, qui vire au bleu cobalt à quelques mètres du bord. La raison est géologique : le fond de la rade est composé de sable blanc et de posidonie — une plante marine qui stabilise le sable et filtre l'eau. La posidonie est un trésor écologique — sans elle, les plages de la Méditerranée seraient grises et l'eau serait trouble.

Les Marinières sont un lieu de rendez-vous pour les plongeurs. À quelques mètres du bord, on peut observer des mérous, des sars, des girelles et parfois des murènes. La rade est une zone protégée depuis 2019, et la faune sous-marine a spectaculairement récupéré. Les pêcheurs s'en plaignent — les mérous mangent le poisson avant eux — mais les plongeurs exultent.

Pendant la Guerre Froide, la US Sixth Fleet mouillait régulièrement dans cette rade. Les marins américains descendaient à terre et envahissaient les bars du port. Villefranche est devenue un lieu de permission célèbre — un petit bout d'Amérique sur la Côte d'Azur. Les plus anciens du village se souviennent encore des marins en uniforme blanc qui dansaient le rock and roll au bar de l'Hôtel Welcome. Cocteau, qui logeait à l'étage du dessus, s'en amusait beaucoup.

Si vous avez un maillot, plongez. L'eau est fraîche mais pas froide. Et la vue depuis l'eau — les façades colorées du port, la citadelle en arrière-plan — est encore plus belle que depuis la plage.

Dernière escale : le cap, pour l'épilogue.`,
      },
      {
        title: 'Pointe des Marinières — L\'Horizon Infini',
        lat: 43.7030, lng: 7.3145,
        desc: 'Vue panoramique sur le Cap Ferrat et la grande bleue.',
        transcript: `Nous terminons ici, à la Pointe des Marinières, avec la Méditerranée devant nous et le Cap Ferrat qui s'avance dans la mer comme un doigt vert. C'est le point de vue final de notre parcours — et c'est celui que Cocteau préférait.

Dans son journal, Cocteau a écrit : "Villefranche est le lieu où je suis le plus moi-même. La mer y est un miroir qui ne ment pas." C'est une phrase typiquement coctalienne — belle, mystérieuse, légèrement prétentieuse et profondément vraie.

Villefranche-sur-Mer est un secret. Pas un secret bien gardé — les touristes la connaissent, les paquebots y font escale — mais un secret au sens où sa vraie beauté ne se révèle qu'à ceux qui prennent le temps. Le temps de descendre dans la Rue Obscure, de regarder les fresques de Cocteau, d'écouter les vagues contre les galets, de sentir la fraîcheur des murs de la citadelle.

C'est un lieu qui récompense la lenteur. Dans un monde qui accélère, qui scroll, qui zappe, Villefranche vous demande de ralentir. De marcher, pas de courir. De regarder, pas de photographier. D'écouter, pas de parler. C'est un exercice difficile pour la plupart d'entre nous. Mais c'est l'exercice le plus précieux que la Côte d'Azur puisse offrir.

Merci de m'avoir suivie dans cette promenade. Villefranche n'est pas une ville qui fait du bruit. Elle murmure. Et si vous avez tendu l'oreille pendant ces cinquante minutes, vous avez entendu quelque chose que la plupart des visiteurs manquent — le murmure de la Méditerranée, celui qui parle de beauté, de temps et de lumière.

Claire Duval, au revoir. Et revenez quand vous voulez — la rade sera toujours là.`,
      },
    ],
  },

  // ─── TOUR 5 : CAP FERRAT — LA PRESQU'ÎLE DES MILLIARDAIRES ───
  {
    id: `${SEED_PREFIX}tour-capferrat`, guideIdx: 4,
    title: `${SEED_PREFIX}Cap Ferrat — La Presqu'île des Milliardaires`,
    city: 'Saint-Jean-Cap-Ferrat', duration: 52, distance: 3.5,
    description: 'La presqu\'île la plus exclusive de la Méditerranée. Derrière les grilles des villas et les haies de lauriers se cachent les histoires de la baronne Rothschild, de Somerset Maugham, de Cocteau, de David Niven et des oligarques russes. Ce parcours de 52 minutes longe le sentier du littoral, traverse les jardins Ephrussi et révèle les secrets d\'un lieu où le mètre carré vaut plus cher qu\'à Manhattan.',
    pois: [
      {
        title: 'Port de Saint-Jean — Le Village des Pêcheurs',
        lat: 43.6948, lng: 7.3320,
        desc: 'Le port originel où les pêcheurs côtoient les milliardaires.',
        transcript: `Bienvenue à Saint-Jean-Cap-Ferrat. Je suis Thomas Bellini, et je vais vous raconter l'histoire de la presqu'île la plus chère du monde. Vous êtes au port de Saint-Jean, un village de pêcheurs qui n'a presque pas changé depuis un siècle — des barques colorées, un quai, quelques restaurants de poisson et des chats qui dorment au soleil.

Sauf que derrière ce décor de carte postale, les villas qui couvrent la presqu'île valent entre 10 et 200 millions d'euros chacune. Le mètre carré ici oscille entre 30 000 et 100 000 euros, ce qui en fait l'immobilier résidentiel le plus cher du monde — devant Monaco, Londres, Hong Kong et Manhattan.

Pourquoi ? La position géographique est parfaite : une presqu'île de 2,5 kilomètres de long, protégée du mistral par le Mont Boron, exposée plein sud, avec une eau turquoise et une végétation subtropicale. Mais surtout, Cap Ferrat offre ce que l'argent peut difficilement acheter ailleurs : l'intimité. Les villas sont cachées derrière des murs de pierre, des haies de cyprès et des jardins luxuriants. Pas de tours, pas de béton, pas de bruit. Le contraire exact de Monaco, qui est à dix minutes en voiture.

Le roi des Belges Léopold II a été le premier à comprendre le potentiel de Cap Ferrat. En 1899, il a acheté une propriété de 14 hectares — un septième de la presqu'île — et y a construit une villa entourée de jardins exotiques. Son exemple a attiré l'aristocratie et la haute bourgeoisie européenne, et en quelques décennies, Cap Ferrat est devenu le refuge des ultra-riches.

Mais attention — Cap Ferrat n'est pas que de l'argent. C'est aussi de l'art, de l'histoire et de la nature. C'est ce que cette visite va vous montrer. En route vers la Villa Ephrussi.`,
      },
      {
        title: 'Villa Ephrussi de Rothschild — La Folie Rose',
        lat: 43.6940, lng: 7.3295,
        desc: 'Le palais rose de la baronne, entre art et excentricité.',
        transcript: `La Villa Ephrussi de Rothschild. Un palais rose entouré de neuf jardins thématiques, perché au sommet de la presqu'île avec une vue sur la mer des deux côtés — la rade de Villefranche à l'est, la baie de Beaulieu à l'ouest. C'est le monument le plus visité de Cap Ferrat, et l'un des plus extraordinaires de la Côte d'Azur.

La baronne Béatrice de Rothschild a acheté le terrain en 1905 et a passé sept ans à construire cette villa. Sept ans. Elle a renvoyé vingt architectes successifs, fait raser la colline pour obtenir une plateforme parfaitement plate, et importé des matériaux d'Italie, d'Espagne et d'Afrique du Nord. Le résultat est un palais de style vénitien-mauresque — façade rose, colonnes de marbre, patios à arcades — qui ne ressemble à rien d'autre en France.

La baronne était une collectionneuse compulsive. La villa abrite des meubles de Marie-Antoinette, des porcelaines de Sèvres et de Meissen, des tableaux de Boucher, Fragonard et Carpaccio, des tapisseries des Gobelins et des tapis d'Isfahan. Chaque pièce est un musée dans le musée.

Mais le vrai génie de la baronne, ce sont les jardins. Neuf jardins thématiques — français, espagnol, florentin, japonais, exotique, lapidaire, provençal, roseraie et jardin de Sèvres — disposés en éventail autour de la villa. Le jardin français, avec son bassin central et ses jets d'eau, est aligné sur l'axe de la rade de Villefranche. Quand les jets d'eau s'activent, on a l'impression que le jardin se prolonge dans la mer. C'est un effet de perspective calculé par la baronne elle-même.

Béatrice de Rothschild était excentrique, autoritaire et visionnaire. Elle habillait ses jardiniers de bérets de marin parce qu'elle voulait que la villa ressemble à un paquebot de luxe ancré au sommet de la presqu'île. Elle léguait la villa à l'Académie des Beaux-Arts à sa mort en 1934. Merci, baronne.

L'entrée est payante (environ 16 euros), mais ça les vaut largement. Prenez au moins une heure pour les jardins — c'est là que la vraie magie opère.

Continuons vers le phare.`,
      },
      {
        title: 'Sentier du Littoral — Entre Pins et Vagues',
        lat: 43.6870, lng: 7.3280,
        desc: 'Le chemin côtier qui fait le tour de la presqu\'île.',
        transcript: `Nous empruntons maintenant le sentier du littoral, ce chemin côtier qui fait le tour complet de la presqu'île de Cap Ferrat. Le circuit complet fait 6 kilomètres et prend environ deux heures. Nous n'en ferons qu'une partie, mais c'est suffisant pour comprendre pourquoi ce sentier est considéré comme l'une des plus belles promenades côtières de la Méditerranée.

Le sentier serpente entre les rochers et la végétation — pins d'Alep, agaves, figuiers de Barbarie, euphorbes et romarins sauvages. À votre droite, la mer, d'un bleu qui change de nuance à chaque anse — turquoise dans les criques abritées, bleu foncé au large, vert émeraude là où les algues tapissent le fond. À votre gauche, les murs des villas, parfois si hauts qu'on ne voit rien, parfois percés d'une grille qui laisse entrevoir un jardin extraordinaire.

Ces murs racontent une histoire. Avant le XXe siècle, le sentier du littoral était un chemin de douaniers — il servait à surveiller la côte contre la contrebande. Quand les riches ont commencé à acheter les terrains, ils ont voulu fermer l'accès à la mer. Mais la loi française est claire : le sentier du littoral est un droit de passage inaliénable. Personne — pas même un Rothschild ou un oligarque russe — ne peut bloquer l'accès au rivage. Les murs des villas s'arrêtent donc à la limite du sentier, parfois à quelques mètres de la mer.

C'est l'une des choses les plus démocratiques de France : le sentier du littoral de Cap Ferrat, où un promeneur en baskets marche à deux mètres de villas à 100 millions d'euros, avec exactement le même droit d'accès à la mer que leurs propriétaires.

Respirez. Le mélange d'iode, de pin et de romarin sauvage est le parfum naturel de Cap Ferrat. Aucun parfumeur de Grasse n'a réussi à le reproduire — c'est trop complexe, trop vivant, trop dépendant de la température et du vent. C'est le seul luxe de Cap Ferrat qui est véritablement gratuit.

On continue vers la Chapelle Saint-Hospice.`,
      },
      {
        title: 'Chapelle Saint-Hospice — Le Saint Ermite',
        lat: 43.6810, lng: 7.3395,
        desc: 'L\'ermitage du VIe siècle avec sa statue de la Vierge monumentale.',
        transcript: `La Chapelle Saint-Hospice, sur la pointe est de la presqu'île. C'est le lieu le plus ancien de Cap Ferrat — un ermitage fondé au VIe siècle par Saint Hospice, un moine qui vivait ici en reclus, enchaîné dans une tour, priant et jeûnant.

Saint Hospice est une figure fascinante. Selon Grégoire de Tours, qui l'a mentionné dans son "Histoire des Francs", Hospice vivait volontairement dans les privations les plus extrêmes — il portait des chaînes de fer autour du corps, ne mangeait que du pain et des dattes, et passait ses journées en prière. En 574, quand les Lombards ont envahi la Provence, Hospice leur a prédit que leur conquête échouerait. Les Lombards, furieux, ont essayé de le tuer à coups d'épée, mais — selon la légende — les lames ne pouvaient pas le blesser. Impressionnés, les guerriers se sont convertis au christianisme.

La chapelle actuelle date du XIXe siècle, mais elle est construite sur les fondations de l'ermitage original. La tour de Saint Hospice est encore visible dans les soubassements. Et au sommet de la colline, une statue monumentale de la Vierge Marie, haute de 11 mètres, domine la mer. Érigée en 1903 par un sculpteur italien, elle est visible depuis Nice et Monaco par temps clair.

L'endroit est paisible. Peu de touristes viennent jusqu'ici — le sentier est long et la chapelle n'est pas sur les circuits habituels. C'est dommage, parce que la vue depuis le cimetière qui entoure la chapelle est spectaculaire : la côte italienne à l'est, Monaco en contrebas, et la mer à perte de vue.

Saint Hospice a choisi cet endroit pour son isolement. Quinze siècles plus tard, l'isolement est toujours là. C'est peut-être le dernier lieu vraiment tranquille de Cap Ferrat — protégé par la distance, l'absence de parking et la réputation d'un saint un peu fou.

Rebroussons chemin vers la Villa Santo Sospir — Cocteau nous y attend.`,
      },
      {
        title: 'Villa Santo Sospir — Cocteau Muraliste',
        lat: 43.6900, lng: 7.3350,
        desc: 'La villa privée entièrement tatouée de fresques par Cocteau.',
        transcript: `La Villa Santo Sospir. Cette villa privée est l'un des secrets les mieux gardés de Cap Ferrat. En 1950, Jean Cocteau — encore lui — est invité à séjourner chez Francine Weisweiller, une mécène fortunée qui possédait cette villa au bord de l'eau. Cocteau reste un week-end. Puis une semaine. Puis il commence à dessiner sur les murs.

En quelques mois, Cocteau a recouvert chaque mur, chaque plafond, chaque surface de la villa de fresques, de dessins et de motifs. Il a "tatoué" la villa, selon sa propre expression. Des personnages mythologiques — Apollon, Diane, Ulysse — côtoient des pêcheurs de Villefranche, des gitanes de Camargue et des visages inspirés de Jean Marais, l'acteur et amant de Cocteau.

La villa est classée monument historique depuis 2020 et se visite sur rendez-vous (les jours d'ouverture varient). Si vous avez la chance d'y entrer, vous vivrez une expérience unique : habiter un dessin de Cocteau. Chaque pièce est une œuvre d'art totale — les murs, le sol, le plafond, les meubles, tout participe à une composition d'ensemble.

Cocteau a vécu intermittemment à Santo Sospir jusqu'à sa mort en 1963. C'était son lieu de création favori — plus intime que l'atelier, plus libre que le studio de cinéma. Il y a écrit des poèmes, peint des céramiques et tourné un court-métrage ("La Villa Santo Sospir", 1952) qui montre la maison et son processus créatif.

Francine Weisweiller a conservé la villa intacte après la mort de Cocteau. Sa fille Carole a poursuivi la tradition. La villa est un mausolée vivant — un lieu où l'art et la vie domestique fusionnent de manière si complète qu'on ne sait plus où finit le tableau et où commence le salon.

De l'extérieur, on ne voit rien — juste un mur de pierre et un portail fermé. C'est Cap Ferrat : les trésors sont toujours cachés.

Deux derniers arrêts pour conclure cette promenade.`,
      },
      {
        title: 'Promenade Maurice Rouvier — Le Sentier des Artistes',
        lat: 43.7005, lng: 7.3345,
        desc: 'Promenade en bord de mer entre Saint-Jean et Beaulieu, fréquentée par les artistes.',
        transcript: `La Promenade Maurice Rouvier, un sentier piétonnier d'un kilomètre qui longe la mer entre Saint-Jean-Cap-Ferrat et Beaulieu-sur-Mer. C'est l'une des plus belles promenades côtières de la Riviera — et l'une des moins connues.

Le sentier porte le nom de Maurice Rouvier, président du Conseil français (l'équivalent de Premier ministre) de 1887 à 1887 puis de 1905 à 1906, qui possédait une villa à Beaulieu. Mais les vrais habitués de cette promenade étaient les artistes et les écrivains qui ont élu domicile à Cap Ferrat au XXe siècle.

Somerset Maugham, l'un des écrivains les plus lus du XXe siècle, a vécu à la Villa Mauresque sur Cap Ferrat de 1928 à 1965. Il marchait sur cette promenade chaque matin, accompagné de son secrétaire Alan Searle, et travaillait l'après-midi. Maugham a écrit certains de ses meilleurs romans ici — "Le Fil du Rasoir", "La Passe dangereuse" — dans le calme de la presqu'île.

David Niven, l'acteur britannique, vivait aussi à Cap Ferrat. Sa villa, "Lo Scoglietto", surplombait la mer à quelques centaines de mètres d'ici. Niven était un voisin de Maugham et un habitué de cette promenade. Charlie Chaplin venait lui rendre visite. Gregory Peck aussi. Cap Ferrat dans les années 1950, c'était Hollywood-sur-Mer, mais en plus discret et en meilleur goût.

La promenade est bordée de pins parasols, de palmiers et d'agaves. Sur votre droite, la mer. Sur votre gauche, les jardins des villas — souvent invisibles derrière leurs murs, mais parfois entrevus à travers une grille ou un portail entrouvert. Ces aperçus fugitifs sont des moments précieux — des jardins d'Éden qu'on ne fait que deviner.

Dernière escale au Grand Hôtel pour l'épilogue.`,
      },
      {
        title: 'Grand Hôtel du Cap Ferrat — L\'Épilogue',
        lat: 43.6870, lng: 7.3340,
        desc: 'Le palace absolu, symbole du luxe discret de Cap Ferrat.',
        transcript: `Nous terminons devant le Grand Hôtel du Cap Ferrat, un palace cinq étoiles posé au milieu d'un parc de 7 hectares, face à la mer. Chambre à partir de 1 200 euros la nuit. Suite présidentielle : 25 000 euros. Piscine olympique chauffée, spa, restaurant étoilé, accès privé à la plage. C'est l'un des hôtels les plus exclusifs du monde.

Inauguré en 1908, le Grand Hôtel a traversé le XXe siècle comme un paquebot de luxe traverse l'océan — imperturbable, élégant, indifférent aux tempêtes. Pendant les deux guerres mondiales, il a été réquisitionné comme hôpital militaire. Dans les années 1950 et 1960, il est devenu le lieu de villégiature préféré de l'aristocratie internationale et des stars de cinéma. Aujourd'hui, il appartient au groupe Four Seasons et continue d'attirer les ultra-riches du monde entier.

Le Grand Hôtel incarne la philosophie de Cap Ferrat : le luxe discret. Pas de tours de verre comme à Monaco, pas de plages bondées comme à Saint-Tropez, pas de boîtes de nuit comme à Cannes. Juste un palace caché dans les pins, un jardin parfait, et la mer. Le luxe de ne rien montrer — le contraire exact de notre époque.

Cap Ferrat est un anachronisme. Dans un monde de transparence, d'exposition permanente et de réseaux sociaux, cette presqu'île cultive l'opacité, la discrétion et le secret. Les murs sont hauts, les portails fermés, les propriétaires invisibles. C'est un lieu qui dit : le vrai luxe, c'est ce qui ne se voit pas.

Mais grâce au sentier du littoral, au jardin Ephrussi et aux chapelles ouvertes, Cap Ferrat n'est pas entièrement fermé. Il offre des fragments de sa beauté à ceux qui acceptent de marcher, de chercher et de regarder. C'est un équilibre fragile entre exclusion et partage, entre richesse privée et patrimoine commun.

Merci de m'avoir accompagné sur cette presqu'île. Si vous repartez avec une seule image, gardez celle du sentier du littoral — ce chemin de quelques mètres de large, entre les murs des milliardaires et la Méditerranée, où tout le monde est à égalité devant la beauté de la mer.

Thomas Bellini, au revoir.`,
      },
    ],
  },
];

// ── Reviews ─────────────────────────────────────────────
const reviewPool = [
  { rating: 5, comment: 'Incroyable ! Les narrations sont captivantes, on est transporté dans l\'histoire. Le meilleur audio guide que j\'ai jamais fait.' },
  { rating: 5, comment: 'Le guide raconte les anecdotes avec un talent fou. J\'ai ri, j\'ai appris, j\'ai été ému. 10/10.' },
  { rating: 5, comment: 'On sent le travail de recherche historique et la passion du guide. Chaque POI est une découverte.' },
  { rating: 4, comment: 'Très bonne visite, récit passionnant. Un peu long pour les enfants en bas âge mais excellent pour les adultes.' },
  { rating: 5, comment: 'J\'ai refait la visite trois fois avec des amis différents. Chaque fois, je remarque de nouveaux détails. Chapeau !' },
  { rating: 5, comment: 'La qualité audio est parfaite, le rythme est juste. On marche et on écoute sans se lasser. Bravo.' },
  { rating: 4, comment: 'Excellente visite culturelle. Les transitions entre les points sont fluides. Manque juste un plan papier.' },
  { rating: 5, comment: 'Le thème est original et les histoires sont vraies ! J\'ai vérifié. Fascinant du début à la fin.' },
  { rating: 5, comment: 'Recommandé les yeux fermés. Une façon unique de découvrir la Côte d\'Azur, loin des clichés.' },
  { rating: 4, comment: 'Très belle balade, guide cultivé et drôle. J\'aurais juste aimé quelques minutes de plus sur certains POIs.' },
  { rating: 5, comment: 'Le parcours est parfaitement balisé et les narrations sont d\'une qualité professionnelle. Merci !' },
  { rating: 5, comment: 'Meilleure activité de nos vacances. Toute la famille a adoré, même les ados !' },
];

// ── Seed Execution ──────────────────────────────────────
async function run() {
  const doClean = process.argv.includes('--clean');
  if (doClean) {
    console.log('Cleaning existing premium seed data...');
    const cleaned = await cleanExisting();
    console.log(`Cleaned ${cleaned} items.\n`);
  }

  console.log('=== Seed Premium Tours ===\n');

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

    // GuideTour
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

    // StudioScenes — one per POI with full transcript and coords
    for (let s = 0; s < t.pois.length; s++) {
      const poi = t.pois[s];
      // Estimate audio duration from transcript length (~150 words/min in French)
      const wordCount = poi.transcript.split(/\s+/).length;
      const estimatedDuration = Math.round(wordCount / 150 * 60); // seconds

      await put('StudioScene', {
        id: `${t.id}-scene-${s}`, sessionId,
        owner: `${guide.userId}::${guide.userId}`,
        sceneIndex: s, title: poi.title, status: 'finalized',
        studioAudioKey: `guide-audio/${t.id}/scene_${s}.aac`,
        originalAudioKey: `guide-audio/${t.id}/scene_${s}_original.aac`,
        transcriptText: poi.transcript,
        poiDescription: poi.desc,
        transcriptionStatus: 'completed',
        qualityScore: 'good', archived: false,
        photosRefs: [`guide-photos/${t.id}/poi_${s}.jpg`],
        latitude: poi.lat, longitude: poi.lng,
        durationSeconds: estimatedDuration,
      });
    }

    // TourReviews
    const reviewCount = 4 + Math.floor(Math.random() * 4);
    let ratingSum = 0;
    for (let r = 0; r < reviewCount; r++) {
      const tmpl = reviewPool[(i * 3 + r) % reviewPool.length];
      ratingSum += tmpl.rating;
      await put('TourReview', {
        id: `${t.id}-review-${r}`, tourId: t.id,
        userId: `visitor-${randomUUID().substring(0, 8)}`,
        owner: 'visitor::visitor',
        rating: tmpl.rating, comment: tmpl.comment,
        visitedAt: Date.now() - (r + 1) * 86400000 * (3 + Math.floor(Math.random() * 15)),
        language: 'fr', status: 'visible',
      });
    }

    // TourStats
    const avgRating = Math.round((ratingSum / reviewCount) * 10) / 10;
    const completionCount = 25 + Math.floor(Math.random() * 250);
    await put('TourStats', {
      id: `${t.id}-stats`, tourId: t.id,
      averageRating: avgRating, reviewCount, completionCount,
    });

    // Calculate total word count for transcript duration
    const totalWords = t.pois.reduce((sum, p) => sum + p.transcript.split(/\s+/).length, 0);
    const totalMinutes = Math.round(totalWords / 150);
    console.log(`  Tour: ${t.title.replace(SEED_PREFIX, '')} (${t.city}) — ${t.pois.length} POIs, ~${totalMinutes} min narration, ${reviewCount} reviews, ★${avgRating}`);
  }

  // Summary
  const totalPois = tours.reduce((s, t) => s + t.pois.length, 0);
  const totalWords = tours.reduce((s, t) => s + t.pois.reduce((ps, p) => ps + p.transcript.split(/\s+/).length, 0), 0);
  console.log(`\n=== Done: ${guides.length} guides, ${tours.length} tours, ${totalPois} POIs ===`);
  console.log(`=== Total narration: ~${Math.round(totalWords / 150)} minutes (~${totalWords} words) ===`);
  console.log(`=== Fun theme: "Crimes & Scandales de la Riviera" ===`);
}

run().catch(console.error);
