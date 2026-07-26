import outputs from '../../amplify_outputs.json';

export const E2E_GUIDE_EMAIL = process.env.E2E_GUIDE_EMAIL ?? 'e2e-guide@test.tourguide.app';
export const E2E_GUIDE_PASSWORD = process.env.E2E_GUIDE_PASSWORD ?? '';
export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@test.tourguide.app';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
export const COGNITO_CLIENT_ID = outputs.auth.user_pool_client_id;
export const COGNITO_REGION = outputs.auth.aws_region;

export function e2ePrefix(suite: string): string {
  const runPrefix = process.env.E2E_RUN_PREFIX;
  return `e2e-${runPrefix ? `${runPrefix}-` : ''}${suite}-${Date.now()}`;
}
