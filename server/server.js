// Local / VPS entry point (npm run dev, npm start). On Vercel the entry point is /api/index.js instead.
import { createApp } from './app.js';
import { env, assertRuntimeEnv, envWarnings } from './config/env.js';
import { connectDB } from './config/db.js';
import { initIndexes } from './models/index.js';

async function start() {
  assertRuntimeEnv();
  for (const w of envWarnings()) console.warn(`Warning: ${w}`);
  await connectDB();
  await initIndexes(); // booking, verification and rate-limit indexes must exist before requests arrive
  createApp().listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
}

start().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
