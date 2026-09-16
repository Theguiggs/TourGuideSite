import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/antibes-ete-picasso` — huit étapes, 2,5 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur
 * antibesjuanlespins.com (office de tourisme et ville).
 */
const SOURCES = {
  picasso: 'https://www.antibesjuanlespins.com/a-voir-a-faire/culture-patrimoine-art-urbain/les-musees/le-musee-picasso-2031894',
  fort: 'https://www.antibesjuanlespins.com/a-voir-a-faire/culture-patrimoine-art-urbain/le-patrimoine/le-fort-carre-2032216',
  marches: 'https://www.antibesjuanlespins.com/en/must-see-must-do/the-markets',
  acces: 'https://www.antibesjuanlespins.com/en/pratiqual-information/move/bus-trains-bikes-taxis',
};

export const ARTICLE_ANTIBES: EditorialArticle = {
  slug: 'visiter-antibes-a-pied',
  city: { slug: 'antibes', name: 'Antibes', country: 'FR' },
  tour: { slug: 'antibes-l-ete-de-picasso', match: 'picasso' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Antibes à pied : sur les pas de Picasso, des remparts au Fort Carré',
      description: 'Balade à pied dans le vieil Antibes : remparts, musée Picasso, cathédrale, marché provençal, rue Sade, Fort Carré et port Vauban. Étapes, durée et conseils.',
      label: 'Visiter Antibes à pied',
      lead: 'À l’automne 1946, Picasso a peint pendant soixante-neuf jours dans le château Grimaldi, face à la mer. Ce parcours suit sa ville : les remparts, le musée qui porte son nom, le marché où il achetait ses sardines à vélo, et le fort où Napoléon a passé deux semaines en prison.',
      sections: [
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le parcours part des remparts d’Antibes, au bord de l’eau. Antipolis, « la ville d’en face », a été fondée par les Grecs de Marseille au IVe siècle avant notre ère, face à la future Nice. Vauban a redessiné ces murs pour Louis XIV, quand Antibes était encore la dernière ville française avant la Savoie. La visite audio Murmure commence sur les remparts.',
            'Le château Grimaldi, devenu musée Picasso, est à deux minutes. Les étapes qui s’y déroulent supposent d’entrer dans le musée : vérifiez ses horaires avant de venir.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'Au musée Picasso, le parcours s’arrête devant La Joie de vivre, peinte en 1946 sur du fibrociment avec de la peinture de bâtiment, faute de toiles dans l’Europe d’après-guerre. Le peintre a laissé au musée municipal vingt-trois peintures et quarante-quatre dessins : l’un des premiers musées au monde à porter le nom d’un artiste vivant.',
            'Juste en face, la cathédrale Notre-Dame-de-la-Platea est bâtie sur un temple grec, un temple romain et une église romane ; son retable de Louis Bréa a traversé toutes les guerres. Le cours Masséna accueille l’un des plus anciens marchés de la Côte, puis la rue Sade traverse le vieil Antibes et ses façades d’enduit coloré, ocre, terracotta et jaune sable, héritées de Gênes.',
            'Le parcours longe ensuite le port vers le nord jusqu’au Fort Carré, étoile à quatre bastions bâtie vers 1550, où un jeune officier corse nommé Buonaparte a été détenu deux semaines en août 1794. Il s’achève au port Vauban, fondé par les Grecs et devenu le plus grand port de plaisance d’Europe pour les grandes unités.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'Le parcours publié mesure 2,5 km pour huit étapes, sans dénivelé important : le vieil Antibes est plat, et la marche vers le Fort Carré suit le port, par un sentier d’un peu moins d’un kilomètre. Comptez une heure et demie, plus le temps passé dans le musée Picasso, qui peut facilement en prendre une de plus.',
            'Le musée Picasso (12 € par adulte en 2026) est fermé le lundi, sauf du 15 juin au 15 septembre où il ouvre tous les jours ; hors été, il ferme entre 13 h et 14 h. Le Fort Carré se visite pour 5 €, tous les jours sauf le lundi et les jours fériés, jusqu’à 17 h hors juillet-août ; la balade le contemple de l’extérieur. La cathédrale n’affiche pas d’horaires garantis : entrez si elle est ouverte.',
            'Le marché provençal du cours Masséna se tient le matin, tous les jours en juin, juillet et août, et tous les jours sauf le lundi le reste de l’année : partez avant 13 h si vous voulez le voir vivant.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'Le vieil Antibes se parcourt sans difficulté à pied ; le tronçon vers le Fort Carré est plus exposé au soleil et au vent. Prévoyez de l’eau et un chapeau en été.',
            'Le musée Picasso est accessible aux personnes à mobilité réduite ; l’intérieur du Fort Carré, avec ses escaliers, ne l’est pas. La promenade des remparts, l’amiral-de-Grasse, est entièrement accessible et piétonne. Ce parcours est l’un des plus faciles de la Côte d’Azur : peu de marches, sauf à l’entrée de certains bâtiments.',
            'Pour écouter sur place, apportez écouteurs et batterie ; les remparts sont ventés, des écouteurs intra-auriculaires aident.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'La gare d’Antibes est à deux kilomètres du vieil Antibes, soit vingt minutes à pied le long du port, ou quelques minutes avec la navette électrique gratuite du réseau Envibus qui dessert la vieille ville tous les jours.',
            'En voiture, le parking du Pré-aux-Pêcheurs, au pied des remparts, est le plus proche du départ ; il est payant. Le Fort Carré dispose d’un parking gratuit, à dix ou quinze minutes de marche de l’entrée du fort.',
          ],
        },
      ],
      stops: {
        title: 'Les huit étapes du parcours',
        items: [
          'Les remparts d’Antibes',
          'Le château Grimaldi, musée Picasso',
          'La Joie de vivre, dans le musée',
          'La cathédrale Notre-Dame-de-la-Platea',
          'Le cours Masséna et son marché provençal',
          'La rue Sade, dans le vieil Antibes',
          'Le Fort Carré',
          'Le port Vauban',
        ],
      },
      tour: {
        title: 'Écouter « L’Été de Picasso »',
        body: 'La visite audio Murmure suit Picasso dans Antibes en huit étapes sur 2,5 km, des remparts au port Vauban. Écoutez un extrait, consultez l’itinéraire et vérifiez les horaires du musée avant de partir.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 auprès de la ville et de l’office de tourisme d’Antibes Juan-les-Pins :',
        links: [
          { label: 'musée Picasso, horaires et tarifs', href: SOURCES.picasso },
          { label: 'Fort Carré', href: SOURCES.fort },
          { label: 'les marchés d’Antibes', href: SOURCES.marches },
          { label: 'venir et se déplacer', href: SOURCES.acces },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite raconte l’automne 1946, quand Picasso, à soixante-cinq ans, a reçu les clés du château Grimaldi et y a peint La Joie de vivre sur du fibrociment. Elle part des remparts, entre dans le musée, passe par la cathédrale, le marché du cours Masséna et la rue Sade, puis longe le port jusqu’au Fort Carré et au port Vauban.',
          'Elle croise en chemin les Grecs qui ont fondé Antipolis, Vauban qui a redessiné les murs, Napoléon prisonnier deux semaines au Fort Carré, et un peintre qui payait parfois ses additions en dessinant sur les nappes.',
          'Le parcours mesure 2,5 km, presque plat, et se termine face à la mer, sur la même ligne d’horizon que regardaient les galères grecques il y a deux mille cinq cents ans.',
        ],
      },
    },
    en: {
      title: 'Visiting Antibes on foot: in Picasso’s footsteps, from the ramparts to Fort Carré',
      description: 'A walk through old Antibes: ramparts, Picasso museum, cathedral, Provençal market, Rue Sade, Fort Carré and Port Vauban. Stops, timing and practical tips.',
      label: 'Visiting Antibes on foot',
      lead: 'In the autumn of 1946, Picasso painted for sixty-nine days in the Château Grimaldi, facing the sea. This route follows his town: the ramparts, the museum that bears his name, the market where he cycled to buy sardines, and the fort where Napoleon spent two weeks in prison.',
      sections: [
        {
          title: 'Where to start',
          paragraphs: [
            'The route starts on the ramparts of Antibes, at the water’s edge. Antipolis, “the town opposite”, was founded by the Greeks of Marseille in the fourth century BC, facing the future Nice. Vauban redesigned these walls for Louis XIV, when Antibes was still the last French town before Savoy. The Murmure audio tour begins on the ramparts.',
            'The Château Grimaldi, now the Picasso museum, is two minutes away. The stops that take place there assume you go into the museum: check its opening hours before coming.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'In the Picasso museum, the route pauses in front of La Joie de vivre, painted in 1946 on fibre cement with house paint, for lack of canvas in post-war Europe. The painter left the municipal museum twenty-three paintings and forty-four drawings: one of the first museums in the world to bear the name of a living artist.',
            'Just opposite, the cathedral of Notre-Dame-de-la-Platea stands on a Greek temple, a Roman temple and a Romanesque church; its altarpiece by Louis Bréa has survived every war. Cours Masséna hosts one of the oldest markets on the coast, then Rue Sade crosses old Antibes and its coloured render, ochre, terracotta and sand yellow, inherited from Genoa.',
            'The route then follows the harbour north to Fort Carré, a four-bastioned star built around 1550, where a young Corsican officer named Buonaparte was held for two weeks in August 1794. It ends at Port Vauban, founded by the Greeks and now the largest marina in Europe for large yachts.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'The published route is 2.5 km long with eight stops and no significant climb: old Antibes is flat, and the walk to Fort Carré follows the harbour along a path just under a kilometre long. Allow an hour and a half, plus the time spent in the Picasso museum, which can easily take another hour.',
            'The Picasso museum (12 € per adult in 2026) is closed on Mondays, except from 15 June to 15 September when it opens daily; outside summer it closes between 1 pm and 2 pm. Fort Carré can be visited for 5 €, every day except Mondays and public holidays, until 5 pm outside July and August; the walk views it from outside. The cathedral publishes no guaranteed hours: go in if it is open.',
            'The Provençal market on Cours Masséna runs in the morning, every day in June, July and August, and every day except Monday the rest of the year: leave before 1 pm if you want to see it alive.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'Old Antibes is easy on foot; the stretch to Fort Carré is more exposed to sun and wind. Bring water and a hat in summer.',
            'The Picasso museum is accessible to people with reduced mobility; the inside of Fort Carré, with its stairs, is not. The rampart walk, Promenade Amiral-de-Grasse, is fully accessible and pedestrian. This route is one of the easiest on the Riviera: few steps, except at the entrance to some buildings.',
            'To listen on site, bring headphones and battery; the ramparts are windy, so in-ear headphones help.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'Antibes station is two kilometres from old Antibes, a twenty-minute walk along the harbour, or a few minutes on the free electric shuttle of the Envibus network, which serves the old town every day.',
            'By car, the Pré-aux-Pêcheurs car park at the foot of the ramparts is the closest to the start; it is paying. Fort Carré has a free car park, ten to fifteen minutes’ walk from the fort entrance.',
          ],
        },
      ],
      stops: {
        title: 'The eight stops of the route',
        items: [
          'The ramparts of Antibes',
          'The Château Grimaldi, Picasso museum',
          'La Joie de vivre, inside the museum',
          'The cathedral of Notre-Dame-de-la-Platea',
          'Cours Masséna and its Provençal market',
          'Rue Sade, in old Antibes',
          'Fort Carré',
          'Port Vauban',
        ],
      },
      tour: {
        title: 'Listen to “Picasso’s Summer”',
        body: 'The Murmure audio tour follows Picasso through Antibes in eight stops over 2.5 km, from the ramparts to Port Vauban. Listen to a preview, check the itinerary and the museum’s opening hours before you leave.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 with the town and tourist office of Antibes Juan-les-Pins:',
        links: [
          { label: 'Picasso museum, hours and prices', href: SOURCES.picasso },
          { label: 'Fort Carré', href: SOURCES.fort },
          { label: 'the markets of Antibes', href: SOURCES.marches },
          { label: 'getting there and around', href: SOURCES.acces },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour tells the story of autumn 1946, when Picasso, aged sixty-five, was given the keys to the Château Grimaldi and painted La Joie de vivre there on fibre cement. It starts on the ramparts, enters the museum, passes the cathedral, the Cours Masséna market and Rue Sade, then follows the harbour to Fort Carré and Port Vauban.',
          'Along the way it meets the Greeks who founded Antipolis, Vauban who redesigned the walls, Napoleon imprisoned for two weeks in Fort Carré, and a painter who sometimes paid his bills by drawing on the tablecloth.',
          'The route is 2.5 km long, almost flat, and ends facing the sea, on the same horizon the Greek galleys watched two and a half thousand years ago.',
        ],
      },
    },
  },
};
