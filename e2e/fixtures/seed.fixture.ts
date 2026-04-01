/**
 * Reusable seed functions for E2E test suites.
 *
 * Each function creates data with the given e2e prefix.
 * All functions validate that the prefix starts with "e2e-".
 */
import {
  seedTour,
  seedSession,
  seedScene,
  seedModerationItem,
  seedLanguagePurchase,
  seedSceneSegment,
  deleteItemsByPrefix,
  resolveGuideId,
} from '../helpers/appsync-direct';

function validatePrefix(prefix: string): void {
  if (!prefix.startsWith('e2e-')) {
    throw new Error(
      `[seed.fixture] SAFETY: prefix must start with "e2e-", got "${prefix}". ` +
      `This prevents accidental pollution of production/sandbox data.`,
    );
  }
}

export interface SeededTour {
  tourId: string;
  sessionId: string;
  sceneIds: string[];
}

export async function seedGuideTour(
  prefix: string,
  token: string,
): Promise<SeededTour> {
  validatePrefix(prefix);

  const tour = await seedTour(prefix, token, {
    title: `${prefix} Tour Test`,
    city: 'Grasse',
  });

  const session = await seedSession(prefix, tour.id, token, {
    title: `${prefix} Session`,
    status: 'editing',
  });

  const scene1 = await seedScene(session.id, 0, token, {
    title: `${prefix} Scene 1`,
    status: 'edited',
  });
  const scene2 = await seedScene(session.id, 1, token, {
    title: `${prefix} Scene 2`,
    status: 'edited',
  });

  return {
    tourId: tour.id,
    sessionId: session.id,
    sceneIds: [scene1.id, scene2.id],
  };
}

export async function seedSubmittedTour(
  prefix: string,
  token: string,
): Promise<SeededTour & { moderationItemId: string }> {
  validatePrefix(prefix);

  const tour = await seedTour(prefix, token, {
    title: `${prefix} Tour Soumis`,
    city: 'Grasse',
    status: 'pending_moderation',
  });

  const session = await seedSession(prefix, tour.id, token, {
    title: `${prefix} Session Soumise`,
    status: 'submitted',
  });

  const scene1 = await seedScene(session.id, 0, token, {
    title: `${prefix} Scene 1`,
    status: 'finalized',
  });
  const scene2 = await seedScene(session.id, 1, token, {
    title: `${prefix} Scene 2`,
    status: 'finalized',
  });

  const modItem = await seedModerationItem(tour.id, `${prefix}-guide`, token, {
    tourTitle: `${prefix} Tour Soumis`,
    city: 'Grasse',
    status: 'pending',
  });

  return {
    tourId: tour.id,
    sessionId: session.id,
    sceneIds: [scene1.id, scene2.id],
    moderationItemId: modItem.id,
  };
}

export async function seedPublishedTour(
  prefix: string,
  token: string,
): Promise<SeededTour> {
  validatePrefix(prefix);

  const tour = await seedTour(prefix, token, {
    title: `${prefix} Tour Publié`,
    city: 'Grasse',
    status: 'published',
  });

  const session = await seedSession(prefix, tour.id, token, {
    title: `${prefix} Session Publiée`,
    status: 'published',
  });

  const scene1 = await seedScene(session.id, 0, token, {
    title: `${prefix} Scene 1`,
    status: 'finalized',
  });

  return {
    tourId: tour.id,
    sessionId: session.id,
    sceneIds: [scene1.id],
  };
}

export async function seedDraftTour(
  prefix: string,
  token: string,
): Promise<{ tourId: string }> {
  validatePrefix(prefix);

  const tour = await seedTour(prefix, token, {
    title: `${prefix} Draft`,
    city: 'Grasse',
    status: 'draft',
  });

  return { tourId: tour.id };
}

export async function seedMobileSession(
  prefix: string,
  token: string,
): Promise<SeededTour> {
  validatePrefix(prefix);

  const tour = await seedTour(prefix, token, {
    title: `${prefix} Tour Mobile`,
    city: 'Grasse',
    status: 'synced',
  });

  const session = await seedSession(prefix, tour.id, token, {
    title: `${prefix} Session Mobile`,
    status: 'editing',
    sourceSessionId: `mobile-sim-${prefix}`,
  });

  const scene1 = await seedScene(session.id, 0, token, {
    title: `${prefix} POI Mobile 1`,
    status: 'transcribed',
  });
  const scene2 = await seedScene(session.id, 1, token, {
    title: `${prefix} POI Mobile 2`,
    status: 'transcribed',
  });

  return {
    tourId: tour.id,
    sessionId: session.id,
    sceneIds: [scene1.id, scene2.id],
  };
}

export async function seedMultilangReadyTour(
  prefix: string,
  token: string,
): Promise<SeededTour & { guideId: string }> {
  validatePrefix(prefix);

  // Resolve the real GuideProfile.id for the authenticated user
  const guideId = await resolveGuideId(token);

  const tour = await seedTour(prefix, token, {
    title: `${prefix} Grasse Vieille Ville`,
    city: 'Grasse',
    status: 'published',
    guideId,
  });

  const session = await seedSession(prefix, tour.id, token, {
    title: `${prefix} Visite Grasse`,
    status: 'submitted',
    guideId,
  });

  const scenes = [];
  const sceneData = [
    { title: 'Place aux Aires', text: 'Bienvenue sur la place aux Aires, coeur historique de Grasse. Cette place medievale accueille un marche provencal chaque matin.' },
    { title: 'Cathedrale Notre-Dame du Puy', text: 'La cathedrale domine la vieille ville depuis le douzieme siecle. Elle abrite des oeuvres de Rubens et de Fragonard.' },
    { title: 'Parfumerie Fragonard', text: 'Fragonard fondee en 1926 est la plus ancienne parfumerie de Grasse. Decouvrez les secrets de la fabrication du parfum.' },
  ];

  for (let i = 0; i < sceneData.length; i++) {
    const scene = await seedScene(session.id, i, token, {
      title: `${prefix} ${sceneData[i].title}`,
      status: 'transcribed',
    });
    scenes.push(scene);
  }

  return {
    tourId: tour.id,
    sessionId: session.id,
    sceneIds: scenes.map(s => s.id),
    guideId,
  };
}

export { seedLanguagePurchase, seedSceneSegment };

export async function cleanupByPrefix(prefix: string): Promise<number> {
  validatePrefix(prefix);
  const count = await deleteItemsByPrefix(prefix);
  console.log(`[seed.fixture] Cleaned up ${count} items with prefix "${prefix}"`);
  return count;
}
