// Role permission tests that need no database: forbidden requests are stopped by middleware before any query.
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'x'.repeat(40);
const { createApp } = await import('../app.js');
const { adminStore } = await import('../middleware/auth.js');
const { PERMISSIONS, can, permissionsFor } = await import('../config/permissions.js');
const app = createApp();

const ids = { admin: 'a'.repeat(24), developer: 'd'.repeat(24) };
adminStore.findById = async (id) => {
  const role = Object.keys(ids).find((r) => ids[r] === id);
  return role ? { _id: id, email: `${role}@x.com`, role, tokenVersion: 0 } : null;
};
const tokenFor = (role) => jwt.sign({ sub: ids[role], email: `${role}@x.com`, role, tv: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' });
const as = (role) => ({ Authorization: `Bearer ${tokenFor(role)}` });
const ID = 'c'.repeat(24);
const svc = { name: 'Nope', description: 'Not allowed', price: 10, durationMinutes: 30, category: 'haircuts' };

test('permission table: admin is read-only on services, developer has no customer data access', () => {
  assert.ok(can('admin', 'services:read'));
  assert.ok(!can('admin', 'services:write'));
  assert.ok(can('developer', 'services:write'));
  for (const p of ['appointments:read', 'appointments:manage', 'messages:read', 'messages:manage', 'barbers:read']) {
    assert.ok(!can('developer', p), `developer must not have ${p}`);
  }
  assert.deepEqual(permissionsFor('__proto__'), []);
  assert.deepEqual(permissionsFor('constructor'), []);
  assert.deepEqual(Object.keys(PERMISSIONS).sort(), ['admin', 'developer']);
});

test('admin cannot create, update or delete services (403 from the backend)', async () => {
  assert.equal((await request(app).post('/api/admin/services').set(as('admin')).send(svc)).status, 403);
  assert.equal((await request(app).put(`/api/admin/services/${ID}`).set(as('admin')).send(svc)).status, 403);
  assert.equal((await request(app).delete(`/api/admin/services/${ID}`).set(as('admin'))).status, 403);
});

test('admin cannot upload service images either (permission runs before the upload is read)', async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const res = await request(app).post('/api/admin/services').set(as('admin')).field('name', 'x').attach('imageFile', png, 'a.png');
  assert.equal(res.status, 403);
});

test('developer cannot view appointments, stats, barbers or customer messages (403)', async () => {
  for (const [method, url] of [
    ['get', '/api/admin/appointments'], ['get', '/api/admin/stats'], ['get', '/api/admin/barbers'],
    ['get', '/api/admin/messages'], ['patch', `/api/admin/messages/${ID}/read`],
    ['patch', `/api/admin/appointments/${ID}/status`], ['post', `/api/admin/appointments/${ID}/resend-email`],
  ]) {
    const res = await request(app)[method](url).set(as('developer')).send({ status: 'confirmed' });
    assert.equal(res.status, 403, `${method} ${url}`);
    assert.equal(res.body.code, 'FORBIDDEN');
    assert.equal(JSON.stringify(res.body).includes('@'), false, 'no customer data in the error');
  }
});

test('the role in the request body or query cannot grant access', async () => {
  const res = await request(app).get('/api/admin/appointments?role=admin').set(as('developer')).send({ role: 'admin' });
  assert.equal(res.status, 403);
});

test('there is no route that creates accounts or changes roles', async () => {
  for (const [method, url] of [['post', '/api/admin/register'], ['post', '/api/admin/developer'], ['put', `/api/admin/users/${ID}/role`], ['post', '/api/register']]) {
    const res = await request(app)[method](url).set(as('admin')).send({ role: 'developer', email: 'x@y.com', password: 'x'.repeat(20) });
    assert.ok([401, 404].includes(res.status), `${method} ${url} -> ${res.status}`);
  }
});
