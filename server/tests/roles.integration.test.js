// Accounts, roles and admin workflows against a real database.
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as t from './helpers/db.js';
const { app, request, auth } = t;

const opts = { skip: t.skip };
before(async () => { if (!t.skip) await t.connect(); });
after(async () => { if (!t.skip) await t.disconnect(); });
beforeEach(async () => { if (!t.skip) await t.reset(); });

const svcBody = { name: 'Razor Fade', description: 'A very sharp fade.', price: '28.5', durationMinutes: '45', category: 'haircuts' };

test('valid admin and developer logins return the role and permissions from the database', opts, async () => {
  const owner = await t.makeAdmin();
  const dev = await t.makeDeveloper();
  const a = await t.login(owner.email, owner.password);
  assert.equal(a.status, 200);
  assert.equal(a.body.data.role, 'admin');
  assert.ok(a.body.data.permissions.includes('appointments:read'));
  assert.ok(!a.body.data.permissions.includes('services:write'));
  const d = await t.login(dev.email, dev.password);
  assert.equal(d.status, 200);
  assert.equal(d.body.data.role, 'developer');
  assert.deepEqual(d.body.data.permissions.sort(), ['services:read', 'services:write']);
  assert.equal(JSON.stringify(a.body).includes('passwordHash'), false);
});

test('an invalid password (or unknown email) gets the same 401 message', opts, async () => {
  const owner = await t.makeAdmin();
  const wrong = await t.login(owner.email, 'wrong-password');
  const unknown = await t.login('nobody@example.com', 'whatever-123');
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.body.message, unknown.body.message);
});

test('logout invalidates the session on the server', opts, async () => {
  const owner = await t.makeAdmin();
  const token = await t.tokenOf(owner);
  assert.equal((await request(app).get('/api/admin/me').set(auth(token))).status, 200);
  assert.equal((await request(app).post('/api/admin/logout').set(auth(token))).status, 200);
  assert.equal((await request(app).get('/api/admin/me').set(auth(token))).status, 401);
  assert.equal((await request(app).get('/api/admin/appointments').set(auth(token))).status, 401);
  // signing in again works and gets a working token
  const again = await t.tokenOf(owner);
  assert.equal((await request(app).get('/api/admin/me').set(auth(again))).status, 200);
});

test('admin can view services (read-only) and cannot create, update or delete them', opts, async () => {
  const owner = await t.makeAdmin();
  const token = await t.tokenOf(owner);
  const svc = await t.makeService();
  const list = await request(app).get('/api/admin/services').set(auth(token));
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
  assert.equal((await request(app).post('/api/admin/services').set(auth(token)).send(svcBody)).status, 403);
  assert.equal((await request(app).put(`/api/admin/services/${svc._id}`).set(auth(token)).send({ ...svcBody, price: '1' })).status, 403);
  assert.equal((await request(app).delete(`/api/admin/services/${svc._id}`).set(auth(token))).status, 403);
  const unchanged = await t.Service.findById(svc._id).lean();
  assert.equal(unchanged.price, 25);
  assert.equal(await t.Service.countDocuments(), 1);
});

test('developer can create, edit (price/description/image), and delete services', opts, async () => {
  const dev = await t.makeDeveloper();
  const token = await t.tokenOf(dev);
  const created = await request(app).post('/api/admin/services').set(auth(token)).send(svcBody);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.data.price, 28.5);
  const id = created.body.data._id;
  const edited = await request(app).put(`/api/admin/services/${id}`).set(auth(token)).send({ ...svcBody, price: '31', description: 'New description here', image: '/images/services/skin-fade.svg' });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.data.price, 31);
  assert.equal(edited.body.data.description, 'New description here');
  const list = await request(app).get('/api/admin/services').set(auth(token));
  assert.equal(list.status, 200);
  const del = await request(app).delete(`/api/admin/services/${id}`).set(auth(token));
  assert.equal(del.status, 200);
  assert.equal(await t.Service.countDocuments(), 0);
  // invalid input is rejected, nothing is written
  const bad = await request(app).post('/api/admin/services').set(auth(token)).send({ ...svcBody, price: '-5', category: 'nope' });
  assert.equal(bad.status, 400);
});

