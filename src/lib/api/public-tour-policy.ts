type TourWithTitle = {
  title?: string | null;
};

export function isPublicCatalogueTour(tour: TourWithTitle): boolean {
  return !tour.title?.trimStart().toLowerCase().startsWith('e2e-');
}
