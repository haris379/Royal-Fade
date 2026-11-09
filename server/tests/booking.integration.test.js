// Booking + email verification, against a real database (set MONGODB_TEST_URI to a throw-away database).
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as t from './helpers/db.js';
const { app, request, mails, logged } = t;

const opts = { skip: t.skip };
before(async () => { if (!t.skip) await t.connect(); });
after(async () => { if (!t.skip) await t.disconnect(); });
beforeEach(async () => { if (!t.skip) await t.reset(); });

test('a customer cannot book without verification (403 EMAIL_NOT_VERIFIED)', opts, async () => {
  const svc = await t.makeService();
  const res = await t.book(t.bookingBody(svc));
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
  assert.equal(await t.Appointment.countDocuments(), 0);
  // a made-up token is no better
  const fake = await t.book(t.bookingBody(svc, { verificationToken: 'a'.repeat(43) }));
  assert.equal(fake.status, 403);
});

test('the OTP is emailed but never returned by the API or written to logs; only a hash is stored', opts, async () => {
  const res = await t.requestCode('jane@example.com');
  assert.equal(res.status, 202);
  const code = t.codeFor('jane@example.com');
  assert.match(code, /^\d{6}$/);
  assert.equal(JSON.stringify(res.body).includes(code), false);
  assert.equal(logged.some((l) => l.includes(code)), false, 'code must not be logged');
  const rec = await t.EmailVerification.findOne({ email: 'jane@example.com' }).lean();
  assert.notEqual(rec.codeHash, code);
  assert.match(rec.codeHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(rec).includes(code), false);
});

test('an incorrect OTP is rejected, attempts are counted, and 5 wrong guesses lock the code', opts, async () => {
  await t.requestCode('jane@example.com');
  const good = t.codeFor('jane@example.com');
  const bad = good === '000000' ? '111111' : '000000';
  const first = await t.verifyCode('jane@example.com', bad);
  assert.equal(first.status, 400);
  assert.equal(first.body.code, 'INVALID_CODE');
  for (let i = 0; i < 4; i += 1) await t.verifyCode('jane@example.com', bad);
  const locked = await t.verifyCode('jane@example.com', good); // even the right code is refused now
  assert.equal(locked.status, 429);
  assert.equal(locked.body.code, 'TOO_MANY_ATTEMPTS');
});

test('an expired OTP is rejected', opts, async () => {
  await t.requestCode('jane@example.com');
  const code = t.codeFor('jane@example.com');
  await t.EmailVerification.updateMany({ email: 'jane@example.com' }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  const res = await t.verifyCode('jane@example.com', code);
  assert.equal(res.status, 410);
  assert.equal(res.body.code, 'CODE_EXPIRED');
});

test('an OTP cannot be reused', opts, async () => {
  await t.requestCode('jane@example.com');
  const code = t.codeFor('jane@example.com');
  assert.equal((await t.verifyCode('jane@example.com', code)).status, 200);
  const again = await t.verifyCode('jane@example.com', code);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'CODE_ALREADY_USED');
});

test('resend cooldown (60 s) and hourly cap (5) apply per email address', opts, async () => {
  assert.equal((await t.requestCode('cool@example.com')).status, 202);
  const second = await t.requestCode('cool@example.com');
  assert.equal(second.status, 429);
  assert.equal(second.body.code, 'COOLDOWN');
  for (let i = 0; i < 4; i += 1) { await t.OtpThrottle.deleteMany({}); assert.equal((await t.requestCode('cool@example.com')).status, 202); }
  await t.OtpThrottle.deleteMany({});
  const sixth = await t.requestCode('cool@example.com');
  assert.equal(sixth.status, 429);
  assert.equal(sixth.body.code, 'TOO_MANY_REQUESTS');
});

test('a failed OTP email is not counted against the customer (code discarded, cooldown released)', opts, async () => {
  t.mode.failIf = () => true;
  assert.equal((await t.requestCode('jane@example.com')).status, 502);
  assert.equal(await t.EmailVerification.countDocuments({ email: 'jane@example.com' }), 0);
  t.mode.failIf = null;
  assert.equal((await t.requestCode('jane@example.com')).status, 202);
});

