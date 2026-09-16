import type { ArticleCopy, EditorialArticle } from '../articles';

/**
 * Premier article du site (15 septembre 2026), relu dans les six langues.
 * Porté depuis le composant `grasse-walking-article` qui le codait en dur.
 * Informations pratiques vérifiées le 16 septembre 2026 sur museesdegrasse.com
 * (certificat TLS incomplet : non relié), usines-parfum.fragonard.com, molinard.com, paysdegrassetourisme.fr,
 * ville-grasse.fr et sillages.paysdegrasse.fr.
 */
const STOPS = {
  fr: ['place aux Aires', 'parfumerie Fragonard', 'Musée international de la parfumerie', 'Villa-Musée Fragonard', 'cathédrale Notre-Dame-du-Puy', 'place du 24 Août', 'parfumerie Molinard'],
  en: ['Place aux Aires', 'Fragonard perfumery', 'International Perfume Museum', 'Villa-Musée Fragonard', 'Notre-Dame-du-Puy Cathedral', 'Place du 24 Août', 'Molinard perfumery'],
  es: ['Place aux Aires', 'perfumería Fragonard', 'Museo Internacional de la Perfumería', 'Villa-Musée Fragonard', 'catedral Notre-Dame-du-Puy', 'Place du 24 Août', 'perfumería Molinard'],
  de: ['Place aux Aires', 'Parfümerie Fragonard', 'Internationales Parfümeriemuseum', 'Villa-Musée Fragonard', 'Kathedrale Notre-Dame-du-Puy', 'Place du 24 Août', 'Parfümerie Molinard'],
  it: ['Place aux Aires', 'profumeria Fragonard', 'Museo Internazionale della Profumeria', 'Villa-Musée Fragonard', 'cattedrale Notre-Dame-du-Puy', 'Place du 24 Août', 'profumeria Molinard'],
  nl: ['Place aux Aires', 'parfumerie Fragonard', 'Internationaal Parfummuseum', 'Villa-Musée Fragonard', 'kathedraal Notre-Dame-du-Puy', 'Place du 24 Août', 'parfumerie Molinard'],
};

const SOURCES = {
  tourism: 'https://www.paysdegrassetourisme.fr/imaginons-votre-sejour/visiter-grasse/',
  heritage: 'https://www.paysdegrassetourisme.fr/imaginons-votre-sejour/visiter-grasse/parcours-patrimonial/',
  fragonard: 'https://usines-parfum.fragonard.com/en/free-tour/',
  molinard: 'https://molinard.com/pages/la-bastide-visite-et-musee',
  cathedrale: 'https://www.paysdegrassetourisme.fr/cathedrale-notre-dame-du-puy-de-grasse-919513/',
  marches: 'https://www.ville-grasse.fr/foires-et-marches-grasse/',
  sillages: 'https://sillages.paysdegrasse.fr/se-deplacer-entre-la-gare-sncf-et-le-centre%E2%80%91ville/',
};

