import { setupAuthStates } from './auth.fixture';

async function globalSetup() {
  console.log('[global-setup] Setting up auth states...');
  await setupAuthStates();
  console.log('[global-setup] Done');
}

export default globalSetup;
