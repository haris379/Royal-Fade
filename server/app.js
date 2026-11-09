import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { business } from './config/business.js';
import { UploadedImage } from './models/UploadedImage.js';
import { isGeneratedName } from './services/uploads.js';
import routes from './routes/index.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/** CORS policy: same-origin needs no CORS at all; other origins must be listed in CLIENT_ORIGIN. */
function corsOptions(req, cb) {
  const origin = req.headers.origin;
  if (!origin) return cb(null, { origin: false });
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let sameOrigin = false;
  try {
    sameOrigin = new URL(origin).host === host;
  } catch {
    /* malformed Origin: treated as cross-origin */
  }
  if (sameOrigin) return cb(null, { origin: false }); // allowed, nothing to add
  cb(null, { origin: env.clientOrigins.includes(origin) ? origin : false });
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors(corsOptions));

  // Uploaded service images (public, read-only), stored in MongoDB so they survive redeployments on Vercel.
  // Only server-generated names are ever looked up. Names are random, so responses can be cached for a long time.
  app.get('/uploads/services/:name', async (req, res, next) => {
    try {
      if (!isGeneratedName(req.params.name)) return notFound(req, res);
      const img = await UploadedImage.findOne({ name: req.params.name }).lean();
      if (!img) return notFound(req, res);
      res.set({
        'Content-Type': img.mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
        'X-Content-Type-Options': 'nosniff',
      });
      res.send(Buffer.from(img.data.buffer ?? img.data));
    } catch (err) {
      next(err);
    }
  });

  // API status route for the root and the Vercel rewrite
  app.get(['/', '/api'], (req, res) => {
    res.status(200).json({ success: true, message: `${business.name} API is running` });
  });

  app.use(express.json({ limit: '20kb' }));
  app.use('/api', apiLimiter, routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
