import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/cannes-derriere-la-palme` — huit étapes, 2,2 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur cannes.com,
 * cannes-france.com et festival-cannes.com.
 */
const SOURCES = {
  musee: 'https://www.cannes.com/fr/culture/musees-et-expositions/musee-des-explorations-du-monde.html',
  forville: 'https://www.cannes.com/fr/mairie/annuaire-pratique/equipements-municipaux/marche-provencal-forville.html',
  etoiles: 'https://www.cannes.com/fr/culture/cannes-et-le-cinema/cannes-aux-couleurs-du-7e-art/le-chemin-des-etoiles.html',
  parkings: 'https://www.cannes.com/fr/cadre-de-vie/stationnement-ou-se-garer-a-cannes/stationnez-dans-les-parkings.html',
  festival: 'https://www.festival-cannes.com/',
};

export const ARTICLE_CANNES: EditorialArticle = {
  slug: 'visiter-cannes-a-pied',
  city: { slug: 'cannes', name: 'Cannes', country: 'FR' },
  tour: { slug: 'cannes-derriere-la-palme', match: 'palme' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Cannes à pied : la Croisette, le marché Forville et le Suquet',
      description: 'Parcours à pied dans Cannes, du Palais des Festivals aux palaces de la Croisette, puis au marché Forville et au Suquet : huit étapes, 2,2 km, durée et conseils.',
      label: 'Visiter Cannes à pied',
      lead: 'Cannes, ce sont deux villes superposées : celle des vingt-quatre marches et des palaces, et celle du marché et de la colline du Suquet, qui regardait la mer mille ans avant le cinéma. Ce parcours les traverse toutes les deux en 2,2 km.',
      sections: [
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le parcours commence devant le Palais des Festivals, que les Cannois appellent le Bunker : un bloc de béton livré en 1983, et les vingt-quatre marches que trente mille personnes gravissent chaque année pendant les douze jours du Festival. Hors événement, ces marches sont librement accessibles. La visite audio Murmure démarre à leur pied.',
            'Le Chemin des Étoiles, au pied du Palais et sur l’esplanade Pompidou, garde dans le béton quelque quatre cent cinquante empreintes de mains laissées depuis 1981, en accès libre à toute heure. Regardez le sol avant de partir vers l’est.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'La Croisette aligne trois palaces que le parcours regarde de l’extérieur : le Carlton, ouvert en 1913 avec ses deux coupoles, où Hitchcock a tourné La Main au collet en 1955 ; le Majestic, de 1926, dont les suites accueillent le Marché du Film ; et le Martinez, né en 1929, l’une des plus belles façades Art déco de la Côte d’Azur.',
            'Deux rues derrière, le marché Forville est celui des habitants depuis l’ouverture de la halle en 1934 : poisson du port, herbes, tomates, et des prix qui ne changent pas pendant le Festival. La montée qui suit mène au Suquet, le vieux Cannes, colline de pêcheurs habitée depuis le Moyen Âge.',
            'Au sommet, la tour du château de la Castre, élevée en 1370 par les moines de l’abbaye de Lérins, abrite le musée des Explorations du monde. De là-haut, la Croisette se lit comme un plan, et les îles de Lérins ferment l’horizon : Sainte-Marguerite et la prison du Masque de fer, Saint-Honorat et son abbaye.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'Le parcours publié mesure 2,2 km pour huit étapes. La Croisette est plate ; la montée au Suquet est courte mais raide, par des escaliers. Comptez une heure et quart à une heure et demie, davantage si vous entrez au musée ou montez à la tour, qui compte cent neuf marches et n’accueille que quinze personnes à la fois.',
            'Le musée des Explorations du monde (6,50 € par adulte, gratuit pour les moins de dix-huit ans) est fermé le lundi, sauf en juillet et août ; il ferme aussi entre 13 h et 14 h hors été. Attention : il est fermé pour travaux du 14 septembre au 30 octobre 2026.',
            'Le marché Forville ouvre de 7 h à 13 h, du mardi au dimanche de septembre à juin, et tous les jours en juillet et août ; le lundi, la halle accueille une brocante de 8 h à 16 h. Partez tôt si vous voulez le voir en activité.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'Chaussures confortables pour les escaliers du Suquet, eau et chapeau en été sur la Croisette, qui offre peu d’ombre. Le parcours n’est pas garanti sans marches : la colline se gravit à pied, et la ville ne documente pas d’itinéraire en pente douce, seulement une navette pour les personnes à mobilité réduite.',
            'Pendant le Festival de Cannes, dont la prochaine édition se tient du 11 au 22 mai 2027, les marches et les abords du Palais sont fermés au public et la Croisette très fréquentée : préférez une autre période pour la balade.',
            'Pour écouter sur place, apportez écouteurs, batterie et connexion Internet.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'La gare de Cannes est à cinq minutes à pied du Palais des Festivals, en descendant vers la mer. Les bus Palm Bus desservent la Croisette et le port ; les navettes pour les îles de Lérins partent du quai Laubeuf, à l’ouest du Palais.',
            'En voiture, le parking du Palais des Festivals se trouve sous le point de départ, et le parking Forville à côté du marché ; tous deux sont payants.',
          ],
        },
      ],
      stops: {
        title: 'Les huit étapes du parcours',
        items: [
          'Le Palais des Festivals et ses vingt-quatre marches',
          'Le Chemin des Étoiles',
          'Le Carlton',
          'Le Majestic',
          'Le Martinez',
          'Le marché Forville',
          'Le Suquet, la vieille ville',
          'La tour du Suquet et le musée des Explorations du monde',
        ],
      },
      tour: {
        title: 'Écouter « Derrière la Palme »',
        body: 'La visite audio Murmure raconte ce que le Festival ne filme pas, en huit étapes sur 2,2 km, des marches du Palais à la tour du Suquet. Écoutez un extrait et consultez l’itinéraire avant de partir.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 sur le site de la ville de Cannes et du Festival :',
        links: [
          { label: 'musée des Explorations du monde', href: SOURCES.musee },
          { label: 'marché Forville', href: SOURCES.forville },
          { label: 'Chemin des Étoiles', href: SOURCES.etoiles },
          { label: 'parkings de Cannes', href: SOURCES.parkings },
          { label: 'Festival de Cannes', href: SOURCES.festival },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite commence sous les vingt-quatre marches du Palais des Festivals et longe les palaces de la Croisette avant de tourner le dos au glamour : le marché Forville, la colline du Suquet et la tour de 1370 d’où l’on voit les îles de Lérins.',
          'Elle raconte le Festival de 1939 annulé par la guerre, le braquage de deux minutes au Carlton en 1994, le Marché du Film qui se négocie dans les suites, Lord Brougham arrêté par le choléra en 1834, et un poissonnier qui ne double pas ses prix en mai.',
          'Le parcours mesure 2,2 km, plat jusqu’au marché puis en escaliers, et se termine au sommet de la vieille ville, là où le Festival ressemble à ce qu’il est : un événement de douze jours posé sur un village millénaire.',
        ],
      },
    },
    en: {
      title: 'Visiting Cannes on foot: the Croisette, the Forville market and Le Suquet',
      description: 'A walk through Cannes, from the Palais des Festivals to the Croisette palaces, then the Forville market and Le Suquet: eight stops, 2.2 km, timing and tips.',
      label: 'Visiting Cannes on foot',
      lead: 'Cannes is two towns laid one over the other: the town of the twenty-four steps and the palaces, and the town of the market and the Suquet hill, which watched the sea a thousand years before cinema. This route crosses both in 2.2 km.',
      sections: [
        {
          title: 'Where to start',
          paragraphs: [
            'The route begins in front of the Palais des Festivals, which the locals call the Bunker: a concrete block delivered in 1983, and the twenty-four steps that thirty thousand people climb each year during the twelve days of the Festival. Outside events, the steps are freely accessible. The Murmure audio tour starts at their foot.',
            'The Chemin des Étoiles, at the foot of the Palais and on the Pompidou esplanade, keeps in its concrete some four hundred and fifty handprints left since 1981, open to all at any hour. Look at the ground before heading east.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'The Croisette lines up three palaces that the route views from outside: the Carlton, opened in 1913 with its two domes, where Hitchcock shot To Catch a Thief in 1955; the Majestic, from 1926, whose suites host the Film Market; and the Martinez, born in 1929, one of the finest Art Deco façades on the Riviera.',
            'Two streets back, the Forville market has belonged to the locals since the hall opened in 1934: fish from the harbour, herbs, tomatoes, and prices that do not change during the Festival. The climb that follows leads to Le Suquet, the old Cannes, a fishermen’s hill inhabited since the Middle Ages.',
            'At the top, the tower of the Château de la Castre, raised in 1370 by the monks of Lérins abbey, houses the Museum of World Explorations. From up there the Croisette reads like an architect’s plan, and the Lérins islands close the horizon: Sainte-Marguerite with the prison of the Man in the Iron Mask, Saint-Honorat with its abbey.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'The published route is 2.2 km long with eight stops. The Croisette is flat; the climb to Le Suquet is short but steep, by staircases. Allow an hour and a quarter to an hour and a half, more if you enter the museum or climb the tower, which has one hundred and nine steps and admits only fifteen people at a time.',
            'The Museum of World Explorations (6.50 € per adult, free under eighteen) is closed on Mondays except in July and August; outside summer it also closes between 1 pm and 2 pm. Note that it is closed for works from 14 September to 30 October 2026.',
            'The Forville market opens from 7 am to 1 pm, Tuesday to Sunday from September to June, and every day in July and August; on Mondays the hall hosts a flea market from 8 am to 4 pm. Leave early if you want to see it in full swing.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'Comfortable shoes for the Suquet staircases, water and a hat in summer on the Croisette, which offers little shade. The route is not guaranteed step-free: the hill is climbed on foot, and the town documents no gentle-slope alternative, only a shuttle for people with reduced mobility.',
            'During the Cannes Film Festival, whose next edition runs from 11 to 22 May 2027, the steps and the surroundings of the Palais are closed to the public and the Croisette is very crowded: choose another time for the walk.',
            'To listen on site, bring headphones, battery and an internet connection.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'Cannes station is five minutes’ walk from the Palais des Festivals, downhill towards the sea. Palm Bus services run along the Croisette and to the harbour; boats for the Lérins islands leave from Quai Laubeuf, west of the Palais.',
            'By car, the Palais des Festivals car park lies beneath the starting point, and the Forville car park next to the market; both are paying.',
          ],
        },
      ],
      stops: {
        title: 'The eight stops of the route',
        items: [
          'The Palais des Festivals and its twenty-four steps',
          'The Chemin des Étoiles',
          'The Carlton',
          'The Majestic',
          'The Martinez',
          'The Forville market',
          'Le Suquet, the old town',
          'The Suquet tower and the Museum of World Explorations',
        ],
      },
      tour: {
        title: 'Listen to “Behind the Palme”',
        body: 'The Murmure audio tour tells what the Festival never films, in eight stops over 2.2 km, from the steps of the Palais to the Suquet tower. Listen to a preview and check the itinerary before you leave.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 on the websites of the town of Cannes and the Festival:',
        links: [
          { label: 'Museum of World Explorations', href: SOURCES.musee },
          { label: 'Forville market', href: SOURCES.forville },
          { label: 'Chemin des Étoiles', href: SOURCES.etoiles },
          { label: 'car parks in Cannes', href: SOURCES.parkings },
          { label: 'Cannes Film Festival', href: SOURCES.festival },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour begins below the twenty-four steps of the Palais des Festivals and follows the palaces of the Croisette before turning its back on the glamour: the Forville market, the Suquet hill and the tower of 1370 from which you see the Lérins islands.',
          'It tells of the 1939 Festival cancelled by the war, the two-minute robbery at the Carlton in 1994, the Film Market negotiated in hotel suites, Lord Brougham stopped by cholera in 1834, and a fishmonger who does not double his prices in May.',
          'The route is 2.2 km long, flat until the market and then on stairs, and ends at the top of the old town, where the Festival looks like what it is: a twelve-day event set on a thousand-year-old village.',
        ],
      },
    },
  },
};
