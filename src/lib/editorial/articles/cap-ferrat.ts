import type { EditorialArticle } from '../articles';

/**
 * Source : `content/tours/cap-ferrat-milliardaires` — sept étapes, 6,9 km.
 * Informations pratiques vérifiées le 16 septembre 2026 sur
 * saintjeancapferrat-tourisme.fr, saint-jean-cap-ferrat.fr et villa-ephrussi.com.
 */
const SOURCES = {
  ephrussi: 'https://www.villa-ephrussi.com/fr/preparer-sa-visite/tarifs',
  balades: 'https://www.saintjeancapferrat-tourisme.fr/balades/',
  fermeture: 'https://www.saintjeancapferrat-tourisme.fr/fermeture-partielle-du-sentier-du-tour-du-cap/',
  transports: 'https://www.saint-jean-cap-ferrat.fr/vie-pratique/transports/',
};

export const ARTICLE_CAP_FERRAT: EditorialArticle = {
  slug: 'visiter-saint-jean-cap-ferrat-a-pied',
  city: { slug: 'saint-jean-cap-ferrat', name: 'Saint-Jean-Cap-Ferrat', country: 'FR' },
  tour: { slug: 'cap-ferrat-la-presqu-ile-des-milliardaires', match: 'milliardaires' },
  publishedAt: '2026-09-16',
  copy: {
    fr: {
      title: 'Visiter Saint-Jean-Cap-Ferrat à pied : de la villa Ephrussi au sentier du littoral',
      description: 'Traversée à pied de Cap Ferrat : villa Ephrussi de Rothschild, promenade Maurice-Rouvier, port, sentier du littoral et chapelle Saint-Hospice. 6,9 km, conseils.',
      label: 'Visiter Cap Ferrat à pied',
      lead: 'Cap Ferrat est la presqu’île des villas fermées, mais son rivage appartient à tout le monde : un sentier en suit tout le pourtour, entre pins d’Alep et Méditerranée. Ce parcours traverse le cap du nord au sud, de la villa d’une baronne à la maison tatouée par Cocteau.',
      sections: [
        {
          title: 'Par où commencer',
          paragraphs: [
            'Le parcours commence devant la villa Ephrussi de Rothschild, au nord de la presqu’île. Ce palais rose et ses neuf jardins ont été bâtis entre 1905 et 1912 pour la baronne Béatrice de Rothschild, qui a congédié dix-huit architectes avant de choisir le sien. Les arrêts de bus Rothschild, Passable et Pont Saint-Jean desservent ce point de départ ; la visite audio Murmure y commence.',
            'Le parcours ne revient pas au départ : il traverse la presqu’île sans revenir sur ses pas et s’achève vers la pointe sud, près du Grand-Hôtel du Cap-Ferrat. Organisez le retour avant de partir.',
          ],
        },
        {
          title: 'Ce que l’on voit en chemin',
          paragraphs: [
            'La promenade Maurice-Rouvier, entièrement goudronnée et sans escaliers, suit la baie de Beaulieu jusqu’au village. Somerset Maugham y a vécu trente-sept ans à la Villa Mauresque ; David Niven allait chercher son pain au port. Ce port de Saint-Jean, avec ses pointus, est le cœur originel de la commune, hameau de pêcheurs jusqu’au milieu du XIXe siècle.',
            'Après le jardin de la Paix, le sentier du littoral contourne la pointe Saint-Hospice : trois mètres de rivage accessibles à tous par la loi, devant des villas que personne ne peut fermer. Un court détour en montée mène à la chapelle Saint-Hospice, sur les lieux où vécut l’ermite Hospitius au VIe siècle, et à la Vierge de bronze de onze mètres et demi érigée en 1904.',
            'Vers le sud, le Grand-Hôtel du Cap-Ferrat, ouvert en 1908, rappelle l’époque où la Riviera était une destination d’hiver. Le parcours s’achève devant la villa Santo Sospir, dont Jean Cocteau a couvert les murs de fresques à partir de 1950, à l’invitation de Francine Weisweiller.',
          ],
        },
        {
          title: 'Combien de temps prévoir',
          paragraphs: [
            'C’est le plus long parcours de la Côte d’Azur sur Murmure : 6,9 km pour sept étapes. Comptez deux heures et demie à trois heures de marche effective, sans les visites intérieures. La promenade Maurice-Rouvier fait 1,3 km, soit vingt minutes ; la boucle de la pointe Saint-Hospice 1,8 km, soit quarante minutes environ.',
            'La villa Ephrussi de Rothschild (18 € par adulte en 2026, jardins et audioguide compris) ouvre tous les jours de 10 h à 18 h de février à début novembre, jusqu’à 19 h en juillet et août, avec une dernière entrée une demi-heure avant la fermeture ; en plein hiver, vérifiez ses jours d’ouverture. Comptez une heure au minimum pour la villa et ses jardins. La chapelle Saint-Hospice est ouverte de 8 h 30 à 19 h ; la Vierge de bronze se voit librement.',
            'La villa Santo Sospir se visite sur réservation, certains jours seulement, en visite guidée ; le Grand-Hôtel est un établissement privé, réservé à ses clients. Le parcours décrit l’un et l’autre de l’extérieur.',
          ],
        },
        {
          title: 'Conseils pratiques',
          paragraphs: [
            'Chaussures de marche, eau en quantité et protection solaire : le sentier du littoral est exposé, avec peu d’ombre en dehors des pins. Par forte houle ou vent violent, le sentier est fermé : renseignez-vous auprès de l’office de tourisme avant de partir.',
            'En 2026, la portion du sentier entre le phare et la plage de Passable, sur la face ouest du cap, est fermée pour travaux de sécurisation. Elle ne fait pas partie de ce parcours, qui passe par la pointe Saint-Hospice, à l’est, mais évitez de prolonger la boucle de ce côté.',
            'Pour écouter sur place, prévoyez écouteurs, batterie chargée pour trois heures et connexion Internet. La promenade Maurice-Rouvier convient aux poussettes et aux fauteuils ; le sentier du littoral et le détour vers Saint-Hospice, non.',
          ],
        },
        {
          title: 'Y aller et se garer',
          paragraphs: [
            'Depuis Nice, la ligne 15 des bus Lignes d’Azur rejoint le port de Saint-Jean-Cap-Ferrat en desservant les arrêts Rothschild, Passable et Pont Saint-Jean ; c’est aussi elle qui vous ramènera depuis le village. La gare la plus proche est celle de Beaulieu-sur-Mer, à deux ou trois kilomètres, reliée au port par cette même ligne en une dizaine de minutes ; la promenade Maurice-Rouvier permet aussi de rejoindre le départ à pied depuis Beaulieu.',
            'En voiture, les parkings du port et de Passable sont payants de mai à septembre et gratuits le reste de l’année. Comme le parcours ne revient pas au départ, mieux vaut venir en bus.',
          ],
        },
      ],
      stops: {
        title: 'Les sept étapes du parcours',
        items: [
          'La villa Ephrussi de Rothschild',
          'La promenade Maurice-Rouvier',
          'Le port de Saint-Jean',
          'Le sentier du littoral, pointe Saint-Hospice',
          'La chapelle Saint-Hospice et sa Vierge de bronze',
          'Le Grand-Hôtel du Cap-Ferrat',
          'La villa Santo Sospir',
        ],
      },
      tour: {
        title: 'Écouter « La Presqu’île des Milliardaires »',
        body: 'La visite audio Murmure est racontée par Thomas Bellini : sept étapes sur 6,9 km, de la villa Ephrussi à la villa Santo Sospir. Écoutez un extrait, vérifiez la longueur du parcours et organisez votre retour avant de partir.',
        cta: 'Écouter un extrait de la visite',
      },
      sources: {
        title: 'Pour préparer votre venue',
        intro: 'Informations vérifiées en septembre 2026 auprès de l’office de tourisme, de la mairie et de la villa :',
        links: [
          { label: 'villa Ephrussi de Rothschild, tarifs et horaires', href: SOURCES.ephrussi },
          { label: 'balades et sentiers de Saint-Jean-Cap-Ferrat', href: SOURCES.balades },
          { label: 'fermeture partielle du sentier en 2026', href: SOURCES.fermeture },
          { label: 'transports et parkings', href: SOURCES.transports },
        ],
        note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.',
      },
      note: {
        title: 'À propos de cette visite',
        paragraphs: [
          'Cette visite traverse la presqu’île de Cap Ferrat du nord au sud, de la villa Ephrussi de Rothschild à la villa Santo Sospir, par la promenade Maurice-Rouvier, le port des pêcheurs et le sentier du littoral.',
          'Elle raconte la baronne qui faisait porter des bérets de marin à ses jardiniers, Somerset Maugham et David Niven sur la promenade, le roi des Belges qui a acheté un tiers du cap, l’ordonnance de Colbert qui garde le rivage ouvert à tous, l’ermite Hospitius et la maison que Cocteau a « tatouée ».',
          'Le parcours mesure 6,9 km : c’est une vraie marche, à préparer avec de l’eau et du temps. Il se termine face à la mer, sur ce que les fortunes du cap n’ont jamais pu acheter.',
        ],
      },
    },
    en: {
      title: 'Visiting Saint-Jean-Cap-Ferrat on foot: from Villa Ephrussi to the coastal path',
      description: 'Crossing Cap Ferrat on foot: Villa Ephrussi de Rothschild, Promenade Maurice-Rouvier, the harbour, the coastal path and Saint-Hospice chapel. 6.9 km, tips.',
      label: 'Visiting Cap Ferrat on foot',
      lead: 'Cap Ferrat is the peninsula of gated villas, but its shoreline belongs to everyone: a path circles it, between Aleppo pines and the Mediterranean. This route crosses the cape from north to south, from a baroness’s villa to the house Cocteau tattooed.',
      sections: [
        {
          title: 'Where to start',
          paragraphs: [
            'The route begins in front of Villa Ephrussi de Rothschild, at the north of the peninsula. This pink palace and its nine gardens were built between 1905 and 1912 for Baroness Béatrice de Rothschild, who dismissed eighteen architects before choosing hers. The Rothschild, Passable and Pont Saint-Jean bus stops serve this starting point; the Murmure audio tour begins there.',
            'The route does not return to the start: it crosses the peninsula without retracing its steps and ends towards the southern tip, near the Grand-Hôtel du Cap-Ferrat. Arrange your way back before you leave.',
          ],
        },
        {
          title: 'What you will see on the way',
          paragraphs: [
            'Promenade Maurice-Rouvier, fully paved and step-free, follows the bay of Beaulieu to the village. Somerset Maugham lived there for thirty-seven years at the Villa Mauresque; David Niven walked to the harbour for his bread. That harbour of Saint-Jean, with its pointu boats, is the original heart of the commune, a fishing hamlet until the mid-nineteenth century.',
            'After the Jardin de la Paix, the coastal path rounds the Saint-Hospice point: three metres of shoreline open to everyone by law, in front of villas that no one can close off. A short uphill detour leads to the Saint-Hospice chapel, where the hermit Hospitius lived in the sixth century, and to the eleven-and-a-half-metre bronze Virgin erected in 1904.',
            'To the south, the Grand-Hôtel du Cap-Ferrat, opened in 1908, recalls the time when the Riviera was a winter destination. The route ends in front of Villa Santo Sospir, whose walls Jean Cocteau covered with frescoes from 1950 onwards, at the invitation of Francine Weisweiller.',
          ],
        },
        {
          title: 'How much time to allow',
          paragraphs: [
            'This is the longest Riviera route on Murmure: 6.9 km for seven stops. Allow two and a half to three hours of actual walking, not counting indoor visits. Promenade Maurice-Rouvier is 1.3 km, about twenty minutes; the Saint-Hospice loop 1.8 km, about forty minutes.',
            'Villa Ephrussi de Rothschild (18 € per adult in 2026, gardens and audio guide included) opens daily from 10 am to 6 pm from February to early November, until 7 pm in July and August, with last entry half an hour before closing; in midwinter, check its opening days. Allow at least an hour for the villa and its gardens. The Saint-Hospice chapel is open from 8.30 am to 7 pm; the bronze Virgin can be seen freely.',
            'Villa Santo Sospir is visited by reservation on certain days only, as a guided tour; the Grand-Hôtel is a private establishment reserved for its guests. The route describes both from outside.',
          ],
        },
        {
          title: 'Practical tips',
          paragraphs: [
            'Walking shoes, plenty of water and sun protection: the coastal path is exposed, with little shade beyond the pines. In heavy swell or strong wind the path is closed: check with the tourist office before you set off.',
            'In 2026, the section of the path between the lighthouse and Passable beach, on the west side of the cape, is closed for safety works. It is not part of this route, which goes round the Saint-Hospice point to the east, but avoid extending the loop on that side.',
            'To listen on site, bring headphones, a battery charged for three hours and an internet connection. Promenade Maurice-Rouvier suits pushchairs and wheelchairs; the coastal path and the Saint-Hospice detour do not.',
          ],
        },
        {
          title: 'Getting there and parking',
          paragraphs: [
            'From Nice, Lignes d’Azur bus 15 runs to the harbour of Saint-Jean-Cap-Ferrat, serving the Rothschild, Passable and Pont Saint-Jean stops; it is also the bus that brings you back from the village. The nearest station is Beaulieu-sur-Mer, two or three kilometres away and linked to the harbour by the same bus in about ten minutes; Promenade Maurice-Rouvier also lets you walk to the start from Beaulieu.',
            'By car, the harbour and Passable car parks are paying from May to September and free the rest of the year. Since the route does not return to the start, the bus is the better choice.',
          ],
        },
      ],
      stops: {
        title: 'The seven stops of the route',
        items: [
          'Villa Ephrussi de Rothschild',
          'Promenade Maurice-Rouvier',
          'The harbour of Saint-Jean',
          'The coastal path, Saint-Hospice point',
          'The Saint-Hospice chapel and its bronze Virgin',
          'The Grand-Hôtel du Cap-Ferrat',
          'Villa Santo Sospir',
        ],
      },
      tour: {
        title: 'Listen to “The Billionaires’ Peninsula”',
        body: 'The Murmure audio tour is narrated by Thomas Bellini: seven stops over 6.9 km, from Villa Ephrussi to Villa Santo Sospir. Listen to a preview, check the length of the route and arrange your way back before you leave.',
        cta: 'Listen to a tour preview',
      },
      sources: {
        title: 'Plan your visit',
        intro: 'Information checked in September 2026 with the tourist office, the town hall and the villa:',
        links: [
          { label: 'Villa Ephrussi de Rothschild, prices and hours', href: SOURCES.ephrussi },
          { label: 'walks and paths in Saint-Jean-Cap-Ferrat', href: SOURCES.balades },
          { label: 'partial closure of the path in 2026', href: SOURCES.fermeture },
          { label: 'transport and car parks', href: SOURCES.transports },
        ],
        note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.',
      },
      note: {
        title: 'About this tour',
        paragraphs: [
          'This tour crosses the Cap Ferrat peninsula from north to south, from Villa Ephrussi de Rothschild to Villa Santo Sospir, along Promenade Maurice-Rouvier, the fishing harbour and the coastal path.',
          'It tells of the baroness who made her gardeners wear sailors’ berets, Somerset Maugham and David Niven on the promenade, the King of the Belgians who bought a third of the cape, Colbert’s ordinance that keeps the shore open to all, the hermit Hospitius and the house that Cocteau “tattooed”.',
          'The route is 6.9 km long: a real walk, to be prepared with water and time. It ends facing the sea, on what the fortunes of the cape have never been able to buy.',
        ],
      },
    },
  },
};
