import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as t from './helpers/db.js';
import { MAX_IMAGE_BYTES } from '../services/uploads.js';
const { app, request, auth } = t;

const opts = { skip: t.skip };
before(async () => { if (!t.skip) await t.connect(); });
after(async () => { if (!t.skip) await t.disconnect(); });
beforeEach(async () => { if (!t.skip) await t.reset(); });

const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200, 1)]);
const jpg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 2)]);
const fields = (r) => r.field('name', 'Razor Fade').field('description', 'A very sharp fade.').field('price', '25').field('durationMinutes', '45').field('category', 'haircuts');

test('developer uploads an image: stored in MongoDB, served publicly, replaced and cleaned up', opts, async () => {
  const dev = await t.makeDeveloper();
  const token = await t.tokenOf(dev);
  const created = await fields(request(app).post('/api/admin/services').set(auth(token))).attach('imageFile', png(), { filename: 'a.png', contentType: 'image/png' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const url = created.body.data.image;
  assert.match(url, /^\/uploads\/services\/[a-f0-9]{32}\.png$/);
  assert.equal(await t.UploadedImage.countDocuments(), 1);
  const served = await request(app).get(url);
  assert.equal(served.status, 200);
  assert.equal(served.headers['content-type'], 'image/png');
  assert.match(served.headers['cache-control'], /immutable/);
  assert.equal(served.headers['x-content-type-options'], 'nosniff');
  // survives an "app restart": a brand new app instance still serves it from the database
  const { createApp } = await import('../app.js');
  assert.equal((await request(createApp()).get(url)).status, 200);
  // replace
  const replaced = await fields(request(app).put(`/api/admin/services/${created.body.data._id}`).set(auth(token))).attach('imageFile', jpg(), { filename: 'b.jpg', contentType: 'image/jpeg' });
  assert.equal(replaced.status, 200);
  assert.notEqual(replaced.body.data.image, url);
  assert.equal((await request(app).get(url)).status, 404, 'old image removed');
  assert.equal(await t.UploadedImage.countDocuments(), 1);
});

test('uploads are validated by real content, type and size', opts, async () => {
  const dev = await t.makeDeveloper();
  const token = await t.tokenOf(dev);
  const post = (buf, filename, contentType) => fields(request(app).post('/api/admin/services').set(auth(token))).attach('imageFile', buf, { filename, contentType });
  assert.equal((await post(Buffer.from('<script>alert(1)</script>'.repeat(5)), 'x.png', 'image/png')).status, 400, 'text pretending to be a png');
  assert.equal((await post(png(), 'x.gif', 'image/gif')).status, 400, 'gif not allowed');
  assert.equal((await post(png(), 'x.svg', 'image/svg+xml')).status, 400, 'svg not allowed');
  assert.equal((await post(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(MAX_IMAGE_BYTES + 10)]), 'big.png', 'image/png')).status, 413);
  assert.equal(await t.Service.countDocuments(), 0);
  assert.equal(await t.UploadedImage.countDocuments(), 0);
});

test('only server-generated image names are served', opts, async () => {
  for (const name of ['../etc/passwd', 'abc.png', `${'a'.repeat(32)}.svg`, `${'a'.repeat(32)}.png`]) {
    assert.equal((await request(app).get(`/uploads/services/${encodeURIComponent(name)}`)).status, 404, name);
  }
});

test('uploading again replaces the image of one service without touching another service using a shared path', opts, async () => {
  const dev = await t.makeDeveloper();
  const token = await t.tokenOf(dev);
  const a = await fields(request(app).post('/api/admin/services').set(auth(token))).attach('imageFile', png(), { filename: 'a.png', contentType: 'image/png' });
  const shared = a.body.data.image;
  const b = await request(app).post('/api/admin/services').set(auth(token)).send({ name: 'Second', description: 'Shares the picture', price: 10, durationMinutes: 30, image: shared });
  assert.equal(b.status, 201);
  await request(app).delete(`/api/admin/services/${a.body.data._id}`).set(auth(token));
  assert.equal((await request(app).get(shared)).status, 200, 'still used by the other service');
});
