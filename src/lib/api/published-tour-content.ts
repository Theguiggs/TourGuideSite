export interface PublicTourScene {
  id: string;
  order: number;
  title: string;
  description: string;
  audioKey?: string;
  photos: string[];
  latitude?: number;
  longitude?: number;
}

export interface PublishedTourContent {
  tourId: string;
  scenes: PublicTourScene[];
  walkPath: { latitude: number; longitude: number }[];
}

export interface PublishedTourContentQueryClient {
  queries: {
    getPublishedTourContent(
      input: { tourId: string },
      options?: { authMode: 'identityPool' },
    ): Promise<{ data?: unknown; errors?: Array<{ message: string }> }>;
  };
}

export async function queryPublishedTourContent(
  client: PublishedTourContentQueryClient,
  tourId: string,
): Promise<PublishedTourContent> {
  const result = await client.queries.getPublishedTourContent(
    { tourId },
    { authMode: 'identityPool' },
  );
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(', '));
  }
  const content = parsePublishedTourContent(result.data);
  if (!content || content.tourId !== tourId) {
    throw new Error('Invalid published tour content response');
  }
  return content;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Concurrency limit must be a positive integer');
  }
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const batch = items.slice(index, index + limit);
    results.push(
      ...(await Promise.all(batch.map((item, offset) => mapper(item, index + offset)))),
    );
  }
  return results;
}

export function parsePublishedTourContent(value: unknown): PublishedTourContent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.tourId !== 'string' ||
    !Array.isArray(candidate.scenes) ||
    !Array.isArray(candidate.walkPath)
  ) {
    return null;
  }

  const scenes: PublicTourScene[] = [];
  for (const valueScene of candidate.scenes) {
    if (!valueScene || typeof valueScene !== 'object') return null;
    const scene = valueScene as Record<string, unknown>;
    if (
      typeof scene.id !== 'string' ||
      typeof scene.order !== 'number' ||
      !Number.isInteger(scene.order) ||
      typeof scene.title !== 'string' ||
      typeof scene.description !== 'string' ||
      !Array.isArray(scene.photos) ||
      !scene.photos.every((photo) => typeof photo === 'string')
    ) {
      return null;
    }
    if (scene.audioKey != null && typeof scene.audioKey !== 'string') return null;
    if (
      (scene.latitude == null) !== (scene.longitude == null) ||
      scene.latitude != null &&
      (typeof scene.latitude !== 'number' ||
        !Number.isFinite(scene.latitude) ||
        scene.latitude < -90 ||
        scene.latitude > 90)
    ) {
      return null;
    }
    if (
      (scene.latitude == null) !== (scene.longitude == null) ||
      scene.longitude != null &&
      (typeof scene.longitude !== 'number' ||
        !Number.isFinite(scene.longitude) ||
        scene.longitude < -180 ||
        scene.longitude > 180)
    ) {
      return null;
    }
    scenes.push({
      id: scene.id,
      order: scene.order,
      title: scene.title,
      description: scene.description,
      photos: scene.photos as string[],
      ...(typeof scene.audioKey === 'string' ? { audioKey: scene.audioKey } : {}),
      ...(typeof scene.latitude === 'number' ? { latitude: scene.latitude } : {}),
      ...(typeof scene.longitude === 'number' ? { longitude: scene.longitude } : {}),
    });
  }

  const walkPath: PublishedTourContent['walkPath'] = [];
  for (const valuePoint of candidate.walkPath) {
    if (!valuePoint || typeof valuePoint !== 'object') return null;
    const point = valuePoint as Record<string, unknown>;
    if (
      typeof point.latitude !== 'number' ||
      !Number.isFinite(point.latitude) ||
      point.latitude < -90 ||
      point.latitude > 90 ||
      typeof point.longitude !== 'number' ||
      !Number.isFinite(point.longitude) ||
      point.longitude < -180 ||
      point.longitude > 180
    ) {
      return null;
    }
    walkPath.push({ latitude: point.latitude, longitude: point.longitude });
  }

  return {
    tourId: candidate.tourId,
    scenes,
    walkPath,
  };
}
