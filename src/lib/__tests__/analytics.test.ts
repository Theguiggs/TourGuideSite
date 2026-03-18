import { trackEvent, AnalyticsEvents } from '../analytics';

describe('analytics', () => {
  it('should define all required event names', () => {
    expect(AnalyticsEvents.WEB_LANDING_VISIT).toBe('web_landing_visit');
    expect(AnalyticsEvents.WEB_CATALOGUE_BROWSE).toBe('web_catalogue_browse');
    expect(AnalyticsEvents.WEB_TOUR_DETAIL_VIEW).toBe('web_tour_detail_view');
    expect(AnalyticsEvents.WEB_APP_DOWNLOAD_CLICK).toBe('web_app_download_click');
    expect(AnalyticsEvents.WEB_QR_CODE_SCAN).toBe('web_qr_code_scan');
  });

  it('should not throw when tracking an event', () => {
    expect(() => {
      trackEvent(AnalyticsEvents.WEB_LANDING_VISIT, { page: '/' });
    }).not.toThrow();
  });
});
