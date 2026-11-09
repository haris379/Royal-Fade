// Deployment checks: environment validation, the Vercel API entry point, and vercel.json routing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import request from 'supertest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { validateEnv, envWarnings } = await import('../config/env.js');

const good = { nodeEnv: 'production', mongoUri: 'mongodb+srv://u:p@cluster0.example.mongodb.net/royal-fade', jwtSecret: 'k'.repeat(40), otpSecret: '', smtp: { host: 'smtp.x', from: 'a@b.c', owner: 'o@b.c' } };

test('environment validation accepts a good configuration', () => {
  assert.deepEqual(validateEnv(good), []);
  assert.deepEqual(envWarnings(good), []);
});

test('environment validation rejects missing or weak configuration', () => {
  assert.match(validateEnv({ ...good, mongoUri: '' }).join(), /MONGODB_URI is required/);
  assert.match(validateEnv({ ...good, mongoUri: 'http://nope' }).join(), /must start with mongodb/);
  assert.match(validateEnv({ ...good, jwtSecret: 'short' }).join(), /JWT_SECRET/);
  assert.match(validateEnv({ ...good, otpSecret: 'short' }).join(), /OTP_SECRET/);
  assert.match(validateEnv({ ...good, jwtSecret: 'replace-with-a-long-random-string-at-least-32-chars' }).join(), /example value/);
  assert.match(envWarnings({ ...good, smtp: { host: '', from: '', owner: '' } }).join(' '), /SMTP_HOST/);
});

test('API entry point loads and answers with a safe JSON error when the environment is missing', async () => {
  const keep = { ...process.env };
  delete process.env.MONGODB_URI;
  delete process.env.JWT_SECRET;
  const { default: handler } = await import('../../api/index.js');
  assert.equal(typeof handler, 'function');
  const calls = [];
  const res = { status(c) { calls.push(['status', c]); return this; }, json(b) { calls.push(['json', b]); return this; } };
  await handler({ method: 'GET', url: '/api/health', headers: {} }, res);
  Object.assign(process.env, keep);
  assert.deepEqual(calls[0], ['status', 500]);
  assert.equal(calls[1][1].success, false);
  assert.ok(!JSON.stringify(calls).includes('JWT_SECRET='), 'no secrets or env values in the response');
});

test('API entry point serves requests through the shared Express app (no listen)', async () => {
  const src = fs.readFileSync(path.join(root, 'api/index.js'), 'utf8');
  assert.ok(!/\.listen\(/.test(src), 'must not start a server on Vercel');
  assert.match(src, /createApp/);
  assert.match(src, /initIndexes/);
  const { createApp } = await import('../app.js');
  const res = await request(createApp()).get('/api');
  assert.equal(res.status, 200);
  assert.match(res.body.message, /Royal Fade API/);
});

test('same-origin requests work without CLIENT_ORIGIN; unlisted cross-origin requests get no CORS headers', async () => {
  const { createApp } = await import('../app.js');
  const app = createApp();
  const same = await request(app).get('/api').set('Host', 'royal-fade-git-x.vercel.app').set('Origin', 'https://royal-fade-git-x.vercel.app');
  assert.equal(same.status, 200);
  const other = await request(app).get('/api').set('Host', 'royal-fade.vercel.app').set('Origin', 'https://evil.example');
  assert.equal(other.status, 200);
  assert.equal(other.headers['access-control-allow-origin'], undefined);
});

test('vercel.json: builds the client, routes API and uploads to the function, SPA fallback for pages only', () => {
  const v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(v.outputDirectory, 'client/dist');
  assert.equal(v.buildCommand, 'npm run build');
  assert.ok(v.functions['api/index.js'].maxDuration >= 10);
  assert.ok(fs.existsSync(path.join(root, 'api/index.js')));
  const rewrites = v.rewrites;
  const match = (p) => rewrites.find((r) => new RegExp(`^${r.source}$`).test(p));
  assert.equal(match('/api/services').destination, '/api');
  assert.equal(match('/api/admin/login').destination, '/api');
  assert.equal(match('/uploads/services/' + 'a'.repeat(32) + '.png').destination, '/api');
  for (const route of ['/', '/services', '/booking', '/booking/confirmation', '/admin/login', '/admin', '/privacy-policy', '/anything/else']) {
    assert.equal(match(route)?.destination, '/index.html', `${route} must fall back to index.html after a refresh`);
  }
  for (const asset of ['/assets/index-abc.js', '/favicon.svg', '/images/hero.svg', '/robots.txt']) {
    assert.notEqual(match(asset)?.destination, '/index.html', `${asset} must not be swallowed by the SPA fallback`);
  }
  const csp = v.headers.flatMap((h) => h.headers).find((h) => h.key === 'Content-Security-Policy');
  assert.match(csp.value, /default-src 'self'/);
});

test('root package.json wires workspaces so Vercel installs server and client dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.workspaces.sort(), ['client', 'server']);
  assert.equal(pkg.type, 'module');
  assert.match(pkg.scripts.build, /client/);
});

test('no secrets are committed: .env files are ignored and only .env.example files exist', () => {
  const ignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
  assert.match(ignore, /^\.env$/m);
  const found = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', 'dist', '.git'].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/^\.env/.test(e.name) && e.name !== '.env.example') found.push(full);
    }
  };
  walk(root);
  assert.deepEqual(found, [], 'real .env files must not be part of the project');
});

test('frontend production build succeeds', { timeout: 180_000 }, () => {
  execSync('npm run build --workspace client', { cwd: root, stdio: 'pipe' });
  const dist = path.join(root, 'client/dist');
  assert.ok(fs.existsSync(path.join(dist, 'index.html')));
  assert.ok(fs.readdirSync(path.join(dist, 'assets')).some((f) => f.endsWith('.js')));
});
