import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/monaco-dynastie-demesure` — huit étapes, 3 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur visitmonaco.com,
 * palais.mc, musee.oceano.org et gouv.mc.
 */
const SOURCES = {
  palais: 'https://www.palais.mc/fr/visites-du-palais-vente-des-places-en-ligne-1-31.html',
  oceano: 'https://musee.oceano.org/en/practical-info/',
  jardin: 'https://www.visitmonaco.com/profiter/parcs-et-jardins/jardin-japonais',
  casino: 'https://www.visitmonaco.com/en/explore/activities/casinos-in-monaco/casino-de-monte-carlo',
  apied: 'https://www.visitmonaco.com/en/plan-your-stay/access-and-transport/getting-around/visit-monaco-city-walk',
  bus: 'https://www.visitmonaco.com/en/plan-your-stay/access-and-transport/getting-around/travelling-by-bus',
};

export const ARTICLE_MONACO: EditorialArticle = {
  slug: 'visiter-monaco-a-pied',
  city: { slug: 'monaco', name: 'Monaco', country: 'MC' },
  tour: { slug: 'monaco-dynastie-casino-et-demesure', match: 'dynastie' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Monaco à pied : du Rocher à Monte-Carlo, étape par étape',
      description: 'Parcours à pied dans Monaco, du palais princier au casino de Monte-Carlo et à la plage du Larvotto : huit étapes, 3 km, durée, dénivelé et conseils pratiques.',
      label: 'Visiter Monaco à pied',
      lead: 'Monaco tient sur deux kilomètres carrés, mais entre le Rocher et Monte-Carlo, il y a des falaises, des escaliers et sept siècles d’histoire. Voici comment traverser la principauté à pied, en huit étapes et trois kilomètres.',
      sections: [
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le parcours commence place du Palais, sur le Rocher, devant la résidence des Grimaldi. C’est ici que tout a débuté un soir de janvier 1297, quand François Grimaldi, déguisé en moine franciscain, s’est fait ouvrir la forteresse génoise. Les deux moines armés des armoiries, au-dessus de l’entrée, en gardent le souvenir. La visite audio Murmure démarre devant le palais.',
            'Les ruelles pavées du Rocher datent du XIVe siècle : évitez les talons. La cathédrale et le Musée océanographique sont à quelques minutes de marche.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'La cathédrale Notre-Dame-Immaculée, bâtie en 1875 en pierres blanches de La Turbie, abrite la tombe de la princesse Grace, dans le déambulatoire, aux côtés de celle du prince Rainier III. Un peu plus loin, le Musée océanographique, inauguré en 1910 par le prince Albert Ier, s’accroche à la falaise à quatre-vingt-cinq mètres au-dessus de la mer ; Jacques-Yves Cousteau l’a dirigé pendant trente et un ans.',
            'La descente vers le port Hercule mène sur le tracé du Grand Prix, couru ici depuis 1929 : les rues et le tunnel que l’on emprunte à pied deviennent un circuit chaque année. La montée vers Monte-Carlo aboutit devant le casino dessiné par Charles Garnier et l’Hôtel de Paris, ouvert le 1er janvier 1864, avec sa statue équestre de Louis XIV au genou poli par les joueurs superstitieux.',
            'Le parcours s’apaise ensuite au jardin japonais, créé en 1994 selon un souhait de la princesse Grace, et s’achève sur la plage du Larvotto, seule plage publique de la principauté, réaménagée en 2021 face à la réserve marine créée en 1976.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'Le parcours publié mesure 3 km pour huit étapes. Le Rocher se descend en une dizaine de minutes ; la remontée du port vers le casino demande un quart d’heure en côte, ou moins avec les ascenseurs publics. Comptez une heure et demie à deux heures, davantage si vous entrez dans la cathédrale ou le Musée océanographique.',
            'La cathédrale est en accès libre en dehors des offices, épaules couvertes. Les Grands Appartements du palais se visitent de la fin mars à la mi-octobre ; la relève de la garde a lieu chaque jour à 11 h 55 sur la place. Le Musée océanographique est ouvert tous les jours (22,50 € par adulte en 2026), sauf le 25 décembre et le week-end du Grand Prix. Le jardin japonais est gratuit, ouvert de 9 h à 18 h en hiver et jusqu’à 19 h d’avril à octobre.',
            'Le parcours ne revient pas au point de départ : il se termine au Larvotto, à l’est. Prévoyez votre retour vers le Rocher ou la gare.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'Monaco se visite en montées et descentes, mais la principauté compte près de quatre-vingts ascenseurs publics gratuits, des escalators et des tapis roulants qui relient le Rocher, le port et les quartiers hauts : repérez-les, ils épargnent bien des marches. Chaussures confortables et eau restent de mise entre le port et Monte-Carlo.',
            'Le casino et l’Hôtel de Paris se regardent de l’extérieur dans ce parcours ; le casino se visite le matin, avant l’ouverture des jeux, avec un billet payant, une tenue correcte et dix-huit ans révolus. Pendant le week-end du Grand Prix, fin mai ou début juin selon l’année (du 4 au 7 juin en 2026), les rues du port sont fermées par les tribunes : préférez une autre date.',
            'Pour écouter sur place, apportez écouteurs, batterie et connexion Internet. Le parcours n’est pas garanti sans marches, mais les ascenseurs publics permettent d’en éviter l’essentiel.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'La gare de Monaco–Monte-Carlo, desservie par les TER entre Nice et Vintimille, est creusée dans le rocher ; des ascenseurs mènent à la surface, et le Rocher est à une vingtaine de minutes à pied ou par les bus 1 et 2 de la Compagnie des autobus de Monaco, qui relient Monaco-Ville au port et à Monte-Carlo.',
            'En voiture, les parkings publics sont nombreux mais souterrains et payants ; le parking des Pêcheurs, sous le Rocher, est le plus proche du départ. Le Rocher lui-même est fermé à la circulation des visiteurs.',
          ],
        },
      ],
      stops: {
        title: 'Les huit étapes du parcours',
        items: [
          'La place du Palais, sur le Rocher',
          'La cathédrale Notre-Dame-Immaculée',
          'Le Musée océanographique',
          'Le port Hercule et le circuit du Grand Prix',
          'Le casino de Monte-Carlo',
          'L’Hôtel de Paris',
          'Le jardin japonais',
          'La plage du Larvotto',
        ],
      },
      tour: {
        title: 'Écouter « Dynastie, Casino et Démesure »',
        body: 'La visite audio Murmure est racontée par Elena Castellano, historienne monégasque née sur le Rocher : huit étapes sur 3 km, du palais princier à la plage du Larvotto. Écoutez un extrait avant de partir.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 auprès des sites officiels :',
        links: [
          { label: 'visite du palais princier', href: SOURCES.palais },
          { label: 'Musée océanographique, informations pratiques', href: SOURCES.oceano },
          { label: 'jardin japonais', href: SOURCES.jardin },
          { label: 'casino de Monte-Carlo', href: SOURCES.casino },
          { label: 'se déplacer à pied : ascenseurs publics', href: SOURCES.apied },
          { label: 'bus de la principauté', href: SOURCES.bus },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite traverse Monaco d’ouest en est, du Rocher des Grimaldi à la plage du Larvotto. Elle passe par la cathédrale où repose la princesse Grace, le Musée océanographique de Cousteau, le port Hercule et son circuit de Formule 1, le casino de Monte-Carlo, l’Hôtel de Paris et le jardin japonais.',
          'Elle raconte la ruse de 1297 qui a fondé la dynastie, la faillite évitée grâce au jeu en 1863, les trente mille bouteilles murées dans la cave de l’Hôtel de Paris pendant la guerre, et ce que les Monégasques eux-mêmes n’ont pas le droit de faire au casino.',
          'Le parcours mesure 3 km, avec une descente depuis le Rocher et une montée vers Monte-Carlo. Il se termine face à la mer, à l’endroit où la principauté cesse d’être une carte postale.',
        ],
      },
    },
    en: {
      title: 'Visiting Monaco on foot: from the Rock to Monte-Carlo, stop by stop',
      description: 'A walking route through Monaco, from the Prince’s Palace to the Monte-Carlo casino and Larvotto beach: eight stops, 3 km, timing, climbs and practical tips.',
      label: 'Visiting Monaco on foot',
      lead: 'Monaco fits into two square kilometres, but between the Rock and Monte-Carlo there are cliffs, staircases and seven centuries of history. Here is how to cross the principality on foot, in eight stops and three kilometres.',
      sections: [
        {
          title: 'Where to start',
          paragraphs: [
            'The route begins on the Palace Square, on the Rock, in front of the Grimaldi residence. This is where everything started one evening in January 1297, when François Grimaldi, disguised as a Franciscan monk, had the Genoese fortress opened to him. The two armed monks on the coat of arms above the entrance keep the memory alive. The Murmure audio tour starts in front of the palace.',
            'The cobbled lanes of the Rock date from the fourteenth century: avoid heels. The cathedral and the Oceanographic Museum are a few minutes’ walk away.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'The cathedral of Notre-Dame-Immaculée, built in 1875 in white stone from La Turbie, holds the tomb of Princess Grace in the ambulatory, beside that of Prince Rainier III. A little further on, the Oceanographic Museum, opened in 1910 by Prince Albert I, clings to the cliff eighty-five metres above the sea; Jacques-Yves Cousteau directed it for thirty-one years.',
            'The descent to Port Hercule follows the Grand Prix circuit, raced here since 1929: the streets and the tunnel you walk through become a racetrack every year. The climb to Monte-Carlo ends in front of the casino designed by Charles Garnier and the Hôtel de Paris, opened on 1 January 1864, with its equestrian statue of Louis XIV whose knee has been polished by superstitious gamblers.',
            'The route then calms down in the Japanese garden, created in 1994 at the wish of Princess Grace, and ends on Larvotto beach, the only public beach in the principality, redeveloped in 2021 facing the marine reserve created in 1976.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'The published route is 3 km long with eight stops. The Rock takes about ten minutes to descend; the climb from the port to the casino is a quarter of an hour uphill, or less using the public lifts. Allow an hour and a half to two hours, more if you go into the cathedral or the Oceanographic Museum.',
            'The cathedral is free to enter outside services, shoulders covered. The State Apartments of the palace are open from late March to mid-October; the changing of the guard takes place every day at 11.55 am on the square. The Oceanographic Museum is open daily (22.50 € per adult in 2026), except on 25 December and over the Grand Prix weekend. The Japanese garden is free, open from 9 am to 6 pm in winter and until 7 pm from April to October.',
            'The route does not return to its starting point: it ends at Larvotto, to the east. Plan your way back to the Rock or the station.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'Monaco is visited uphill and downhill, but the principality has nearly eighty free public lifts, escalators and moving walkways linking the Rock, the port and the upper districts: look out for them, they save a lot of steps. Comfortable shoes and water are still advisable between the port and Monte-Carlo.',
            'The casino and the Hôtel de Paris are seen from outside on this route; the casino can be visited in the morning, before gaming opens, with a paid ticket, smart dress and a minimum age of eighteen. Over the Grand Prix weekend, in late May or early June depending on the year (4 to 7 June in 2026), the streets around the port are closed off by grandstands: choose another date.',
            'To listen on site, bring headphones, battery and an internet connection. The route is not guaranteed step-free, but the public lifts let you avoid most of the steps.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'Monaco–Monte-Carlo station, served by TER trains between Nice and Ventimiglia, is cut into the rock; lifts take you to the surface, and the Rock is about twenty minutes on foot or by buses 1 and 2 of the Monaco bus company, which link Monaco-Ville to the port and Monte-Carlo.',
            'By car, public car parks are plentiful but underground and paying; the Pêcheurs car park, beneath the Rock, is the closest to the start. The Rock itself is closed to visitor traffic.',
          ],
        },
      ],
      stops: {
        title: 'The eight stops of the route',
        items: [
          'The Palace Square, on the Rock',
          'The cathedral of Notre-Dame-Immaculée',
          'The Oceanographic Museum',
          'Port Hercule and the Grand Prix circuit',
          'The Monte-Carlo casino',
          'The Hôtel de Paris',
          'The Japanese garden',
          'Larvotto beach',
        ],
      },
      tour: {
        title: 'Listen to “Dynasty, Casino and Excess”',
        body: 'The Murmure audio tour is narrated by Elena Castellano, a Monegasque historian born on the Rock: eight stops over 3 km, from the Prince’s Palace to Larvotto beach. Listen to a preview before you set off.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 on the official websites:',
        links: [
          { label: 'visiting the Prince’s Palace', href: SOURCES.palais },
          { label: 'Oceanographic Museum, practical information', href: SOURCES.oceano },
          { label: 'Japanese garden', href: SOURCES.jardin },
          { label: 'Casino de Monte-Carlo', href: SOURCES.casino },
          { label: 'getting around on foot: public lifts', href: SOURCES.apied },
          { label: 'buses in the principality', href: SOURCES.bus },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour crosses Monaco from west to east, from the Grimaldi Rock to Larvotto beach. It passes the cathedral where Princess Grace rests, Cousteau’s Oceanographic Museum, Port Hercule and its Formula 1 circuit, the Monte-Carlo casino, the Hôtel de Paris and the Japanese garden.',
          'It tells of the trick of 1297 that founded the dynasty, the bankruptcy avoided thanks to gambling in 1863, the thirty thousand bottles walled up in the cellar of the Hôtel de Paris during the war, and what the Monegasques themselves are not allowed to do in the casino.',
          'The route is 3 km long, with a descent from the Rock and a climb to Monte-Carlo. It ends facing the sea, at the point where the principality stops being a postcard.',
        ],
      },
    },
  },
};
