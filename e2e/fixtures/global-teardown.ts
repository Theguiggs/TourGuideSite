import * as fs from 'fs';
import * as path from 'path';

async function globalTeardown() {
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
