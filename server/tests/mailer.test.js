import test from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'x'.repeat(40);
process.env.SMTP_HOST = 'smtp.test.invalid';
process.env.MAIL_FROM = 'Royal Fade <no-reply@test.invalid>';
process.env.OWNER_EMAIL = 'owner@test.invalid';
const { buildBookingEmail, buildOtpEmail, buildContactEmail, deliver, mailTransport, money } = await import('../services/mailer.js');

const appt = (status) => ({
  reference: 'RF-ABCD1234', status, customerName: 'Jane <b>Doe</b>', serviceName: 'Skin Fade', servicePrice: 26, isStartingPrice: false,
  durationMinutes: 45, barberName: 'Marcus Reid', date: '2030-06-18', startMinutes: 750, endMinutes: 795,
});

test('prices are formatted in pounds', () => {
  assert.equal(money(26), '£26');
  assert.equal(money(26.5), '£26.50');
  assert.equal(money(15, true), 'From £15');
});

test('request-received email says the booking is pending, not confirmed', () => {
  const m = buildBookingEmail(appt('pending'));
  assert.match(m.subject, /request received/i);
  assert.match(m.text, /Pending confirmation/);
  assert.match(m.text, /not yet a confirmed appointment/i);
  assert.doesNotMatch(m.subject, /is confirmed/i);
  assert.match(m.text, /Tuesday, 18 June 2030 at 12:30/);
  assert.match(m.text, /£26/);
});

test('confirmed and cancelled emails are distinct', () => {
  assert.match(buildBookingEmail(appt('confirmed')).subject, /is confirmed/i);
  const c = buildBookingEmail(appt('cancelled'));
  assert.match(c.subject, /cancelled/i);
  assert.match(c.html, /cancelled/i);
});

test('customer-supplied text is HTML-escaped in emails', () => {
  const m = buildBookingEmail(appt('pending'));
  assert.doesNotMatch(m.html, /<b>Doe<\/b>/);
  assert.match(m.html, /&lt;b&gt;Doe/);
});

test('the OTP email contains the code, its lifetime, and Royal Fade branding', () => {
  const m = buildOtpEmail('123456');
  assert.match(m.text, /123456/);
  assert.match(m.text, /10 minutes/);
  assert.match(m.html, /ROYAL FADE/);
});

test('contact email: From is our own sender, Reply-To is the visitor, header injection is neutralised', () => {
  const m = buildContactEmail({ name: 'Evil\r\nBcc: x@y.z <a@b.c>', email: 'v@example.com', subject: 'Hi', message: 'Hello there' });
  assert.equal(m.from.address, 'no-reply@test.invalid');
  assert.equal(m.replyTo.address, 'v@example.com');
  assert.doesNotMatch(m.from.name, /[\r\n<>@]/);
});

test('deliver never throws and logs only a short error code', async () => {
  const logs = [];
  const orig = console.error;
  console.error = (...a) => logs.push(a.join(' '));
  mailTransport.send = async () => { throw Object.assign(new Error('secret@leak.test 654321'), { code: 'EAUTH' }); };
  const r = await deliver({ to: 'a@b.c', subject: 's', text: 't' });
  console.error = orig;
  assert.deepEqual(r, { status: 'failed', error: 'EAUTH' });
  assert.ok(logs.every((l) => !/654321|leak/.test(l)));
});
