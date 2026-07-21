interface PoiValidationPanelProps {
  sceneLabel: string;
  textExcerpt: string | null;
  title: string;
  description: string;
  latitude: string;
  longitude: string;
  addressSearch: string;
  searchResult: string | null;
  isSearching: boolean;
  isSaved: boolean;
  isLocked: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onLatitudeChange: (value: string) => void;
  onLongitudeChange: (value: string) => void;
  onAddressSearchChange: (value: string) => void;
  onAddressSearch: () => void;
  onSave: () => void;
}

function parseCoordinate(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCoord(value: number): string {
  return value.toFixed(5);
}

function buildGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

function buildStreetViewUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

function buildMapEmbedUrl(lat: number, lng: number): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (key) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${lat},${lng}&zoom=18`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}&z=18&output=embed`;
}

function buildStreetViewEmbedUrl(lat: number, lng: number): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://www.google.com/maps/embed/v1/streetview?key=${encodeURIComponent(key)}&location=${lat},${lng}&heading=210&pitch=0&fov=80`;
}

export function PoiValidationPanel({
  sceneLabel,
  textExcerpt,
  title,
  description,
  latitude,
  longitude,
  addressSearch,
  searchResult,
  isSearching,
  isSaved,
  isLocked,
  onTitleChange,
  onDescriptionChange,
  onLatitudeChange,
  onLongitudeChange,
  onAddressSearchChange,
  onAddressSearch,
  onSave,
}: PoiValidationPanelProps) {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  const hasValidCoordinates = lat !== null && lng !== null;
  const mapsUrl = hasValidCoordinates ? buildGoogleMapsUrl(lat, lng) : null;
  const streetViewUrl = hasValidCoordinates ? buildStreetViewUrl(lat, lng) : null;
  const mapEmbedUrl = hasValidCoordinates ? buildMapEmbedUrl(lat, lng) : null;
  const streetViewEmbedUrl = hasValidCoordinates ? buildStreetViewEmbedUrl(lat, lng) : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="text-[11px] font-semibold text-ink-40 uppercase tracking-widest">{sceneLabel}</p>
            <h2 className="text-lg font-semibold text-ink mt-0.5">Validation du lieu</h2>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
              hasValidCoordinates ? 'bg-olive-soft text-success' : 'bg-ocre-soft text-ocre'
            }`}
            data-testid="poi-validation-status"
          >
            {hasValidCoordinates ? 'Lieu localise' : 'A verifier'}
          </span>
        </div>

        {textExcerpt && (
          <div className="bg-paper-soft border border-line rounded-lg p-3">
            <p className="text-[11px] font-semibold text-ink-40 uppercase tracking-widest mb-1">Texte de reference</p>
            <div
              className="max-h-44 overflow-y-auto pr-2 text-sm text-ink-80 leading-relaxed whitespace-pre-wrap"
              data-testid="poi-reference-text"
            >
              {textExcerpt}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="poi-title" className="text-sm font-medium text-ink-80 block mb-1">Titre de la scene</label>
          <input
            id="poi-title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Ex: Place aux Aires"
            disabled={isLocked}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-grenadine disabled:bg-paper-soft disabled:text-ink-60"
            data-testid="poi-title-input"
          />
        </div>

        <div>
          <label htmlFor="poi-desc" className="text-sm font-medium text-ink-80 block mb-1">Description du point d&apos;interet</label>
          <textarea
            id="poi-desc"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Ce que le visiteur doit regarder a cet endroit"
            rows={3}
            disabled={isLocked}
            className="w-full border border-line rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-grenadine disabled:bg-paper-soft disabled:text-ink-60"
            data-testid="poi-description-input"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-ink-80 block mb-1">Recherche du lieu</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={addressSearch}
              onChange={(e) => onAddressSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onAddressSearch();
                }
              }}
              placeholder="Adresse, monument, place..."
              disabled={isLocked}
              className="flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-grenadine disabled:bg-paper-soft disabled:text-ink-60"
              data-testid="poi-address-search"
            />
            <button
              type="button"
              onClick={onAddressSearch}
              disabled={isSearching || isLocked}
              className="bg-grenadine hover:opacity-90 disabled:bg-paper-deep text-white text-sm px-4 py-2 rounded-lg transition"
            >
              {isSearching ? '...' : 'Chercher'}
            </button>
          </div>
          {searchResult && <p className="text-xs text-ink-60">{searchResult}</p>}
        </div>

        <div>
          <label className="text-sm font-medium text-ink-80 block mb-1">Coordonnees GPS</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="poi-lat" className="text-xs text-ink-60 block mb-0.5">Latitude</label>
              <input
                id="poi-lat"
                type="text"
                value={latitude}
                onChange={(e) => onLatitudeChange(e.target.value)}
                placeholder="43.6591"
                disabled={isLocked}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-grenadine disabled:bg-paper-soft disabled:text-ink-60"
              />
            </div>
            <div>
              <label htmlFor="poi-lng" className="text-xs text-ink-60 block mb-0.5">Longitude</label>
              <input
                id="poi-lng"
                type="text"
                value={longitude}
                onChange={(e) => onLongitudeChange(e.target.value)}
                placeholder="6.9243"
                disabled={isLocked}
                className="w-full border border-line rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-grenadine disabled:bg-paper-soft disabled:text-ink-60"
              />
            </div>
          </div>
          {hasValidCoordinates ? (
            <p className="text-xs text-success mt-1">{formatCoord(lat)}, {formatCoord(lng)}</p>
          ) : (
            <p className="text-xs text-ocre mt-1">Ajoutez des coordonnees pour verifier le lieu sur carte et Street View.</p>
          )}
        </div>

        {!isLocked && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSave}
              className="bg-grenadine hover:opacity-90 text-white font-medium py-2 px-5 rounded-lg text-sm transition"
              data-testid="save-poi-btn"
            >
              Valider le lieu
            </button>
            {isSaved && <span className="text-sm text-success">Enregistre</span>}
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-grenadine hover:underline">
                Ouvrir dans Google Maps
              </a>
            )}
            {streetViewUrl && (
              <a href={streetViewUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-grenadine hover:underline">
                Ouvrir Street View
              </a>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <div className="border border-line rounded-lg overflow-hidden bg-paper-soft">
          <div className="px-3 py-2 border-b border-line flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-60 uppercase tracking-widest">Carte</p>
            {mapsUrl && (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-xs text-grenadine hover:underline">
                Plein ecran
              </a>
            )}
          </div>
          {mapEmbedUrl ? (
            <iframe
              title="Apercu carte du POI"
              src={mapEmbedUrl}
              className="w-full h-56 border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              data-testid="poi-map-preview"
            />
          ) : (
            <div className="h-56 flex items-center justify-center px-6 text-center text-sm text-ink-60">
              Recherchez ou saisissez les coordonnees du lieu.
            </div>
          )}
        </div>

        <div className="border border-line rounded-lg overflow-hidden bg-paper-soft">
          <div className="px-3 py-2 border-b border-line flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-60 uppercase tracking-widest">Street View</p>
            {streetViewUrl && (
              <a href={streetViewUrl} target="_blank" rel="noreferrer" className="text-xs text-grenadine hover:underline">
                Ouvrir
              </a>
            )}
          </div>
          {streetViewEmbedUrl ? (
            <iframe
              title="Apercu Google Street View du POI"
              src={streetViewEmbedUrl}
              className="w-full h-64 border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              data-testid="poi-street-view-preview"
            />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-ink-60">
              <p>Apercu Street View integre indisponible pour ce lieu.</p>
              {streetViewUrl && (
                <a href={streetViewUrl} target="_blank" rel="noreferrer" className="bg-paper border border-line rounded-lg px-4 py-2 font-medium text-ink hover:bg-paper-soft">
                  Verifier dans Google Street View
                </a>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
