import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as t from './helpers/db.js';
import { seed } from '../scripts/seed.js';
import { catalog } from '../services/serviceCatalog.js';

const opts = { skip: t.skip };
before(async () => { if (!t.skip) await t.connect(); });
after(async () => { if (!t.skip) await t.disconnect(); });
beforeEach(async () => { if (!t.skip) await t.reset(); });
const quiet = () => {};

test('seed creates the catalogue and the admin, and is safe to run twice', opts, async () => {
  const a = await seed({ adminEmail: 'Owner@RoyalFade.test', adminPassword: 'owner-password-123', log: quiet });
  assert.equal(a.catalog.created, catalog.length);
  assert.equal(a.admin, 'created');
  const b = await seed({ adminEmail: 'owner@royalfade.test', adminPassword: 'owner-password-123', log: quiet });
  assert.equal(b.catalog.created, 0);
  assert.equal(b.admin, 'unchanged');
  assert.equal(await t.Service.countDocuments(), catalog.length);
  assert.equal(await t.Admin.countDocuments(), 1);
  assert.equal((await t.Admin.findOne()).role, 'admin');
});

test('seed never overwrites prices, descriptions or images edited by the developer', opts, async () => {
  await seed({ log: quiet });
  await t.Service.updateOne({ slug: 'skin-fade' }, { $set: { price: 40, description: 'Custom text from the developer', image: '/uploads/services/' + 'a'.repeat(32) + '.jpg', active: false } });
  await seed({ log: quiet });
  const s = await t.Service.findOne({ slug: 'skin-fade' }).lean();
  assert.equal(s.price, 40);
  assert.equal(s.description, 'Custom text from the developer');
  assert.equal(s.active, false);
  assert.match(s.image, /^\/uploads\/services\//);
});

test('seed changes the admin password (and signs out old sessions) only when it differs', opts, async () => {
  await seed({ adminEmail: 'owner@royalfade.test', adminPassword: 'owner-password-123', log: quiet });
  const before = await t.Admin.findOne();
  const r = await seed({ adminEmail: 'owner@royalfade.test', adminPassword: 'brand-new-password-9', log: quiet });
  assert.equal(r.admin, 'password-updated');
  const after = await t.Admin.findOne();
  assert.equal(after.tokenVersion, before.tokenVersion + 1);
  assert.equal((await t.login('owner@royalfade.test', 'brand-new-password-9')).status, 200);
});

test('seed never overwrites or converts a developer account', opts, async () => {
  const dev = await t.makeDeveloper('dev@royalfade.test', 'developer-password-123');
  const r = await seed({ adminEmail: 'dev@royalfade.test', adminPassword: 'owner-password-123', log: quiet });
  assert.equal(r.admin, 'refused-developer');
  const after = await t.Admin.findOne({ email: 'dev@royalfade.test' }).select('+passwordHash');
  assert.equal(after.role, 'developer');
  assert.equal(after.passwordHash, dev.doc.passwordHash);
});