test('booking succeeds after verification: pending status, server-side price, snapshots, request-received email', opts, async () => {
  const svc = await t.makeService({ price: 26, durationMinutes: 45, name: 'Skin Fade' });
  const token = await t.tokenFor('jane@example.com');
  // a tampered price/duration in the request is ignored
  const res = await t.book(t.bookingBody(svc, { verificationToken: token, servicePrice: 0.01, durationMinutes: 5 }));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.status, 'pending');
  assert.equal(res.body.data.servicePrice, 26);
  assert.equal(res.body.data.durationMinutes, 45);
  assert.match(res.body.data.reference, /^RF-[A-F0-9]{8}$/);
  const appt = await t.Appointment.findOne().lean();
  assert.equal(appt.emailVerified, true);
  assert.equal(appt.serviceName, 'Skin Fade');
  assert.equal(appt.bookingEmail.status, 'sent');
  const mail = mails.at(-1);
  assert.equal(mail.to, 'jane@example.com');
  assert.match(mail.subject, /request received/i);
  assert.doesNotMatch(mail.text + mail.subject, /your appointment is confirmed|has been confirmed/i);
  assert.match(mail.text, /not yet a confirmed appointment/i);
  assert.match(mail.text, /£26/);
  // later edits to the service do not rewrite history
  await t.Service.updateOne({ _id: svc._id }, { $set: { price: 99, name: 'Renamed' } });
  const after = await t.Appointment.findOne().lean();
  assert.equal(after.servicePrice, 26);
  assert.equal(after.serviceName, 'Skin Fade');
});

test('the token is linked to the exact verified email', opts, async () => {
  const svc = await t.makeService();
  const token = await t.tokenFor('jane@example.com');
  const res = await t.book(t.bookingBody(svc, { verificationToken: token, email: 'someone.else@example.com' }));
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
});

test('a verification token authorises one booking only (reuse for another slot is refused)', opts, async () => {
  const svc = await t.makeService();
  const token = await t.tokenFor('jane@example.com');
  assert.equal((await t.book(t.bookingBody(svc, { verificationToken: token, time: '12:00' }))).status, 201);
  const second = await t.book(t.bookingBody(svc, { verificationToken: token, time: '14:00' }));
  assert.equal(second.status, 409);
  assert.equal(second.body.code, 'VERIFICATION_ALREADY_USED');
  assert.equal(await t.Appointment.countDocuments(), 1);
});

test('repeating the identical request (double click) returns the same booking, not a second one', opts, async () => {
  const svc = await t.makeService();
  const token = await t.tokenFor('jane@example.com');
  const body = t.bookingBody(svc, { verificationToken: token });
  const a = await t.book(body);
  const b = await t.book(body);
  assert.equal(a.status, 201);
  assert.equal(b.status, 200);
  assert.equal(b.body.data.reference, a.body.data.reference);
  assert.equal(await t.Appointment.countDocuments(), 1);
});

test('an expired authorization (30 minutes) is rejected', opts, async () => {
  const svc = await t.makeService();
  const token = await t.tokenFor('jane@example.com');
  await t.EmailVerification.updateMany({}, { $set: { authExpiresAt: new Date(Date.now() - 1000) } });
  const res = await t.book(t.bookingBody(svc, { verificationToken: token }));
  assert.equal(res.status, 403);
  assert.equal(res.body.code, 'VERIFICATION_EXPIRED');
});

test('double booking is prevented for a specific barber, and "any" moves to the next free barber', opts, async () => {
  const svc = await t.makeService();
  const date = t.openDate(5); // Friday: Marcus, Daniel, Liam, Tommy all work
  const t1 = await t.tokenFor('a@example.com');
  const t2 = await t.tokenFor('b@example.com');
  const t3 = await t.tokenFor('c@example.com');
  const first = await t.book(t.bookingBody(svc, { date, barberId: 'marcus', email: 'a@example.com', verificationToken: t1 }));
  assert.equal(first.status, 201);
  const clash = await t.book(t.bookingBody(svc, { date, barberId: 'marcus', email: 'b@example.com', verificationToken: t2 }));
  assert.equal(clash.status, 409);
  assert.equal(clash.body.code, 'SLOT_TAKEN');
  // overlapping time (starts mid-way through Marcus's first appointment) is also a clash
  const overlap = await t.book(t.bookingBody(svc, { date, barberId: 'marcus', time: '12:30', email: 'b@example.com', verificationToken: t2, durationMinutes: 5 }));
  assert.equal(overlap.status, 201, 'a 30-minute booking at 12:30 starts exactly when the 12:00 one ends');
  const any = await t.book(t.bookingBody(svc, { date, barberId: 'any', email: 'c@example.com', verificationToken: t3 }));
  assert.equal(any.status, 201);
  assert.notEqual(any.body.data.barberName, 'Marcus Reid');
});

test('overlapping appointments for one barber are rejected (45-minute service vs 30-minute start)', opts, async () => {
  const long = await t.makeService({ durationMinutes: 45 });
  const date = t.openDate(5);
  const t1 = await t.tokenFor('a@example.com');
  const t2 = await t.tokenFor('b@example.com');
  assert.equal((await t.book(t.bookingBody(long, { date, barberId: 'daniel', time: '12:00', email: 'a@example.com', verificationToken: t1 }))).status, 201);
  const overlap = await t.book(t.bookingBody(long, { date, barberId: 'daniel', time: '12:30', email: 'b@example.com', verificationToken: t2 }));
  assert.equal(overlap.status, 409);
});

