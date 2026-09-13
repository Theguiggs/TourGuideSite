import { SITE_LOCALES, LOCALE_FORMATS, formatMoney, formatDate, formatNumber, isInterfaceLocale, requireInterfaceLocale } from '../locales';
import { CHECKOUT_COPY } from '../checkout-copy';
import { localizePublicPath } from '../public-routes';
import { localizeVisitorReturn, visitorAuthUrl, visitorDestination } from '@/lib/auth/visitor-routes';
import { safeReturnTo } from '@/lib/auth/return-to';
import { describeAuthError } from '@/lib/auth/cognito-errors';
import { refusalMessage } from '@/lib/auth/session-signals';
import { INTERFACE_COPY, translate, localizeValue } from '../translate';
import { evaluateVisitCompleteness } from '@/lib/studio/visit-completeness';

describe('six interface locales', () => {
  it.each(SITE_LOCALES)('provides every interface message and structured value in %s', locale => {
    for (const copy of Object.values(INTERFACE_COPY)) {
      expect(Object.keys(copy).sort()).toEqual([...SITE_LOCALES].sort());
      if (locale !== 'fr') expect(copy[locale].trim()).not.toBe('');
      expect(translate(locale, copy.fr, copy.en)).toBe(copy[locale]);
    }
    expect(localizeValue(locale, { title: 'Mes visites' }, { title: 'My tours' }).title).toBe(translate(locale, 'Mes visites', 'My tours'));
    const report = evaluateVisitCompleteness({ narrationMode: null, sourceLanguage: 'fr', scenes: [] }, locale);
    expect(report.ready).toBe(false);
    if (locale !== 'fr') expect(report.checks[0].evidence).not.toBe('Mode de narration manquant.');
  });
  it('rejects unsupported locale values explicitly', () => {
    expect(isInterfaceLocale('pt')).toBe(false);
    expect(() => requireInterfaceLocale('pt')).toThrow(RangeError);
    expect(() => requireInterfaceLocale('EN')).toThrow(RangeError);
  });

  it.each(SITE_LOCALES)('has complete checkout copy and native formatting for %s', locale => {
    for (const copy of Object.values(CHECKOUT_COPY)) {
      expect(Object.keys(copy).sort()).toEqual([...SITE_LOCALES].sort());
      expect(copy[locale].trim().length).toBeGreaterThan(0);
    }
    expect(formatMoney(1990, locale)).toBe(new Intl.NumberFormat(LOCALE_FORMATS[locale], { style: 'currency', currency: 'EUR' }).format(19.9));
    expect(formatNumber(1234.5, locale)).toBe(new Intl.NumberFormat(LOCALE_FORMATS[locale]).format(1234.5));
    expect(formatDate(0, locale, { timeZone: 'UTC' })).toBe(new Intl.DateTimeFormat(LOCALE_FORMATS[locale], { timeZone: 'UTC' }).format(0));
  });

  it.each(SITE_LOCALES)('translates auth errors without exposing provider text in %s', locale => {
    for (const name of ['UserNotFoundException', 'NotAuthorizedException', 'UserNotConfirmedException', 'PasswordResetRequiredException', 'TooManyRequestsException', 'UsernameExistsException', 'InvalidPasswordException', 'InvalidParameterException', 'CodeMismatchException', 'ExpiredCodeException', 'CodeDeliveryFailureException', 'NetworkError', 'UnexpectedException']) {
      for (const context of ['signIn', 'signUp', 'confirmSignUp', 'reset'] as const) {
        const error = Object.assign(new Error('provider raw secret'), { name });
        const message = describeAuthError(error, context, locale);
        expect(message.length).toBeGreaterThan(10);
        expect(message).not.toContain('provider raw secret');
        if (locale !== 'en' && locale !== 'fr') {
          expect(message).not.toBe(describeAuthError(error, context, 'fr'));
          expect(message).not.toBe(describeAuthError(error, context, 'en'));
        }
      }
    }
    expect(refusalMessage('expired', locale)).toBeTruthy();
    expect(refusalMessage('revoked', locale)).toBeTruthy();
  });

  it.each(SITE_LOCALES)('round trips filters, payment returns and fragments through %s', locale => {
    const original = '/catalogue/nice/tour?q=Nice&audio=de&duration=short&price=paid#acheter';
    const localized = localizePublicPath(original, locale);
    expect(localizePublicPath(localized, 'fr')).toBe(original);
    expect(localizePublicPath(localized, locale)).toBe(localized);
    expect(localizeVisitorReturn(original, locale)).toBe(localized);
    const auth = new URL(visitorAuthUrl(locale, 'signup', localized), 'https://murmure-visit.com');
    expect(auth.searchParams.get('returnTo')).toBe(localized);
    expect(safeReturnTo(auth.pathname)).toBeNull();
    expect(visitorDestination(locale)).toBe(localizePublicPath('/mes-achats', locale));
  });

  it('preserves protected and external paths and rejects external auth returns', () => {
    expect(localizePublicPath('/guide/studio', 'nl')).toBe('/guide/studio');
    expect(localizePublicPath('/admin/moderation', 'de')).toBe('/admin/moderation');
    expect(localizePublicPath('//external.example/catalogue', 'es')).toBe('//external.example/catalogue');
    expect(localizeVisitorReturn('//external.example/path', 'it')).toBeNull();
    expect(localizeVisitorReturn('/nl/%73ign-in', 'nl')).toBeNull();
  });
});
