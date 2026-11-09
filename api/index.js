// Vercel serverless entry point. The same Express app that runs locally is reused here; nothing listens on a port.
// vercel.json rewrites /api/* and /uploads/* to this function.
import { createApp } from '../server/app.js';
import { assertRuntimeEnv } from '../server/config/env.js';
import { connectDB } from '../server/config/db.js';
import { initIndexes } from '../server/models/index.js';

const app = createApp();
let ready; // shared by every request this warm instance serves

function init() {
  if (!ready) {
    ready = (async () => {
      assertRuntimeEnv();
      await connectDB();
      await initIndexes();
    })().catch((err) => {
      ready = undefined; // retry on the next request
      throw err;
    });
  }
  return ready;
}

export default async function handler(req, res) {
  try {
    await init();
  } catch (err) {
    console.error('Backend initialization failed:', err.message);
    return res.status(500).json({ success: false, message: 'Server initialization failed. Check the environment variables and database access.' });
  }
  return app(req, res);
}
