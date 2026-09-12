/** Ancre réservée au parcours Mes achats → écoute ; elle n’accorde aucun accès. */
export const LISTEN_ANCHOR = '#ecouter';

export const PURCHASE_LISTEN_COPY = {
  fr: {
    listen: 'Écouter', unavailable: 'Indisponible au catalogue', label: (title: string) => `Écouter « ${title} »`,
    purchasedOn: 'Acheté le', myPurchases: 'Mes achats', viewAll: 'Voir tout →',
    unavailableDetail: 'Indisponible au catalogue actuellement — retrouvez-la dans l’appli Murmure.',
  },
  en: {
    listen: 'Listen', unavailable: 'Unavailable in the catalogue', label: (title: string) => `Listen to “${title}”`,
    purchasedOn: 'Purchased on', myPurchases: 'My purchases', viewAll: 'View all →',
    unavailableDetail: 'Currently unavailable in the catalogue — find it in the Murmure app.',
  },
} as const;
