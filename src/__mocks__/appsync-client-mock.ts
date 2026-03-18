// Global mock for appsync-client — ensures tests always run in stub mode
// and never make real API calls

jest.mock('@/lib/api/appsync-client', () => ({
  listGuideTours: jest.fn(() => Promise.resolve([])),
  getGuideTourById: jest.fn(() => Promise.resolve(null)),
  listGuideProfiles: jest.fn(() => Promise.resolve([])),
  getGuideProfileById: jest.fn(() => Promise.resolve(null)),
  listTourReviews: jest.fn(() => Promise.resolve([])),
  getTourStats: jest.fn(() => Promise.resolve(null)),
  updateGuideProfileMutation: jest.fn(() => Promise.resolve({ ok: true, data: {} })),
  updateGuideTourMutation: jest.fn(() => Promise.resolve({ ok: true, data: {} })),
  listModerationItems: jest.fn(() => Promise.resolve([])),
  getModerationItemById: jest.fn(() => Promise.resolve(null)),
  updateModerationItemMutation: jest.fn(() => Promise.resolve({ ok: true, data: {} })),
  getGuideDashboardStatsById: jest.fn(() => Promise.resolve(null)),
}));

// Force stub mode for all tests
process.env.NEXT_PUBLIC_USE_STUBS = 'true';
