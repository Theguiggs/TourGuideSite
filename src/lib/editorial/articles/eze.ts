import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/eze-nid-aigle` — huit étapes, 1,6 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur eze-tourisme.com,
 * ville-eze.fr, jardinexotique-eze.fr et usines-parfum.fragonard.com.
 */
const SOURCES = {
  tourisme: 'https://www.eze-tourisme.com/fr/infos-pratiques/acces-et-liaisons.html',
  jardin: 'https://jardinexotique-eze.fr/informations/',
  fragonard: 'https://usines-parfum.fragonard.com/en/factories/the-factory-laboratory-in-eze-village/',
};

export const ARTICLE_EZE: EditorialArticle = {
  slug: 'visiter-eze-a-pied',
  city: { slug: 'eze', name: 'Èze', country: 'FR' },
  tour: { slug: 'eze-le-vertige-du-nid-d-aigle', match: 'vertige' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Èze à pied : le village perché, étape par étape',
      description: 'Parcours à pied dans Èze, de la Poterne au jardin exotique et au sentier Nietzsche : étapes, durée, relief, conseils pratiques et visite audio.',
      label: 'Visiter Èze à pied',
      lead: 'Èze est un village médiéval accroché à un rocher, à plus de quatre cents mètres au-dessus de la Méditerranée. On le visite à pied, et seulement à pied. Voici comment préparer la montée, ce que l’on voit en chemin et combien de temps prévoir.',
      sections: [
        {
          title: 'Pourquoi Èze se visite à pied',
          paragraphs: [
            'La rue principale d’Èze n’est pas une rue : c’est un escalier. Des marches irrégulières taillées dans la roche, pavées de galets posés sur la tranche, montent vers le sommet. Cette « calade » offrait de l’adhérence aux ânes, seuls véhicules capables de grimper ici pendant des siècles. Aujourd’hui encore, les voitures restent en bas, sur la Moyenne Corniche.',
            'Le village est bâti sur le rocher lui-même : la roche sert souvent de mur aux maisons. Des passages voûtés, les « pontis », relient les ruelles sous les habitations. Rien de tout cela ne se voit depuis une route. La récompense vient au sommet, avec l’un des panoramas les plus vertigineux de la Côte d’Azur.',
          ],
        },
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le point de départ est la Poterne, l’unique entrée du village fortifié au Moyen Âge : une double porte flanquée de deux tours, que les comtes de Savoie ont fait bâtir au XIVe siècle. Elle est volontairement étroite et basse, pour qu’un seul homme à la fois puisse la franchir. La visite audio Murmure commence devant cette porte.',
            'Avant de la franchir, retournez-vous : la route sinueuse qui monte jusqu’ici est la Grande Corniche, ouverte par Napoléon sur le tracé de la voie romaine Julia Augusta.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'Après l’escalier de la rue principale, le parcours passe devant la chapelle des Pénitents Blancs, siège d’une confrérie laïque fondée sans doute au XIVe siècle, puis devant l’église Notre-Dame-de-l’Assomption, construite entre 1764 et 1778 après que Louis XIV eut fait raser la citadelle d’Èze, en 1706.',
            'Au sommet, à 427 mètres, le jardin exotique occupe les ruines de cette citadelle. Créé en 1949 par le botaniste Jean Gastaud, il rassemble agaves et cactus entre les derniers pans de muraille. Par temps clair, la vue porte de l’Estérel à la côte italienne, avec le cap Ferrat et la baie de Villefranche au premier plan.',
            'La descente longe le départ du sentier Nietzsche, le chemin escarpé qui relie le village à Èze-sur-Mer. Le philosophe le gravissait à partir de 1883 ; il écrira que « tout Zarathoustra » lui est venu là. Le parcours redescend ensuite vers la parfumerie Fragonard, maison fondée en 1926, et s’achève au belvédère de la Moyenne Corniche, d’où l’on voit le village entier posé sur son rocher.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'Le parcours publié mesure 1,6 km pour huit étapes. La distance est courte, mais presque tout se fait en montée ou en descente sur des marches. Comptez une heure à une heure et demie, selon votre rythme, les photos et les pauses.',
            'Le jardin exotique est payant (10 € par adulte, gratuit pour les moins de douze ans en septembre 2026) et ouvert toute l’année, de 9 h jusqu’à la fin d’après-midi en hiver et jusqu’en soirée en été : prévoyez une demi-heure de plus pour le parcourir. L’usine Fragonard propose une visite guidée gratuite, sans réservation, tous les jours de 9 h à 18 h, par départs d’une demi-heure. La chapelle des Pénitents Blancs ne se visite pas à l’intérieur : on la regarde depuis sa grille.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'Portez des chaussures fermées : les galets et les marches irrégulières se prêtent mal aux sandales. Emportez de l’eau. Historiquement, le village n’avait aucune source et vivait de citernes creusées dans la roche ; en été, la chaleur sur le rocher se fait sentir dès la fin de matinée, et le début de journée est plus agréable.',
            'Le sentier Nietzsche descend jusqu’à la mer sur 2,1 km et quatre cents mètres de dénivelé, avec des marches hautes : comptez trois quarts d’heure à la descente et une heure et demie à la montée. La visite audio n’en parcourt que le départ. Si vous voulez le descendre en entier, prévoyez de bonnes chaussures et un retour par le train ou le bus depuis Èze-sur-Mer.',
            'Pour écouter sur place, prévoyez vos écouteurs, une batterie suffisante et une connexion Internet. Le village n’est pas conçu pour les poussettes ni pour les personnes à mobilité réduite : les marches sont partout, et aucun itinéraire sans escalier n’est documenté par la commune.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'Depuis Nice ou Monaco, la ligne 82 des bus Lignes d’Azur dessert Èze village par la Moyenne Corniche ; la ligne 83 relie la plage de Beaulieu au village et au col d’Èze. En train, descendez à la gare d’Èze-sur-Mer, puis empruntez la navette « À Vos Èze » qui monte au village en une demi-heure environ, tous les jours, ou le sentier Nietzsche pour les plus sportifs.',
            'En voiture, le parking Général-de-Gaulle, à l’entrée du village, est payant et ouvert en continu. Les ruelles elles-mêmes sont piétonnes.',
          ],
        },
      ],
      stops: {
        title: 'Les huit étapes du parcours',
        items: [
          'La Poterne, entrée fortifiée du village',
          'La rue principale et ses marches en calade',
          'La chapelle des Pénitents Blancs',
          'L’église Notre-Dame-de-l’Assomption',
          'Le jardin exotique, sur les ruines de la citadelle',
          'Le départ du sentier Nietzsche',
          'La parfumerie Fragonard',
          'Le belvédère de la Moyenne Corniche',
        ],
      },
      tour: {
        title: 'Écouter « Le Vertige du Nid d’Aigle »',
        body: 'La visite audio Murmure est racontée par Isabelle Moretti, historienne niçoise : huit étapes sur 1,6 km, de la Poterne au belvédère de la Moyenne Corniche. Écoutez un extrait, vérifiez les langues disponibles et lancez la première étape devant la porte du village.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 auprès des sites officiels :',
        links: [
          { label: 'accès et liaisons, office de tourisme d’Èze', href: SOURCES.tourisme },
          { label: 'jardin exotique d’Èze, horaires et tarifs', href: SOURCES.jardin },
          { label: 'usine Fragonard d’Èze, visite gratuite', href: SOURCES.fragonard },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite raconte Èze depuis sa porte fortifiée jusqu’au belvédère qui domine le village. Elle suit la montée des ruelles, s’arrête à la chapelle des Pénitents Blancs et à l’église Notre-Dame-de-l’Assomption, et atteint le jardin exotique bâti sur les ruines de la citadelle rasée en 1706.',
          'En chemin, elle croise quatre mille ans d’occupation du rocher, les convois d’eau à dos d’âne, la confrérie qui accompagnait les condamnés, Nietzsche gravissant son sentier, et les sept millions de fleurs de jasmin qu’il faut pour un kilo d’absolue.',
          'Le parcours mesure 1,6 km, presque entièrement en marches. Il se termine face au village, à l’endroit d’où l’on comprend qu’à Èze, les maisons ne sont pas posées sur la montagne : elles sont la montagne.',
        ],
      },
    },
    en: {
      title: 'Visiting Èze on foot: the hilltop village, stop by stop',
      description: 'A walking route through Èze, from the Poterne gate to the exotic garden and the Nietzsche path: stops, timing, terrain, practical tips and an audio tour.',
      label: 'Visiting Èze on foot',
      lead: 'Èze is a medieval village clinging to a rock more than four hundred metres above the Mediterranean. You visit it on foot, and only on foot. Here is how to prepare for the climb, what you will see on the way and how much time to allow.',
      sections: [
        {
          title: 'Why Èze is a walking village',
          paragraphs: [
            'The main street of Èze is not a street: it is a staircase. Uneven steps cut into the rock, paved with pebbles set on edge, climb towards the summit. This “calade” gave grip to the donkeys, the only vehicles able to climb here for centuries. Cars still stay below, on the Moyenne Corniche.',
            'The village is built on the rock itself, which often serves as the wall of a house. Vaulted passages, the “pontis”, link the lanes beneath the buildings. None of this can be seen from a road. The reward comes at the top, with one of the most dizzying panoramas on the French Riviera.',
          ],
        },
        {
          title: 'Where to start',
          paragraphs: [
            'The starting point is the Poterne, the only entrance to the fortified village in the Middle Ages: a double gate flanked by two towers, built by the Counts of Savoy in the fourteenth century. It is deliberately narrow and low, so that only one man at a time could pass. The Murmure audio tour begins in front of this gate.',
            'Before you go through, turn around: the winding road that brought you here is the Grande Corniche, opened by Napoleon along the line of the Roman Via Julia Augusta.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'After the staircase of the main street, the route passes the Chapel of the White Penitents, home of a lay brotherhood probably founded in the fourteenth century, then the church of Notre-Dame-de-l’Assomption, built between 1764 and 1778 after Louis XIV had the citadel of Èze razed in 1706.',
            'At the top, 427 metres up, the exotic garden occupies the ruins of that citadel. Created in 1949 by the botanist Jean Gastaud, it gathers agaves and cacti between the last fragments of rampart. On a clear day the view stretches from the Estérel to the Italian coast, with Cap Ferrat and the bay of Villefranche in the foreground.',
            'The way down passes the start of the Nietzsche path, the steep trail linking the village to Èze-sur-Mer. The philosopher climbed it from 1883 onwards and later wrote that “all of Zarathustra” came to him there. The route then descends to the Fragonard perfumery, a house founded in 1926, and ends at the Moyenne Corniche viewpoint, from which you see the whole village perched on its rock.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'The published route is 1.6 km long with eight stops. The distance is short, but almost all of it is uphill or downhill on steps. Allow one hour to an hour and a half, depending on your pace, photos and breaks.',
            'The exotic garden charges admission (10 € per adult, free under twelve as of September 2026) and is open all year, from 9 am until late afternoon in winter and into the evening in summer: allow an extra half hour to walk through it. The Fragonard factory offers a free guided visit, no booking needed, every day from 9 am to 6 pm with departures every half hour. The Chapel of the White Penitents cannot be visited inside: you look at it through its gate.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'Wear closed shoes: pebbles and uneven steps are unkind to sandals. Bring water. Historically the village had no spring and lived on cisterns cut into the rock; in summer the heat on the rock builds from late morning, and early in the day is more pleasant.',
            'The Nietzsche path drops to the sea over 2.1 km and four hundred metres of descent, with high steps: allow three quarters of an hour down and an hour and a half up. The audio tour only covers its start. If you want to walk it all the way down, plan good shoes and a return by train or bus from Èze-sur-Mer.',
            'To listen on site, bring headphones, enough battery and an internet connection. The village is not designed for pushchairs or reduced mobility: there are steps everywhere, and the town documents no step-free route.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'From Nice or Monaco, Lignes d’Azur bus 82 serves Èze village along the Moyenne Corniche; bus 83 links Beaulieu beach to the village and the Col d’Èze. By train, get off at Èze-sur-Mer station, then take the “À Vos Èze” shuttle, which climbs to the village in about half an hour every day, or the Nietzsche path if you are feeling energetic.',
            'By car, the Général-de-Gaulle car park at the entrance to the village is paying and open around the clock. The lanes themselves are pedestrian only.',
          ],
        },
      ],
      stops: {
        title: 'The eight stops of the route',
        items: [
          'The Poterne, the fortified gate of the village',
          'The main street and its cobbled steps',
          'The Chapel of the White Penitents',
          'The church of Notre-Dame-de-l’Assomption',
          'The exotic garden, on the ruins of the citadel',
          'The start of the Nietzsche path',
          'The Fragonard perfumery',
          'The Moyenne Corniche viewpoint',
        ],
      },
      tour: {
        title: 'Listen to “The Eagle’s Nest”',
        body: 'The Murmure audio tour is narrated by Isabelle Moretti, a historian from Nice: eight stops over 1.6 km, from the Poterne to the Moyenne Corniche viewpoint. Listen to a preview, check the available languages and start the first stop in front of the village gate.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 on the official websites:',
        links: [
          { label: 'access and transport, Èze tourist office', href: SOURCES.tourisme },
          { label: 'Èze exotic garden, hours and prices', href: SOURCES.jardin },
          { label: 'Fragonard factory in Èze, free tour', href: SOURCES.fragonard },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour tells the story of Èze from its fortified gate to the viewpoint above the village. It follows the climb through the lanes, stops at the Chapel of the White Penitents and the church of Notre-Dame-de-l’Assomption, and reaches the exotic garden built on the ruins of the citadel razed in 1706.',
          'Along the way it meets four thousand years of life on the rock, water carried up by donkey, the brotherhood that accompanied the condemned, Nietzsche climbing his path, and the seven million jasmine flowers needed for one kilo of absolute.',
          'The route is 1.6 km long, almost entirely on steps. It ends facing the village, at the spot where you understand that in Èze the houses are not set on the mountain: they are the mountain.',
        ],
      },
    },
  },
};