const fr: ArticleCopy = {
  title: 'Visiter le centre historique de Grasse à pied : parcours et conseils',
  description: 'Préparez votre balade à Grasse : départ place aux Aires, patrimoine, parfum et conseils pratiques pour découvrir le centre historique à pied.',
  label: 'Visiter Grasse à pied',
  lead: 'Une place, une fontaine, une façade de parfumerie : à Grasse, une promenade peut devenir le fil d’une histoire. Voici comment préparer votre découverte du centre et prolonger la balade avec Les Routes du Parfum.',
  imageAlt: 'Les façades colorées et les clochers de Grasse, derrière un palmier',
  sections: [
    { title: 'Commencer place aux Aires', paragraphs: ['La place aux Aires est le point de départ de la visite audio Murmure. Rejoignez la fontaine, puis ouvrez la fiche de la visite sur votre téléphone. Avant de marcher, écoutez la première étape pour découvrir la voix et le ton du récit. Le samedi matin, de 8 h à 13 h, la place accueille le marché provençal.', 'Le circuit patrimonial proposé par la destination touristique passe également par le centre historique. Ses pavés en laiton constituent des repères pour une autre découverte de la ville ; ils ne remplacent pas les indications de l’itinéraire Murmure.'] },
    { title: 'Suivre le fil du parfum, puis regarder la ville', paragraphs: ['Vous pouvez écouter depuis les lieux indiqués, puis choisir de prolonger votre sortie par une visite intérieure. Le Musée international de la parfumerie est ouvert tous les jours de 10 h à 18 h (6 € par adulte en 2026, gratuit pour les moins de dix-huit ans) ; la Villa-Musée Fragonard, consacrée au peintre, est gratuite et ouverte tous les jours ; les usines Fragonard et Molinard proposent des visites guidées gratuites d’une demi-heure environ, sans réservation.', 'La cathédrale Notre-Dame-du-Puy est en accès libre en semaine et le samedi, le matin et l’après-midi, hors offices. Entre deux écoutes, rangez le téléphone et prenez le temps de regarder autour de vous. Repérez un détail de façade ou une perspective que vous auriez manqué.'] },
    { title: 'Combien de temps prévoir ?', paragraphs: ['La fiche indique la durée, la distance et les étapes. Le parcours publié mesure 2,2 km. Gardez une marge pour les déplacements, les photos et les arrêts : votre temps sur place dépend de votre rythme.', 'Une entrée dans un musée ou un atelier de parfumerie demande du temps supplémentaire, une heure au moins pour le Musée international de la parfumerie. Évitez un rendez-vous immédiatement après la balade si vous souhaitez pouvoir vous arrêter librement.'] },
    { title: 'Relief, équipement et accès', paragraphs: ['Les ruelles de Grasse peuvent être escarpées. Portez des chaussures adaptées, emportez de l’eau et gardez suffisamment de batterie. Pour écouter sur le site, prévoyez une connexion Internet et vos écouteurs.', 'Si vous vous déplacez avec une poussette ou avez besoin d’un itinéraire sans marches, renseignez-vous avant le départ : l’office de tourisme publie une page dédiée aux visiteurs à mobilité réduite, mais les ruelles du centre historique restent pentues. Cette proposition ne garantit pas un parcours accessible.'] },
    { title: 'Y aller et se garer', paragraphs: ['La gare de Grasse est en contrebas du centre, à 1,6 km et une bonne montée ; la navette Centifolia du réseau Sillages relie la gare au centre-ville, et un pôle d’échange avec places réservées et ascenseur se trouve à la gare.', 'En voiture, les parkings Notre-Dame-des-Fleurs et Honoré-Cresp, boulevard Fragonard, sont les plus proches de la place aux Aires ; tous deux sont payants.'] },
  ],
  stops: { title: 'Les sept étapes du parcours', items: STOPS.fr },
  tour: { title: 'Découvrir Grasse avec Les Routes du Parfum', body: 'La visite audio relie l’histoire des tanneurs à celle des parfumeurs. Écoutez un extrait, consultez l’itinéraire et vérifiez les langues ainsi que les conditions d’accès avant de partir.', cta: 'Écouter un extrait de la visite' },
  sources: { title: 'Pour préparer votre venue', intro: 'Informations vérifiées en septembre 2026 auprès des sites officiels :', links: [{ label: 'visiter Grasse avec Pays de Grasse Tourisme', href: SOURCES.tourism }, { label: 'parcours patrimonial du centre historique', href: SOURCES.heritage }, { label: 'visite gratuite de l’usine Fragonard', href: SOURCES.fragonard }, { label: 'visite de la maison Molinard', href: SOURCES.molinard }, { label: 'cathédrale Notre-Dame-du-Puy', href: SOURCES.cathedrale }, { label: 'foires et marchés', href: SOURCES.marches }, { label: 'navette entre la gare et le centre', href: SOURCES.sillages }], note: 'Les horaires et tarifs peuvent changer : consultez-les avant de partir. Le parcours audio Murmure est une offre indépendante.' },
};

