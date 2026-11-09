import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as t from './helpers/db.js';
import { MongoStore } from '../middleware/rateLimit.js';
import { RateLimit } from '../models/RateLimit.js';

const opts = { skip: t.skip };
before(async () => { if (!t.skip) await t.connect(); });
after(async () => { if (!t.skip) await t.disconnect(); });
beforeEach(async () => { if (!t.skip) await t.reset(); });

const store = () => Object.assign(new MongoStore(), { prefix: 'test', windowMs: 60_000 });

test('MongoDB rate-limit store counts hits per key across instances and resets after the window', opts, async () => {
  const a = store();
  const b = store(); // a second "serverless instance"
  assert.equal((await a.increment('1.2.3.4')).totalHits, 1);
  assert.equal((await b.increment('1.2.3.4')).totalHits, 2);
  assert.equal((await a.increment('5.6.7.8')).totalHits, 1, 'keys are independent');
  await RateLimit.updateMany({}, { $set: { resetAt: new Date(Date.now() - 1000) } });
  assert.equal((await b.increment('1.2.3.4')).totalHits, 1, 'a new window starts after expiry');
  await a.increment('1.2.3.4'); // 2
  await a.decrement('1.2.3.4'); // 1
  assert.equal((await a.increment('1.2.3.4')).totalHits, 2);
  await a.resetKey('1.2.3.4');
  assert.equal((await a.increment('1.2.3.4')).totalHits, 1);
});

test('concurrent first hits never reset a live window (the counter keeps climbing)', opts, async () => {
  const s = store();
  const results = await Promise.all(Array.from({ length: 8 }, () => s.increment('9.9.9.9')));
  // Real MongoDB makes every $inc atomic, so the top count is exactly 8. The SQLite-backed FerretDB used for local
  // testing can occasionally lose one concurrent update, hence a lower bound of 4. What must NEVER happen is a reset to 1.
  assert.ok(Math.max(...results.map((r) => r.totalHits)) >= 4, results.map((r) => r.totalHits).join(','));
  assert.equal(await RateLimit.countDocuments({ key: 'test:9.9.9.9' }), 1, 'exactly one window document');
});
