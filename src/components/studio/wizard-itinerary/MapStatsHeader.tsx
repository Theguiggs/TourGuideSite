'use client';

interface MapStatsHeaderProps {
  totalPois: number;
  geolocated: number;
  validated: number;
}

/**
 * <MapStatsHeader> — counter compact "N POIs · M géolocalisés · K validés" pour
 * la page Itinéraire. Les chiffres sont mis en avant en font-bold ink.
 * Port de docs/design/ds/wizard-3-itineraire.jsx:22-24.
 */
export function MapStatsHeader({ totalPois, geolocated, validated }: MapStatsHeaderProps) {
  return (
    <div
      className="text-meta text-ink-60 flex flex-wrap gap-1"
      data-testid="map-stats-header"
    >
      <span>
        <strong className="text-ink font-bold">{totalPois}</strong> POI{totalPois !== 1 ? 's' : ''}
      </span>
      <span aria-hidden="true">·</span>
      <span>
        <strong className="text-ink font-bold">{geolocated}</strong> géolocalisé
        {geolocated !== 1 ? 's' : ''}
      </span>
      <span aria-hidden="true">·</span>
      <span>
        <strong className="text-olive font-bold">{validated}</strong> validé
        {validated !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
