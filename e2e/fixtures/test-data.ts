import outputs from '../../amplify_outputs.json';

export const E2E_GUIDE_EMAIL = process.env.E2E_GUIDE_EMAIL ?? 'e2e-guide@test.tourguide.app';
export const E2E_GUIDE_PASSWORD = process.env.E2E_GUIDE_PASSWORD ?? '';
export const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@test.tourguide.app';
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';
export const COGNITO_CLIENT_ID = outputs.auth.user_pool_client_id;
export const COGNITO_REGION = outputs.auth.aws_region;

export function e2ePrefix(suite: string): string {
  return `e2e-${suite}-${Date.now()}`;
}
