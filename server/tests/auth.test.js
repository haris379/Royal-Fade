// Authentication / authorization tests that need no database: the account lookup is stubbed.
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'x'.repeat(40);
const { createApp } = await import('../app.js');
const { adminStore } = await import('../middleware/auth.js');
const { default: routes } = await import('../routes/index.js');
const app = createApp();

const ID = 'b'.repeat(24);
let record;
let bumps;
const reset = (over = {}) => { record = { _id: ID, email: 'owner@x.com', role: 'admin', tokenVersion: 0, ...over }; bumps = 0; };
adminStore.findById = async (id) => (record && id === ID ? { ...record } : null);
adminStore.bumpTokenVersion = async () => { bumps += 1; record.tokenVersion += 1; };

const sign = (claims = {}, opts = {}) => jwt.sign({ sub: ID, email: 'owner@x.com', role: 'admin', tv: 0, ...claims }, process.env.JWT_SECRET, { expiresIn: '1h', ...opts });
const auth = (t) => ({ Authorization: `Bearer ${t}` });

const adminRoutes = () =>
  routes.stack
    .filter((l) => l.route && l.route.path.startsWith('/admin') && l.route.path !== '/admin/login')
    .flatMap((l) => Object.keys(l.route.methods).map((m) => [m, l.route.path, l.route]));

test('every admin route rejects requests without a token (401)', async () => {
  reset();
  const list = adminRoutes();
  assert.ok(list.length >= 12, `found ${list.length} admin routes`);
  for (const [method, path] of list) {
    const url = '/api' + path.replace(':id', 'c'.repeat(24));
    assert.equal((await request(app)[method](url)).status, 401, `${method.toUpperCase()} ${url}`);
  }
});

test('every admin route except /me and /logout declares an explicit permission', () => {
  const open = new Set(['/admin/me', '/admin/logout']);
  for (const [method, path, route] of adminRoutes()) {
    if (open.has(path)) continue;
    const guarded = route.stack.some((l) => typeof l.handle.permission === 'string');
    assert.ok(guarded, `${method.toUpperCase()} /api${path} has no requirePermission(...)`);
  }
});

test('unknown /api/admin paths do not leak (401 before 404)', async () => {
  reset();
  assert.equal((await request(app).get('/api/admin/does-not-exist')).status, 401);
});

test('a valid token works and /me returns the role read from the database', async () => {
  reset();
  const res = await request(app).get('/api/admin/me').set(auth(sign()));
  assert.equal(res.status, 200);
  assert.equal(res.body.data.role, 'admin');
});

test('invalid password route: malformed login body is rejected before any lookup', async () => {
  const res = await request(app).post('/api/admin/login').send({ email: { $ne: null }, password: { $ne: null } });
  assert.equal(res.status, 400);
});

test('expired, forged, alg=none and malformed tokens are rejected', async () => {
  reset();
  const expired = sign({}, { expiresIn: -10 });
  const forged = jwt.sign({ sub: ID, role: 'admin', tv: 0 }, 'some-other-secret-some-other-secret!!');
  const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: ID, role: 'admin' })).toString('base64url')}.`;
  for (const t of [expired, forged, none, 'garbage', '']) {
    assert.equal((await request(app).get('/api/admin/me').set(auth(t))).status, 401, `token ${String(t).slice(0, 12)}`);
  }
});

test('a token claiming an unknown role is forbidden, and the database role is checked too', async () => {
  reset();
  assert.equal((await request(app).get('/api/admin/me').set(auth(sign({ role: 'customer' })))).status, 403);
  reset({ role: 'staff' });
  assert.equal((await request(app).get('/api/admin/me').set(auth(sign()))).status, 403);
});

test('a token claiming developer cannot elevate a database admin (role comes from the database)', async () => {
  reset({ role: 'developer' });
  const t = sign({ role: 'admin' }); // claims admin, database says developer
  assert.equal((await request(app).get('/api/admin/appointments').set(auth(t))).status, 403);
});

test('a token for a deleted account, or with a non-id subject, stops working', async () => {
  reset();
  record = null;
  assert.equal((await request(app).get('/api/admin/me').set(auth(sign()))).status, 401);
  reset();
  assert.equal((await request(app).get('/api/admin/me').set(auth(sign({ sub: '1' })))).status, 401);
  assert.equal((await request(app).get('/api/admin/me').set(auth(sign({ sub: { $ne: null } })))).status, 401);
});

test('logout invalidates the session: the same token no longer works', async () => {
  reset();
  const t = sign();
  assert.equal((await request(app).get('/api/admin/me').set(auth(t))).status, 200);
  assert.equal((await request(app).post('/api/admin/logout').set(auth(t))).status, 200);
  assert.equal(bumps, 1);
  assert.equal((await request(app).get('/api/admin/me').set(auth(t))).status, 401);
});