test('a service with upcoming appointments cannot be deleted', opts, async () => {
  const dev = await t.makeDeveloper();
  const token = await t.tokenOf(dev);
  const svc = await t.makeService();
  await t.Appointment.create({ reference: 'RF-TEST0001', service: svc._id, serviceName: 'x', servicePrice: 1, durationMinutes: 30, barberId: 'marcus', barberName: 'Marcus Reid', date: t.futureDate(), startMinutes: 600, endMinutes: 630, customerName: 'A B', email: 'a@b.co', phone: '07700900123', status: 'pending' });
  assert.equal((await request(app).delete(`/api/admin/services/${svc._id}`).set(auth(token))).status, 409);
});

test('developer cannot read appointments or customer messages, and sees no customer data anywhere', opts, async () => {
  const dev = await t.makeDeveloper();
  const token = await t.tokenOf(dev);
  const svc = await t.makeService();
  await t.Appointment.create({ reference: 'RF-TEST0002', service: svc._id, serviceName: 'x', servicePrice: 1, durationMinutes: 30, barberId: 'marcus', barberName: 'Marcus Reid', date: t.futureDate(), startMinutes: 600, endMinutes: 630, customerName: 'Secret Customer', email: 'secret@customer.test', phone: '07700900999' });
  await t.ContactMessage.create({ name: 'Visitor', email: 'visitor@x.test', subject: 'Hello there', message: 'Private message text' });
  for (const url of ['/api/admin/appointments', '/api/admin/messages', '/api/admin/stats', '/api/admin/barbers']) {
    const res = await request(app).get(url).set(auth(token));
    assert.equal(res.status, 403, url);
    assert.ok(!/secret@customer|07700900999|Private message/.test(res.text));
  }
  // the services the developer can see contain no customer data
  const svcs = await request(app).get('/api/admin/services').set(auth(token));
  assert.ok(!/secret@customer|Secret Customer/.test(svcs.text));
});

test('admin dashboard: stats, filters by date/status, search, details', opts, async () => {
  const owner = await t.makeAdmin();
  const token = await t.tokenOf(owner);
  const svc = await t.makeService();
  const date = t.futureDate();
  const mk = (n, over) => t.Appointment.create({ reference: `RF-0000000${n}`, service: svc._id, serviceName: 'Skin Fade', servicePrice: 26, durationMinutes: 30, barberId: 'marcus', barberName: 'Marcus Reid', date, startMinutes: 600 + n * 30, endMinutes: 630 + n * 30, customerName: `Customer ${n}`, email: `c${n}@example.com`, phone: `0770090012${n}`, ...over });
  await mk(1, { status: 'pending' });
  await mk(2, { status: 'confirmed', customerName: 'Zed Special' });
  await mk(3, { status: 'completed' });
  await mk(4, { status: 'cancelled', date: t.addDays(date, 1) });
  const stats = (await request(app).get('/api/admin/stats').set(auth(token))).body.data;
  assert.deepEqual([stats.total, stats.pending, stats.confirmed, stats.completed, stats.cancelled], [4, 1, 1, 1, 1]);
  assert.equal(stats.recent.length, 4);
  const get = (q) => request(app).get('/api/admin/appointments').query(q).set(auth(token));
  assert.equal((await get({})).body.data.length, 4);
  assert.equal((await get({ date })).body.data.length, 3);
  assert.equal((await get({ status: 'confirmed' })).body.data.length, 1);
  assert.equal((await get({ q: 'zed' })).body.data.length, 1);
  assert.equal((await get({ q: 'RF-00000003' })).body.data.length, 1);
  assert.equal((await get({ q: '.*' })).body.data.length, 0, 'regex characters are matched literally');
  // Express 5 parses query strings flatly, so "q[$ne]=" is just an unknown key and never an operator. Repeated or
  // array values (which could become a query operand) are rejected by validation.
  assert.equal((await get({ q: { $ne: '' } })).body.data.length, 4, 'operator-style parameters are ignored, not interpreted');
  assert.equal((await request(app).get('/api/admin/appointments?q=a&q=b').set(auth(token))).status, 400, 'array values are rejected');
  const barbers = await request(app).get('/api/admin/barbers').set(auth(token));
  assert.equal(barbers.status, 200);
  assert.equal(barbers.body.data.length, 4);
});

