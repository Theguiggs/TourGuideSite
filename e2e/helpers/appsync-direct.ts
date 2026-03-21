/**
 * AppSync direct helper for E2E tests.
 *
 * - Seed/Assertions: raw GraphQL HTTP requests to AppSync (Amplify generateClient
 *   does NOT work in Node.js context with authToken — "NoValidAuthTokens" error)
 * - Cleanup: DynamoDB SDK with IAM credentials (AppSync owner-auth prevents cross-user deletion)
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import outputs from '../../amplify_outputs.json';

const APPSYNC_URL = (outputs as { data: { url: string } }).data.url;

// F1 fix: derive APP_ID from env var with hardcoded fallback
const APP_ID = process.env.AMPLIFY_APP_ID ?? '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = (outputs as { auth?: { aws_region?: string } }).auth?.aws_region ?? 'us-east-1';

const TABLES_TO_CLEAN = [
  'GuideTour',
  'StudioSession',
  'StudioScene',
  'ModerationItem',
  'GuideDashboardStats',
];

// --- GraphQL HTTP helper ---

async function graphql<T = Record<string, unknown>>(
  query: string,
  variables: Record<string, unknown>,
  token: string,
): Promise<T> {
  const response = await fetch(APPSYNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`AppSync HTTP ${response.status}: ${await response.text()}`);
  }

  const json = await response.json() as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(`AppSync errors: ${json.errors.map(e => e.message).join(', ')}`);
  }
  return json.data as T;
}

// --- Seed Functions (via GraphQL HTTP) ---

interface CreatedItem {
  id: string;
  [key: string]: unknown;
}

export async function seedTour(
  prefix: string,
  token: string,
  overrides?: Partial<{ title: string; city: string; description: string; status: string }>,
): Promise<CreatedItem> {
  validateE2ePrefix(prefix);
  const input = {
    guideId: `${prefix}-guide`,
    title: overrides?.title ?? `${prefix} Tour Test`,
    city: overrides?.city ?? 'Grasse',
    status: overrides?.status ?? 'draft',
    description: overrides?.description ?? 'E2E test tour',
    duration: 45,
    distance: 2.5,
    poiCount: 2,
  };

  const data = await graphql<{ createGuideTour: CreatedItem }>(
    `mutation CreateGuideTour($input: CreateGuideTourInput!) {
      createGuideTour(input: $input) { id title city status guideId }
    }`,
    { input },
    token,
  );
  return data.createGuideTour;
}

export async function seedSession(
  prefix: string,
  tourId: string,
  token: string,
  overrides?: Partial<{ sourceSessionId: string; status: string; title: string }>,
): Promise<CreatedItem> {
  validateE2ePrefix(prefix);
  const input = {
    guideId: `${prefix}-guide`,
    tourId,
    title: overrides?.title ?? `${prefix} Session`,
    status: overrides?.status ?? 'draft',
    sourceSessionId: overrides?.sourceSessionId ?? null,
    consentRGPD: true,
    language: 'fr',
  };

  const data = await graphql<{ createStudioSession: CreatedItem }>(
    `mutation CreateStudioSession($input: CreateStudioSessionInput!) {
      createStudioSession(input: $input) { id title status tourId guideId sourceSessionId }
    }`,
    { input },
    token,
  );
  return data.createStudioSession;
}

export async function seedScene(
  sessionId: string,
  index: number,
  token: string,
  overrides?: Partial<{ title: string; status: string }>,
): Promise<CreatedItem> {
  const input = {
    sessionId,
    sceneIndex: index,
    title: overrides?.title ?? `Scene ${index}`,
    status: overrides?.status ?? 'edited',
    archived: false,
    photosRefs: [],
    transcriptText: `Texte de la scène ${index} pour test E2E`,
  };

  const data = await graphql<{ createStudioScene: CreatedItem }>(
    `mutation CreateStudioScene($input: CreateStudioSceneInput!) {
      createStudioScene(input: $input) { id title sceneIndex status sessionId }
    }`,
    { input },
    token,
  );
  return data.createStudioScene;
}

export async function seedModerationItem(
  tourId: string,
  guideId: string,
  token: string,
  overrides?: Partial<{ tourTitle: string; city: string; status: string }>,
): Promise<CreatedItem> {
  const input = {
    tourId,
    guideId,
    guideName: 'E2E Test Guide',
    tourTitle: overrides?.tourTitle ?? 'E2E Tour',
    city: overrides?.city ?? 'Grasse',
    submissionDate: Date.now(),
    status: overrides?.status ?? 'pending',
  };

  const data = await graphql<{ createModerationItem: CreatedItem }>(
    `mutation CreateModerationItem($input: CreateModerationItemInput!) {
      createModerationItem(input: $input) { id tourId guideId tourTitle status }
    }`,
    { input },
    token,
  );
  return data.createModerationItem;
}

// --- Assertion Functions (via GraphQL HTTP) ---

export async function queryTourByTitle(
  titleContains: string,
  token: string,
): Promise<CreatedItem[]> {
  const data = await graphql<{ listGuideTours: { items: CreatedItem[] } }>(
    `query ListTours($filter: ModelGuideTourFilterInput) {
      listGuideTours(filter: $filter) { items { id title city status guideId } }
    }`,
    { filter: { title: { contains: titleContains } } },
    token,
  );
  return data.listGuideTours.items;
}

export async function queryTourById(
  tourId: string,
  token: string,
): Promise<CreatedItem | null> {
  const data = await graphql<{ getGuideTour: CreatedItem | null }>(
    `query GetTour($id: ID!) {
      getGuideTour(id: $id) { id title city status guideId }
    }`,
    { id: tourId },
    token,
  );
  return data.getGuideTour;
}

export async function querySessionByTourId(
  tourId: string,
  token: string,
): Promise<CreatedItem[]> {
  const data = await graphql<{ listStudioSessions: { items: CreatedItem[] } }>(
    `query ListSessions($filter: ModelStudioSessionFilterInput) {
      listStudioSessions(filter: $filter) { items { id title status tourId guideId } }
    }`,
    { filter: { tourId: { eq: tourId } } },
    token,
  );
  return data.listStudioSessions.items;
}

export async function queryModerationByTourId(
  tourId: string,
  token: string,
): Promise<CreatedItem[]> {
  const data = await graphql<{ listModerationItems: { items: CreatedItem[] } }>(
    `query ListModerations($filter: ModelModerationItemFilterInput) {
      listModerationItems(filter: $filter) { items { id tourId guideId tourTitle status } }
    }`,
    { filter: { tourId: { eq: tourId } } },
    token,
  );
  return data.listModerationItems.items;
}

// --- Cleanup Functions (via DynamoDB SDK + IAM) ---

function getDynamoClient() {
  return DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: REGION }),
    { marshallOptions: { removeUndefinedValues: true } },
  );
}

// F3 fix: retry unprocessed items from BatchWriteCommand
async function batchDeleteWithRetry(
  dynamo: DynamoDBDocumentClient,
  tableName: string,
  ids: string[],
): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 25) {
    const batch = ids.slice(i, i + 25);
    let requestItems: Record<string, Array<{ DeleteRequest: { Key: { id: string } } }>> = {
      [tableName]: batch.map(id => ({ DeleteRequest: { Key: { id } } })),
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await dynamo.send(new BatchWriteCommand({ RequestItems: requestItems }));
      const unprocessed = response.UnprocessedItems?.[tableName];
      if (!unprocessed || unprocessed.length === 0) {
        deleted += batch.length;
        break;
      }
      requestItems = { [tableName]: unprocessed as typeof requestItems[string] };
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return deleted;
}

// F2 fix: use begins_with for field scans
export async function deleteItemsByPrefix(prefix: string): Promise<number> {
  validateE2ePrefix(prefix);
  const dynamo = getDynamoClient();
  let totalDeleted = 0;

  for (const table of TABLES_TO_CLEAN) {
    const fullTableName = `${table}-${APP_ID}-${ENV}`;
    let lastKey: Record<string, unknown> | undefined;
    const idsToDelete: string[] = [];

    // Scan for items matching prefix in ID
    do {
      const scan = await dynamo.send(
        new ScanCommand({
          TableName: fullTableName,
          ProjectionExpression: 'id',
          ExclusiveStartKey: lastKey,
        }),
      );
      for (const item of scan.Items ?? []) {
        if (typeof item.id === 'string' && item.id.startsWith(prefix)) {
          idsToDelete.push(item.id);
        }
      }
      lastKey = scan.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    // Scan by text fields using begins_with
    const scanByField = async (field: string) => {
      let key: Record<string, unknown> | undefined;
      do {
        const result = await dynamo.send(
          new ScanCommand({
            TableName: fullTableName,
            ProjectionExpression: 'id',
            FilterExpression: `begins_with(#f, :prefix)`,
            ExpressionAttributeNames: { '#f': field },
            ExpressionAttributeValues: { ':prefix': prefix },
            ExclusiveStartKey: key,
          }),
        );
        for (const item of result.Items ?? []) {
          if (typeof item.id === 'string' && !idsToDelete.includes(item.id)) {
            idsToDelete.push(item.id);
          }
        }
        key = result.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (key);
    };

    if (table === 'GuideTour') await scanByField('title');
    if (table === 'ModerationItem') await scanByField('tourTitle');
    if (['GuideTour', 'StudioSession', 'GuideDashboardStats'].includes(table)) {
      await scanByField('guideId');
    }

    if (idsToDelete.length > 0) {
      totalDeleted += await batchDeleteWithRetry(dynamo, fullTableName, idsToDelete);
    }
  }

  return totalDeleted;
}

// --- Validation ---

function validateE2ePrefix(prefix: string): void {
  if (!prefix.startsWith('e2e-')) {
    throw new Error(
      `[appsync-direct] SAFETY: prefix must start with "e2e-", got "${prefix}". ` +
      `This prevents accidental pollution of production/sandbox data.`,
    );
  }
}
