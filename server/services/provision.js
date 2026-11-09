import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Admin } from '../models/Admin.js';

const emailSchema = z.string().trim().toLowerCase().email().max(120);
export const MIN_DEVELOPER_PASSWORD = 12;

/**
 * Creates (or resets the password of) the developer account. This is the ONLY way a developer account comes
 * into existence: there is no API, no registration page and no request field for it.
 * It refuses the business admin's email (from the database AND from ADMIN_EMAIL), so the two are never mixed up.
 * Returns { action: 'created' | 'password-updated', email }.
 */
export async function provisionDeveloper(rawEmail, password, { adminEmail = process.env.ADMIN_EMAIL } = {}) {
  const parsed = emailSchema.safeParse(rawEmail);
  if (!parsed.success) throw new Error('Enter a valid email address.');
  const email = parsed.data;
  if (typeof password !== 'string' || password.length < MIN_DEVELOPER_PASSWORD) {
    throw new Error(`The password must be at least ${MIN_DEVELOPER_PASSWORD} characters.`);
  }
  const local = email.split('@')[0];
  if (local.length >= 4 && password.toLowerCase().includes(local)) {
    throw new Error('The password must not contain the email name.');
  }
  if (adminEmail && email === String(adminEmail).trim().toLowerCase()) {
    throw new Error('That email is the business admin email (ADMIN_EMAIL). Use a different email for the developer account.');
  }

  const existing = await Admin.findOne({ email });
  if (existing && (existing.role ?? 'admin') !== 'developer') {
    throw new Error('That email already belongs to the business admin account. Use a different email for the developer account.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.tokenVersion = (existing.tokenVersion || 0) + 1; // signs out every existing developer session
    await existing.save();
    return { action: 'password-updated', email };
  }
  await Admin.create({ email, passwordHash, role: 'developer' });
  return { action: 'created', email };
}
