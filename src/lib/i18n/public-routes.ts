export type PublicLocale = 'fr' | 'en';

const EN_TO_FR: ReadonlyArray<readonly [string, string]> = [
  ['/en/delete-account', '/supprimer-mon-compte'],
  ['/en/privacy', '/confidentialite'],
  ['/en/terms', '/cgu'],
  ['/en/help', '/aide'],
  ['/en/catalogue', '/catalogue'],
  ['/en', '/'],
];

export function localizePublicPath(pathname: string, locale: PublicLocale): string {
  const path = pathname || '/';

  if (locale === 'fr') {
    const mapping = EN_TO_FR.find(([english]) => path === english || path.startsWith(`${english}/`));
    if (!mapping) return path;
    const [english, french] = mapping;
    return `${french}${path.slice(english.length)}` || '/';
  }

  if (path === '/') return '/en';
  if (path === '/supprimer-mon-compte') return '/en/delete-account';
  if (path === '/confidentialite') return '/en/privacy';
  if (path === '/cgu') return '/en/terms';
  if (path === '/aide' || path.startsWith('/aide/')) return path.replace('/aide', '/en/help');
  if (path === '/catalogue' || path.startsWith('/catalogue/')) {
    return `/en${path}`;
  }
  if (path === '/en' || path.startsWith('/en/')) return path;

  return path;
}