test('admin confirm / complete / cancel with emails; cancelling frees the slot', opts, async () => {
  const owner = await t.makeAdmin();
  const token = await t.tokenOf(owner);
  const svc = await t.makeService();
  const tk = await t.tokenFor('jane@example.com');
  const booked = await t.book(t.bookingBody(svc, { verificationToken: tk, barberId: 'marcus' }));
  const appt = await t.Appointment.findOne().lean();
  const patch = (status) => request(app).patch(`/api/admin/appointments/${appt._id}/status`).set(auth(token)).send({ status });
  const conf = await patch('confirmed');
  assert.equal(conf.status, 200);
  assert.equal(conf.body.data.status, 'confirmed');
  assert.equal(conf.body.data.confirmedEmail.status, 'sent');
  assert.match(t.mails.at(-1).subject, /confirmed/i);
  const canc = await patch('cancelled');
  assert.equal(canc.body.data.cancelledEmail.status, 'sent');
  assert.match(t.mails.at(-1).subject, /cancelled/i);
  assert.equal(await t.SlotLock.countDocuments({ appointment: appt._id }), 0, 'slot released');
  assert.equal((await patch('confirmed')).status, 400, 'a cancelled appointment cannot be reopened');
  assert.equal(booked.status, 201);
  // another customer can now take the freed slot
  const tk2 = await t.tokenFor('kim@example.com');
  assert.equal((await t.book(t.bookingBody(svc, { verificationToken: tk2, barberId: 'marcus', email: 'kim@example.com' }))).status, 201);
});

test('mark completed works from confirmed', opts, async () => {
  const owner = await t.makeAdmin();
  const token = await t.tokenOf(owner);
  const svc = await t.makeService();
  const tk = await t.tokenFor('jane@example.com');
  await t.book(t.bookingBody(svc, { verificationToken: tk }));
  const id = (await t.Appointment.findOne())._id;
  await request(app).patch(`/api/admin/appointments/${id}/status`).set(auth(token)).send({ status: 'confirmed' });
  const done = await request(app).patch(`/api/admin/appointments/${id}/status`).set(auth(token)).send({ status: 'completed' });
  assert.equal(done.status, 200);
  assert.equal(done.body.data.status, 'completed');
});

test('admin cannot confirm an unverified booking', opts, async () => {
  const owner = await t.makeAdmin();
  const token = await t.tokenOf(owner);
  const svc = await t.makeService();
  const legacy = await t.Appointment.create({ reference: 'RF-LEGACY01', service: svc._id, serviceName: 'x', servicePrice: 1, durationMinutes: 30, barberId: 'marcus', barberName: 'Marcus Reid', date: t.futureDate(), startMinutes: 600, endMinutes: 630, customerName: 'No Proof', email: 'noproof@example.com', phone: '07700900123' }); // emailVerified defaults to false
  const res = await request(app).patch(`/api/admin/appointments/${legacy._id}/status`).set(auth(token)).send({ status: 'confirmed' });
  assert.equal(res.status, 409);
  assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');
  assert.equal((await t.Appointment.findById(legacy._id)).status, 'pending');
  const resend = await request(app).post(`/api/admin/appointments/${legacy._id}/resend-email`).set(auth(token));
  assert.equal(resend.status, 409);
  assert.equal(t.mails.length, 0, 'nothing is ever emailed to an unverified address');
  // it can still be cancelled
  assert.equal((await request(app).patch(`/api/admin/appointments/${legacy._id}/status`).set(auth(token)).send({ status: 'cancelled' })).status, 200);
  assert.equal(t.mails.length, 0);
});

