import { visitorAuthUrl } from '@/lib/auth/visitor-routes';

const answers = {
  fr: [
    ['Faut-il un compte pour découvrir une visite ?', 'Le catalogue et les extraits disponibles sont accessibles sans compte. Pour acheter et retrouver vos achats, utilisez votre compte Murmure : le même sur le site et dans l’application.'],
    ['Comment écouter sur le site ?', 'Ouvrez une fiche et choisissez Découvrir l’audio. Lancez une étape ou la visite, mettez en pause et reprenez avec les commandes du lecteur. L’audio démarre après votre action.'],
    ['Que se passe-t-il après le paiement ?', 'La visite est accessible après confirmation du paiement et vérification de vos droits par le serveur. Retrouvez-la dans Mes visites avec le compte utilisé pour l’achat. Si la confirmation tarde, vérifiez vos visites avant de recommencer un achat.'],
    ['Puis-je changer de langue ?', 'Le lecteur propose les langues audio disponibles pour cette visite. Les langues du site et de l’écoute peuvent être différentes. Une traduction absente ne devient pas disponible en changeant la langue du site.'],
    ['Où est mémorisée ma progression ?', 'La reprise est enregistrée sur cet appareil, dans ce navigateur. Elle peut disparaître si vous effacez ses données ou vous déconnectez. Elle n’est pas synchronisée entre appareils.'],
    ['Puis-je écouter sans connexion ou marcher écran éteint ?', 'Le lecteur web demande une connexion pour charger l’audio. Installer le site n’enregistre pas les visites hors connexion. La carte peut vous situer avec votre accord, mais le site ne déclenche pas les étapes par GPS écran éteint. Utilisez les fonctions prévues dans l’application pour la marche.'],
  ],
  en: [
    ['Do I need an account to explore?', 'The catalogue and available previews are public. To purchase and find your purchases, use your Murmure account: the same account on the website and in the app.'],
    ['How do I listen on the website?', 'Open a tour and choose Discover the audio. Start a scene or the tour, pause and resume using the player. Audio starts after your action.'],
    ['What happens after payment?', 'The tour is available after payment confirmation and the server checks your access. Find it in My tours using the account that made the purchase. If confirmation takes time, check your tours before starting another purchase.'],
    ['Can I change the audio language?', 'The player offers the audio languages available for that tour. The website and audio languages may differ. Changing the website language does not make a missing translation available.'],
    ['Where is my progress saved?', 'Resume information is stored in this browser on this device. Clearing browser data or signing out can remove it. Progress is not synchronised across devices.'],
    ['Can I listen offline or walk with the screen locked?', 'The web player needs a connection to load audio. Installing the website does not download tours for offline use. The map can locate you with your permission, but the website does not trigger GPS scenes with the screen locked. Use the features provided in the app for walking.'],
  ],
};

export function VisitorHelp({ locale }: { locale: 'fr' | 'en' }) {
  return <section id="visiteur" className="bg-paper-soft py-12 scroll-mt-20">
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <h2 className="font-display text-h4 sm:text-h3 mb-6">{locale === 'en' ? 'Find, purchase and listen to a tour' : 'Trouver, acheter et écouter une visite'}</h2>
      <dl className="space-y-6">{answers[locale].map(([question, answer]) => <div key={question}><dt className="font-semibold text-body-lg mb-2">{question}</dt><dd className="text-body text-ink-80 leading-relaxed">{answer}</dd></div>)}</dl>
      <nav className="flex flex-wrap gap-4 mt-6" aria-label={locale === 'en' ? 'Visitor help links' : 'Liens d’aide visiteur'}>
        <a className="min-h-11 inline-flex items-center text-grenadine underline" href={locale === 'en' ? '/en/catalogue' : '/catalogue'}>{locale === 'en' ? 'Find a tour' : 'Trouver une visite'}</a>
        <a className="min-h-11 inline-flex items-center text-grenadine underline" href={visitorAuthUrl(locale, 'login', locale === 'en' ? '/en/my-purchases' : '/mes-achats')}>{locale === 'en' ? 'Access my account' : 'Accéder à mon compte'}</a>
      </nav>
    </div>
  </section>;
}