const en: ArticleCopy = {
  title: 'Walking through Grasse old town: route and practical tips',
  description: 'Plan your walk through Grasse old town, from Place aux Aires to its perfume heritage, with practical advice and an audio tour.',
  label: 'Walking through Grasse',
  lead: 'A square, a fountain, a perfume-house façade: in Grasse, a walk can become the thread of a story. Here is how to plan your old-town visit and continue it with The Perfume Route.',
  imageAlt: 'Colourful façades and bell towers in Grasse behind a palm tree',
  sections: [
    { title: 'Start at Place aux Aires', paragraphs: ['Place aux Aires is the starting point of the Murmure audio tour. Head to the fountain, then open the tour page on your phone. Listen to the first stop before walking to discover the voice and style of the story. On Saturday mornings, from 8 am to 1 pm, the square hosts the Provençal market.', 'The destination’s heritage trail also crosses the old town. Its brass markers guide a separate way of exploring the city; they do not replace the directions in the Murmure itinerary.'] },
    { title: 'Follow the perfume story and look at the city', paragraphs: ['Listen from the locations shown on the tour page, then choose whether to continue with an indoor visit. The International Perfume Museum is open daily from 10 am to 6 pm (6 € per adult in 2026, free under eighteen); the Villa-Musée Fragonard, devoted to the painter, is free and open daily; the Fragonard and Molinard factories offer free guided tours of about half an hour, no booking needed.', 'Notre-Dame-du-Puy Cathedral is free to enter on weekdays and Saturdays, morning and afternoon, outside services. Between recordings, put your phone away and look around. Notice a façade detail or a view you might otherwise have missed.'] },
    { title: 'How much time should you allow?', paragraphs: ['The tour page gives the stated duration, distance and number of stops. The published route covers 2.2 km. Allow extra time for walking, photos and breaks: the total depends on your pace.', 'A museum or perfume workshop takes additional time, at least an hour for the International Perfume Museum. Avoid scheduling an appointment immediately after the walk if you want to stop freely.'] },
    { title: 'Hills, equipment and access', paragraphs: ['Grasse has steep streets. Wear suitable shoes, carry water and keep enough battery power. To listen on the website, bring headphones and make sure you have an internet connection.', 'If you use a pushchair or need a step-free route, check access before leaving: the tourist office publishes a page for visitors with reduced mobility, but the lanes of the old town remain steep. This itinerary is not guaranteed to be accessible.'] },
    { title: 'Getting there and parking', paragraphs: ['Grasse station lies below the centre, 1.6 km away and a good climb; the Centifolia shuttle of the Sillages network links the station to the town centre, and an interchange with reserved spaces and a lift stands at the station.', 'By car, the Notre-Dame-des-Fleurs and Honoré-Cresp car parks, on Boulevard Fragonard, are the closest to Place aux Aires; both are paying.'] },
  ],
  stops: { title: 'The seven stops of the route', items: STOPS.en },
  tour: { title: 'Discover Grasse with The Perfume Route', body: 'The audio tour connects the history of tanners with that of perfumers. Listen to a preview, view the itinerary and check languages and access information before leaving.', cta: 'Listen to a tour preview' },
  sources: { title: 'Plan your visit', intro: 'Information checked in September 2026 on the official websites:', links: [{ label: 'visit Grasse with Pays de Grasse Tourisme', href: SOURCES.tourism }, { label: 'old-town heritage trail', href: SOURCES.heritage }, { label: 'free tour of the Fragonard factory', href: SOURCES.fragonard }, { label: 'visiting the Molinard house', href: SOURCES.molinard }, { label: 'Notre-Dame-du-Puy Cathedral', href: SOURCES.cathedrale }, { label: 'fairs and markets', href: SOURCES.marches }, { label: 'shuttle between the station and the centre', href: SOURCES.sillages }], note: 'Opening hours and prices may change: check them before you leave. The Murmure audio route is an independent offer.' },
};

