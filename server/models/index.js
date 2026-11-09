// Every model, so startup code can create all indexes (unique, TTL) before serving requests.
import { Admin } from './Admin.js';
import { Appointment } from './Appointment.js';
import { ContactMessage } from './ContactMessage.js';
import { EmailVerification } from './EmailVerification.js';
import { OtpThrottle } from './OtpThrottle.js';
import { RateLimit } from './RateLimit.js';
import { Service } from './Service.js';
import { SlotLock } from './SlotLock.js';
import { UploadedImage } from './UploadedImage.js';

export const allModels = [Admin, Appointment, ContactMessage, EmailVerification, OtpThrottle, RateLimit, Service, SlotLock, UploadedImage];

// TTL indexes only clean up old rows; every security rule also checks expiry in code. A server that does not
// implement them (some MongoDB-compatible test servers; real MongoDB and Atlas do) must not stop the app starting.
const isMissingTtlSupport = (err) => err?.code === 238 && /expireAfterSeconds/.test(err.message || '');

/** Creates the indexes the app relies on. Safe to call repeatedly. Unique indexes failing is always fatal. */
export async function initIndexes() {
  await Promise.all(
    allModels.map((m) =>
      m.init().catch((err) => {
        if (!isMissingTtlSupport(err)) throw err;
        console.warn(`Warning: this database does not support TTL indexes (${m.modelName}); expired rows are ignored by the code but not auto-deleted.`);
      }),
    ),
  );
}
