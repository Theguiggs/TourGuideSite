import { test, expect } from '@playwright/test';
import {
  E2E_GUIDE_EMAIL,
  E2E_GUIDE_PASSWORD,
  e2ePrefix,
} from '../fixtures/test-data';
import {
  getGuideStorageStatePath,
  isTokenValid,
  authenticateCognito,
  createStorageState,
} from '../fixtures/auth.fixture';
import {
  seedTour,
  queryTourByTitle,
  deleteItemsByPrefix,
  seedLanguagePurchase,
  graphql,
} from '../helpers/appsync-direct';
import { getAccessTokenFromStorageState } from '../fixtures/auth.fixture';

test.describe('Smoke Tests', () => {
  test('smoke-auth: login guide via UI navigates to Studio', async ({ page }, testInfo) => {
    // F15 fix: disable trace/video for this test to avoid capturing credentials
    testInfo.config.projects[0].use = {
      ...testInfo.config.projects[0].use,
      trace: 'off',
      video: 'off',
    };
    await page.goto('/guide/login');

    await page.getByTestId('login-email').fill(E2E_GUIDE_EMAIL);
    await page.getByTestId('login-password').fill(E2E_GUIDE_PASSWORD);
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/guide\/studio$/, { timeout: 15_000 });
  });

  test('smoke-crud: create tour via API, verify, cleanup', async () => {
    const guidePath = getGuideStorageStatePath();

    // Re-auth if token expired
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }

    const token = getAccessTokenFromStorageState(guidePath);
    const prefix = e2ePrefix('smoke');

    // Create tour via AppSync direct
    const tour = await seedTour(prefix, token, {
      title: `${prefix} Smoke Test`,
      city: 'Grasse',
    });
    expect(tour.id).toBeTruthy();

    // Verify via AppSync query
    const found = await queryTourByTitle(prefix, token);
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found.some(t => String(t.title ?? '').includes(prefix))).toBe(true);

    // Cleanup
    const deleted = await deleteItemsByPrefix(prefix);
    expect(deleted).toBeGreaterThanOrEqual(1);

    // Verify cleanup worked
    const afterCleanup = await queryTourByTitle(prefix, token);
    const stillExists = afterCleanup.some(t => String(t.title ?? '').includes(prefix));
    expect(stillExists).toBe(false);
  });

  /**
   * Régression du 2026-08-24 : poser des autorisations de CHAMP sur
   * `TourLanguagePurchase` avait retiré `delete` de l'autorisation de TYPE,
   * alors que la règle de modèle l'accorde. Un guide ne pouvait plus supprimer
   * son propre brouillon — `submission/page.tsx:338` efface les achats de
   * langue de la session avant de la supprimer.
   *
   * Le défaut est parti en production sans qu'aucun des 1541 tests unitaires,
   * des 54 e2e ni d'une revue à trois lentilles ne le voie : ce chemin n'avait
   * aucune couverture. Ce test est cette couverture.
   *
   * Il tombera si l'un des champs annotés du modèle cesse d'autoriser `delete`.
   */
  test('smoke-authz: le propriétaire peut supprimer son propre achat de langue', async () => {
    const guidePath = getGuideStorageStatePath();
    if (!isTokenValid(guidePath)) {
      const tokens = await authenticateCognito(E2E_GUIDE_EMAIL, E2E_GUIDE_PASSWORD);
      createStorageState(tokens, E2E_GUIDE_EMAIL, guidePath);
    }
    const token = getAccessTokenFromStorageState(guidePath);
    const sessionId = e2ePrefix('smoke-del');

    const purchase = await seedLanguagePurchase(sessionId, 'en', token);
    expect(purchase.id).toBeTruthy();

    const deleted = await graphql<{ deleteTourLanguagePurchase: { id: string } | null }>(
      `mutation($input: DeleteTourLanguagePurchaseInput!) {
        deleteTourLanguagePurchase(input: $input) { id }
      }`,
      { input: { id: purchase.id } },
      token,
    );
    expect(deleted.deleteTourLanguagePurchase?.id).toBe(purchase.id);
  });
});