const es: ArticleCopy = {
  title: 'Visitar el centro histórico de Grasse a pie: ruta y consejos',
  description: 'Prepara tu paseo por Grasse: salida desde Place aux Aires, patrimonio del perfume y consejos prácticos para el casco histórico.',
  label: 'Visitar Grasse a pie',
  lead: 'Una plaza, una fuente, la fachada de una perfumería: en Grasse, un paseo puede convertirse en el hilo de una historia. Así puedes preparar tu visita con Las Rutas del Perfume.',
  imageAlt: 'Fachadas de colores y campanarios de Grasse detrás de una palmera',
  sections: [
    { title: 'Empezar en Place aux Aires', paragraphs: ['Place aux Aires es el punto de partida de la visita de audio Murmure. Acércate a la fuente, abre la ficha en el teléfono y escucha la primera etapa antes de caminar. Los sábados por la mañana, de 8 h a 13 h, la plaza acoge el mercado provenzal.', 'El circuito patrimonial también atraviesa el casco histórico. Sus marcas de latón guían otra ruta y no sustituyen las indicaciones de Murmure.'] },
    { title: 'Seguir el hilo del perfume y mirar la ciudad', paragraphs: ['Escucha en los puntos indicados y decide después si quieres realizar una visita interior. El Museo Internacional de la Perfumería abre todos los días de 10 h a 18 h (6 € por adulto en 2026, gratis para menores de dieciocho años); la Villa-Musée Fragonard, dedicada al pintor, es gratuita y abre a diario; las fábricas Fragonard y Molinard ofrecen visitas guiadas gratuitas de media hora, sin reserva.', 'La catedral Notre-Dame-du-Puy es de acceso libre entre semana y los sábados, mañana y tarde, fuera de los oficios. Entre dos audios, guarda el teléfono y observa. Busca un detalle de una fachada o una vista que quizá habrías pasado por alto.'] },
    { title: '¿Cuánto tiempo hay que prever?', paragraphs: ['La ficha indica duración, distancia y etapas. La ruta publicada mide 2,2 km. Añade tiempo para caminar, hacer fotos y descansar: el total depende de tu ritmo.', 'Entrar en un museo o realizar un taller de perfume requiere tiempo adicional, al menos una hora para el Museo Internacional de la Perfumería. No programes una cita justo después si quieres detenerte libremente.'] },
    { title: 'Desniveles, equipo y acceso', paragraphs: ['Las calles de Grasse pueden ser empinadas. Lleva buen calzado, agua, batería suficiente, conexión a Internet y auriculares.', 'Si vas con cochecito o necesitas una ruta sin escalones, consulta los accesos antes de salir: la oficina de turismo publica una página para visitantes con movilidad reducida, pero las callejuelas del casco histórico siguen siendo empinadas. Este itinerario no garantiza la accesibilidad.'] },
    { title: 'Cómo llegar y aparcar', paragraphs: ['La estación de Grasse está por debajo del centro, a 1,6 km y una buena subida; la lanzadera Centifolia de la red Sillages une la estación con el centro, y en la estación hay un intercambiador con plazas reservadas y ascensor.', 'En coche, los aparcamientos Notre-Dame-des-Fleurs y Honoré-Cresp, en el bulevar Fragonard, son los más cercanos a Place aux Aires; ambos son de pago.'] },
  ],
  stops: { title: 'Las siete etapas de la ruta', items: STOPS.es },
  tour: { title: 'Descubrir Grasse con Las Rutas del Perfume', body: 'La visita enlaza la historia de los curtidores con la de los perfumistas. Escucha un fragmento y comprueba itinerario, idiomas y accesos.', cta: 'Escuchar un fragmento' },
  sources: { title: 'Preparar la visita', intro: 'Información verificada en septiembre de 2026 en los sitios oficiales:', links: [{ label: 'visitar Grasse con Pays de Grasse Tourisme', href: SOURCES.tourism }, { label: 'circuito patrimonial del casco histórico', href: SOURCES.heritage }, { label: 'visita gratuita de la fábrica Fragonard', href: SOURCES.fragonard }, { label: 'visita de la casa Molinard', href: SOURCES.molinard }, { label: 'catedral Notre-Dame-du-Puy', href: SOURCES.cathedrale }, { label: 'ferias y mercados', href: SOURCES.marches }, { label: 'lanzadera entre la estación y el centro', href: SOURCES.sillages }], note: 'Los horarios y tarifas pueden cambiar: consúltalos antes de salir. La ruta de audio Murmure es una oferta independiente.' },
};