test('failed emails are visible in the dashboard and can be resent', opts, async () => {
  const owner = await t.makeAdmin();
  const token = await t.tokenOf(owner);
  const svc = await t.makeService();
  const tk = await t.tokenFor('jane@example.com');
  t.mode.failIf = (m) => /request received/i.test(m.subject);
  await t.book(t.bookingBody(svc, { verificationToken: tk }));
  const list = await request(app).get('/api/admin/appointments').set(auth(token));
  assert.equal(list.body.data[0].bookingEmail.status, 'failed');
  t.mode.failIf = null;
  const resend = await request(app).post(`/api/admin/appointments/${list.body.data[0]._id}/resend-email`).set(auth(token));
  assert.equal(resend.status, 200);
  assert.equal(resend.body.data.bookingEmail.status, 'sent');
  assert.equal(resend.body.data.bookingEmail.attempts, 2);
});

test('contact messages: saved, listed and marked read by the admin', opts, async () => {
  const owner = await t.makeAdmin();
  const token = await t.tokenOf(owner);
  const sent = await request(app).post('/api/contact').send({ name: 'Visitor', email: 'v@example.com', subject: 'Opening times', message: 'Are you open on Sundays?' });
  assert.equal(sent.status, 201);
  const list = await request(app).get('/api/admin/messages').set(auth(token));
  assert.equal(list.body.data.length, 1);
  assert.equal(list.body.data[0].read, false);
  const read = await request(app).patch(`/api/admin/messages/${list.body.data[0]._id}/read`).set(auth(token));
  assert.equal(read.body.data.read, true);
  assert.equal((await request(app).post('/api/contact').send({ name: 'x', email: 'bad', subject: '', message: '' })).status, 400);
});

test('developer provisioning: refuses the admin email, short passwords; reset bumps tokenVersion', opts, async () => {
  const owner = await t.makeAdmin('owner@royalfade.test');
  await assert.rejects(t.provisionDeveloper('owner@royalfade.test', 'a-very-long-password-1'), /business admin/);
  await assert.rejects(t.provisionDeveloper('dev2@royalfade.test', 'short'), /at least 12/);
  await assert.rejects(t.provisionDeveloper('dev2@royalfade.test', 'a-very-long-password-1', { adminEmail: 'dev2@royalfade.test' }), /ADMIN_EMAIL/);
  const created = await t.provisionDeveloper('dev2@royalfade.test', 'a-very-long-password-1');
  assert.equal(created.action, 'created');
  const first = await t.Admin.findOne({ email: 'dev2@royalfade.test' }).select('+passwordHash');
  assert.equal(first.role, 'developer');
  assert.notEqual(first.passwordHash, 'a-very-long-password-1');
  assert.ok(first.passwordHash.startsWith('$2'), 'bcrypt hash');
  const token = (await t.login('dev2@royalfade.test', 'a-very-long-password-1')).body.data.token;
  assert.equal((await request(app).get('/api/admin/me').set(auth(token))).status, 200);
  const reset = await t.provisionDeveloper('dev2@royalfade.test', 'another-long-password-2');
  assert.equal(reset.action, 'password-updated');
  assert.equal((await request(app).get('/api/admin/me').set(auth(token))).status, 401, 'old session invalidated');
  assert.equal((await t.login('dev2@royalfade.test', 'another-long-password-2')).status, 200);
  assert.equal(owner.doc.role, 'admin');
});
