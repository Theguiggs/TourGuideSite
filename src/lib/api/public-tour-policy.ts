type TourWithTitle = {
  title?: string | null;
};

export function isPublicCatalogueTour(tour: TourWithTitle): boolean {
  if (process.env.E2E_ALLOW_TEST_TOURS === 'true') {
    return true;
  }
  const title = tour.title?.trimStart().toLowerCase();
  return !title?.startsWith('e2e-') && !title?.startsWith('persistence test ');
}
