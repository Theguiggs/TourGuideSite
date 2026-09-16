import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/crimes-scandales-riviera` — dix étapes, 3,2 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur nice.fr,
 * explorenicecotedazur.com et lignesdazur.com.
 */
const SOURCES = {
  lascaris: 'https://www.explorenicecotedazur.com/en/culture/palais-lascaris/',
  chateau: 'https://www.nice.fr/lieux/parc-de-la-colline-du-chateau/',
  saleya: 'https://www.explorenicecotedazur.com/en/culture/cours-saleya/',
  patrimoine: 'https://www.nice.fr/lieux/centre-du-patrimoine-le-senat/',
  tram: 'https://www.lignesdazur.com/',
};

export const ARTICLE_NICE_CRIMES: EditorialArticle = {
  slug: 'visiter-nice-a-pied-crimes-et-scandales',
  city: { slug: 'nice', name: 'Nice', country: 'FR' },
  tour: { slug: 'crimes-scandales-de-la-riviera', match: 'crimes' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Nice à pied autrement : crimes et scandales de la Riviera',
      description: 'Un parcours à pied dans Nice, du jardin Albert-Ier au Negresco par le Vieux-Nice, la colline du Château et le port : dix étapes, 3,2 km, durée et conseils.',
      label: 'Visiter Nice à pied : crimes et scandales',
      lead: 'Nice se visite d’habitude pour sa lumière. Ce parcours la prend par l’envers : un incendie suspect à l’Opéra, des empoisonneuses au palais Lascaris, des espions sur la colline du Château et un sous-marin de contrebande dans le port. Dix étapes, 3,2 km, et une ville que l’on ne regarde plus pareil.',
      sections: [
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le parcours part du jardin Albert-Ier, inauguré en 1852 entre la promenade des Anglais et la place Masséna. C’est un point de départ facile à rejoindre à pied ou en tramway, et la visite audio Murmure y commence par un « briefing » avant d’entrer dans la vieille ville.',
            'La boucle revient sur la promenade des Anglais : le point d’arrivée est à quelques minutes du départ.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'L’Opéra de Nice, inauguré en 1885, est le second du nom : le premier a brûlé en 1881 pendant une représentation, faisant soixante-trois victimes et une loi sur les sorties de secours. Le cours Saleya et son marché aux fleurs, le palais Lascaris, demeure baroque du XVIIe siècle, et la place Rossetti forment le cœur du Vieux-Nice.',
            'La colline du Château, à quatre-vingt-douze mètres, offre le panorama sur la baie des Anges ; sous vos pieds, des tunnels que la Belle Époque a prêtés aux espions. La descente mène au port Lympia, creusé au XVIIIe siècle, puis à la place Garibaldi, la plus belle place piémontaise de la ville, où le héros de l’unité italienne est né en 1807.',
            'Le retour vers l’ouest passe devant le Negresco, sa coupole rose et son lustre de Baccarat commandé par le tsar Nicolas II, avant de retrouver la promenade des Anglais pour le verdict.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'Le parcours publié mesure 3,2 km pour dix étapes. Le Vieux-Nice est plat ; la colline du Château se monte à pied par les escaliers Lesage ou par l’ascenseur public gratuit, au bout du quai des États-Unis, et se redescend vers le port. Comptez une heure et demie à deux heures.',
            'Le parc de la colline du Château est ouvert de 8 h 30 à 20 h d’avril à septembre, et jusqu’à 18 h d’octobre à mars ; le jardin Albert-Ier suit les mêmes horaires. Le palais Lascaris se visite pour 5 € (gratuit pour les moins de dix-huit ans), tous les jours sauf le mardi, de 10 h à 18 h ; le parcours le regarde de l’extérieur, mais l’intérieur mérite une demi-heure. L’Opéra ne s’ouvre qu’aux spectacles et aux visites guidées du Centre du patrimoine ; le Negresco reste réservé à ses clients.',
            'Le marché du cours Saleya se tient le matin du mardi au dimanche ; le lundi, il laisse place aux antiquaires et aux brocanteurs jusqu’en fin d’après-midi. Choisissez votre jour selon ce que vous voulez voir.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'Chaussures confortables pour la montée au Château et les pavés du Vieux-Nice. Eau et chapeau en été : la colline est exposée.',
            'Dans les ruelles du cours Saleya et de la place Rossetti, l’affluence est forte en fin de journée : le matin est plus calme pour écouter. Les pavés du Vieux-Nice ne sont pas commodes en fauteuil, mais l’ascenseur de la colline du Château est accessible et gratuit, ce qui évite les escaliers à la montée.',
            'Pour écouter sur place, prévoyez vos écouteurs, une batterie suffisante et une connexion Internet : la boucle dure près de deux heures.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'Le tramway est le plus simple : ligne 1, arrêt Masséna, à deux pas du jardin Albert-Ier, ou arrêt Opéra – Vieille Ville ; la ligne 2 dessert le port Lympia, utile pour abréger la boucle. La gare de Nice-Ville est à un quart d’heure à pied de la place Masséna par l’avenue Jean-Médecin.',
            'En voiture, garez-vous dans un parking du centre ou du port et laissez la voiture pour la journée : le Vieux-Nice est piéton et la promenade des Anglais très surveillée.',
          ],
        },
      ],
      stops: {
        title: 'Les dix étapes du parcours',
        items: [
          'Le jardin Albert-Ier',
          'L’Opéra de Nice',
          'Le cours Saleya',
          'Le palais Lascaris',
          'La place Rossetti',
          'La colline du Château',
          'Le port Lympia',
          'La place Garibaldi',
          'L’hôtel Negresco',
          'La promenade des Anglais',
        ],
      },
      tour: {
        title: 'Écouter « Crimes & Scandales de la Riviera »',
        body: 'La visite audio Murmure est menée par Victor Lemaire, ancien commissaire de police de Nice : dix étapes sur 3,2 km, du jardin Albert-Ier à la promenade des Anglais. Écoutez un extrait avant de partir.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 auprès de la ville de Nice, de l’office de tourisme et de Lignes d’Azur :',
        links: [
          { label: 'palais Lascaris', href: SOURCES.lascaris },
          { label: 'colline du Château, horaires du parc', href: SOURCES.chateau },
          { label: 'marchés du cours Saleya', href: SOURCES.saleya },
          { label: 'visites guidées du Centre du patrimoine', href: SOURCES.patrimoine },
          { label: 'tramway et bus Lignes d’Azur', href: SOURCES.tram },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite parcourt le Vieux-Nice, la colline du Château et le port avec un ancien commissaire pour guide. Elle part du jardin Albert-Ier, passe par l’Opéra, le cours Saleya, le palais Lascaris et la place Rossetti, monte au Château, redescend au port Lympia et à la place Garibaldi, puis revient par le Negresco jusqu’à la promenade des Anglais.',
          'Chaque étape raconte une affaire : l’incendie de l’Opéra en 1881, la guerre des fleurs de 1952, les poisons de la noblesse savoyarde, l’espion Redl à la Belle Époque, le sous-marin de contrebande de 1972 et le braquage raté du Negresco en 1989.',
          'Le parcours mesure 3,2 km et se termine là où il a commencé, face à la mer, avec un verdict sur la Côte d’Azur.',
        ],
      },
    },
    en: {
      title: 'Visiting Nice on foot, differently: crimes and scandals of the Riviera',
      description: 'A walking route through Nice, from the Albert I garden to the Negresco via old Nice, Castle Hill and the harbour: ten stops, 3.2 km, timing and practical tips.',
      label: 'Visiting Nice on foot: crimes and scandals',
      lead: 'Nice is usually visited for its light. This route takes it from the other side: a suspicious fire at the Opera, poisoners in the Lascaris palace, spies on Castle Hill and a smugglers’ submarine in the harbour. Ten stops, 3.2 km, and a city you will never look at the same way again.',
      sections: [
        {
          title: 'Where to start',
          paragraphs: [
            'The route starts in the Albert I garden, opened in 1852 between the Promenade des Anglais and Place Masséna. It is easy to reach on foot or by tram, and the Murmure audio tour begins there with a “briefing” before entering the old town.',
            'The loop returns to the Promenade des Anglais: the finishing point is a few minutes from the start.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'The Nice Opera, opened in 1885, is the second of its name: the first burned down in 1881 during a performance, leaving sixty-three dead and a law on emergency exits. Cours Saleya and its flower market, the Lascaris palace, a seventeenth-century baroque residence, and Place Rossetti form the heart of old Nice.',
            'Castle Hill, ninety-two metres up, gives the panorama over the Baie des Anges; beneath your feet run tunnels that the Belle Époque lent to spies. The descent leads to Port Lympia, dug in the eighteenth century, then to Place Garibaldi, the finest Piedmontese square in the city, where the hero of Italian unification was born in 1807.',
            'The way back west passes the Negresco, its pink dome and its Baccarat chandelier ordered by Tsar Nicholas II, before returning to the Promenade des Anglais for the verdict.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'The published route is 3.2 km long with ten stops. Old Nice is flat; Castle Hill is climbed on foot by the Lesage stairs or by the free public lift at the end of Quai des États-Unis, and descended towards the harbour. Allow an hour and a half to two hours.',
            'The Castle Hill park is open from 8.30 am to 8 pm from April to September, and until 6 pm from October to March; the Albert I garden keeps the same hours. The Lascaris palace can be visited for 5 € (free under eighteen), every day except Tuesday, from 10 am to 6 pm; the route views it from outside, but the interior deserves half an hour. The Opera opens only for performances and for guided visits run by the city’s heritage centre; the Negresco remains reserved for its guests.',
            'The Cours Saleya market runs in the morning from Tuesday to Sunday; on Mondays it gives way to antique and bric-a-brac dealers until late afternoon. Choose your day according to what you want to see.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'Comfortable shoes for the climb to the Castle and the cobbles of old Nice. Water and a hat in summer: the hill is exposed.',
            'The lanes around Cours Saleya and Place Rossetti get crowded late in the day: the morning is quieter for listening. The cobbles of old Nice are awkward for wheelchairs, but the Castle Hill lift is accessible and free, which avoids the stairs on the way up.',
            'To listen on site, bring your headphones, enough battery and an internet connection: the loop takes nearly two hours.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'The tram is the simplest option: line 1, Masséna stop, a short walk from the Albert I garden, or the Opéra – Vieille Ville stop; line 2 serves Port Lympia, handy for shortening the loop. Nice-Ville station is a quarter of an hour’s walk from Place Masséna along Avenue Jean-Médecin.',
            'By car, park in a city-centre or harbour car park and leave the car for the day: old Nice is pedestrian and the Promenade des Anglais closely policed.',
          ],
        },
      ],
      stops: {
        title: 'The ten stops of the route',
        items: [
          'The Albert I garden',
          'The Nice Opera',
          'Cours Saleya',
          'The Lascaris palace',
          'Place Rossetti',
          'Castle Hill',
          'Port Lympia',
          'Place Garibaldi',
          'The Hôtel Negresco',
          'The Promenade des Anglais',
        ],
      },
      tour: {
        title: 'Listen to “Crimes & Scandals of the Riviera”',
        body: 'The Murmure audio tour is led by Victor Lemaire, a former Nice police commissioner: ten stops over 3.2 km, from the Albert I garden to the Promenade des Anglais. Listen to a preview before you set off.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 with the city of Nice, the tourist office and Lignes d’Azur:',
        links: [
          { label: 'Lascaris palace', href: SOURCES.lascaris },
          { label: 'Castle Hill, park opening hours', href: SOURCES.chateau },
          { label: 'Cours Saleya markets', href: SOURCES.saleya },
          { label: 'guided visits by the heritage centre', href: SOURCES.patrimoine },
          { label: 'Lignes d’Azur trams and buses', href: SOURCES.tram },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour loops through old Nice, Castle Hill and the harbour with a former police commissioner as your guide. It starts in the Albert I garden, passes the Opera, Cours Saleya, the Lascaris palace and Place Rossetti, climbs to the Castle, comes down to Port Lympia and Place Garibaldi, then returns past the Negresco to the Promenade des Anglais.',
          'Each stop tells a case: the Opera fire of 1881, the flower war of 1952, the poisons of the Savoyard nobility, the spy Redl in the Belle Époque, the smugglers’ submarine of 1972 and the failed Negresco robbery of 1989.',
          'The route is 3.2 km long and ends where it began, facing the sea, with a verdict on the Riviera.',
        ],
      },
    },
  },
};