const de: ArticleCopy = {
  title: 'Die Altstadt von Grasse zu Fuß: Route und praktische Tipps',
  description: 'Planen Sie Ihren Spaziergang durch Grasse: Start am Place aux Aires, Parfümerbe und praktische Tipps für die Altstadt.',
  label: 'Grasse zu Fuß',
  lead: 'Ein Platz, ein Brunnen, die Fassade einer Parfümerie: In Grasse wird ein Spaziergang zum roten Faden einer Geschichte. So bereiten Sie den Besuch mit der Parfumroute vor.',
  imageAlt: 'Bunte Fassaden und Kirchtürme von Grasse hinter einer Palme',
  sections: [
    { title: 'Am Place aux Aires beginnen', paragraphs: ['Der Place aux Aires ist der Startpunkt der Murmure-Audiotour. Gehen Sie zum Brunnen, öffnen Sie die Tour auf dem Handy und hören Sie vor dem Losgehen die erste Station. Samstagvormittags, von 8 bis 13 Uhr, findet auf dem Platz der provenzalische Markt statt.', 'Auch der offizielle Kulturerbe-Rundweg führt durch die Altstadt. Seine Messingmarkierungen gehören zu einer eigenen Route und ersetzen nicht die Wegbeschreibung von Murmure.'] },
    { title: 'Der Geschichte des Parfums folgen', paragraphs: ['Hören Sie an den angegebenen Orten und entscheiden Sie anschließend, ob Sie einen Innenbesuch ergänzen möchten. Das Internationale Parfümeriemuseum ist täglich von 10 bis 18 Uhr geöffnet (6 € pro Erwachsenem im Jahr 2026, frei unter 18 Jahren); die dem Maler gewidmete Villa-Musée Fragonard ist kostenlos und täglich geöffnet; die Fabriken Fragonard und Molinard bieten kostenlose Führungen von etwa einer halben Stunde, ohne Reservierung.', 'Die Kathedrale Notre-Dame-du-Puy ist wochentags und samstags vormittags und nachmittags außerhalb der Gottesdienste frei zugänglich. Stecken Sie das Handy zwischen den Aufnahmen weg und sehen Sie sich um. Achten Sie auf Details und Ausblicke, die Sie sonst übersehen hätten.'] },
    { title: 'Wie viel Zeit sollten Sie einplanen?', paragraphs: ['Die Tourseite nennt Dauer, Entfernung und Stationen. Die Route ist 2,2 km lang. Planen Sie zusätzliche Zeit für Wege, Fotos und Pausen ein.', 'Ein Museumsbesuch oder Parfumworkshop benötigt zusätzliche Zeit, mindestens eine Stunde für das Internationale Parfümeriemuseum. Legen Sie keinen festen Termin direkt hinter den Spaziergang.'] },
    { title: 'Steigungen, Ausrüstung und Zugang', paragraphs: ['Die Gassen von Grasse können steil sein. Tragen Sie geeignete Schuhe und nehmen Sie Wasser, ausreichend Akku, Internetzugang und Kopfhörer mit.', 'Wenn Sie einen Kinderwagen nutzen oder eine stufenfreie Route benötigen, prüfen Sie die Zugänge vorab: Das Tourismusbüro veröffentlicht eine Seite für Besucher mit eingeschränkter Mobilität, doch die Gassen der Altstadt bleiben steil. Barrierefreiheit wird nicht garantiert.'] },
    { title: 'Anreise und Parken', paragraphs: ['Der Bahnhof von Grasse liegt unterhalb des Zentrums, 1,6 km entfernt und einen ordentlichen Anstieg weit; der Pendelbus Centifolia des Netzes Sillages verbindet Bahnhof und Zentrum, und am Bahnhof gibt es einen Umsteigepunkt mit reservierten Plätzen und Aufzug.', 'Mit dem Auto sind die Parkhäuser Notre-Dame-des-Fleurs und Honoré-Cresp am Boulevard Fragonard dem Place aux Aires am nächsten; beide sind gebührenpflichtig.'] },
  ],
  stops: { title: 'Die sieben Stationen der Route', items: STOPS.de },
  tour: { title: 'Grasse mit der Parfumroute entdecken', body: 'Die Audiotour verbindet die Geschichte der Gerber mit jener der Parfümeure. Hören Sie eine Vorschau und prüfen Sie Route, Sprachen und Zugangshinweise.', cta: 'Hörprobe starten' },
  sources: { title: 'Besuch vorbereiten', intro: 'Informationen im September 2026 auf den offiziellen Websites geprüft:', links: [{ label: 'Grasse mit Pays de Grasse Tourisme besuchen', href: SOURCES.tourism }, { label: 'Kulturerbe-Rundweg durch die Altstadt', href: SOURCES.heritage }, { label: 'kostenlose Führung durch die Fragonard-Fabrik', href: SOURCES.fragonard }, { label: 'Besuch des Hauses Molinard', href: SOURCES.molinard }, { label: 'Kathedrale Notre-Dame-du-Puy', href: SOURCES.cathedrale }, { label: 'Märkte', href: SOURCES.marches }, { label: 'Pendelbus zwischen Bahnhof und Zentrum', href: SOURCES.sillages }], note: 'Öffnungszeiten und Preise können sich ändern: Prüfen Sie sie vor dem Aufbruch. Die Murmure-Audioroute ist ein unabhängiges Angebot.' },
};

