import { getStudioAnalytics } from '../studio-analytics';

beforeAll(() => {
  process.env.NEXT_PUBLIC_USE_STUBS = 'true';
});

describe('getStudioAnalytics', () => {
  it('returns funnel data', async () => {
    const data = await getStudioAnalytics();
    expect(data.funnel.fieldSessions).toBeGreaterThan(0);
    expect(data.funnel.published).toBeLessThanOrEqual(data.funnel.fieldSessions);
  });

  it('returns status distribution', async () => {
    const data = await getStudioAnalytics();
    expect(data.statusDistribution.length).toBeGreaterThan(0);
    const total = data.statusDistribution.reduce((sum, s) => sum + s.count, 0);
    expect(total).toBeGreaterThan(0);
  });

  it('returns tour costs', async () => {
    const data = await getStudioAnalytics();
    expect(data.tourCosts.length).toBeGreaterThan(0);
    for (const tour of data.tourCosts) {
      expect(tour.estimatedCostUSD).toBeLessThan(1); // NFR15: <1 USD per tour
    }
  });

  it('average cost below 1 USD (NFR15)', async () => {
    const data = await getStudioAnalytics();
    expect(data.averageCostPerTourUSD).toBeLessThan(1);
  });
});
