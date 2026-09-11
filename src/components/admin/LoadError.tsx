/**
 * Échec de chargement d'une liste admin (lot 6.3) : distinct du « vide ».
 * Avant, une file illisible affichait « Aucune visite en attente » — un admin
 * pouvait croire la modération à jour alors que la lecture avait échoué.
 */
export function LoadError({ message, onRetry, testId = 'admin-load-error' }: { message?: string; onRetry: () => void; testId?: string }) {
  return (
    <div role="alert" data-testid={testId} className="rounded-md border border-grenadine bg-grenadine-soft px-4 py-6 text-center">
      <p className="text-body font-medium text-danger">{message ?? 'Impossible de charger les données.'}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-danger px-4 py-2 text-body font-medium text-danger hover:bg-card"
      >
        Réessayer
      </button>
    </div>
  );
}