const it: ArticleCopy = {
  title: 'Visitare il centro storico di Grasse a piedi: percorso e consigli',
  description: 'Prepara la passeggiata a Grasse: partenza da Place aux Aires, patrimonio del profumo e consigli pratici per il centro storico.',
  label: 'Visitare Grasse a piedi',
  lead: 'Una piazza, una fontana, la facciata di una profumeria: a Grasse una passeggiata diventa il filo di una storia. Ecco come preparare la visita con Le Vie del Profumo.',
  imageAlt: 'Facciate colorate e campanili di Grasse dietro una palma',
  sections: [
    { title: 'Iniziare da Place aux Aires', paragraphs: ['Place aux Aires è il punto di partenza del tour audio Murmure. Raggiungi la fontana, apri la scheda sul telefono e ascolta la prima tappa prima di camminare. Il sabato mattina, dalle 8 alle 13, la piazza ospita il mercato provenzale.', 'Anche il circuito del patrimonio attraversa il centro storico. I segni in ottone indicano un percorso distinto e non sostituiscono le indicazioni di Murmure.'] },
    { title: 'Seguire il filo del profumo e osservare la città', paragraphs: ['Ascolta nei punti indicati e scegli poi se proseguire con una visita interna. Il Museo Internazionale della Profumeria è aperto tutti i giorni dalle 10 alle 18 (6 € per adulto nel 2026, gratuito sotto i diciotto anni); la Villa-Musée Fragonard, dedicata al pittore, è gratuita e aperta ogni giorno; le fabbriche Fragonard e Molinard offrono visite guidate gratuite di circa mezz’ora, senza prenotazione.', 'La cattedrale Notre-Dame-du-Puy è ad accesso libero nei giorni feriali e il sabato, mattina e pomeriggio, fuori dalle funzioni. Tra un audio e l’altro, riponi il telefono e guardati attorno. Cerca un dettaglio o una vista che altrimenti avresti perso.'] },
    { title: 'Quanto tempo prevedere?', paragraphs: ['La scheda indica durata, distanza e tappe. Il percorso misura 2,2 km. Aggiungi tempo per gli spostamenti, le foto e le pause: il totale dipende dal tuo ritmo.', 'Un museo o un laboratorio di profumeria richiede tempo aggiuntivo, almeno un’ora per il Museo Internazionale della Profumeria. Evita appuntamenti subito dopo la passeggiata.'] },
    { title: 'Salite, attrezzatura e accesso', paragraphs: ['I vicoli di Grasse possono essere ripidi. Porta scarpe adatte, acqua, batteria sufficiente, connessione Internet e auricolari.', 'Se usi un passeggino o hai bisogno di un itinerario senza gradini, verifica prima gli accessi: l’ufficio del turismo pubblica una pagina per i visitatori a mobilità ridotta, ma i vicoli del centro storico restano ripidi. Il percorso non garantisce l’accessibilità.'] },
    { title: 'Come arrivare e parcheggiare', paragraphs: ['La stazione di Grasse si trova sotto il centro, a 1,6 km e una buona salita; la navetta Centifolia della rete Sillages collega la stazione al centro, e in stazione c’è un nodo di interscambio con posti riservati e ascensore.', 'In auto, i parcheggi Notre-Dame-des-Fleurs e Honoré-Cresp, sul boulevard Fragonard, sono i più vicini a Place aux Aires; entrambi sono a pagamento.'] },
  ],
  stops: { title: 'Le sette tappe del percorso', items: STOPS.it },
  tour: { title: 'Scoprire Grasse con Le Vie del Profumo', body: 'Il tour audio unisce la storia dei conciatori a quella dei profumieri. Ascolta un’anteprima e controlla itinerario, lingue e accessi.', cta: 'Ascolta un’anteprima' },
  sources: { title: 'Preparare la visita', intro: 'Informazioni verificate a settembre 2026 sui siti ufficiali:', links: [{ label: 'visitare Grasse con Pays de Grasse Tourisme', href: SOURCES.tourism }, { label: 'circuito del patrimonio nel centro storico', href: SOURCES.heritage }, { label: 'visita gratuita della fabbrica Fragonard', href: SOURCES.fragonard }, { label: 'visita della casa Molinard', href: SOURCES.molinard }, { label: 'cattedrale Notre-Dame-du-Puy', href: SOURCES.cathedrale }, { label: 'fiere e mercati', href: SOURCES.marches }, { label: 'navetta tra la stazione e il centro', href: SOURCES.sillages }], note: 'Orari e tariffe possono cambiare: controllali prima di partire. Il percorso audio Murmure è un’offerta indipendente.' },
};

