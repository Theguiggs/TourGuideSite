import type { FaqItem, HelpStep } from './_content';
import type { InterfaceLocale } from '@/lib/i18n/locales';

export interface HelpPageCopy {
  eyebrow: string; title: string; subtitle: string; what: string; introduction: string;
  stepsTitle: string; stepsIntro: string; tipsTitle: string; faqTitle: string;
  guides: string; visitors: string; contactTitle: string; contact: string; catalogue: string;
  steps: HelpStep[]; tips: string[]; guideFaq: FaqItem[]; visitorFaq: FaqItem[];
}
export const HELP_COPY: Record<Exclude<InterfaceLocale, 'fr' | 'en'>, HelpPageCopy> = {
  es: {
    eyebrow: 'Centro de ayuda', title: 'Todo para crear, escuchar y compartir.', subtitle: 'La guía completa de Murmure, para creadores y viajeros.',
    what: '¿Qué es Murmure?', introduction: 'Murmure ofrece visitas guiadas de audio. Los viajeros las escuchan en el sitio web o en la aplicación. Los guías crean estas visitas en el estudio web, sin necesidad de conocimientos técnicos.',
    stepsTitle: 'Crea un recorrido, paso a paso', stepsIntro: 'De la idea a la publicación: el recorrido completo en el estudio.', tipsTitle: 'Consejos para una buena visita', faqTitle: 'Preguntas frecuentes', guides: 'Para guías', visitors: 'Para viajeros', contactTitle: '¿Necesitas ayuda?', contact: 'Contactar con soporte', catalogue: 'Ver el catálogo',
    steps: [
      {id: 'create', n: 1, title: 'Crea tu visita', body: 'En el estudio, pulsa «Crear una nueva visita» y elige un título y una ciudad. La visita se crea como borrador, lista para completarla.', tip: 'Un título evocador ayuda a los viajeros a descubrir la experiencia.'},
      {id: 'details', n: 2, title: 'Añade la información', body: 'Añade una descripción de hasta 2000 caracteres, una foto de portada JPG/PNG/WebP de al menos 1200 × 800, hasta tres temas, dificultad, duración, distancia, idioma original e idiomas que quieras ofrecer.'},
      {id: 'map', n: 3, title: 'Traza el itinerario', body: 'Añade puntos de interés por dirección o pulsando en el mapa y cambia su orden. Elige entre trazado automático, manual o importación GPX (Komoot, Strava, Garmin). La distancia y la duración se calculan automáticamente.'},
      {id: 'tell', n: 4, title: 'Cuenta cada etapa', body: 'Cada punto de interés se convierte en una escena con pestañas de lugar, fotos, texto y audio. Escribe el relato y añade hasta tres fotos. Graba con el micrófono, importa un archivo o genera una voz a partir del texto. También hay transcripción automática.', tip: 'Si prefieres no grabar tu voz, la voz sintética puede leer tu texto.'},
      {id: 'translate', n: 5, title: 'Traduce, si lo deseas', body: 'Añade idiomas para traducir y generar narración en cada uno. Revisa y corrige todo antes de enviar la visita.'},
      {id: 'preview', n: 6, title: 'Previsualiza', body: 'Comprueba la visita tal como los viajeros la verán en el catálogo y en la aplicación.'},
      {id: 'publish', n: 7, title: 'Publica', body: 'Envía la visita a moderación. Pasa de borrador a enviada y después a publicada o con revisión solicitada. Una vez publicada aparece en el catálogo y en la aplicación. Puedes pausarla o archivarla.'},
    ],
    tips: ['Mantén las escenas breves, de uno a tres minutos.', 'Usa un tono conversacional, como si guiaras a un amigo.', 'Empieza cada escena con una frase que despierte interés.', 'Comprueba las coordenadas GPS: un punto mal situado puede desorientar al viajero.', 'Cuida la portada: es la primera impresión en el catálogo.', 'Revisa las traducciones automáticas antes de publicarlas.'],
    guideFaq: [
      {q: '¿Crear una visita cuesta dinero?', a: 'Crear y publicar es gratis. Algunos servicios de traducción pueden ofrecerse como opciones de pago Standard o Pro.'},
      {q: '¿Cómo recibo mis ingresos?', a: 'Recibes una parte mayoritaria de cada venta de tu visita, que puedes seguir en la pestaña Ingresos del estudio.'},
      {q: '¿Cuánto tarda la publicación?', a: 'Tras el envío, el equipo de moderación revisa el contenido. El plazo depende del volumen de trabajo.'},
      {q: '¿Puedo modificar una visita publicada?', a: 'Sí. Puedes pausarla, crear una versión nueva o corregirla tras los comentarios de moderación, sin empezar de cero.'},
      {q: '¿Necesito saber grabar audio?', a: 'No. Si no quieres grabar tu voz, la narración sintética puede leer el texto.'},
      {q: '¿Mi visita puede ser multilingüe?', a: 'Sí. Cada idioma se traduce, narra y modera por separado.'},
    ],
    visitorFaq: [
      {q: '¿Cómo escucho una visita?', a: 'En la página de la visita, pulsa Escuchar bajo cada etapa cuando llegues al lugar. El siguiente audio no empieza automáticamente. La aplicación añade guiado GPS y escucha sin conexión.'},
      {q: '¿Funciona sin conexión?', a: 'El reproductor web necesita conexión para cargar el audio. Descargar visitas para escucharlas sin conexión es una función de la aplicación, no del sitio instalado.'},
      {q: '¿En qué dispositivos funciona?', a: 'El sitio se adapta al teléfono, la tableta y el ordenador. Las funciones de la aplicación dependen de su disponibilidad en tu dispositivo.'},
      {q: '¿Es gratis?', a: 'Algunas visitas son gratuitas y otras son de pago. En las visitas de pago puedes escuchar una etapa de muestra.'},
      {q: '¿Dónde encuentro las visitas?', a: 'Explora el catálogo, abre una visita y descubre su audio en el sitio. Tus compras están en Mis visitas, con tu cuenta Murmure.'},
    ],
  },
  de: {
    eyebrow: 'Hilfecenter', title: 'Alles zum Erstellen, Zuhören und Teilen.', subtitle: 'Der vollständige Murmure-Leitfaden für Guides und Reisende.',
    what: 'Was ist Murmure?', introduction: 'Murmure bietet Audiotouren. Reisende hören sie auf der Website oder in der App. Guides erstellen die Touren im Webstudio, ohne technische Vorkenntnisse.',
    stepsTitle: 'Eine Tour Schritt für Schritt erstellen', stepsIntro: 'Von der Idee zur Veröffentlichung: der vollständige Ablauf im Studio.', tipsTitle: 'Tipps für eine gelungene Tour', faqTitle: 'Häufige Fragen', guides: 'Für Guides', visitors: 'Für Reisende', contactTitle: 'Brauchst du Hilfe?', contact: 'Support kontaktieren', catalogue: 'Katalog ansehen',
    steps: [
      {id: 'create', n: 1, title: 'Erstelle deine Tour', body: 'Wähle im Studio „Neue Tour erstellen“ und gib einen Titel und eine Stadt an. Deine Tour wird als Entwurf angelegt und kann ergänzt werden.', tip: 'Ein aussagekräftiger Titel macht Reisende neugierig auf das Erlebnis.'},
      {id: 'details', n: 2, title: 'Ergänze die Informationen', body: 'Füge eine Beschreibung mit bis zu 2000 Zeichen, ein Titelbild als JPG/PNG/WebP mit mindestens 1200 × 800 Pixeln, bis zu drei Themen, Schwierigkeit, Dauer, Entfernung, Ausgangssprache und gewünschte Sprachen hinzu.'},
      {id: 'map', n: 3, title: 'Zeichne die Route', body: 'Füge Sehenswürdigkeiten per Adresse oder auf der Karte hinzu und ändere ihre Reihenfolge. Wähle automatische Routenberechnung, manuelles Zeichnen oder GPX-Import (Komoot, Strava, Garmin). Entfernung und Dauer werden automatisch berechnet.'},
      {id: 'tell', n: 4, title: 'Erzähle jede Etappe', body: 'Jeder Ort wird zu einer Szene mit Bereichen für Ort, Fotos, Text und Audio. Schreibe den Text und füge bis zu drei Fotos hinzu. Nimm deine Stimme auf, importiere eine Datei oder erzeuge eine Stimme aus dem Text. Automatische Transkription ist ebenfalls verfügbar.', tip: 'Wenn du nicht selbst aufnehmen möchtest, kann eine synthetische Stimme deinen Text lesen.'},
      {id: 'translate', n: 5, title: 'Übersetze bei Bedarf', body: 'Füge Sprachen hinzu, um Übersetzungen und Erzählstimmen zu erzeugen. Prüfe und korrigiere alles vor dem Einreichen.'},
      {id: 'preview', n: 6, title: 'Prüfe die Vorschau', body: 'Sieh dir die fertige Tour so an, wie Reisende sie im Katalog und in der App erleben werden.'},
      {id: 'publish', n: 7, title: 'Veröffentliche die Tour', body: 'Reiche die Tour zur Prüfung ein. Sie wechselt vom Entwurf zu eingereicht und anschließend zu veröffentlicht oder Überarbeitung angefordert. Nach Freigabe erscheint sie im Katalog und in der App. Du kannst sie pausieren oder archivieren.'},
    ],
    tips: ['Halte Szenen kurz: idealerweise eine bis drei Minuten.', 'Sprich im Gesprächston, als würdest du einen Freund begleiten.', 'Beginne jede Szene mit einem interessanten Einstieg.', 'Prüfe die GPS-Punkte: Ein falsch gesetzter Ort kann Reisende in die Irre führen.', 'Wähle das Titelbild sorgfältig: Es prägt den ersten Eindruck.', 'Prüfe automatische Übersetzungen vor der Veröffentlichung.'],
    guideFaq: [
      {q: 'Kostet das Erstellen einer Tour etwas?', a: 'Erstellen und Veröffentlichen sind kostenlos. Bestimmte Übersetzungsdienste können als kostenpflichtige Standard- oder Pro-Optionen angeboten werden.'},
      {q: 'Wie werde ich bezahlt?', a: 'Du erhältst den überwiegenden Anteil jedes Verkaufs deiner Tour. Im Studio kannst du ihn unter Einnahmen verfolgen.'},
      {q: 'Wie lange dauert die Veröffentlichung?', a: 'Nach dem Einreichen prüft das Moderationsteam die Inhalte. Die Bearbeitungszeit hängt vom aktuellen Aufkommen ab.'},
      {q: 'Kann ich veröffentlichte Touren ändern?', a: 'Ja. Pausiere die Tour, erstelle eine neue Version oder setze Rückmeldungen der Moderation um, ohne von vorn zu beginnen.'},
      {q: 'Muss ich Audio aufnehmen können?', a: 'Nein. Wenn du deine Stimme nicht aufnehmen möchtest, kann eine synthetische Stimme den Text lesen.'},
      {q: 'Kann meine Tour mehrsprachig sein?', a: 'Ja. Jede Sprache wird separat übersetzt, vertont und geprüft.'},
    ],
    visitorFaq: [
      {q: 'Wie höre ich eine Tour?', a: 'Tippe auf der Tourseite unter jeder Etappe auf Anhören, wenn du vor Ort bist. Die nächste Aufnahme startet nicht automatisch. Die App ergänzt GPS-Führung und Offline-Hören.'},
      {q: 'Funktioniert es offline?', a: 'Der Webplayer benötigt eine Verbindung zum Laden der Audiodateien. Touren für die Offline-Nutzung herunterzuladen ist eine Funktion der App, nicht der installierten Website.'},
      {q: 'Welche Geräte werden unterstützt?', a: 'Die Website passt sich an Smartphones, Tablets und Computer an. App-Funktionen hängen von der Verfügbarkeit auf deinem Gerät ab.'},
      {q: 'Ist es kostenlos?', a: 'Einige Touren sind kostenlos, andere kostenpflichtig. Bei kostenpflichtigen Touren kannst du eine Etappe als Vorschau anhören.'},
      {q: 'Wo finde ich die Touren?', a: 'Durchsuche den Katalog, öffne eine Tour und höre sie auf der Website an. Deine Käufe findest du mit deinem Murmure-Konto unter Meine Touren.'},
    ],
  },
  it: {
    eyebrow: 'Centro assistenza', title: 'Tutto per creare, ascoltare e condividere.', subtitle: 'La guida completa a Murmure, per creatori e viaggiatori.',
    what: 'Che cos’è Murmure?', introduction: 'Murmure offre visite guidate audio. I viaggiatori le ascoltano sul sito o nell’app. Le guide creano le visite nello studio web, senza competenze tecniche.',
    stepsTitle: 'Crea un itinerario, passo dopo passo', stepsIntro: 'Dall’idea alla pubblicazione: il percorso completo nello studio.', tipsTitle: 'Consigli per una visita riuscita', faqTitle: 'Domande frequenti', guides: 'Per le guide', visitors: 'Per i viaggiatori', contactTitle: 'Hai bisogno di aiuto?', contact: 'Contatta l’assistenza', catalogue: 'Sfoglia il catalogo',
    steps: [
      {id: 'create', n: 1, title: 'Crea la tua visita', body: 'Nello studio scegli Crea una nuova visita, poi inserisci titolo e città. La visita nasce come bozza, pronta da arricchire.', tip: 'Un titolo evocativo aiuta i viaggiatori a capire l’esperienza.'},
      {id: 'details', n: 2, title: 'Aggiungi le informazioni', body: 'Aggiungi una descrizione fino a 2000 caratteri, una copertina JPG/PNG/WebP di almeno 1200 × 800, fino a tre temi, difficoltà, durata, distanza, lingua originale e lingue da offrire.'},
      {id: 'map', n: 3, title: 'Traccia l’itinerario', body: 'Inserisci punti di interesse tramite indirizzo o sulla mappa e riordinali. Scegli il percorso automatico, il tracciato manuale o l’importazione GPX (Komoot, Strava, Garmin). Distanza e durata sono calcolate automaticamente.'},
      {id: 'tell', n: 4, title: 'Racconta ogni tappa', body: 'Ogni punto diventa una scena con schede per luogo, foto, testo e audio. Scrivi il racconto e aggiungi fino a tre foto. Registra con il microfono, importa un file oppure genera una voce dal testo. È disponibile anche la trascrizione automatica.', tip: 'Se preferisci non registrare, la voce sintetica può leggere il testo.'},
      {id: 'translate', n: 5, title: 'Traduci, se vuoi', body: 'Aggiungi le lingue per generare traduzioni e narrazioni. Rileggi e correggi tutto prima dell’invio.'},
      {id: 'preview', n: 6, title: 'Guarda l’anteprima', body: 'Controlla il risultato finale esattamente come lo vedranno i viaggiatori nel catalogo e nell’app.'},
      {id: 'publish', n: 7, title: 'Pubblica', body: 'Invia la visita alla moderazione. Passa da bozza a inviata, poi a pubblicata o revisione richiesta. Dopo la pubblicazione appare nel catalogo e nell’app. Puoi sospenderla o archiviarla.'},
    ],
    tips: ['Mantieni le scene brevi, da uno a tre minuti.', 'Usa un tono colloquiale, come se accompagnassi un amico.', 'Inizia ogni scena con uno spunto che incuriosisca.', 'Controlla i punti GPS: una posizione sbagliata può disorientare il viaggiatore.', 'Cura la copertina: è la prima impressione nel catalogo.', 'Rileggi le traduzioni automatiche prima di pubblicarle.'],
    guideFaq: [
      {q: 'Creare una visita è a pagamento?', a: 'Creare e pubblicare è gratuito. Alcuni servizi di traduzione possono essere proposti come opzioni a pagamento Standard o Pro.'},
      {q: 'Come ricevo i ricavi?', a: 'Ricevi una quota maggioritaria di ogni vendita della tua visita, visibile nella scheda Ricavi dello studio.'},
      {q: 'Quanto tempo serve per pubblicare?', a: 'Dopo l’invio, il team di moderazione controlla i contenuti. I tempi dipendono dal volume di lavoro.'},
      {q: 'Posso modificare una visita pubblicata?', a: 'Sì. Puoi sospenderla, creare una nuova versione o correggerla dopo i commenti della moderazione, senza ricominciare.'},
      {q: 'Devo saper registrare l’audio?', a: 'No. Se non vuoi registrare la tua voce, la narrazione sintetica può leggere il testo.'},
      {q: 'La visita può essere multilingue?', a: 'Sì. Ogni lingua viene tradotta, narrata e moderata separatamente.'},
    ],
    visitorFaq: [
      {q: 'Come ascolto una visita?', a: 'Nella pagina della visita premi Ascolta sotto ogni tappa quando sei sul posto. L’audio successivo non parte automaticamente. L’app aggiunge guida GPS e ascolto offline.'},
      {q: 'Funziona senza connessione?', a: 'Il lettore web richiede una connessione per caricare l’audio. Scaricare visite offline è una funzione dell’app, non del sito installato.'},
      {q: 'Su quali dispositivi funziona?', a: 'Il sito si adatta a telefoni, tablet e computer. Le funzioni dell’app dipendono dalla disponibilità sul dispositivo.'},
      {q: 'È gratuito?', a: 'Alcune visite sono gratuite, altre a pagamento. Per quelle a pagamento puoi ascoltare una tappa di anteprima.'},
      {q: 'Dove trovo le visite?', a: 'Sfoglia il catalogo, apri una visita e ascoltala sul sito. Trovi gli acquisti in Le mie visite con il tuo account Murmure.'},
    ],
  },
  nl: {
    eyebrow: 'Helpcentrum', title: 'Alles om te maken, luisteren en delen.', subtitle: 'De complete Murmure-handleiding voor makers en reizigers.',
    what: 'Wat is Murmure?', introduction: 'Murmure biedt audiotours. Reizigers luisteren op de website of in de app. Gidsen maken tours in de webstudio, zonder technische kennis.',
    stepsTitle: 'Stap voor stap een tour maken', stepsIntro: 'Van idee tot publicatie: het volledige proces in de studio.', tipsTitle: 'Tips voor een geslaagde tour', faqTitle: 'Veelgestelde vragen', guides: 'Voor gidsen', visitors: 'Voor reizigers', contactTitle: 'Hulp nodig?', contact: 'Contact opnemen met support', catalogue: 'Catalogus bekijken',
    steps: [
      {id: 'create', n: 1, title: 'Maak je tour', body: 'Kies in de studio Een nieuwe tour maken en geef een titel en stad op. Je tour wordt als concept aangemaakt en is klaar om aan te vullen.', tip: 'Een aansprekende titel maakt duidelijk wat reizigers kunnen beleven.'},
      {id: 'details', n: 2, title: 'Voeg de informatie toe', body: 'Voeg een beschrijving van maximaal 2000 tekens, een JPG/PNG/WebP-omslag van minstens 1200 × 800, maximaal drie thema’s, moeilijkheid, duur, afstand, oorspronkelijke taal en gewenste talen toe.'},
      {id: 'map', n: 3, title: 'Teken de route', body: 'Voeg bezienswaardigheden toe via een adres of op de kaart en wijzig de volgorde. Kies automatische berekening, handmatig tekenen of GPX-import (Komoot, Strava, Garmin). Afstand en duur worden automatisch berekend.'},
      {id: 'tell', n: 4, title: 'Vertel bij elke halte', body: 'Elke plek wordt een scène met onderdelen voor locatie, foto’s, tekst en audio. Schrijf het verhaal en voeg maximaal drie foto’s toe. Neem je stem op, importeer een bestand of laat tekst omzetten naar spraak. Automatische transcriptie is ook beschikbaar.', tip: 'Als je niet wilt opnemen, kan een synthetische stem je tekst voorlezen.'},
      {id: 'translate', n: 5, title: 'Vertaal indien gewenst', body: 'Voeg talen toe om vertalingen en gesproken versies te genereren. Controleer en verbeter alles voordat je de tour indient.'},
      {id: 'preview', n: 6, title: 'Bekijk de voorvertoning', body: 'Controleer het resultaat zoals reizigers het in de catalogus en de app zullen zien.'},
      {id: 'publish', n: 7, title: 'Publiceer', body: 'Dien de tour in voor beoordeling. De status gaat van concept naar ingediend en daarna naar gepubliceerd of aanpassing gevraagd. Na publicatie verschijnt de tour in de catalogus en de app. Je kunt de tour pauzeren of archiveren.'},
    ],
    tips: ['Houd scènes kort: één tot drie minuten.', 'Gebruik een gesprekstoon, alsof je een vriend rondleidt.', 'Begin elke scène met iets dat nieuwsgierig maakt.', 'Controleer GPS-punten: een verkeerd geplaatste plek kan reizigers laten verdwalen.', 'Besteed aandacht aan de omslag: die bepaalt de eerste indruk.', 'Controleer automatische vertalingen voordat je ze publiceert.'],
    guideFaq: [
      {q: 'Kost het maken van een tour geld?', a: 'Maken en publiceren is gratis. Sommige vertaaldiensten kunnen als betaalde Standard- of Pro-optie worden aangeboden.'},
      {q: 'Hoe word ik betaald?', a: 'Je ontvangt het grootste deel van elke verkoop van je tour. Je volgt dit in het tabblad Inkomsten van de studio.'},
      {q: 'Hoelang duurt publiceren?', a: 'Na indiening controleert het moderatieteam de inhoud. De wachttijd hangt af van de hoeveelheid werk.'},
      {q: 'Kan ik een gepubliceerde tour wijzigen?', a: 'Ja. Pauzeer de tour, maak een nieuwe versie of verwerk feedback van de moderatie, zonder opnieuw te beginnen.'},
      {q: 'Moet ik audio kunnen opnemen?', a: 'Nee. Een synthetische stem kan de tekst voorlezen als je je eigen stem niet wilt opnemen.'},
      {q: 'Kan mijn tour meertalig zijn?', a: 'Ja. Elke taal wordt afzonderlijk vertaald, ingesproken en beoordeeld.'},
    ],
    visitorFaq: [
      {q: 'Hoe luister ik naar een tour?', a: 'Tik op de tourpagina onder elke halte op Luisteren wanneer je daar bent. De volgende audio begint niet automatisch. De app voegt GPS-begeleiding en offline luisteren toe.'},
      {q: 'Werkt het offline?', a: 'De webspeler heeft verbinding nodig om audio te laden. Tours downloaden voor offline gebruik is een appfunctie, niet een functie van de geïnstalleerde website.'},
      {q: 'Welke apparaten worden ondersteund?', a: 'De website past zich aan telefoons, tablets en computers aan. Appfuncties hangen af van de beschikbaarheid op je apparaat.'},
      {q: 'Is het gratis?', a: 'Sommige tours zijn gratis, andere betaald. Bij betaalde tours kun je één halte als voorproefje beluisteren.'},
      {q: 'Waar vind ik de tours?', a: 'Blader door de catalogus, open een tour en luister op de website. Je aankopen staan met je Murmure-account onder Mijn tours.'},
    ],
  },
};