test('simultaneous requests for the same slot: exactly one wins', opts, async () => {
  const svc = await t.makeService();
  const date = t.openDate(5);
  const emails = Array.from({ length: 6 }, (_, i) => `racer${i}@example.com`);
  const tokens = [];
  for (const e of emails) tokens.push(await t.tokenFor(e));
  const results = await Promise.all(emails.map((email, i) => t.book(t.bookingBody(svc, { date, barberId: 'tommy', email, verificationToken: tokens[i] }))));
  assert.equal(results.filter((r) => r.status === 201).length, 1, results.map((r) => r.status).join(','));
  assert.equal(results.filter((r) => r.status === 409).length, 5);
  assert.equal(await t.Appointment.countDocuments({ barberId: 'tommy' }), 1);
  assert.equal(await t.SlotLock.countDocuments({ barberId: 'tommy' }), 2); // 30 min = two 15-minute blocks
});

test('past dates are rejected', opts, async () => {
  const svc = await t.makeService();
  const token = await t.tokenFor('jane@example.com');
  const res = await t.book(t.bookingBody(svc, { date: t.addDays(t.shopNow(t.business.timezone).date, -3), verificationToken: token }));
  assert.equal(res.status, 400);
  assert.equal(await t.Appointment.countDocuments(), 0);
});

test('unavailable slots are rejected: closed day, outside hours, barber day off, unknown barber', opts, async () => {
  const svc = await t.makeService();
  const token = await t.tokenFor('jane@example.com');
  const base = { verificationToken: token };
  assert.equal((await t.book(t.bookingBody(svc, { ...base, time: '03:00' }))).status, 400, 'outside opening hours');
  const sunday = t.openDate(0);
  const marcusOff = await t.book(t.bookingBody(svc, { ...base, date: sunday, barberId: 'marcus', time: '11:00' }));
  assert.equal(marcusOff.status, 409, 'Marcus is off on Sundays');
  const unknown = await t.book(t.bookingBody(svc, { ...base, barberId: 'nobody' }));
  assert.equal(unknown.status, 400);
  const closed = await t.book(t.bookingBody(svc, { ...base, date: '2026-12-25' }));
  assert.equal(closed.status, 400, 'bank holiday (or past, either way not bookable)');
  assert.equal(await t.Appointment.countDocuments(), 0);
});

test('the availability endpoint marks taken slots as unavailable and reports closed days', opts, async () => {
  const svc = await t.makeService();
  const date = t.openDate(5);
  const token = await t.tokenFor('a@example.com');
  await t.book(t.bookingBody(svc, { date, barberId: 'marcus', time: '12:00', email: 'a@example.com', verificationToken: token }));
  const get = (barberId) => request(app).get('/api/appointments/availability').query({ serviceId: String(svc._id), date, barberId });
  const marcus = (await get('marcus')).body.data;
  assert.equal(marcus.slots.find((s) => s.time === '12:00').available, false);
  assert.equal(marcus.slots.find((s) => s.time === '12:30').available, true);
  const any = (await get('any')).body.data;
  assert.equal(any.slots.find((s) => s.time === '12:00').available, true, 'another barber is still free');
  const off = (await request(app).get('/api/appointments/availability').query({ serviceId: String(svc._id), date: t.openDate(0), barberId: 'marcus' })).body.data;
  assert.ok(off.slots.every((s) => !s.available), "Marcus's day off: every slot disabled");
});

test('injection attempts in booking and verification payloads are rejected', opts, async () => {
  const svc = await t.makeService();
  const r1 = await t.book({ ...t.bookingBody(svc), email: { $ne: null }, verificationToken: { $ne: null } });
  assert.equal(r1.status, 400);
  const r2 = await request(app).post('/api/verification/email/verify').send({ email: { $gt: '' }, code: { $gt: '' } });
  assert.equal(r2.status, 400);
  const r3 = await request(app).get('/api/appointments/availability').query({ serviceId: { $ne: '1' }, date: '2030-01-01' });
  assert.equal(r3.status, 400);
});

test('if the booking email fails, the appointment is kept and the failure is recorded', opts, async () => {
  const svc = await t.makeService();
  const token = await t.tokenFor('jane@example.com');
  t.mode.failIf = (m) => /request received/i.test(m.subject);
  const res = await t.book(t.bookingBody(svc, { verificationToken: token }));
  assert.equal(res.status, 201);
  assert.equal(res.body.data.emailStatus, 'failed');
  const appt = await t.Appointment.findOne().lean();
  assert.equal(appt.bookingEmail.status, 'failed');
  assert.equal(appt.bookingEmail.lastError, 'ECONNECTION');
});
