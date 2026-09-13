import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { GuideStatusDialog } from '@/components/admin/GuideStatusDialog';
import { StudioLocaleProvider } from '@/lib/i18n/studio-locale';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { ADMIN_COPY, ADMIN_KEYS, adminText } from '../copy';
import * as badges from '../status-badges';
import { getQualityChecklistTemplate, REJECTION_CATEGORIES } from '@/types/moderation';

describe('six-language administration', () => {
  afterEach(() => { cleanup(); localStorage.clear(); });

  it('has complete translations and preserves interpolation arguments', () => {
    for (const key of ADMIN_KEYS) {
      const copy = ADMIN_COPY[key];
      for (const locale of SITE_LOCALES) {
        expect(typeof copy[locale]).toBe('string');
        const argumentsIn = (value: string) => [...new Set(value.match(/\{\d+\}/g) ?? [])].sort();
        expect(argumentsIn(copy[locale])).toEqual(argumentsIn(key));
      }
    }
  });

  it.each(SITE_LOCALES)('covers status badges, review criteria and confirmation actions in %s', locale => {
    for (const table of [badges.TOUR_STATUS_BADGES, badges.GUIDE_PROFILE_STATUS_BADGES, badges.MODERATION_STATUS_BADGES, badges.LANGUAGE_MODERATION_BADGES, badges.PAIR_STATUS_BADGES]) {
      for (const badge of Object.values(table)) expect(adminText(locale, badge.label)).toBeTruthy();
    }
    for (const mode of ['recording', 'tts_on_demand'] as const) for (const item of getQualityChecklistTemplate(true, mode)) {
      expect(adminText(locale, item.label)).toBeTruthy();
      expect(adminText(locale, item.description)).toBeTruthy();
    }
    for (const category of REJECTION_CATEGORIES) expect(adminText(locale, category.label)).toBeTruthy();
    localStorage.setItem('murmure-studio-locale', locale);
    const onConfirm = jest.fn();
    render(<StudioLocaleProvider><GuideStatusDialog target="suspended" guideName="Aix — texte original" onConfirm={onConfirm} onCancel={() => {}} /></StudioLocaleProvider>);
    expect(screen.getByRole('heading', { name: adminText(locale, 'Suspendre ce compte guide ?') })).toBeInTheDocument();
    expect(screen.getByText('Aix — texte original')).toBeInTheDocument();
    const confirm = screen.getByTestId('guide-status-confirm');
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByTestId('guide-status-reason'), { target: {value: 'Une raison précise et inchangée'} });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('Une raison précise et inchangée');
  });
});
