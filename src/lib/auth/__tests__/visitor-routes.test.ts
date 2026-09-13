import { visitorAuthUrl, visitorDestination, localizeVisitorReturn } from '../visitor-routes';

it('garde la bibliothèque publique comme destination sans rôle imposé', () => {
  expect(visitorDestination('fr')).toBe('/mes-achats');
  expect(visitorDestination('en')).toBe('/en/my-purchases');
});
it('transmet le retour dans chaque mode de compte', () => {
  for (const mode of ['login', 'signup', 'reset'] as const) {
    expect(new URL(visitorAuthUrl('en', mode, '/catalogue/nice/test?x=1#scene'), 'https://test.invalid').searchParams.get('returnTo')).toBe('/catalogue/nice/test?x=1#scene');
  }
});
it('traduit le chemin sans perdre paramètres ou ancre', () => {
  expect(localizeVisitorReturn('/catalogue/nice/test?lang=es#scene', 'en')).toBe('/en/catalogue/nice/test?lang=es#scene');
});
