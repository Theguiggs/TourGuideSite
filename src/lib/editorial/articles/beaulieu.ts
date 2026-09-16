import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/beaulieu-villa-kerylos` — sept étapes, 1,8 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur villakerylos.fr,
 * ville.beaulieusurmer.fr et destination.beaulieusurmer.fr.
 */
const SOURCES = {
  kerylos: 'https://www.villakerylos.fr/billetterie/',
  marches: 'https://ville.beaulieusurmer.fr/vivre-a-beaulieu/commerces/marches/',
  venir: 'https://destination.beaulieusurmer.fr/en/pratical-informations/come-to-beaulieu/',
  stationnement: 'https://ville.beaulieusurmer.fr/vivre-a-beaulieu/cadre-de-vie/stationnement/',
};

export const ARTICLE_BEAULIEU: EditorialArticle = {
  slug: 'visiter-beaulieu-sur-mer-a-pied',
  city: { slug: 'beaulieu-sur-mer', name: 'Beaulieu-sur-Mer', country: 'FR' },
  tour: { slug: 'beaulieu-sur-mer-villa-kerylos-la-grece-revee', match: 'kerylos' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Beaulieu-sur-Mer à pied : la villa Kérylos et la Belle Époque',
      description: 'Balade à pied à Beaulieu-sur-Mer, de la promenade Maurice-Rouvier à la villa Kérylos, la vieille ville et la baie des Fourmis : sept étapes, 1,8 km, conseils.',
      label: 'Visiter Beaulieu à pied',
      lead: 'Beaulieu-sur-Mer est une petite station de la Belle Époque au microclimat réputé, où un helléniste a rebâti une maison grecque antique face à la mer. Ce parcours court relie la promenade du bord de mer, la villa Kérylos, le village et la baie des Fourmis.',
      sections: [
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le parcours commence sur la promenade Maurice-Rouvier, qui longe la mer sous les palmiers et les lauriers roses. Beaulieu revendique, avec Menton, le meilleur microclimat de France : les Alpes bloquent les vents froids, la mer rend sa chaleur. La reine Victoria y séjournait au Grand Hôtel jusqu’en 1899. La visite audio Murmure commence sur cette promenade.',
            'La villa Kérylos apparaît au détour du chemin, blanche et colonnaire, sur la pointe des Fourmis. Trois des sept étapes se déroulent à l’intérieur : renseignez-vous sur ses horaires et son billet avant de venir.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'La villa Kérylos a été construite de 1902 à 1908 par l’architecte Emmanuel Pontremoli pour Théodore Reinach, helléniste, numismate et député, qui parlait le grec ancien et voulait habiter l’Antiquité plutôt que la lire. L’atrium et sa mosaïque au dauphin, la bibliothèque de deux mille volumes aux rayonnages de citronnier, puis les jardins en terrasses plantés de cyprès, de lauriers et d’oliviers, forment le cœur de la visite.',
            'La vieille ville de Beaulieu, où Reinach faisait ses courses, ramène au quotidien : ruelles, façades ocre, fontaine, marché. L’église du Sacré-Cœur, bâtie entre 1899 et 1903 et payée en partie par les hivernants russes, anglais et allemands, dit ce que fut la station à son apogée.',
            'Le parcours se termine au bord de la baie des Fourmis, avec la vue d’ensemble : le cap Ferrat à l’ouest, et sur son rocher, les colonnes blanches de Kérylos.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'Le parcours publié mesure 1,8 km pour sept étapes, sans dénivelé notable. La marche seule prend moins d’une heure ; la visite intérieure de la villa Kérylos demande une heure et demie à deux heures en visite libre. Comptez deux heures et demie à trois heures en tout.',
            'La villa Kérylos (15 € par adulte en 2026, tarif réduit 10 €) est ouverte tous les jours de 10 h à 17 h d’octobre à mars et de 10 h à 18 h d’avril à septembre, avec des nocturnes en été ; elle ferme le 1er janvier, le 1er mai, les 1er et 11 novembre et le 25 décembre. Des visites guidées sont proposées à heures fixes, avec un supplément.',
            'Le marché de Beaulieu se tient place du Général-de-Gaulle, dite place Marinoni, du lundi au samedi matin, avec un marché provençal le samedi et un marché italien le premier dimanche du mois. L’église du Sacré-Cœur est ouverte en journée en semaine.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'C’est l’un des parcours les plus faciles de la Côte d’Azur : promenade plate, distances courtes. Prévoyez tout de même de l’eau et un chapeau, la promenade est ensoleillée. La baie des Fourmis est une plage de gravier, en accès libre, avec douches et sanitaires en saison.',
            'À la villa Kérylos, le rez-de-chaussée est accessible par une rampe ; l’étage se gagne par un escalier d’une trentaine de marches avec paliers, et les jardins sont en gravier. Sans visite intérieure, la balade reste cohérente mais plus courte.',
            'Pour écouter sur place, apportez écouteurs et batterie. La promenade Maurice-Rouvier et la vieille ville conviennent aux poussettes.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'La gare de Beaulieu-sur-Mer, à dix minutes de train de Nice et onze de Monaco, est à sept minutes à pied de la villa Kérylos : c’est le moyen le plus simple de venir. Les bus Lignes d’Azur 15, 83 et 84 et les cars ZOU 600 et 601 entre Nice et Menton s’arrêtent aussi dans le centre.',
            'En voiture, le stationnement du centre est payant en journée du lundi au samedi ; une zone bleue gratuite de deux heures existe boulevard Marinoni, et le parking de la gare est ouvert en continu.',
          ],
        },
      ],
      stops: {
        title: 'Les sept étapes du parcours',
        items: [
          'La promenade Maurice-Rouvier',
          'La villa Kérylos : entrée et atrium',
          'La bibliothèque de la villa',
          'Les jardins et la terrasse sur la mer',
          'La vieille ville de Beaulieu',
          'L’église du Sacré-Cœur',
          'La baie des Fourmis',
        ],
      },
      tour: {
        title: 'Écouter « Villa Kérylos, la Grèce rêvée »',
        body: 'La visite audio Murmure raconte l’homme qui a reconstruit la Grèce antique pierre par pierre : sept étapes sur 1,8 km, de la promenade Maurice-Rouvier à la baie des Fourmis. Écoutez un extrait et vérifiez les horaires de la villa avant de partir.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 auprès de la villa, de la mairie et de l’office de tourisme :',
        links: [
          { label: 'villa Kérylos, billetterie et horaires', href: SOURCES.kerylos },
          { label: 'marchés de Beaulieu', href: SOURCES.marches },
          { label: 'venir à Beaulieu', href: SOURCES.venir },
          { label: 'stationnement', href: SOURCES.stationnement },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite tourne autour d’une obsession : celle de Théodore Reinach, qui a fait bâtir à Beaulieu, entre 1902 et 1908, une villa grecque antique où il dormait, lisait Platon et nageait chaque matin. Elle part de la promenade Maurice-Rouvier, entre dans la villa Kérylos, puis remonte vers la vieille ville, l’église du Sacré-Cœur et la baie des Fourmis.',
          'Elle raconte la Belle Époque des princes russes et de la reine Victoria, l’architecte Pontremoli qui refusait de faire semblant, la bibliothèque de citronnier, la famille Reinach et l’affaire Dreyfus, et la question que pose la villa : qu’est-ce qu’habiter un rêve ?',
          'Le parcours mesure 1,8 km, plat, et se termine face à la baie, avec les colonnes blanches de Kérylos en point de fuite.',
        ],
      },
    },
    en: {
      title: 'Visiting Beaulieu-sur-Mer on foot: Villa Kérylos and the Belle Époque',
      description: 'A walk in Beaulieu-sur-Mer, from Promenade Maurice-Rouvier to Villa Kérylos, the old town and the Baie des Fourmis: seven stops, 1.8 km, timing and practical tips.',
      label: 'Visiting Beaulieu on foot',
      lead: 'Beaulieu-sur-Mer is a small Belle Époque resort with a famous microclimate, where a Hellenist rebuilt an ancient Greek house facing the sea. This short route links the seafront promenade, Villa Kérylos, the village and the Baie des Fourmis.',
      sections: [
        {
          title: 'Where to start',
          paragraphs: [
            'The route begins on Promenade Maurice-Rouvier, which runs along the sea beneath palms and oleanders. Beaulieu claims, along with Menton, the best microclimate in France: the Alps block the cold winds, the sea gives back its warmth. Queen Victoria stayed at the Grand Hôtel until 1899. The Murmure audio tour starts on this promenade.',
            'Villa Kérylos appears around a bend, white and colonnaded, on the Fourmis point. Three of the seven stops take place inside: check its opening hours and tickets before coming.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'Villa Kérylos was built from 1902 to 1908 by the architect Emmanuel Pontremoli for Théodore Reinach, a Hellenist, numismatist and member of parliament who spoke ancient Greek and wanted to live in Antiquity rather than read about it. The atrium with its dolphin mosaic, the library of two thousand volumes on lemonwood shelves, then the terraced gardens planted with cypress, laurel and olive, form the heart of the visit.',
            'The old town of Beaulieu, where Reinach did his shopping, brings you back to everyday life: lanes, ochre façades, a fountain, a market. The church of the Sacré-Cœur, built between 1899 and 1903 and partly paid for by Russian, English and German winter residents, says what the resort was at its height.',
            'The route ends at the edge of the Baie des Fourmis, with the overall view: Cap Ferrat to the west and, on its rock, the white columns of Kérylos.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'The published route is 1.8 km long with seven stops and no notable climb. The walk alone takes less than an hour; the indoor visit of Villa Kérylos takes an hour and a half to two hours at your own pace. Allow two and a half to three hours in all.',
            'Villa Kérylos (15 € per adult in 2026, reduced rate 10 €) is open daily from 10 am to 5 pm from October to March and from 10 am to 6 pm from April to September, with late openings in summer; it closes on 1 January, 1 May, 1 and 11 November and 25 December. Guided visits run at fixed times for a supplement.',
            'The Beaulieu market is held on Place du Général-de-Gaulle, known as Place Marinoni, Monday to Saturday mornings, with a Provençal market on Saturdays and an Italian market on the first Sunday of the month. The church of the Sacré-Cœur is open during the day on weekdays.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'This is one of the easiest routes on the Riviera: a flat promenade, short distances. Still bring water and a hat, the promenade is sunny. The Baie des Fourmis is a free gravel beach, with showers and toilets in season.',
            'At Villa Kérylos the ground floor is reached by a ramp; the upper floor by a staircase of about thirty steps with landings, and the gardens are gravelled. Without the indoor visit the walk still makes sense, but is shorter.',
            'To listen on site, bring headphones and battery. Promenade Maurice-Rouvier and the old town suit pushchairs.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'Beaulieu-sur-Mer station, ten minutes by train from Nice and eleven from Monaco, is a seven-minute walk from Villa Kérylos: it is the simplest way to come. Lignes d’Azur buses 15, 83 and 84 and ZOU coaches 600 and 601 between Nice and Menton also stop in the centre.',
            'By car, town-centre parking is paying during the day from Monday to Saturday; a free two-hour blue zone exists on Boulevard Marinoni, and the station car park is open around the clock.',
          ],
        },
      ],
      stops: {
        title: 'The seven stops of the route',
        items: [
          'Promenade Maurice-Rouvier',
          'Villa Kérylos: entrance and atrium',
          'The villa’s library',
          'The gardens and the sea terrace',
          'The old town of Beaulieu',
          'The church of the Sacré-Cœur',
          'The Baie des Fourmis',
        ],
      },
      tour: {
        title: 'Listen to “Villa Kérylos, a Dream of Greece”',
        body: 'The Murmure audio tour tells of the man who rebuilt ancient Greece stone by stone: seven stops over 1.8 km, from Promenade Maurice-Rouvier to the Baie des Fourmis. Listen to a preview and check the villa’s opening hours before you leave.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 with the villa, the town hall and the tourist office:',
        links: [
          { label: 'Villa Kérylos, tickets and hours', href: SOURCES.kerylos },
          { label: 'Beaulieu markets', href: SOURCES.marches },
          { label: 'getting to Beaulieu', href: SOURCES.venir },
          { label: 'parking', href: SOURCES.stationnement },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour revolves around an obsession: that of Théodore Reinach, who had an ancient Greek villa built in Beaulieu between 1902 and 1908, where he slept, read Plato and swam every morning. It starts on Promenade Maurice-Rouvier, enters Villa Kérylos, then climbs to the old town, the church of the Sacré-Cœur and the Baie des Fourmis.',
          'It tells of the Belle Époque of Russian princes and Queen Victoria, the architect Pontremoli who refused to pretend, the lemonwood library, the Reinach family and the Dreyfus affair, and the question the villa asks: what does it mean to live inside a dream?',
          'The route is 1.8 km long, flat, and ends facing the bay, with the white columns of Kérylos as its vanishing point.',
        ],
      },
    },
  },
};
