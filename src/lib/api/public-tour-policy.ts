type TourWithTitle = {
  title?: string | null;
};

export function isPublicCatalogueTour(tour: TourWithTitle): boolean {
  if (process.env.E2E_ALLOW_TEST_TOURS === 'true') {
    return true;
  }
  return !tour.title?.trimStart().toLowerCase().startsWith('e2e-');
}
