import { initAmplitude } from '../amplitude';
import { AnalyticsEvents, trackEvent } from '../analytics';
import * as amplitude from '@amplitude/analytics-browser';

jest.mock('@amplitude/analytics-browser', () => ({ init: jest.fn(), track: jest.fn() }));

it('transmet les événements d’écoute par le transport EU sans collecte d’IP', () => {
  const oldKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = 'cle-test';
  try {
    initAmplitude();
    expect(amplitude.init).toHaveBeenCalledWith('cle-test', expect.objectContaining({ serverZone: 'EU', trackingOptions: { ipAddress: false } }));
    const properties = { tour_id: 't1', city_id: 'grasse', language: 'fr', from: 'purchases' };
    trackEvent(AnalyticsEvents.WEB_LISTEN_START, properties);
    trackEvent(AnalyticsEvents.WEB_SCENE_COMPLETE, { tour_id: 't1', city_id: 'grasse', scene_order: 2 });
    trackEvent(AnalyticsEvents.WEB_LISTEN_COMPLETE, { tour_id: 't1', city_id: 'grasse' });
    expect(jest.mocked(amplitude.track).mock.calls).toEqual([
      ['web_listen_start', properties],
      ['web_scene_complete', { tour_id: 't1', city_id: 'grasse', scene_order: 2 }],
      ['web_listen_complete', { tour_id: 't1', city_id: 'grasse' }],
    ]);
  } finally {
    if (oldKey === undefined) delete process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
    else process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY = oldKey;
  }
});
