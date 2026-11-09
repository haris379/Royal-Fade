import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { assertRuntimeEnv } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Service } from '../models/Service.js';
import { Admin } from '../models/Admin.js';
import { syncCatalog } from '../services/serviceCatalog.js';

/** Safe to run repeatedly. Exported so tests can run it against a test database. */
export async function seed({ adminEmail, adminPassword, log = console.log } = {}) {
  const r = await syncCatalog(Service);
  log(`Service catalogue synced: ${r.created} created, ${r.updated} updated, ${r.unchanged} unchanged`);

  const email = (adminEmail || '').trim().toLowerCase();
  if (!email || (adminPassword || '').length < 10) {
    log('Skipping admin creation: set ADMIN_EMAIL and an ADMIN_PASSWORD of 10+ characters in server/.env');
    return { catalog: r, admin: 'skipped' };
  }
  const existing = await Admin.findOne({ email }).select('+passwordHash');
  if (existing && existing.role === 'developer') {
    log(`Skipping ${email}: that email is the developer account. Use a different ADMIN_EMAIL for the business admin.`);
    return { catalog: r, admin: 'refused-developer' };
  }
  if (!existing) {
    await Admin.create({ email, passwordHash: await bcrypt.hash(adminPassword, 12), role: 'admin' });
    log(`Created admin ${email}`);
    return { catalog: r, admin: 'created' };
  }
  if (await bcrypt.compare(adminPassword, existing.passwordHash)) {
    log(`Admin ${email} is up to date`);
    return { catalog: r, admin: 'unchanged' };
  }
  existing.passwordHash = await bcrypt.hash(adminPassword, 12);
  existing.tokenVersion = (existing.tokenVersion || 0) + 1; // the password changed: sign out old sessions
  await existing.save();
  log(`Updated password for admin ${email}`);
  return { catalog: r, admin: 'password-updated' };
}

// Run only when executed directly (npm run seed), not when imported by tests.
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  (async () => {
    assertRuntimeEnv();
    await connectDB();
    await seed({ adminEmail: process.env.ADMIN_EMAIL, adminPassword: process.env.ADMIN_PASSWORD });
    await disconnectDB();
  })().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
