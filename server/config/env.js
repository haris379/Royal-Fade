import 'dotenv/config';

const list = (v, fallback = '') =>
  String(v ?? fallback).split(',').map((s) => s.trim()).filter(Boolean);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isVercel: Boolean(process.env.VERCEL),
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || '',
  // Extra browser origins allowed to call the API cross-origin. Same-origin calls (the normal single-project
  // Vercel setup, including preview deployments) never need to be listed here.
  clientOrigins: list(process.env.CLIENT_ORIGIN, 'http://localhost:5173'),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // Key for hashing one-time codes. Falls back to JWT_SECRET when not set.
  otpSecret: process.env.OTP_SECRET || '',
  // Rate-limit counters live in MongoDB on Vercel (memory is per-instance there and would limit nothing).
  rateLimitStore: process.env.RATE_LIMIT_STORE || (process.env.VERCEL ? 'mongo' : 'memory'),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || '',
    owner: process.env.OWNER_EMAIL || '',
  },
};

/** Returns a list of configuration problems (empty = fine). Pure, so tests can call it with any environment. */
export function validateEnv(e = env) {
  const problems = [];
  if (!e.mongoUri) problems.push('MONGODB_URI is required');
  else if (!/^mongodb(\+srv)?:\/\//.test(e.mongoUri)) problems.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  if (e.jwtSecret.length < 32) problems.push('JWT_SECRET must be at least 32 characters');
  if (e.otpSecret && e.otpSecret.length < 32) problems.push('OTP_SECRET must be at least 32 characters when set');
  if (e.nodeEnv === 'production' && /replace-with|changeme/i.test(e.jwtSecret)) problems.push('JWT_SECRET still has the example value');
  return problems;
}

export function assertRuntimeEnv(e = env) {
  const problems = validateEnv(e);
  if (problems.length) throw new Error(`Invalid environment configuration:\n- ${problems.join('\n- ')}`);
}

/** Non-fatal warnings (the site runs, but a feature will not work). */
export function envWarnings(e = env) {
  const w = [];
  if (!e.smtp.host || !e.smtp.from) w.push('SMTP_HOST / MAIL_FROM not set: booking email verification is unavailable.');
  if (!e.smtp.owner) w.push('OWNER_EMAIL not set: contact messages are saved but not emailed.');
  return w;
}
