import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';

async function globalTeardown() {
  const runPrefix = process.env.E2E_RUN_PREFIX;
  if (runPrefix) {
    const cleanupScript = path.join(__dirname, '..', '..', 'scripts', 'cleanup-e2e-data.mjs');
    execFileSync(
      process.execPath,
      [cleanupScript, `--prefix=e2e-${runPrefix}-`],
      { stdio: 'inherit', env: process.env },
    );
  }

  const authDir = path.join(__dirname, '..', '.auth');
  if (fs.existsSync(authDir)) {
    const files = fs.readdirSync(authDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      fs.unlinkSync(path.join(authDir, file));
    }
    console.log(`[global-teardown] Cleaned ${files.length} auth state files`);
  }
}

export default globalTeardown;
