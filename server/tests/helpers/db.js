// Shared setup for database-backed tests. Requires MONGODB_TEST_URI (any MongoDB or MongoDB-compatible server).
// WARNING: collections are emptied, so point it at a throw-away database.
process.env.JWT_SECRET ||= 'x'.repeat(40);
process.env.SMTP_HOST = 'smtp.test.invalid'; // makes email "configured"; nothing is ever sent
process.env.MAIL_FROM = 'Royal Fade <no-reply@test.invalid>';
process.env.DISABLE_RATE_LIMIT = 'true'; // per-IP limiter off; per-address rules are still tested

import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';

export const uri = process.env.MONGODB_TEST_URI;
export const skip = !uri && 'MONGODB_TEST_URI not set';

const { createApp } = await import('../../app.js');
const { mailTransport } = await import('../../services/mailer.js');
const { allModels, initIndexes } = await import('../../models/index.js');
export const { Appointment } = await import('../../models/Appointment.js');
export const { SlotLock } = await import('../../models/SlotLock.js');
export const { Service } = await import('../../models/Service.js');
export const { EmailVerification } = await import('../../models/EmailVerification.js');
export const { OtpThrottle } = await import('../../models/OtpThrottle.js');
export const { Admin } = await import('../../models/Admin.js');
export const { ContactMessage } = await import('../../models/ContactMessage.js');
export const { UploadedImage } = await import('../../models/UploadedImage.js');
export const { business } = await import('../../config/business.js');
export const { addDays, shopNow, dayOfWeek } = await import('../../services/schedule.js');
export const { env } = await import('../../config/env.js');
export const { signToken } = await import('../../middleware/auth.js');
export const { provisionDeveloper } = await import('../../services/provision.js');
export const bcrypt = (await import('bcryptjs')).default;

export const app = createApp();

// ---- mail capture ----
export const mails = [];
export const mode = { failIf: null };
mailTransport.send = async (message) => {
  if (mode.failIf?.(message)) throw Object.assign(new Error('simulated SMTP outage'), { code: 'ECONNECTION' });
  mails.push(message);
};

// ---- capture console output so tests can prove codes are never logged ----
export const logged = [];
for (const k of ['log', 'error', 'warn', 'info']) {
  const original = console[k].bind(console);
  console[k] = (...args) => { logged.push(args.map(String).join(' ')); original(...args); };
}

export async function connect() {
  await mongoose.connect(uri);
  // Some MongoDB-compatible servers used for local testing do not implement TTL indexes (real MongoDB does).
  await Promise.all(allModels.map((m) => m.init().catch((e) => { if (!/expireAfterSeconds/.test(e.message)) throw e; })));
}
export const disconnect = () => mongoose.disconnect();
export { initIndexes };

export async function reset() {
  await Promise.all(allModels.map((m) => m.deleteMany({})));
  mails.length = 0;
  logged.length = 0;
  mode.failIf = null;
}

export async function makeService(over = {}) {
  return Service.create({ name: 'Test Haircut', description: 'Test service', price: 25, durationMinutes: 30, category: 'haircuts', slug: `test-${Math.random().toString(36).slice(2)}`, ...over });
}

/** A future date on which the shop is open and `barberId` (default: any barber) works. Defaults to a Friday ~2 weeks out. */
export function openDate(weekday = 5, minDays = 7) {
  let d = addDays(shopNow(business.timezone).date, minDays);
  while (dayOfWeek(d) !== weekday || business.closedDates.includes(d)) d = addDays(d, 1);
  return d;
}
export const futureDate = () => openDate(5);

export const codeFor = (email) => {
  const mail = [...mails].reverse().find((m) => m.to === email && /verification code/i.test(m.subject));
  return mail ? mail.text.match(/\b(\d{6})\b/)[1] : null;
};
export const requestCode = (email) => request(app).post('/api/verification/email/request').send({ email });
export const verifyCode = (email, code) => request(app).post('/api/verification/email/verify').send({ email, code });

/** Full happy path: request a code, read it from the captured email, verify. Returns the authorization token. */
export async function tokenFor(email) {
  await OtpThrottle.deleteMany({ email }); // test convenience only; the cooldown has its own tests
  const sent = await requestCode(email);
  if (sent.status !== 202) throw new Error(`code request failed: ${sent.status} ${JSON.stringify(sent.body)}`);
  const res = await verifyCode(email, codeFor(email));
  if (res.status !== 200) throw new Error(`verify failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.verificationToken;
}

export const bookingBody = (service, over = {}) => ({
  serviceId: String(service._id), date: futureDate(), time: '12:00', barberId: 'any', customerName: 'Jane Doe',
  email: 'jane@example.com', phone: '07700 900123', ...over,
});
export const book = (body) => request(app).post('/api/appointments').send(body);

// ---- accounts ----
export async function makeAdmin(email = 'owner@royalfade.test', password = 'owner-password-123') {
  const doc = await Admin.create({ email, passwordHash: await bcrypt.hash(password, 4), role: 'admin' });
  return { doc, email, password };
}
export async function makeDeveloper(email = 'dev@royalfade.test', password = 'developer-password-123') {
  const doc = await Admin.create({ email, passwordHash: await bcrypt.hash(password, 4), role: 'developer' });
  return { doc, email, password };
}
export const login = (email, password) => request(app).post('/api/admin/login').send({ email, password });
export async function tokenOf(acct) {
  const res = await login(acct.email, acct.password);
  if (res.status !== 200) throw new Error(`login failed ${res.status}`);
  return res.body.data.token;
}
export const auth = (token) => ({ Authorization: `Bearer ${token}` });
export { jwt, request };
