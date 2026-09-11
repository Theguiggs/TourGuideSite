import { loginDestination, loginUrlFor, safeReturnTo } from '../return-to';

describe('safeReturnTo', () => {
  it('accepte un chemin du site', () => {
    expect(safeReturnTo('/mes-achats')).toBe('/mes-achats');
    expect(safeReturnTo('/guide/studio/nouveau?x=1')).toBe('/guide/studio/nouveau?x=1');
  });

  it('refuse tout ce qui pourrait sortir du site', () => {
    expect(safeReturnTo('//evil.example')).toBeNull();
    expect(safeReturnTo('/\\evil.example')).toBeNull();
    expect(safeReturnTo('https://evil.example/x')).toBeNull();
    expect(safeReturnTo('javascript:alert(1)')).toBeNull();
    expect(safeReturnTo('mes-achats')).toBeNull();
    expect(safeReturnTo('/a b')).toBeNull();
    expect(safeReturnTo('/a\nb')).toBeNull();
  });

  it('refuse la page de connexion elle-même (boucle)', () => {
    expect(safeReturnTo('/guide/login')).toBeNull();
    expect(safeReturnTo('/guide/login?returnTo=%2Fx')).toBeNull();
  });

  it('ignore le vide', () => {
    expect(safeReturnTo(null)).toBeNull();
    expect(safeReturnTo('')).toBeNull();
  });
});

describe('loginDestination', () => {
  it('honore returnTo avant le rôle', () => {
    expect(loginDestination('guide', '/mes-achats')).toBe('/mes-achats');
  });
  it('envoie chaque rôle chez lui', () => {
    expect(loginDestination('admin', null)).toBe('/admin/moderation');
    expect(loginDestination('guide', null)).toBe('/guide/studio');
    expect(loginDestination('tourist', null)).toBe('/mes-achats');
    expect(loginDestination(undefined, null)).toBe('/mes-achats');
  });
});

describe('loginUrlFor', () => {
  it('encode la page d’origine', () => {
    expect(loginUrlFor('/guide/studio/nouveau')).toBe('/guide/login?returnTo=%2Fguide%2Fstudio%2Fnouveau');
  });
  it('retombe sur la connexion nue quand la page ne peut pas servir de retour', () => {
    expect(loginUrlFor('/guide/login')).toBe('/guide/login');
    expect(loginUrlFor(null)).toBe('/guide/login');
  });
});