const nl: ArticleCopy = {
  title: 'De oude binnenstad van Grasse te voet: route en tips',
  description: 'Bereid je wandeling door Grasse voor: vertrek op Place aux Aires, parfumerfgoed en praktische tips voor de oude binnenstad.',
  label: 'Grasse te voet',
  lead: 'Een plein, een fontein, de gevel van een parfumhuis: in Grasse wordt een wandeling de rode draad van een verhaal. Zo bereid je een bezoek met De Parfumroute voor.',
  imageAlt: 'Kleurrijke gevels en kerktorens van Grasse achter een palmboom',
  sections: [
    { title: 'Begin op Place aux Aires', paragraphs: ['Place aux Aires is het vertrekpunt van de Murmure-audiotour. Ga naar de fontein, open de tour op je telefoon en luister vóór het wandelen naar de eerste stop. Op zaterdagochtend, van 8 tot 13 uur, is er de Provençaalse markt op het plein.', 'Ook de erfgoedroute loopt door de oude stad. De messing markeringen horen bij een afzonderlijke route en vervangen de aanwijzingen van Murmure niet.'] },
    { title: 'Volg het parfumverhaal en bekijk de stad', paragraphs: ['Luister op de aangegeven plekken en beslis daarna of je een binnenbezoek wilt toevoegen. Het Internationaal Parfummuseum is dagelijks open van 10 tot 18 uur (6 € per volwassene in 2026, gratis onder de achttien); de Villa-Musée Fragonard, gewijd aan de schilder, is gratis en dagelijks open; de fabrieken Fragonard en Molinard bieden gratis rondleidingen van ongeveer een half uur, zonder reservering.', 'De kathedraal Notre-Dame-du-Puy is op weekdagen en zaterdag, ochtend en middag, vrij toegankelijk buiten de diensten. Stop je telefoon tussen twee opnames weg en kijk om je heen. Let op een detail of uitzicht dat je anders had gemist.'] },
    { title: 'Hoeveel tijd heb je nodig?', paragraphs: ['De tourpagina vermeldt duur, afstand en stops. De route is 2,2 km lang. Reken extra tijd voor wandelen, foto’s en pauzes: het totaal hangt af van je tempo.', 'Een museum of parfumworkshop kost extra tijd, minstens een uur voor het Internationaal Parfummuseum. Plan geen afspraak direct na de wandeling als je vrij wilt kunnen stoppen.'] },
    { title: 'Hellingen, uitrusting en toegang', paragraphs: ['De steegjes van Grasse kunnen steil zijn. Draag goede schoenen en neem water, voldoende batterij, internet en een koptelefoon mee.', 'Gebruik je een kinderwagen of heb je een route zonder trappen nodig, controleer dan vooraf de toegang: het toeristenbureau publiceert een pagina voor bezoekers met beperkte mobiliteit, maar de steegjes van de oude stad blijven steil. Toegankelijkheid is niet gegarandeerd.'] },
    { title: 'Bereikbaarheid en parkeren', paragraphs: ['Het station van Grasse ligt onder het centrum, op 1,6 km en een flinke klim; de pendelbus Centifolia van het netwerk Sillages verbindt het station met het centrum, en bij het station is een knooppunt met gereserveerde plaatsen en een lift.', 'Met de auto liggen de parkeergarages Notre-Dame-des-Fleurs en Honoré-Cresp aan de boulevard Fragonard het dichtst bij Place aux Aires; beide zijn betalend.'] },
  ],
  stops: { title: 'De zeven stops van de route', items: STOPS.nl },
  tour: { title: 'Ontdek Grasse met De Parfumroute', body: 'De audiotour verbindt de geschiedenis van leerlooiers met die van parfumeurs. Luister naar een fragment en controleer route, talen en toegangsinformatie.', cta: 'Luister naar een fragment' },
  sources: { title: 'Bereid je bezoek voor', intro: 'Informatie in september 2026 gecontroleerd op de officiële websites:', links: [{ label: 'bezoek Grasse met Pays de Grasse Tourisme', href: SOURCES.tourism }, { label: 'erfgoedroute door de oude stad', href: SOURCES.heritage }, { label: 'gratis rondleiding door de Fragonard-fabriek', href: SOURCES.fragonard }, { label: 'bezoek aan het huis Molinard', href: SOURCES.molinard }, { label: 'kathedraal Notre-Dame-du-Puy', href: SOURCES.cathedrale }, { label: 'markten', href: SOURCES.marches }, { label: 'pendelbus tussen station en centrum', href: SOURCES.sillages }], note: 'Openingstijden en prijzen kunnen veranderen: controleer ze voor vertrek. De Murmure-audioroute is een onafhankelijk aanbod.' },
};

export const ARTICLE_GRASSE: EditorialArticle = {
  slug: 'visiter-grasse-a-pied',
  city: { slug: 'grasse', name: 'Grasse', country: 'FR' },
  tour: { slug: 'grasse-les-routes-du-parfum', match: 'routes-du-parfum' },
  publishedAt: '2026-09-15',
  updatedAt: '2026-09-16',
  image: { src: '/images/grasse/routes-du-parfum.webp', width: 840, height: 473 },
  copy: { fr, en, es, de, it, nl },
};
