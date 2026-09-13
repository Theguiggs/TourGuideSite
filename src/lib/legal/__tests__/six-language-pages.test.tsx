import { render, screen, cleanup } from '@testing-library/react';
import { LocalizedPrivacyPage, LocalizedTermsPage, LocalizedAccountDeletionPage } from '@/components/legal/localized-legal-pages';
import { LEGAL_PAGES, type AdditionalLegalLocale } from '../translated-pages';
import { LEGAL_IDENTITY, RETENTION } from '../identity';
import { legalPageMetadata } from '../page-metadata';
import { helpMetadata } from '@/lib/help-metadata';
import { creatorMetadata } from '@/lib/creator-metadata';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { publicPath, publicUrl } from '@/lib/seo/urls';
import { HELP_COPY } from '@/app/aide/_translated-content';
import { helpAnchorHref, HELP_ANCHORS } from '@/lib/help-anchors';

describe('public information in six languages', () => {
  afterEach(cleanup);
  it.each(SITE_LOCALES)('keeps canonical links and all language alternatives for %s', locale => {
    for (const [metadata, base] of [
      [legalPageMetadata('privacy', locale), '/confidentialite'],
      [legalPageMetadata('terms', locale), '/cgu'],
      [legalPageMetadata('deletion', locale), '/supprimer-mon-compte'],
      [helpMetadata(locale), '/aide'],
      [creatorMetadata(locale), '/creer-des-visites'],
    ] as const) {
      expect(metadata.alternates?.canonical).toBe(publicUrl(base, locale));
      for (const language of SITE_LOCALES) expect(metadata.alternates?.languages?.[language]).toBe(publicUrl(base, language));
      // Repli déclaré pour les langues non couvertes : le français.
      expect(metadata.alternates?.languages?.['x-default']).toBe(publicUrl(base, 'fr'));
    }
    expect(RETENTION.every(row => row[locale].every(Boolean))).toBe(true);
  });

  it.each(Object.keys(LEGAL_PAGES) as AdditionalLegalLocale[])('renders complete legal documents and localized action links for %s', locale => {
    const copy = LEGAL_PAGES[locale];
    for (const [Component, document] of [[LocalizedPrivacyPage, copy.privacy], [LocalizedTermsPage, copy.terms], [LocalizedAccountDeletionPage, copy.deletion]] as const) {
      const { container } = render(<Component locale={locale} />);
      expect(screen.getByRole('heading', { level: 1, name: document.title })).toBeInTheDocument();
      for (const section of document.sections) expect(screen.getByRole('heading', { name: section.title })).toBeInTheDocument();
      expect(container.textContent).not.toMatch(/\{(?:publisher|contact|authority|law|retention|delete|privacy|cookies)\}/);
      expect(container.querySelectorAll('a[href^="mailto:"]').length).toBeGreaterThan(0);
      cleanup();
    }
    render(<LocalizedAccountDeletionPage locale={locale} />);
    expect(screen.getByRole('link', { name: copy.deletionEmail })).toHaveAttribute('href', `mailto:${LEGAL_IDENTITY.contactEmail}?subject=${encodeURIComponent(copy.emailSubject)}&body=${encodeURIComponent(copy.emailBody)}`);
  });

  it.each(Object.keys(HELP_COPY) as AdditionalLegalLocale[])('keeps all contextual help links usable for %s', locale => {
    const ids = HELP_COPY[locale].steps.map(step => step.id);
    expect(new Set(ids).size).toBe(7);
    for (const step of Object.keys(HELP_ANCHORS[locale]) as Array<keyof typeof HELP_ANCHORS.fr>) {
      expect(ids).toContain(HELP_ANCHORS[locale][step]);
      expect(helpAnchorHref(locale, step)).toBe(`${publicPath('/aide', locale)}#${HELP_ANCHORS[locale][step]}`);
    }
  });
});
