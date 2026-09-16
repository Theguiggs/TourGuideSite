import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/roquebrune-lecorbusier-mer` — sept étapes, 3 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur
 * capmoderne.monuments-nationaux.fr et roquebrune-cap-martin.fr.
 */
const SOURCES = {
  capmoderne: 'https://capmoderne.monuments-nationaux.fr/en/visit/practical-information',
  chateau: 'https://www.roquebrune-cap-martin.fr/16752-le-chateau.htm',
  sentier: 'https://www.roquebrune-cap-martin.fr/25985-sentier-le-corbusier.htm',
  deplacer: 'https://www.roquebrune-cap-martin.fr/16779-se-deplacer.htm',
  parkings: 'https://www.roquebrune-cap-martin.fr/25609-liste-des-parkings.htm',
};

export const ARTICLE_ROQUEBRUNE: EditorialArticle = {
  slug: 'visiter-roquebrune-cap-martin-a-pied',
  city: { slug: 'roquebrune-cap-martin', name: 'Roquebrune-Cap-Martin', country: 'FR' },
  tour: { slug: 'roquebrune-cap-martin-le-corbusier-et-la-mer', match: 'corbusier' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Roquebrune-Cap-Martin à pied : du cabanon de Le Corbusier au château de l’an mil',
      description: 'Parcours à pied à Roquebrune-Cap-Martin, du cabanon de Le Corbusier et de la villa E-1027 au village médiéval, son château et son olivier millénaire. 3 km.',
      label: 'Visiter Roquebrune à pied',
      lead: 'Entre le rivage et le village perché de Roquebrune, il y a deux cents mètres de falaise et mille ans d’architecture : une cabane de neuf mètres carrés dessinée par Le Corbusier, une villa moderniste signée Eileen Gray, un château carolingien et un olivier qui les a tous vus naître.',
      sections: [
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le parcours commence au bord de l’eau, devant le cabanon de Le Corbusier : un rectangle de bois de 3,66 mètres de côté, posé contre la falaise en 1952 pour les soixante ans de sa femme Yvonne. C’est là que la visite audio Murmure démarre. Le cabanon et la villa E-1027 voisine forment le site Cap Moderne, qui ne se visite qu’en visite guidée sur réservation ; la balade les décrit de l’extérieur, depuis le sentier du littoral.',
            'Depuis le rivage, un sentier grimpe à travers les oliviers jusqu’au cimetière, puis au village. C’est la partie la plus rude du parcours.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'En contrebas du cabanon, la villa E-1027 d’Eileen Gray, construite de 1926 à 1929, est l’une des œuvres majeures de l’architecture moderne ; Le Corbusier y a peint des fresques sans permission en 1938, et l’histoire de cet affront est l’un des fils du parcours. Au cimetière de Roquebrune, l’architecte repose auprès d’Yvonne sous deux blocs de calcaire qu’il a dessinés lui-même, à cinquante mètres de la mer où il est mort en nageant, le 27 août 1965.',
            'Le village médiéval s’explore par des ruelles taillées dans la roche, dont le passage Moncollet, si étroit qu’on y marche en file indienne. Son château, fondé vers 970 par Conrad Ier, comte de Vintimille, est présenté comme le plus ancien château féodal de France encore debout, avec des murs de deux mètres d’épaisseur.',
            'À quelques pas du village, chemin de Menton, un olivier d’environ mille ans, creux et cicatrisé, classé arbre remarquable, donne encore des olives chaque novembre. Le parcours s’achève au belvédère, au point le plus haut du village, avec Monaco en contrebas et la Méditerranée jusqu’à l’horizon.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'Le parcours publié mesure 3 km pour sept étapes, avec une montée continue du rivage au village, de l’ordre de deux cents mètres de dénivelé. Comptez une heure et demie à deux heures, davantage si vous entrez au château.',
            'Le site Cap Moderne (cabanon, villa E-1027 et guinguette de L’Étoile de Mer) se visite d’avril à octobre, uniquement en visite guidée de deux heures, sur réservation par courriel auprès du Centre des monuments nationaux, pour 18 € par adulte en 2026 ; le rendez-vous est donné à la gare de Roquebrune-Cap-Martin. Si vous souhaitez y entrer, réservez à l’avance et ajoutez ce temps.',
            'Le château de Roquebrune (5 € par adulte) est ouvert de 10 h 30 à 18 h 30 d’avril à octobre et de 10 h à 17 h le reste de l’année, avec une dernière entrée une demi-heure avant la fermeture ; il ferme le 1er mai, les 1er et 11 novembre, le 25 décembre et le 1er janvier. Le cimetière Saint-Pancrace, où repose Le Corbusier, ouvre tous les jours à partir de 8 h.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'Le sentier entre le rivage et le village est raide, parfois en marches irrégulières : chaussures de marche, eau, et un départ matinal en été. Le village lui-même est fait d’escaliers et de passages voûtés.',
            'Le parcours ne redescend pas : il se termine au sommet du village. Prévoyez le retour vers le rivage à pied ou en bus.',
            'Pour écouter sur place, apportez écouteurs, batterie et connexion Internet. Ce parcours n’est pas accessible aux poussettes ni aux personnes à mobilité réduite ; le site Cap Moderne lui-même exclut les poussettes et déconseille la visite aux jeunes enfants.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'La gare de Roquebrune-Cap-Martin, sur la ligne des TER entre Nice, Monaco et Menton, est le meilleur point d’accès : le cabanon est à une vingtaine de minutes à pied par la promenade Le Corbusier, en accès libre le long de la mer. Les bus Zest relient le village au bord de mer et à Menton, et la ligne 24 dessert la mairie depuis Monaco.',
            'En voiture, un parking se trouve à l’entrée du vieux village, un autre à la gare ; le village médiéval est entièrement piéton.',
          ],
        },
      ],
      stops: {
        title: 'Les sept étapes du parcours',
        items: [
          'Le cabanon de Le Corbusier',
          'La villa E-1027 d’Eileen Gray',
          'Le cimetière de Roquebrune et la tombe de Le Corbusier',
          'Le passage Moncollet, dans le village médiéval',
          'Le château carolingien',
          'L’olivier millénaire',
          'Le belvédère sur Monaco et la mer',
        ],
      },
      tour: {
        title: 'Écouter « Le Corbusier et la Mer »',
        body: 'La visite audio Murmure remonte le temps du cabanon de 1952 au château de l’an mil, en sept étapes sur 3 km. Écoutez un extrait et préparez la montée avant de partir.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 auprès du Centre des monuments nationaux et de la mairie :',
        links: [
          { label: 'Cap Moderne : cabanon et villa E-1027, réservation', href: SOURCES.capmoderne },
          { label: 'château de Roquebrune', href: SOURCES.chateau },
          { label: 'sentier Le Corbusier', href: SOURCES.sentier },
          { label: 'se déplacer à Roquebrune-Cap-Martin', href: SOURCES.deplacer },
          { label: 'liste des parkings', href: SOURCES.parkings },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite part de neuf mètres carrés de bois posés contre une falaise, le cabanon où Le Corbusier passait ses étés, et monte jusqu’au château de l’an mil qui domine Roquebrune. En chemin : la villa E-1027 d’Eileen Gray, la tombe que l’architecte a dessinée pour lui-même, le passage Moncollet, un olivier millénaire et le belvédère sur Monaco.',
          'Elle raconte le Modulor, une villa dont le nom est un message d’amour codé, des fresques peintes sans permission, un homme qui nageait seul chaque matin et n’est pas revenu, et un village qui garde toutes ses strates au lieu de choisir.',
          'Le parcours mesure 3 km, en montée du rivage au sommet du village, et pose à chaque étape la même question : qu’est-ce qu’habiter un lieu ?',
        ],
      },
    },
    en: {
      title: 'Visiting Roquebrune-Cap-Martin on foot: from Le Corbusier’s cabin to the castle of the year 1000',
      description: 'A walk in Roquebrune-Cap-Martin, from Le Corbusier’s cabin and Villa E-1027 to the medieval village, its castle and thousand-year-old olive tree. 3 km, tips.',
      label: 'Visiting Roquebrune on foot',
      lead: 'Between the shore and the hilltop village of Roquebrune lie two hundred metres of cliff and a thousand years of architecture: a nine-square-metre cabin designed by Le Corbusier, a modernist villa by Eileen Gray, a Carolingian castle and an olive tree that saw them all born.',
      sections: [
        {
          title: 'Where to start',
          paragraphs: [
            'The route begins at the water’s edge, in front of Le Corbusier’s cabin: a wooden rectangle 3.66 metres a side, set against the cliff in 1952 for his wife Yvonne’s sixtieth birthday. This is where the Murmure audio tour starts. The cabin and the neighbouring Villa E-1027 form the Cap Moderne site, which can only be visited on a guided tour booked in advance; the walk describes them from outside, from the coastal path.',
            'From the shore, a path climbs through the olive trees to the cemetery, then to the village. It is the hardest part of the route.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'Below the cabin, Eileen Gray’s Villa E-1027, built from 1926 to 1929, is one of the major works of modern architecture; Le Corbusier painted murals there without permission in 1938, and the story of that affront is one of the threads of the route. In the Roquebrune cemetery, the architect rests beside Yvonne under two limestone blocks he designed himself, fifty metres from the sea where he died swimming on 27 August 1965.',
            'The medieval village is explored through lanes cut into the rock, including the Moncollet passage, so narrow you walk in single file. Its castle, founded around 970 by Conrad I, Count of Ventimiglia, is presented as the oldest feudal castle in France still standing, with walls two metres thick.',
            'A few steps from the village, on Chemin de Menton, an olive tree around a thousand years old, hollow and scarred and listed as a remarkable tree, still gives olives every November. The route ends at the viewpoint, the highest point of the village, with Monaco below and the Mediterranean to the horizon.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'The published route is 3 km long with seven stops, climbing continuously from the shore to the village, around two hundred metres of ascent. Allow an hour and a half to two hours, more if you go into the castle.',
            'The Cap Moderne site (cabin, Villa E-1027 and the Étoile de Mer café) is open from April to October, only on two-hour guided tours booked by email with the Centre des monuments nationaux, for 18 € per adult in 2026; the meeting point is Roquebrune-Cap-Martin station. If you want to go in, book ahead and add that time.',
            'Roquebrune castle (5 € per adult) is open from 10.30 am to 6.30 pm from April to October and from 10 am to 5 pm the rest of the year, with last entry half an hour before closing; it closes on 1 May, 1 and 11 November, 25 December and 1 January. The Saint-Pancrace cemetery, where Le Corbusier rests, opens every day from 8 am.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'The path between the shore and the village is steep, sometimes on uneven steps: walking shoes, water, and an early start in summer. The village itself is made of staircases and vaulted passages.',
            'The route does not come back down: it ends at the top of the village. Plan your return to the shore on foot or by bus.',
            'To listen on site, bring headphones, battery and an internet connection. This route is not accessible to pushchairs or to people with reduced mobility; the Cap Moderne site itself excludes pushchairs and advises against the visit for young children.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'Roquebrune-Cap-Martin station, on the TER line between Nice, Monaco and Menton, is the best access point: the cabin is about twenty minutes’ walk along the Promenade Le Corbusier, freely accessible along the sea. Zest buses link the village to the seafront and to Menton, and line 24 serves the town hall from Monaco.',
            'By car, there is a car park at the entrance to the old village and another at the station; the medieval village is entirely pedestrian.',
          ],
        },
      ],
      stops: {
        title: 'The seven stops of the route',
        items: [
          'Le Corbusier’s cabin',
          'Eileen Gray’s Villa E-1027',
          'The Roquebrune cemetery and Le Corbusier’s grave',
          'The Moncollet passage, in the medieval village',
          'The Carolingian castle',
          'The thousand-year-old olive tree',
          'The viewpoint over Monaco and the sea',
        ],
      },
      tour: {
        title: 'Listen to “Le Corbusier and the Sea”',
        body: 'The Murmure audio tour travels back in time from the cabin of 1952 to the castle of the year 1000, in seven stops over 3 km. Listen to a preview and prepare for the climb before you leave.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 with the Centre des monuments nationaux and the town hall:',
        links: [
          { label: 'Cap Moderne: cabin and Villa E-1027, booking', href: SOURCES.capmoderne },
          { label: 'Roquebrune castle', href: SOURCES.chateau },
          { label: 'Le Corbusier path', href: SOURCES.sentier },
          { label: 'getting around Roquebrune-Cap-Martin', href: SOURCES.deplacer },
          { label: 'list of car parks', href: SOURCES.parkings },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour starts from nine square metres of wood set against a cliff, the cabin where Le Corbusier spent his summers, and climbs to the castle of the year 1000 that overlooks Roquebrune. On the way: Eileen Gray’s Villa E-1027, the grave the architect designed for himself, the Moncollet passage, a thousand-year-old olive tree and the viewpoint over Monaco.',
          'It tells of the Modulor, a villa whose name is a coded love message, murals painted without permission, a man who swam alone every morning and did not come back, and a village that keeps all its layers instead of choosing.',
          'The route is 3 km long, climbing from the shore to the top of the village, and asks the same question at every stop: what does it mean to inhabit a place?',
        ],
      },
    },
  },
};
