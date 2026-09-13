import { INTERFACE_COPY } from '@/lib/i18n/translate';
import type { InterfaceLocale } from '@/lib/i18n/locales';

// Each row is FR | EN | ES | DE | IT | NL. These are interface labels, never user content.
const rows = `
Suivante|Next|Siguiente|Nächste|Successiva|Volgende
Absente|Absent|Ausente|Nicht vorhanden|Assente|Afwezig
Brouillon|Draft|Borrador|Entwurf|Bozza|Concept
Soumis|Submitted|Enviado|Eingereicht|Inviato|Ingediend
Enregistrement|Recording|Grabación|Aufnahme|Registrazione|Opname
Prêt|Ready|Listo|Bereit|Pronto|Klaar
Publié|Published|Publicado|Veröffentlicht|Pubblicato|Gepubliceerd
Révision demandée|Revision requested|Revisión solicitada|Überarbeitung angefordert|Revisione richiesta|Herziening gevraagd
En cours d’édition|Editing|En edición|In Bearbeitung|In modifica|Wordt bewerkt
Archivé|Archived|Archivado|Archiviert|Archiviato|Gearchiveerd
Refusé|Rejected|Rechazado|Abgelehnt|Rifiutato|Afgewezen
Inactif|Inactive|Inactivo|Inaktiv|Inattivo|Inactief
OK|OK|OK|OK|OK|OK
Autre|Other|Otro|Sonstiges|Altro|Anders
Mode de narration|Narration mode|Modo de narración|Erzählmodus|Modalità narrazione|Vertelmodus
Texte source|Source text|Texto original|Quelltext|Testo originale|Brontekst
Audio source|Source audio|Audio original|Originalaudio|Audio originale|Bronaudio
Cohérence audio|Audio consistency|Coherencia del audio|Audiokonsistenz|Coerenza audio|Audioconsistentie
Préparation TTS|TTS readiness|Preparación TTS|TTS-Bereitschaft|Preparazione TTS|TTS-gereedheid
En cours…|Working…|En curso…|In Bearbeitung…|In corso…|Bezig…
En cours...|Working...|En curso...|In Bearbeitung...|In corso...|Bezig...
Conforme|Valid|Conforme|Gültig|Conforme|Geldig
Historique|History|Historial|Verlauf|Cronologia|Geschiedenis
Clarte audio|Audio clarity|Claridad de audio|Audioklarheit|Chiarezza audio|Helderheid audio
L'audio est clair, sans bruit excessif ni coupures|Audio is clear, without excessive noise or interruptions|El audio es claro, sin ruido excesivo ni cortes|Audio ist klar, ohne übermäßige Geräusche oder Unterbrechungen|L’audio è chiaro, senza rumori eccessivi o interruzioni|Audio is helder, zonder overmatig lawaai of onderbrekingen
Contenu precis et interessant|Accurate and interesting content|Contenido preciso e interesante|Präzise und interessante Inhalte|Contenuti precisi e interessanti|Nauwkeurige en interessante inhoud
Les informations sont correctes et engageantes|Information is correct and engaging|La información es correcta y atractiva|Informationen sind korrekt und ansprechend|Le informazioni sono corrette e coinvolgenti|De informatie is correct en boeiend
Aucun contenu inapproprie|No inappropriate content|Sin contenido inapropiado|Keine unangemessenen Inhalte|Nessun contenuto inappropriato|Geen ongepaste inhoud
Pas de propos offensants, discriminatoires ou illegaux|No offensive, discriminatory or illegal statements|Sin declaraciones ofensivas, discriminatorias o ilegales|Keine beleidigenden, diskriminierenden oder illegalen Aussagen|Nessuna dichiarazione offensiva, discriminatoria o illegale|Geen beledigende, discriminerende of illegale uitspraken
Parcours GPS praticable|Walkable GPS route|Ruta GPS transitable|Begehbare GPS-Route|Percorso GPS praticabile|Beloopbare GPS-route
Le parcours est accessible a pied et securise|The route is walkable and safe|La ruta es accesible a pie y segura|Die Route ist zu Fuß zugänglich und sicher|Il percorso è accessibile a piedi e sicuro|De route is te voet toegankelijk en veilig
Qualite de traduction|Translation quality|Calidad de traducción|Übersetzungsqualität|Qualità della traduzione|Vertaalkwaliteit
La traduction FR/EN est naturelle et fidele|The translation is natural and faithful|La traducción es natural y fiel|Die Übersetzung ist natürlich und originalgetreu|La traduzione è naturale e fedele|De vertaling is natuurlijk en getrouw
Prononçabilité du texte|Text pronunciation|Pronunciación del texto|Aussprechbarkeit des Textes|Pronunciabilità del testo|Uitspreekbaarheid van de tekst
Le texte est final, naturel à l’oral et ne contient aucune instruction technique|The text is final, natural when spoken and contains no technical instructions|El texto es definitivo, natural al hablar y sin instrucciones técnicas|Der Text ist fertig, klingt gesprochen natürlich und enthält keine technischen Anweisungen|Il testo è definitivo, naturale a voce e privo di istruzioni tecniche|De tekst is definitief, klinkt natuurlijk en bevat geen technische instructies
Qualite audio|Audio quality|Calidad de audio|Audioqualität|Qualità audio|Audiokwaliteit
Precision du contenu|Content accuracy|Precisión del contenido|Inhaltliche Richtigkeit|Accuratezza dei contenuti|Juistheid van de inhoud
Contenu inapproprie|Inappropriate content|Contenido inapropiado|Unangemessene Inhalte|Contenuto inappropriato|Ongepaste inhoud
Problemes GPS/parcours|GPS/route issues|Problemas de GPS/ruta|GPS-/Routenprobleme|Problemi GPS/percorso|GPS-/routeproblemen
Problemes de traduction|Translation issues|Problemas de traducción|Übersetzungsprobleme|Problemi di traduzione|Vertaalproblemen
Données de validation chargées|Validation data loaded|Datos de validación cargados|Prüfdaten geladen|Dati di validazione caricati|Validatiegegevens geladen
Le parcours, l’accès ou les contenus de langue sont encore en cours de lecture.|Route, access or language content is still loading.|La ruta, el acceso o el contenido del idioma aún se están cargando.|Route, Zugang oder Sprachinhalte werden noch geladen.|Percorso, accesso o contenuti della lingua sono ancora in caricamento.|Route, toegang of taalinhoud wordt nog geladen.
Toutes les scènes sont complètes.|All scenes are complete.|Todas las escenas están completas.|Alle Szenen sind vollständig.|Tutte le scene sono complete.|Alle scènes zijn compleet.
titre traduit|translated title|título traducido|übersetzter Titel|titolo tradotto|vertaalde titel
texte traduit|translated text|texto traducido|übersetzter Text|testo tradotto|vertaalde tekst
audio traduit|translated audio|audio traducido|übersetztes Audio|audio tradotto|vertaalde audio
segment unique|unique segment|segmento único|eindeutiges Segment|segmento unico|uniek segment
statut audio final|final audio status|estado de audio final|finaler Audiostatus|stato audio finale|definitieve audiostatus
traduction à actualiser|translation needs updating|traducción por actualizar|Übersetzung aktualisieren|traduzione da aggiornare|vertaling bijwerken
titre source|source title|título original|Originaltitel|titolo originale|brontitel
texte source|source text|texto original|Quelltext|testo originale|brontekst
audio source|source audio|audio original|Originalaudio|audio originale|bronaudio
audio inattendu en mode TTS|unexpected audio in TTS mode|audio inesperado en modo TTS|unerwartetes Audio im TTS-Modus|audio inatteso in modalità TTS|onverwachte audio in TTS-modus
Titre et description|Title and description|Título y descripción|Titel und Beschreibung|Titolo e descrizione|Titel en beschrijving
Le titre et la description sont renseignés.|Title and description are filled in.|El título y la descripción están completos.|Titel und Beschreibung sind ausgefüllt.|Titolo e descrizione sono compilati.|Titel en beschrijving zijn ingevuld.
Le titre ou la description est absent.|Title or description is missing.|Falta el título o la descripción.|Titel oder Beschreibung fehlt.|Manca il titolo o la descrizione.|Titel of beschrijving ontbreekt.
Une couverture est renseignée.|A cover is set.|Hay una portada.|Ein Titelbild ist vorhanden.|È presente una copertina.|Een omslag is ingesteld.
Aucune couverture n’est renseignée.|No cover is set.|No hay portada.|Kein Titelbild vorhanden.|Nessuna copertina presente.|Geen omslag ingesteld.
Thème autorisé|Allowed theme|Tema permitido|Zulässiges Thema|Tema consentito|Toegestaan thema
Aucun thème n’est renseigné.|No theme is set.|No hay tema indicado.|Kein Thema angegeben.|Nessun tema indicato.|Geen thema ingesteld.
Thème alimentaire interdit : {0}.|Food theme not allowed: {0}.|Tema alimentario no permitido: {0}.|Lebensmittelthema nicht zulässig: {0}.|Tema alimentare non consentito: {0}.|Voedingsthema niet toegestaan: {0}.
Thème(s) : {0}.|Theme(s): {0}.|Tema(s): {0}.|Thema/Themen: {0}.|Tema/i: {0}.|Thema’s: {0}.
Origine éditoriale|Editorial origin|Origen editorial|Redaktioneller Ursprung|Origine editoriale|Redactionele oorsprong
Le guide doit indiquer si le contenu a été écrit par lui, avec l’aide de l’IA, ou principalement avec l’IA.|The guide must state whether content was written by them, with AI assistance or mainly with AI.|El guía debe indicar si escribió el contenido, usó ayuda de IA o lo creó principalmente con IA.|Der Guide muss angeben, ob Inhalte selbst, mit KI-Hilfe oder hauptsächlich mit KI erstellt wurden.|La guida deve indicare se ha scritto il contenuto, usato l’IA come aiuto o principalmente l’IA.|De gids moet aangeven of de inhoud zelf, met AI-hulp of voornamelijk met AI is gemaakt.
Contenu écrit par le guide.|Content written by the guide.|Contenido escrito por el guía.|Vom Guide verfasster Inhalt.|Contenuto scritto dalla guida.|Inhoud geschreven door de gids.
Contenu créé avec l’aide de l’IA — mention « Developed with AI » requise.|Content created with AI assistance — “Developed with AI” disclosure required.|Contenido creado con ayuda de IA: se requiere la mención «Developed with AI».|Mit KI-Hilfe erstellter Inhalt — Hinweis „Developed with AI“ erforderlich.|Contenuto creato con l’aiuto dell’IA: dicitura «Developed with AI» richiesta.|Inhoud gemaakt met AI-hulp — vermelding ‘Developed with AI’ vereist.
Contenu créé principalement avec l’IA — mention « Developed with AI » requise.|Content created mainly with AI — “Developed with AI” disclosure required.|Contenido creado principalmente con IA: se requiere la mención «Developed with AI».|Überwiegend mit KI erstellter Inhalt — Hinweis „Developed with AI“ erforderlich.|Contenuto creato principalmente con l’IA: dicitura «Developed with AI» richiesta.|Inhoud voornamelijk gemaakt met AI — vermelding ‘Developed with AI’ vereist.
Mode d’accès|Access mode|Modo de acceso|Zugangsart|Modalità di accesso|Toegangsmodus
La visite est gratuite et ouverte à tous.|The tour is free and open to everyone.|La visita es gratuita y abierta a todos.|Die Tour ist kostenlos und für alle zugänglich.|La visita è gratuita e aperta a tutti.|De tour is gratis en voor iedereen toegankelijk.
La visite est réservée aux abonnés.|The tour is reserved for subscribers.|La visita está reservada a los suscriptores.|Die Tour ist Abonnenten vorbehalten.|La visita è riservata agli abbonati.|De tour is voorbehouden aan abonnees.
La visite est vendue à l’unité : {0}.|The tour is sold individually: {0}.|La visita se vende por separado: {0}.|Die Tour wird einzeln verkauft: {0}.|La visita è venduta singolarmente: {0}.|De tour wordt afzonderlijk verkocht: {0}.
Le prix doit être compris entre 0,99 € et 49,99 €.|The price must be between €0.99 and €49.99.|El precio debe estar entre 0,99 € y 49,99 €.|Der Preis muss zwischen 0,99 € und 49,99 € liegen.|Il prezzo deve essere compreso tra 0,99 € e 49,99 €.|De prijs moet tussen € 0,99 en € 49,99 liggen.
Le mode d’accès n’est pas renseigné ou est invalide.|The access mode is missing or invalid.|El modo de acceso no está indicado o no es válido.|Die Zugangsart fehlt oder ist ungültig.|La modalità di accesso non è indicata o non è valida.|De toegangsmodus ontbreekt of is ongeldig.
Nombre de scènes actives|Number of active scenes|Número de escenas activas|Anzahl aktiver Szenen|Numero di scene attive|Aantal actieve scènes
{0} scène(s) active(s).|{0} active scene(s).|{0} escena(s) activa(s).|{0} aktive Szenen.|{0} scene attive.|{0} actieve scènes.
Coordonnées GPS|GPS coordinates|Coordenadas GPS|GPS-Koordinaten|Coordinate GPS|GPS-coördinaten
Toutes les scènes ont des coordonnées valides.|All scenes have valid coordinates.|Todas las escenas tienen coordenadas válidas.|Alle Szenen haben gültige Koordinaten.|Tutte le scene hanno coordinate valide.|Alle scènes hebben geldige coördinaten.
GPS absent ou invalide : {0}.|Missing or invalid GPS: {0}.|GPS ausente o inválido: {0}.|GPS fehlt oder ist ungültig: {0}.|GPS mancante o non valido: {0}.|GPS ontbreekt of is ongeldig: {0}.
Tracé du parcours|Route path|Trazado de la ruta|Routenverlauf|Tracciato del percorso|Routeverloop
{0} points composent le tracé.|The route has {0} points.|La ruta tiene {0} puntos.|Die Route hat {0} Punkte.|Il tracciato ha {0} punti.|De route heeft {0} punten.
Le tracé persistant est absent, trop court ou invalide.|The saved route is missing, too short or invalid.|La ruta guardada falta, es demasiado corta o no es válida.|Die gespeicherte Route fehlt, ist zu kurz oder ungültig.|Il tracciato salvato manca, è troppo breve o non valido.|De opgeslagen route ontbreekt, is te kort of ongeldig.
Titre et description en {0}|Title and description in {0}|Título y descripción en {0}|Titel und Beschreibung in {0}|Titolo e descrizione in {0}|Titel en beschrijving in {0}
Sans objet pour la langue source.|Not applicable to the source language.|No se aplica al idioma original.|Für die Ausgangssprache nicht relevant.|Non applicabile alla lingua originale.|Niet van toepassing op de brontaal.
Le titre et la description traduits sont renseignés.|Translated title and description are filled in.|El título y la descripción traducidos están completos.|Übersetzter Titel und Beschreibung sind ausgefüllt.|Titolo e descrizione tradotti sono compilati.|Vertaalde titel en beschrijving zijn ingevuld.
Le titre ou la description traduite est absent.|Translated title or description is missing.|Falta el título o la descripción traducidos.|Übersetzter Titel oder Beschreibung fehlt.|Manca il titolo o la descrizione tradotti.|Vertaalde titel of beschrijving ontbreekt.
Contenu complet en {0}|Complete content in {0}|Contenido completo en {0}|Vollständiger Inhalt in {0}|Contenuto completo in {0}|Volledige inhoud in {0}
Contenu source complet|Complete source content|Contenido original completo|Vollständiger Quellinhalt|Contenuto originale completo|Volledige broninhoud
Rejeté|Rejected|Rechazado|Abgelehnt|Rifiutato|Afgewezen
Impossible de charger les analytics.|Unable to load analytics.|No se pudieron cargar las estadísticas.|Die Statistiken konnten nicht geladen werden.|Impossibile caricare le statistiche.|De statistieken konden niet worden geladen.
Le grand livre n’a pas pu être lu.|The ledger could not be read.|No se pudo leer el libro contable.|Das Kostenbuch konnte nicht gelesen werden.|Impossibile leggere il registro contabile.|Het kostenboek kon niet worden gelezen.
Analytics Studio|Studio analytics|Estadísticas del Studio|Studio-Statistiken|Statistiche dello Studio|Studio-statistieken
Aucune donnée disponible. Cette vue se remplira au fur et à mesure que des guides publieront des visites.|No data available. This view will fill as guides publish tours.|No hay datos. Esta vista se completará cuando los guías publiquen visitas.|Noch keine Daten. Diese Ansicht füllt sich, sobald Guides Touren veröffentlichen.|Nessun dato disponibile. Questa vista si popolerà quando le guide pubblicheranno visite.|Nog geen gegevens. Dit overzicht wordt gevuld wanneer gidsen tours publiceren.
Funnel de production|Production funnel|Embudo de producción|Produktionsablauf|Flusso di produzione|Productieoverzicht
Sessions terrain|Field sessions|Sesiones de campo|Vor-Ort-Sitzungen|Sessioni sul campo|Veldsessies
Studios créés|Studios created|Studios creados|Erstellte Studios|Studio creati|Aangemaakte Studio's
Enregistrés|Recorded|Grabados|Aufgenommen|Registrati|Opgenomen
Publiés|Published|Publicados|Veröffentlicht|Pubblicati|Gepubliceerd
Distribution des statuts|Status distribution|Distribución de estados|Statusverteilung|Distribuzione degli stati|Verdeling van statussen
Dépense mesurée (grand livre)|Measured spending (ledger)|Gasto medido (libro contable)|Gemessene Ausgaben (Kostenbuch)|Spesa misurata (registro)|Gemeten uitgaven (kostenboek)
Production par Visite|Production by tour|Producción por visita|Produktion je Tour|Produzione per visita|Productie per tour
Tour|Tour|Visita|Tour|Visita|Tour
Scènes avec audio|Scenes with audio|Escenas con audio|Szenen mit Audio|Scene con audio|Scènes met audio
Ce tableau ne porte plus de coût : il était calculé sur quatre constantes en dur, jamais mesurées sur ce système. Le coût réel est au grand livre, ci-dessus.|This table no longer shows costs calculated from four fixed assumptions. Actual measured costs are in the ledger above.|Esta tabla ya no muestra costes calculados a partir de cuatro valores fijos. Los costes medidos están en el libro contable anterior.|Diese Tabelle zeigt keine Kosten mehr aus vier festen Annahmen. Tatsächlich gemessene Kosten stehen im Kostenbuch oben.|Questa tabella non mostra più costi calcolati da quattro valori fissi. I costi misurati sono nel registro sopra.|Deze tabel toont geen kosten meer op basis van vier vaste aannames. Werkelijk gemeten kosten staan in het kostenboek hierboven.
Lecture du grand livre…|Reading the ledger…|Leyendo el libro contable…|Kostenbuch wird gelesen…|Lettura del registro…|Kostenboek lezen…
Aucun coût n’est estimé à la place : un « — » honnête vaut mieux qu’un chiffre faux.|No estimated cost is substituted: an honest dash is better than an incorrect number.|No se sustituye por una estimación: un guion honesto vale más que una cifra falsa.|Es wird keine Schätzung eingesetzt: Ein ehrlicher Strich ist besser als eine falsche Zahl.|Non viene sostituita una stima: un trattino onesto vale più di un numero falso.|Er wordt geen schatting ingevuld: een eerlijk streepje is beter dan een onjuist getal.
Enveloppe|Budget|Presupuesto|Budget|Budget|Budget
engagés|committed|comprometidos|gebunden|impegnati|vastgelegd
sur|of|de|von|su|van
— non armée (|— not enabled (|— no activado (|— nicht aktiviert (|— non attivato (|— niet ingeschakeld (
sans plafond|no limit|sin límite|ohne Obergrenze|senza limite|zonder limiet
Le grand livre ne porte encore aucun débit. Il part de zéro : toute la dépense antérieure a été journalisée avant qu’il existe, et n’est pas récupérable ici.|The ledger has no debits yet. It starts from zero; earlier spending was logged before it existed and cannot be recovered here.|El libro contable aún no tiene cargos. Empieza de cero; el gasto anterior se registró antes de su creación y no se puede recuperar aquí.|Das Kostenbuch enthält noch keine Buchungen. Frühere Ausgaben wurden vor seiner Einrichtung protokolliert und sind hier nicht abrufbar.|Il registro non contiene ancora addebiti. Parte da zero; le spese precedenti non sono recuperabili qui.|Het kostenboek bevat nog geen afboekingen. Het begint bij nul; eerdere uitgaven zijn hier niet terug te halen.
Ce n’est pas « 0 $ dépensé » — c’est « rien de mesuré à ce jour ».|This means “nothing measured yet”, not “$0 spent”.|Significa «nada medido hasta ahora», no «0 $ gastados».|Das bedeutet „bisher nichts gemessen“, nicht „0 $ ausgegeben“.|Significa «nulla misurato finora», non «0 $ spesi».|Dit betekent ‘nog niets gemeten’, niet ‘$ 0 uitgegeven’.
Visite / producteur|Tour / producer|Visita / productor|Tour / Anbieter|Visita / produttore|Tour / producent
Mesuré|Measured|Medido|Gemessen|Misurato|Gemeten
Provisionné|Reserved|Reservado|Reserviert|Accantonato|Gereserveerd
Relâché|Released|Liberado|Freigegeben|Rilasciato|Vrijgegeven
Trois grandeurs distinctes, jamais additionnées :|Three separate amounts, never added together:|Tres importes distintos, que nunca se suman:|Drei getrennte Beträge, die niemals addiert werden:|Tre importi distinti, mai sommati:|Drie afzonderlijke bedragen, die nooit worden opgeteld:
mesuré|measured|medido|gemessen|misurato|gemeten
(débit conclu),|(completed debit),|(cargo completado),|(abgeschlossene Buchung),|(addebito concluso),|(voltooide afboeking),
provisionné|reserved|reservado|reserviert|accantonato|gereserveerd
(appel encore en vol),|(request still running),|(solicitud en curso),|(Anfrage läuft noch),|(richiesta in corso),|(aanvraag loopt nog),
relâché|released|liberado|freigegeben|rilasciato|vrijgegeven
(appel mort avant d’émettre — le gaspillage). Périodes lues :|(request stopped before output — waste). Periods read:|(solicitud detenida antes del resultado — desperdicio). Periodos leídos:|(Anfrage vor der Ausgabe beendet — Verlust). Gelesene Zeiträume:|(richiesta interrotta prima del risultato — spreco). Periodi letti:|(aanvraag gestopt vóór uitvoer — verspilling). Gelezen perioden:
Impossible de charger les guides.|Unable to load guides.|No se pudieron cargar los guías.|Guides konnten nicht geladen werden.|Impossibile caricare le guide.|Gidsen konden niet worden geladen.
Action refusée par le serveur.|The server rejected the action.|El servidor rechazó la acción.|Der Server hat die Aktion abgelehnt.|Il server ha rifiutato l’azione.|De server heeft de actie geweigerd.
Tous les guides|All guides|Todos los guías|Alle Guides|Tutte le guide|Alle gidsen
Rechercher un guide...|Search for a guide...|Buscar un guía...|Guide suchen...|Cerca una guida...|Een gids zoeken...
Toutes les villes|All cities|Todas las ciudades|Alle Städte|Tutte le città|Alle steden
Tous les statuts|All statuses|Todos los estados|Alle Status|Tutti gli stati|Alle statussen
Actif|Active|Activo|Aktiv|Attivo|Actief
En attente|Pending|Pendiente|Ausstehend|In attesa|In afwachting
Suspendu|Suspended|Suspendido|Gesperrt|Sospeso|Geschorst
guides|guides|guías|Guides|guide|gidsen
Aucun guide trouvé.|No guides found.|No se encontraron guías.|Keine Guides gefunden.|Nessuna guida trovata.|Geen gidsen gevonden.
Guide|Guide|Guía|Guide|Guida|Gids
Parcours|Tours|Recorridos|Touren|Percorsi|Routes
Note|Rating|Valoración|Bewertung|Valutazione|Beoordeling
Actions|Actions|Acciones|Aktionen|Azioni|Acties
Activer|Activate|Activar|Aktivieren|Attiva|Activeren
Rejeter|Reject|Rechazar|Ablehnen|Rifiuta|Afwijzen
Profil introuvable|Profile not found|Perfil no encontrado|Profil nicht gefunden|Profilo non trovato|Profiel niet gevonden
Erreur lors du chargement|Loading error|Error de carga|Fehler beim Laden|Errore di caricamento|Fout bij laden
Session expirée — reconnectez-vous.|Session expired — sign in again.|Sesión caducada: vuelve a iniciar sesión.|Sitzung abgelaufen — bitte erneut anmelden.|Sessione scaduta: accedi di nuovo.|Sessie verlopen — meld je opnieuw aan.
Accès administrateur requis.|Administrator access required.|Se requiere acceso de administrador.|Administratorzugriff erforderlich.|È richiesto l’accesso amministratore.|Beheerderstoegang vereist.
Lecture Cognito indisponible.|Cognito lookup unavailable.|Consulta de Cognito no disponible.|Cognito-Abfrage nicht verfügbar.|Consultazione Cognito non disponibile.|Cognito-gegevens niet beschikbaar.
Aucune adresse email Cognito trouvée.|No Cognito email address found.|No se encontró un correo de Cognito.|Keine Cognito-E-Mail-Adresse gefunden.|Nessun indirizzo email Cognito trovato.|Geen Cognito-e-mailadres gevonden.
Statut mis à jour.|Status updated.|Estado actualizado.|Status aktualisiert.|Stato aggiornato.|Status bijgewerkt.
← Retour|← Back|← Volver|← Zurück|← Indietro|← Terug
← Tous les guides|← All guides|← Todos los guías|← Alle Guides|← Tutte le guide|← Alle gidsen
Voir catalogue|View catalogue|Ver catálogo|Katalog ansehen|Vedi catalogo|Catalogus bekijken
Activer le compte|Activate account|Activar cuenta|Konto aktivieren|Attiva account|Account activeren
Email :|Email:|Correo:|E-Mail:|Email:|E-mail:
Décisions|Decisions|Decisiones|Entscheidungen|Decisioni|Besluiten
ID profil|Profile ID|ID de perfil|Profil-ID|ID profilo|Profiel-ID
ID utilisateur|User ID|ID de usuario|Benutzer-ID|ID utente|Gebruikers-ID
Expérience|Experience|Experiencia|Erfahrung|Esperienza|Ervaring
{0} ans|{0} years|{0} años|{0} Jahre|{0} anni|{0} jaar
Parcours signature|Signature tours|Recorridos destacados|Besondere Touren|Percorsi distintivi|Kenmerkende routes
Bio|Biography|Biografía|Biografie|Biografia|Biografie
Spécialités|Specialities|Especialidades|Spezialgebiete|Specialità|Specialiteiten
Langues|Languages|Idiomas|Sprachen|Lingue|Talen
Parcours (|Tours (|Recorridos (|Touren (|Percorsi (|Routes (
Aucun parcours créé.|No tours created.|No hay recorridos creados.|Noch keine Touren erstellt.|Nessun percorso creato.|Geen routes aangemaakt.
Voir|View|Ver|Ansehen|Vedi|Bekijken
Admin|Admin|Admin|Admin|Admin|Beheer
File d'attente|Queue|Cola|Warteschlange|Coda|Wachtrij
Toutes les visites|All tours|Todas las visitas|Alle Touren|Tutte le visite|Alle tours
Narrations demandées|Requested narrations|Narraciones solicitadas|Angeforderte Erzählungen|Narrazioni richieste|Aangevraagde vertellingen
Analytics|Analytics|Analíticas|Analysen|Analisi|Analyse
Admin · Modération|Admin · Moderation|Admin · Moderación|Admin · Moderation|Admin · Moderazione|Beheer · Moderatie
Administration|Administration|Administración|Verwaltung|Amministrazione|Beheer
Se déconnecter|Sign out|Cerrar sesión|Abmelden|Esci|Afmelden
Impossible de charger l’historique.|Unable to load history.|No se pudo cargar el historial.|Verlauf konnte nicht geladen werden.|Impossibile caricare la cronologia.|Geschiedenis kon niet worden geladen.
Historique de modération|Moderation history|Historial de moderación|Moderationsverlauf|Cronologia moderazione|Moderatiegeschiedenis
Toutes les décisions|All decisions|Todas las decisiones|Alle Entscheidungen|Tutte le decisioni|Alle besluiten
Approuvé|Approved|Aprobado|Genehmigt|Approvato|Goedgekeurd
Aucun historique de modération.|No moderation history.|Sin historial de moderación.|Kein Moderationsverlauf.|Nessuna cronologia di moderazione.|Geen moderatiegeschiedenis.
Date|Date|Fecha|Datum|Data|Datum
Décision|Decision|Decisión|Entscheidung|Decisione|Besluit
Impossible de charger la file de modération.|Unable to load the moderation queue.|No se pudo cargar la cola de moderación.|Moderationswarteschlange konnte nicht geladen werden.|Impossibile caricare la coda di moderazione.|Moderatiewachtrij kon niet worden geladen.
File d'attente de modération|Moderation queue|Cola de moderación|Moderationswarteschlange|Coda di moderazione|Moderatiewachtrij
Temps moyen de revue|Average review time|Tiempo medio de revisión|Durchschnittliche Prüfzeit|Tempo medio di revisione|Gemiddelde beoordelingstijd
Taux d'approbation|Approval rate|Tasa de aprobación|Genehmigungsquote|Tasso di approvazione|Goedkeuringspercentage
Revues ce mois|Reviews this month|Revisiones este mes|Prüfungen diesen Monat|Revisioni questo mese|Beoordelingen deze maand
Toutes les langues|All languages|Todos los idiomas|Alle Sprachen|Tutte le lingue|Alle talen
Resoumis|Resubmitted|Reenviado|Erneut eingereicht|Reinviato|Opnieuw ingediend
Aucune visite en attente de modération.|No tours awaiting moderation.|No hay visitas pendientes de moderación.|Keine Touren warten auf Moderation.|Nessuna visita in attesa di moderazione.|Geen tours wachten op moderatie.
Les nouvelles soumissions apparaîtront ici.|New submissions will appear here.|Los nuevos envíos aparecerán aquí.|Neue Einreichungen erscheinen hier.|I nuovi invii appariranno qui.|Nieuwe inzendingen verschijnen hier.
Narration|Narration|Narración|Erzählung|Narrazione|Vertelling
Soumis le|Submitted on|Enviado el|Eingereicht am|Inviato il|Ingediend op
Action|Action|Acción|Aktion|Azione|Actie
Source|Source|Origen|Quelle|Origine|Bron
Mode à migrer|Mode requires migration|Modo por migrar|Modus muss migriert werden|Modalità da migrare|Modus moet worden gemigreerd
Examiner|Review|Revisar|Prüfen|Esamina|Beoordelen
Photos (|Photos (|Fotos (|Fotos (|Foto (|Foto’s (
Précédente|Previous|Anterior|Vorherige|Precedente|Vorige
Chargement de la session impossible|Unable to load session|No se pudo cargar la sesión|Sitzung konnte nicht geladen werden|Impossibile caricare la sessione|Sessie kon niet worden geladen
Chargement des métadonnées traduites impossible|Unable to load translated metadata|No se pudieron cargar los metadatos traducidos|Übersetzte Metadaten konnten nicht geladen werden|Impossibile caricare i metadati tradotti|Vertaalde metadata konden niet worden geladen
Chargement des segments impossible|Unable to load segments|No se pudieron cargar los segmentos|Segmente konnten nicht geladen werden|Impossibile caricare i segmenti|Segmenten konden niet worden geladen
Chargement des achats de langue impossible|Unable to load language purchases|No se pudieron cargar las compras de idiomas|Sprachkäufe konnten nicht geladen werden|Impossibile caricare gli acquisti di lingue|Taalaankopen konden niet worden geladen
Chargement de la revue impossible|Unable to load review|No se pudo cargar la revisión|Prüfung konnte nicht geladen werden|Impossibile caricare la revisione|Beoordeling kon niet worden geladen
Impossible de charger les données de modération. Réessayez.|Unable to load moderation data. Try again.|No se pudieron cargar los datos de moderación. Inténtalo de nuevo.|Moderationsdaten konnten nicht geladen werden. Bitte erneut versuchen.|Impossibile caricare i dati di moderazione. Riprova.|Moderatiegegevens konden niet worden geladen. Probeer opnieuw.
Langue {0} approuvée|Language {0} approved|Idioma {0} aprobado|Sprache {0} genehmigt|Lingua {0} approvata|Taal {0} goedgekeurd
Langue {0} approuvée !|Language {0} approved!|¡Idioma {0} aprobado!|Sprache {0} genehmigt!|Lingua {0} approvata!|Taal {0} goedgekeurd!
Visite approuvée et publiée !|Tour approved and published!|¡Visita aprobada y publicada!|Tour genehmigt und veröffentlicht!|Visita approvata e pubblicata!|Tour goedgekeurd en gepubliceerd!
Erreur lors de l'approbation|Approval failed|Error al aprobar|Genehmigung fehlgeschlagen|Approvazione non riuscita|Goedkeuring mislukt
Langue {0} refusée.|Language {0} rejected.|Idioma {0} rechazado.|Sprache {0} abgelehnt.|Lingua {0} rifiutata.|Taal {0} afgewezen.
Retour envoyé au guide.|Feedback sent to the guide.|Comentarios enviados al guía.|Rückmeldung an den Guide gesendet.|Feedback inviato alla guida.|Feedback naar de gids gestuurd.
Erreur lors du rejet|Rejection failed|Error al rechazar|Ablehnung fehlgeschlagen|Rifiuto non riuscito|Afwijzing mislukt
Révision demandée pour {0}.|Revision requested for {0}.|Revisión solicitada para {0}.|Überarbeitung für {0} angefordert.|Revisione richiesta per {0}.|Herziening gevraagd voor {0}.
Renvoyé au guide pour corrections.|Sent back to the guide for corrections.|Devuelto al guía para correcciones.|Für Korrekturen an den Guide zurückgesendet.|Rinviato alla guida per correzioni.|Teruggestuurd naar de gids voor correcties.
Erreur lors du renvoi|Failed to return to guide|Error al devolver al guía|Rücksendung fehlgeschlagen|Rinvio non riuscito|Terugsturen mislukt
Erreur lors de l'ajout du commentaire|Unable to add comment|No se pudo añadir el comentario|Kommentar konnte nicht hinzugefügt werden|Impossibile aggiungere il commento|Reactie kon niet worden toegevoegd
Élément de modération introuvable.|Moderation item not found.|Elemento de moderación no encontrado.|Moderationseintrag nicht gefunden.|Elemento di moderazione non trovato.|Moderatie-item niet gevonden.
Retour à la file d'attente|Back to queue|Volver a la cola|Zurück zur Warteschlange|Torna alla coda|Terug naar de wachtrij
← Retour à la file d'attente|← Back to queue|← Volver a la cola|← Zurück zur Warteschlange|← Torna alla coda|← Terug naar de wachtrij
En revue depuis|In review since|En revisión desde|In Prüfung seit|In revisione dal|In beoordeling sinds
← Précédent|← Previous|← Anterior|← Zurück|← Precedente|← Vorige
Suivant →|Next →|Siguiente →|Weiter →|Successivo →|Volgende →
Nouveau guide|New guide|Nuevo guía|Neuer Guide|Nuova guida|Nieuwe gids
soumissions ·|submissions ·|envíos ·|Einreichungen ·|invii ·|inzendingen ·
% approuvé|% approved|% aprobado|% genehmigt|% approvato|% goedgekeurd
parcours|tours|recorridos|Touren|percorsi|routes
Langues:|Languages:|Idiomas:|Sprachen:|Lingue:|Talen:
Commentaires admin existants|Existing admin comments|Comentarios del administrador|Vorhandene Admin-Kommentare|Commenti amministratore esistenti|Bestaande beheerdersreacties
Comparaison|Comparison|Comparación|Vergleich|Confronto|Vergelijking
Description (|Description (|Descripción (|Beschreibung (|Descrizione (|Beschrijving (
Non traduite|Not translated|Sin traducir|Nicht übersetzt|Non tradotta|Niet vertaald
Scènes (|Scenes (|Escenas (|Szenen (|Scene (|Scènes (
{0} manquant|{0} missing|Falta {0}|{0} fehlt|{0} mancante|{0} ontbreekt
Traduction non disponible|Translation unavailable|Traducción no disponible|Übersetzung nicht verfügbar|Traduzione non disponibile|Vertaling niet beschikbaar
Lecture audio|Audio playback|Reproducción de audio|Audiowiedergabe|Riproduzione audio|Audio afspelen
👁 Aperçu touriste|👁 Visitor preview|👁 Vista del visitante|👁 Besuchervorschau|👁 Anteprima visitatore|👁 Bezoekersvoorbeeld
Scènes ({0})|Scenes ({0})|Escenas ({0})|Szenen ({0})|Scene ({0})|Scènes ({0})
ACCÈS NON RENSEIGNÉ|ACCESS NOT SPECIFIED|ACCESO NO INDICADO|ZUGANG NICHT ANGEGEBEN|ACCESSO NON INDICATO|TOEGANG NIET OPGEGEVEN
Titre non traduit|Title not translated|Título sin traducir|Titel nicht übersetzt|Titolo non tradotto|Titel niet vertaald
points d'intérêt · Difficulté :|points of interest · Difficulty:|puntos de interés · Dificultad:|Sehenswürdigkeiten · Schwierigkeit:|punti di interesse · Difficoltà:|bezienswaardigheden · Moeilijkheid:
Accès :|Access:|Acceso:|Zugang:|Accesso:|Toegang:
Payante — {0}|Paid — {0}|De pago — {0}|Kostenpflichtig — {0}|A pagamento — {0}|Betaald — {0}
prix non défini|price not set|precio sin definir|Preis nicht festgelegt|prezzo non definito|prijs niet ingesteld
non renseigné|not specified|sin indicar|nicht angegeben|non indicato|niet opgegeven
Origine éditoriale :|Editorial origin:|Origen editorial:|Redaktioneller Ursprung:|Origine editoriale:|Redactionele oorsprong:
écrit par le guide|written by the guide|escrito por el guía|vom Guide verfasst|scritto dalla guida|geschreven door de gids
créé avec l’aide de l’IA|created with AI assistance|creado con ayuda de IA|mit KI-Unterstützung erstellt|creato con l’aiuto dell’IA|gemaakt met hulp van AI
créé principalement avec l’IA|created mainly with AI|creado principalmente con IA|überwiegend mit KI erstellt|creato principalmente con l’IA|voornamelijk gemaakt met AI
non renseignée|not specified|sin indicar|nicht angegeben|non indicata|niet opgegeven
Developed with AI|Developed with AI|Creado con IA|Mit KI erstellt|Creato con IA|Gemaakt met AI
Guide local ·|Local guide ·|Guía local ·|Lokaler Guide ·|Guida locale ·|Lokale gids ·
Langues :|Languages:|Idiomas:|Sprachen:|Lingue:|Talen:
À propos de cette visite (|About this tour (|Acerca de esta visita (|Über diese Tour (|Informazioni sulla visita (|Over deze tour (
Voir original (FR)|View original (FR)|Ver original (FR)|Original ansehen (FR)|Vedi originale (FR)|Origineel bekijken (FR)
Description non traduite en|Description not translated into|Descripción sin traducir al|Beschreibung nicht übersetzt in|Descrizione non tradotta in|Beschrijving niet vertaald in
. Aucun texte source n’est utilisé comme traduction.|. Source text is never presented as a translation.|. El texto original nunca se presenta como traducción.|. Quelltext wird niemals als Übersetzung dargestellt.|. Il testo originale non viene presentato come traduzione.|. Brontekst wordt nooit als vertaling getoond.
· Tracé du guide|· Guide’s route|· Ruta del guía|· Route des Guides|· Tracciato della guida|· Route van de gids
· Tracé auto (le guide n'a pas persisté son tracé)|· Automatic route (guide’s route not saved)|· Ruta automática (el guía no guardó su ruta)|· Automatische Route (Guide-Route nicht gespeichert)|· Tracciato automatico (la guida non ha salvato il tracciato)|· Automatische route (gids heeft route niet opgeslagen)
Diagnostic segments (|Segment diagnostics (|Diagnóstico de segmentos (|Segmentdiagnose (|Diagnostica segmenti (|Segmentdiagnose (
Chargement des segments...|Loading segments...|Cargando segmentos...|Segmente werden geladen...|Caricamento segmenti...|Segmenten laden...
minutes|minutes|minutos|Minuten|minuti|minuten
points d'intérêt|points of interest|puntos de interés|Sehenswürdigkeiten|punti di interesse|bezienswaardigheden
difficulté|difficulty|dificultad|Schwierigkeit|difficoltà|moeilijkheid
Android (preview)|Android (preview)|Android (vista previa)|Android (Vorschau)|Android (anteprima)|Android (voorbeeld)
iOS (preview)|iOS (preview)|iOS (vista previa)|iOS (Vorschau)|iOS (anteprima)|iOS (voorbeeld)
Non traduite en|Not translated into|Sin traducir al|Nicht übersetzt in|Non tradotta in|Niet vertaald in
Description|Description|Descripción|Beschreibung|Descrizione|Beschrijving
Difficulté:|Difficulty:|Dificultad:|Schwierigkeit:|Difficoltà:|Moeilijkheid:
Langue:|Language:|Idioma:|Sprache:|Lingua:|Taal:
Aucune scène disponible|No scenes available|No hay escenas disponibles|Keine Szenen verfügbar|Nessuna scena disponibile|Geen scènes beschikbaar
Pas d'audio|No audio|Sin audio|Kein Audio|Nessun audio|Geen audio
photo|photo|foto|Foto|foto|foto
Points d'intérêt|Points of interest|Puntos de interés|Sehenswürdigkeiten|Punti di interesse|Bezienswaardigheden
⚠ Pas de GPS|⚠ No GPS|⚠ Sin GPS|⚠ Kein GPS|⚠ Nessun GPS|⚠ Geen GPS
Contrôles automatiques|Automatic checks|Comprobaciones automáticas|Automatische Prüfungen|Controlli automatici|Automatische controles
Contrôle d’interface — l’autorité serveur sera ajoutée séparément.|Interface check — server enforcement will be added separately.|Control de interfaz: la validación del servidor se añadirá por separado.|Oberflächenprüfung — serverseitige Durchsetzung wird separat ergänzt.|Controllo dell’interfaccia: la verifica del server sarà aggiunta separatamente.|Interfacecontrole — servercontrole wordt afzonderlijk toegevoegd.
{0} blocage(s)|{0} blocking issue(s)|{0} bloqueo(s)|{0} blockierende Probleme|{0} blocchi|{0} blokkades
Checklist qualité|Quality checklist|Lista de calidad|Qualitätscheckliste|Lista qualità|Kwaliteitschecklist
Note (optionnel)|Note (optional)|Nota (opcional)|Notiz (optional)|Nota (facoltativa)|Notitie (optioneel)
Notes générales|General notes|Notas generales|Allgemeine Notizen|Note generali|Algemene notities
Observations supplémentaires…|Additional observations…|Observaciones adicionales…|Weitere Anmerkungen…|Osservazioni aggiuntive…|Aanvullende opmerkingen…
Valider et publier|Approve and publish|Aprobar y publicar|Genehmigen und veröffentlichen|Approva e pubblica|Goedkeuren en publiceren
Corrigez tous les blocages automatiques avant de valider|Resolve all automatic blocking issues before approving|Resuelve todos los bloqueos automáticos antes de aprobar|Vor der Genehmigung alle automatischen Blockierungen beheben|Risolvi tutti i blocchi automatici prima di approvare|Los alle automatische blokkades op voordat je goedkeurt
Cochez tous les items de la checklist pour valider|Check every checklist item to approve|Marca todos los elementos para aprobar|Zum Genehmigen alle Prüfpunkte abhaken|Spunta tutte le voci per approvare|Vink alle controlepunten aan om goed te keuren
Commenter|Comment|Comentar|Kommentieren|Commenta|Reageren
Renvoyer au guide|Return to guide|Devolver al guía|An Guide zurücksenden|Rinvia alla guida|Terugsturen naar gids
Ajouter un commentaire|Add a comment|Añadir un comentario|Kommentar hinzufügen|Aggiungi un commento|Reactie toevoegen
Scène (optionnel)|Scene (optional)|Escena (opcional)|Szene (optional)|Scena (facoltativa)|Scène (optioneel)
Commentaire global|General comment|Comentario general|Allgemeiner Kommentar|Commento generale|Algemene reactie
Votre commentaire...|Your comment...|Tu comentario...|Dein Kommentar...|Il tuo commento...|Je reactie...
Envoyer le commentaire|Send comment|Enviar comentario|Kommentar senden|Invia commento|Reactie versturen
Renvoyer au guide pour corrections|Return to guide for corrections|Devolver al guía para correcciones|Für Korrekturen an Guide zurücksenden|Rinvia alla guida per correzioni|Terugsturen naar gids voor correcties
Préciser les corrections attendues (min. 10 caractères)…|Describe the required corrections (min. 10 characters)…|Describe las correcciones necesarias (mín. 10 caracteres)…|Erforderliche Korrekturen beschreiben (mind. 10 Zeichen)…|Descrivi le correzioni richieste (min. 10 caratteri)…|Beschrijf de vereiste correcties (min. 10 tekens)…
/10 caractères minimum|/10 characters minimum|/10 caracteres mínimo|/10 Zeichen mindestens|/10 caratteri minimo|/10 tekens minimaal
Refuser le parcours|Reject tour|Rechazar recorrido|Tour ablehnen|Rifiuta percorso|Tour afwijzen
Catégorie|Category|Categoría|Kategorie|Categoria|Categorie
Feedback (min. 20 caractères)|Feedback (min. 20 characters)|Comentarios (mín. 20 caracteres)|Rückmeldung (mind. 20 Zeichen)|Feedback (min. 20 caratteri)|Feedback (min. 20 tekens)
Soyez précis pour aider le guide à améliorer…|Be specific to help the guide improve…|Sé preciso para ayudar al guía a mejorar…|Sei konkret, damit der Guide Verbesserungen vornehmen kann…|Sii preciso per aiutare la guida a migliorare…|Wees concreet om de gids te helpen verbeteren…
/20 caractères minimum|/20 characters minimum|/20 caracteres mínimo|/20 Zeichen mindestens|/20 caratteri minimo|/20 tekens minimaal
POIs concernés (optionnel)|Affected POIs (optional)|Puntos afectados (opcional)|Betroffene POIs (optional)|POI interessati (facoltativo)|Betrokken POI’s (optioneel)
Refuser définitivement|Reject permanently|Rechazar definitivamente|Endgültig ablehnen|Rifiuta definitivamente|Definitief afwijzen
Aucune demande.|No requests.|No hay solicitudes.|Keine Anfragen.|Nessuna richiesta.|Geen aanvragen.
Registre des demandes illisible.|Unable to read request register.|No se pudo leer el registro de solicitudes.|Anfrageregister konnte nicht gelesen werden.|Impossibile leggere il registro richieste.|Aanvragenregister kon niet worden gelezen.
Narrations à la demande|On-demand narrations|Narraciones bajo demanda|Erzählungen auf Abruf|Narrazioni su richiesta|Vertellingen op aanvraag
Le registre des demandes de fabrication, joint à l’état de chaque Paire (Visite × langue).|Generation requests with the status of each pair (tour × language).|Solicitudes de generación con el estado de cada par (visita × idioma).|Erstellungsanfragen mit dem Status jedes Paars (Tour × Sprache).|Richieste di generazione con lo stato di ogni coppia (visita × lingua).|Generatieaanvragen met de status van elk paar (tour × taal).
Une demande n’est pas un visiteur.|A request is not a visitor.|Una solicitud no es un visitante.|Eine Anfrage ist kein Besucher.|Una richiesta non è un visitatore.|Een aanvraag is geen bezoeker.
Une ligne existe par triplet|There is one row per combination|Hay una fila por combinación|Es gibt eine Zeile je Kombination|Esiste una riga per combinazione|Er is één rij per combinatie
(Visite, langue, version)|(tour, language, version)|(visita, idioma, versión)|(Tour, Sprache, Version)|(visita, lingua, versione)|(tour, taal, versie)
: le deuxième visiteur qui ouvre la même langue est|: a second visitor opening the same language is|: un segundo visitante que abre el mismo idioma se|: ein zweiter Besucher derselben Sprache wird|: un secondo visitatore che apre la stessa lingua viene|: een tweede bezoeker die dezelfde taal opent wordt
absorbé|deduplicated|agrupa|zusammengeführt|raggruppato|samengevoegd
et n’écrit rien. La colonne « Premier demandeur » nomme donc celui qui a fait naître la ligne, pas l’ensemble de ceux qui l’ont réclamée. Le décompte par utilisateur se lit dans le journal CloudWatch d’|and creates no new row. “First requester” identifies who created the row, not everyone who requested it. Counts per user are in the CloudWatch log for|y no crea otra fila. «Primer solicitante» identifica a quien creó la fila. El recuento por usuario está en el registro CloudWatch de|und erzeugt keine neue Zeile. „Erster Anfragender“ nennt den Ersteller der Zeile. Zahlen je Nutzer stehen im CloudWatch-Protokoll von|e non crea una nuova riga. «Primo richiedente» identifica chi ha creato la riga. I conteggi per utente sono nel registro CloudWatch di|en maakt geen nieuwe rij. ‘Eerste aanvrager’ noemt wie de rij maakte. Aantallen per gebruiker staan in het CloudWatch-logboek van
, qui trace aussi les ouvertures absorbées.|, which also records deduplicated requests.|, que también registra las solicitudes agrupadas.|, das auch zusammengeführte Anfragen erfasst.|, che registra anche le richieste raggruppate.|, dat ook samengevoegde aanvragen registreert.
Demandes enregistrées|Recorded requests|Solicitudes registradas|Erfasste Anfragen|Richieste registrate|Geregistreerde aanvragen
En attente d’admission|Awaiting admission|Pendiente de admisión|Wartet auf Zulassung|In attesa di ammissione|Wacht op toelating
Visites concernées|Affected tours|Visitas afectadas|Betroffene Touren|Visite interessate|Betrokken tours
Paires en échec|Failed pairs|Pares fallidos|Fehlgeschlagene Paare|Coppie non riuscite|Mislukte paren
Par langue|By language|Por idioma|Nach Sprache|Per lingua|Per taal
Par visite (top 10)|By tour (top 10)|Por visita (top 10)|Nach Tour (Top 10)|Per visita (top 10)|Per tour (top 10)
Par mois|By month|Por mes|Nach Monat|Per mese|Per maand
Tous les états|All states|Todos los estados|Alle Zustände|Tutti gli stati|Alle statussen
Demandée le|Requested on|Solicitado el|Angefragt am|Richiesto il|Aangevraagd op
Visite|Tour|Visita|Tour|Visita|Tour
État de la Paire|Pair status|Estado del par|Paarstatus|Stato della coppia|Paarstatus
Admission|Admission|Admisión|Zulassung|Ammissione|Toelating
Premier demandeur|First requester|Primer solicitante|Erster Anfragender|Primo richiedente|Eerste aanvrager
scènes|scenes|escenas|Szenen|scene|scènes
Impossible de charger les visites.|Unable to load tours.|No se pudieron cargar las visitas.|Touren konnten nicht geladen werden.|Impossibile caricare le visite.|Tours konden niet worden geladen.
visites|tours|visitas|Touren|visite|tours
Aucune visite trouvée.|No tours found.|No se encontraron visitas.|Keine Touren gefunden.|Nessuna visita trovata.|Geen tours gevonden.
Voir dans le catalogue →|View in catalogue →|Ver en el catálogo →|Im Katalog ansehen →|Vedi nel catalogo →|In catalogus bekijken →
Langue source|Source language|Idioma original|Ausgangssprache|Lingua originale|Brontaal
File modération|Moderation queue|Cola de moderación|Moderationswarteschlange|Coda moderazione|Moderatiewachtrij
Crée un ModerationItem si manquant|Create a missing moderation item|Crear un elemento de moderación si falta|Fehlenden Moderationseintrag erstellen|Crea l’elemento di moderazione mancante|Ontbrekend moderatie-item aanmaken
Sync file|Sync queue|Sincronizar cola|Warteschlange synchronisieren|Sincronizza coda|Wachtrij synchroniseren
Réactiver|Reactivate|Reactivar|Reaktivieren|Riattiva|Opnieuw activeren
Suspendre cette visite ?|Suspend this tour?|¿Suspender esta visita?|Diese Tour sperren?|Sospendere questa visita?|Deze tour schorsen?
Réactiver cette visite ?|Reactivate this tour?|¿Reactivar esta visita?|Diese Tour reaktivieren?|Riattivare questa visita?|Deze tour opnieuw activeren?
La visite sera retirée de la plateforme et invisible aux utilisateurs.|The tour will be removed from the platform and hidden from users.|La visita se retirará de la plataforma y no será visible.|Die Tour wird von der Plattform entfernt und für Nutzer ausgeblendet.|La visita sarà rimossa dalla piattaforma e nascosta agli utenti.|De tour wordt van het platform verwijderd en verborgen voor gebruikers.
La visite sera à nouveau visible et accessible aux utilisateurs.|The tour will be visible and accessible to users again.|La visita volverá a ser visible y accesible.|Die Tour wird für Nutzer wieder sichtbar und zugänglich.|La visita sarà nuovamente visibile e accessibile.|De tour wordt weer zichtbaar en toegankelijk voor gebruikers.
Supprimer définitivement ?|Delete permanently?|¿Eliminar definitivamente?|Endgültig löschen?|Eliminare definitivamente?|Definitief verwijderen?
Cette action est irréversible. La visite, ses scènes, segments traduits, achats de langue et éléments de modération seront supprimés.|This cannot be undone. The tour, scenes, translated segments, language purchases and moderation items will be deleted.|Esta acción es irreversible. Se eliminarán la visita, escenas, segmentos traducidos, compras de idiomas y elementos de moderación.|Dies kann nicht rückgängig gemacht werden. Tour, Szenen, übersetzte Segmente, Sprachkäufe und Moderationseinträge werden gelöscht.|L’azione è irreversibile. Visita, scene, segmenti tradotti, acquisti di lingue ed elementi di moderazione saranno eliminati.|Dit kan niet ongedaan worden gemaakt. De tour, scènes, vertaalde segmenten, taalaankopen en moderatie-items worden verwijderd.
Suppression refusée par le serveur.|Deletion rejected by server.|El servidor rechazó la eliminación.|Löschen vom Server abgelehnt.|Eliminazione rifiutata dal server.|Verwijderen geweigerd door de server.
Scène {0}|Scene {0}|Escena {0}|Szene {0}|Scena {0}|Scène {0}
← Retour aux parcours|← Back to tours|← Volver a recorridos|← Zurück zu Touren|← Torna ai percorsi|← Terug naar routes
Parcours introuvable.|Tour not found.|Recorrido no encontrado.|Tour nicht gefunden.|Percorso non trovato.|Route niet gevonden.
À propos de cette visite|About this tour|Acerca de esta visita|Über diese Tour|Informazioni su questa visita|Over deze tour
Points d'intérêt (|Points of interest (|Puntos de interés (|Sehenswürdigkeiten (|Punti di interesse (|Bezienswaardigheden (
🎵 Audio disponible|🎵 Audio available|🎵 Audio disponible|🎵 Audio verfügbar|🎵 Audio disponibile|🎵 Audio beschikbaar
Aucune scène associée à ce parcours.|No scenes for this tour.|No hay escenas para este recorrido.|Keine Szenen für diese Tour.|Nessuna scena per questo percorso.|Geen scènes voor deze route.
prix|price|precio|Preis|prezzo|prijs
Activer ce compte guide ?|Activate this guide account?|¿Activar esta cuenta de guía?|Dieses Guide-Konto aktivieren?|Attivare questo account guida?|Dit gidsaccount activeren?
Le guide pourra publier des visites et apparaître dans le catalogue.|The guide can publish tours and appear in the catalogue.|El guía podrá publicar visitas y aparecer en el catálogo.|Der Guide kann Touren veröffentlichen und im Katalog erscheinen.|La guida potrà pubblicare visite e apparire nel catalogo.|De gids kan tours publiceren en in de catalogus verschijnen.
Suspendre ce compte guide ?|Suspend this guide account?|¿Suspender esta cuenta de guía?|Dieses Guide-Konto sperren?|Sospendere questo account guida?|Dit gidsaccount schorsen?
Ses visites restent en ligne mais le guide ne peut plus rien publier. Le motif lui sera visible.|Existing tours stay online, but the guide cannot publish. The guide will see the reason.|Sus visitas siguen en línea, pero el guía no podrá publicar. Verá el motivo.|Bestehende Touren bleiben online, aber der Guide kann nichts veröffentlichen. Die Begründung wird ihm angezeigt.|Le visite restano online, ma la guida non potrà pubblicare. Il motivo sarà visibile.|Bestaande tours blijven online, maar de gids kan niet publiceren. De reden wordt zichtbaar.
Rejeter ce compte guide ?|Reject this guide account?|¿Rechazar esta cuenta de guía?|Dieses Guide-Konto ablehnen?|Rifiutare questo account guida?|Dit gidsaccount afwijzen?
Le compte est refusé. Le motif lui sera visible.|The account is rejected. The guide will see the reason.|La cuenta se rechaza. El guía verá el motivo.|Das Konto wird abgelehnt. Die Begründung wird angezeigt.|L’account viene rifiutato. Il motivo sarà visibile.|Het account wordt afgewezen. De reden wordt zichtbaar.
Motif|Reason|Motivo|Begründung|Motivo|Reden
Ce que le guide lira : la règle enfreinte, ce qu'il peut corriger.|What the guide will see: the rule violated and what to correct.|Lo que verá el guía: la norma infringida y qué corregir.|Was der Guide sieht: verletzte Regel und mögliche Korrektur.|Cosa leggerà la guida: regola violata e cosa correggere.|Wat de gids ziet: de overtreden regel en wat te corrigeren.
{0}/{1} caractères minimum|{0}/{1} characters minimum|{0}/{1} caracteres mínimo|{0}/{1} Zeichen mindestens|{0}/{1} caratteri minimo|{0}/{1} tekens minimaal
Le motif sera visible par le guide.|The guide will see the reason.|El guía verá el motivo.|Der Guide sieht die Begründung.|La guida vedrà il motivo.|De gids ziet de reden.
Impossible de charger les données.|Unable to load data.|No se pudieron cargar los datos.|Daten konnten nicht geladen werden.|Impossibile caricare i dati.|Gegevens konden niet worden geladen.
Transféré|Transferred|Transferido|Übertragen|Trasferito|Overgezet
En revue|In review|En revisión|In Prüfung|In revisione|In beoordeling
En modération|In moderation|En moderación|In Moderation|In moderazione|In moderatie
Révision|Revision|Revisión|Überarbeitung|Revisione|Herziening
En file|Queued|En cola|In Warteschlange|In coda|In wachtrij
En fabrication|Generating|Generando|Wird erstellt|In generazione|Wordt gegenereerd
Partiellement prête|Partially ready|Parcialmente listo|Teilweise bereit|Parzialmente pronta|Gedeeltelijk klaar
Prête|Ready|Lista|Bereit|Pronta|Klaar
Échec|Failed|Fallido|Fehlgeschlagen|Non riuscito|Mislukt
`;

export const ADMIN_COPY: Record<string, Record<InterfaceLocale, string>> = Object.fromEntries(
  Object.values(INTERFACE_COPY).map(copy => [copy.fr, { ...copy }]),
);
export const ADMIN_KEYS = rows.trim().split('\n').map(row => row.split('|')[0]);
for (const row of rows.trim().split('\n')) {
  const [fr, en, es, de, it, nl] = row.split('|');
  if (![fr, en, es, de, it, nl].every(Boolean)) throw new Error(`Incomplete admin translation: ${fr}`);
  ADMIN_COPY[fr] = {fr, en, es, de, it, nl};
}

export function adminText(locale: InterfaceLocale, key: string, ...values: Array<string | number>): string {
  const copy = ADMIN_COPY[key];
  if (!copy) throw new Error(`Missing admin translation: ${key}`);
  return copy[locale].replace(/\{(\d+)\}/g, (token, index: string) => String(values[Number(index)] ?? token));
}
