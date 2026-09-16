import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/menton-citron-frontiere` — huit étapes, 2 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur menton.fr et
 * zestbus.fr. Le bâtiment Wunderman du musée Cocteau est fermé depuis la
 * tempête de 2018 ; sa réouverture est annoncée sans date.
 */
const SOURCES = {
  cocteau: 'https://www.menton.fr/Cocteau-et-Wunderman-eternels-a-Menton.html',
  mariages: 'https://www.menton.fr/la-salle-des-mariages.html',
  basilique: 'https://www.menton.fr/la-basilique-saint-michel-archange.html',
  cimetiere: 'https://www.menton.fr/Cimetiere-du-Vieux-Chateau.html',
  citron: 'https://www.fete-du-citron.com/',
  navette: 'https://www.menton.fr/la-navette-100-electrique',
};

export const ARTICLE_MENTON: EditorialArticle = {
  slug: 'visiter-menton-a-pied',
  city: { slug: 'menton', name: 'Menton', country: 'FR' },
  tour: { slug: 'menton-le-citron-cocteau-et-la-frontiere', match: 'citron' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Menton à pied : Cocteau, le citron et la frontière',
      description: 'Balade à pied dans Menton, du musée Cocteau à la vieille ville et au pont Saint-Louis : étapes, salle des Mariages, basilique, durée et conseils pratiques.',
      label: 'Visiter Menton à pied',
      lead: 'Menton est une ville de lisière : italienne par ses façades et sa cuisine, française par décision politique depuis 1860. À pied, en deux kilomètres, on passe du bord de mer au vieux cimetière perché, puis jusqu’à la frontière elle-même.',
      sections: [
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le parcours part du musée Jean Cocteau – collection Séverin Wunderman, sur le bord de mer. Le bâtiment contemporain, inauguré en 2011, a été conçu pour la plus grande collection d’œuvres de Cocteau au monde : sept cents pièces offertes à la ville par un collectionneur qui n’a jamais vu le musée ouvert. La visite audio Murmure commence devant sa façade. Attention : ce bâtiment est fermé au public depuis la tempête de 2018, et sa réouverture, annoncée par la ville, n’a pas encore de date. Une partie de la collection se voit au musée du Bastion, sur le port, à deux pas.',
            'De là, on remonte le quai sur deux cents mètres vers l’Hôtel de Ville. C’est le seul moment où l’itinéraire demande d’entrer dans un bâtiment public : la salle des Mariages, que Cocteau a décorée lui-même en 1957, se demande à l’accueil.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'L’avenue Boyer et le jardin Biovès racontent l’empire du citron : un fruit qui ne gèle presque jamais ici, protégé par les Alpes et l’orientation plein sud, et qu’une Fête du Citron célèbre chaque hiver depuis 1929. Puis la montée vers la place Saint-Michel change de siècle : son dallage de galets noirs et blancs reprend les armoiries des Grimaldi, seigneurs de Menton pendant trois cents ans.',
            'La rue Longue est la colonne vertébrale de la vieille ville depuis le XIe siècle, étroite et haute pour garder l’ombre. La basilique Saint-Michel-Archange, construite entre 1640 et 1675, montre un baroque de marins et de marchands, avec ses trompe-l’œil peints et ses ex-voto.',
            'Le cimetière du Vieux-Château occupe les ruines de la forteresse des Grimaldi. Ses tombes sont écrites en français, en anglais, en russe, en allemand, en italien et parfois en mentonasque : Menton fut, de 1860 à 1930, la ville où l’Europe du Nord venait soigner ses poumons. Le parcours s’achève au pont Saint-Louis, sur la frontière franco-italienne.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'Le parcours publié mesure 2 km pour huit étapes, avec une montée sensible vers la place Saint-Michel puis vers le cimetière. Comptez une heure et demie environ, davantage si vous entrez dans la salle des Mariages, la basilique ou le musée du Bastion.',
            'La salle des Mariages se visite du lundi au vendredi, le matin et en début d’après-midi, pour 2 € (gratuit pour les moins de dix-huit ans) ; elle est fermée le week-end et les jours fériés. La basilique n’ouvre que quelques heures par jour, surtout l’après-midi en semaine et le samedi : vérifiez avant de venir. Le cimetière du Vieux-Château est ouvert tous les jours de 8 h à 19 h d’avril à octobre, et jusqu’à 17 h le reste de l’année.',
            'La dernière étape, au pont Saint-Louis, est à l’écart du centre, vers l’est, au bout de la baie de Garavan : prévoyez le retour, à pied ou par le bus, avant de partir.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'Les ruelles de la vieille ville montent par marches et rampes, à commencer par les rampes Saint-Michel, bâties entre 1753 et 1757 sous le parvis de la basilique : chaussures confortables, eau et un peu de souffle. En été, la rue Longue reste fraîche, mais la montée au cimetière se fait au soleil.',
            'Si vous venez pour la Fête du Citron, en février, sachez que le jardin Biovès est alors clôturé et payant, et la ville très fréquentée ; le reste de l’année, le jardin est libre d’accès. La prochaine édition se tient du 13 au 28 février 2027.',
            'Pour écouter sur place, apportez vos écouteurs et une batterie suffisante. Le parcours n’est pas sans marches : avec une poussette, contournez les rampes Saint-Michel par les rues basses, et sachez que la ville met en place une navette électrique gratuite dans le centre, en journée.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'La gare de Menton est desservie par les TER entre Nice, Monaco et Vintimille ; le musée Cocteau est à un quart d’heure de marche en descendant vers la mer. Les bus Zest relient le centre au pont Saint-Louis par la ligne 18, qui poursuit vers Monaco.',
            'En voiture, les parkings du centre (Hôtel-de-Ville, Saint-Roch, George-V, Sablettes) sont payants ; le cours René-Coty offre du stationnement gratuit. Le vieux Menton lui-même ne se traverse qu’à pied.',
          ],
        },
      ],
      stops: {
        title: 'Les huit étapes du parcours',
        items: [
          'Le musée Jean Cocteau – collection Séverin Wunderman',
          'La salle des Mariages de l’Hôtel de Ville',
          'Le jardin Biovès et l’avenue Boyer',
          'Le parvis et la place Saint-Michel',
          'La rue Longue',
          'La basilique Saint-Michel-Archange',
          'Le cimetière du Vieux-Château',
          'Le pont Saint-Louis, sur la frontière',
        ],
      },
      tour: {
        title: 'Écouter « Le Citron, Cocteau et la Frontière »',
        body: 'La visite audio Murmure relie le musée Cocteau, la salle des Mariages, la vieille ville et la frontière en huit étapes sur 2 km. Écoutez un extrait et consultez l’itinéraire avant de partir.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 sur le site de la ville de Menton :',
        links: [
          { label: 'musée Cocteau et collection Wunderman', href: SOURCES.cocteau },
          { label: 'salle des Mariages', href: SOURCES.mariages },
          { label: 'basilique Saint-Michel-Archange', href: SOURCES.basilique },
          { label: 'cimetière du Vieux-Château', href: SOURCES.cimetiere },
          { label: 'Fête du Citron', href: SOURCES.citron },
          { label: 'navette gratuite du centre-ville', href: SOURCES.navette },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite traverse Menton du bord de mer à la frontière italienne. Elle commence au musée Jean Cocteau, entre dans la salle des Mariages que le poète a peinte lui-même, longe l’avenue Boyer et son jardin d’agrumes, puis grimpe dans la vieille ville jusqu’à la basilique Saint-Michel et au cimetière du Vieux-Château.',
          'Elle raconte pourquoi le citron pousse ici et nulle part ailleurs en France, comment les Grimaldi ont laissé leurs armoiries sur le sol de la place Saint-Michel, et pourquoi tant d’Anglais, de Russes et d’Allemands sont venus mourir à Menton entre 1860 et 1930.',
          'Le parcours mesure 2 km et se termine au pont Saint-Louis, les pieds sur la ligne entre deux pays : le lieu qui explique, à lui seul, pourquoi Cocteau avait choisi cette ville.',
        ],
      },
    },
    en: {
      title: 'Visiting Menton on foot: Cocteau, lemons and the border',
      description: 'A walk through Menton, from the Cocteau museum to the old town and the Saint-Louis bridge: stops, the Wedding Hall, the basilica, timing and practical tips.',
      label: 'Visiting Menton on foot',
      lead: 'Menton is a border town: Italian in its façades and its cooking, French by political decision since 1860. On foot, in two kilometres, you go from the seafront to the old cemetery on the hill, and on to the border itself.',
      sections: [
        {
          title: 'Where to start',
          paragraphs: [
            'The route starts at the Jean Cocteau Museum – Séverin Wunderman Collection, on the seafront. The contemporary building, opened in 2011, was designed for the largest collection of Cocteau’s work in the world: seven hundred pieces given to the town by a collector who never saw the museum open. The Murmure audio tour begins in front of its façade. Note that this building has been closed to the public since the storm of 2018, and its reopening, announced by the town, has no date yet. Part of the collection can be seen at the Bastion museum, on the harbour, a short walk away.',
            'From there you walk two hundred metres along the quay to the Town Hall. It is the only point where the itinerary asks you to enter a public building: the Wedding Hall, which Cocteau decorated himself in 1957, is reached by asking at reception.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'Avenue Boyer and the Biovès garden tell the story of the lemon empire: a fruit that almost never freezes here, sheltered by the Alps and facing due south, celebrated every winter since 1929 by the Lemon Festival. Then the climb to Place Saint-Michel changes century: its black and white pebble paving reproduces the arms of the Grimaldi, lords of Menton for three hundred years.',
            'Rue Longue has been the backbone of the old town since the eleventh century, narrow and tall to keep the shade. The basilica of Saint-Michel-Archange, built between 1640 and 1675, shows a baroque of sailors and merchants, with painted trompe-l’œil and ex-votos.',
            'The Vieux-Château cemetery occupies the ruins of the Grimaldi fortress. Its gravestones are written in French, English, Russian, German, Italian and sometimes Mentonasque: from 1860 to 1930 Menton was the town where northern Europe came to nurse its lungs. The route ends at the Saint-Louis bridge, on the French-Italian border.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'The published route is 2 km long with eight stops, and climbs noticeably to Place Saint-Michel and then to the cemetery. Allow about an hour and a half, more if you go into the Wedding Hall, the basilica or the Bastion museum.',
            'The Wedding Hall is open Monday to Friday, in the morning and early afternoon, for 2 € (free under eighteen); it is closed at weekends and on public holidays. The basilica opens only a few hours a day, mostly weekday afternoons and Saturdays: check before coming. The Vieux-Château cemetery is open every day from 8 am to 7 pm from April to October, and until 5 pm the rest of the year.',
            'The last stop, at the Saint-Louis bridge, lies east of the centre at the far end of Garavan bay: plan your way back, on foot or by bus, before you set off.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'The lanes of the old town climb by steps and ramps, starting with the Saint-Michel ramps, built between 1753 and 1757 below the basilica forecourt: comfortable shoes, water and a little breath. In summer Rue Longue stays cool, but the climb to the cemetery is in full sun.',
            'If you come for the Lemon Festival in February, be aware that the Biovès garden is then fenced off and ticketed, and the town very busy; the rest of the year the garden is free to enter. The next edition runs from 13 to 28 February 2027.',
            'To listen on site, bring headphones and enough battery. The route is not step-free: with a pushchair, bypass the Saint-Michel ramps through the lower streets, and note that the town runs a free electric shuttle in the centre during the day.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'Menton station is served by TER trains between Nice, Monaco and Ventimiglia; the Cocteau museum is a quarter of an hour’s walk downhill towards the sea. Zest bus 18 links the centre to the Saint-Louis bridge and continues to Monaco.',
            'By car, the town-centre car parks (Hôtel-de-Ville, Saint-Roch, George-V, Sablettes) are paying; Cours René-Coty offers free parking. Old Menton itself can only be crossed on foot.',
          ],
        },
      ],
      stops: {
        title: 'The eight stops of the route',
        items: [
          'The Jean Cocteau Museum – Séverin Wunderman Collection',
          'The Wedding Hall of the Town Hall',
          'The Biovès garden and Avenue Boyer',
          'The forecourt and Place Saint-Michel',
          'Rue Longue',
          'The basilica of Saint-Michel-Archange',
          'The Vieux-Château cemetery',
          'The Saint-Louis bridge, on the border',
        ],
      },
      tour: {
        title: 'Listen to “Lemons, Cocteau and the Border”',
        body: 'The Murmure audio tour links the Cocteau museum, the Wedding Hall, the old town and the border in eight stops over 2 km. Listen to a preview and check the itinerary before you leave.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 on the town of Menton’s website:',
        links: [
          { label: 'Cocteau museum and Wunderman collection', href: SOURCES.cocteau },
          { label: 'Wedding Hall', href: SOURCES.mariages },
          { label: 'basilica of Saint-Michel-Archange', href: SOURCES.basilique },
          { label: 'Vieux-Château cemetery', href: SOURCES.cimetiere },
          { label: 'Lemon Festival', href: SOURCES.citron },
          { label: 'free town-centre shuttle', href: SOURCES.navette },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour crosses Menton from the seafront to the Italian border. It starts at the Jean Cocteau Museum, enters the Wedding Hall the poet painted himself, follows Avenue Boyer and its citrus garden, then climbs through the old town to the basilica of Saint-Michel and the Vieux-Château cemetery.',
          'It explains why lemons grow here and nowhere else in France, how the Grimaldi left their coat of arms on the paving of Place Saint-Michel, and why so many English, Russian and German visitors came to die in Menton between 1860 and 1930.',
          'The route is 2 km long and ends at the Saint-Louis bridge, with your feet on the line between two countries: the place that alone explains why Cocteau chose this town.',
        ],
      },
    },
  },
};
