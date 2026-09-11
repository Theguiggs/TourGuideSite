/**
 * Retour de redirection Stripe : l'URL de retour porte la carte concernée, et
 * la relecture ne rend que ce qui appartient à CETTE carte.
 */
import { buildStripeReturnUrl, clearStripeReturn, readStripeReturn } from '../stripe-return';

function setUrl(path: string) {
  window.history.replaceState({}, '', path);
}

describe('stripe-return', () => {
  afterEach(() => setUrl('/'));

  it('construit une URL de retour marquée, sans les paramètres Stripe précédents', () => {
    setUrl('/catalogue/nice/promenade?payment_intent=pi_old&redirect_status=failed&ref=x#bas');
    const url = new URL(buildStripeReturnUrl('tour')!);
    expect(url.pathname).toBe('/catalogue/nice/promenade');
    expect(url.searchParams.get('murmure_pay')).toBe('tour');
    expect(url.searchParams.get('ref')).toBe('x');
    expect(url.searchParams.has('payment_intent')).toBe(false);
    expect(url.hash).toBe('');
  });

  it('ne lit que le retour destiné à la carte demandée', () => {
    setUrl('/p?murmure_pay=forfait&payment_intent=pi_9&redirect_status=succeeded');
    expect(readStripeReturn('tour')).toBeNull();
    expect(readStripeReturn('forfait')).toEqual({ paymentIntentId: 'pi_9', status: 'succeeded' });
  });

  it('ignore une URL sans intent ou sans statut', () => {
    setUrl('/p?murmure_pay=tour&payment_intent=pi_9');
    expect(readStripeReturn('tour')).toBeNull();
    setUrl('/p?murmure_pay=tour&redirect_status=succeeded');
    expect(readStripeReturn('tour')).toBeNull();
  });

  it('efface les paramètres Stripe pour qu’un rechargement ne rejoue rien', () => {
    setUrl('/p?keep=1&murmure_pay=tour&payment_intent=pi_9&payment_intent_client_secret=s&redirect_status=succeeded');
    clearStripeReturn();
    expect(window.location.search).toBe('?keep=1');
    expect(readStripeReturn('tour')).toBeNull();
  });
});
