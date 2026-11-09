import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { RateLimit } from '../models/RateLimit.js';

// DISABLE_RATE_LIMIT=true is for automated tests only.
const skip = () => process.env.DISABLE_RATE_LIMIT === 'true';

/**
 * express-rate-limit store backed by MongoDB, so the counters are shared by every serverless instance.
 * Uses only basic operators (find/update/upsert) so it works on any MongoDB-compatible server.
 */
export class MongoStore {
  init(options) {
    this.windowMs = options.windowMs;
  }

  prefixed(key) {
    return `${this.prefix}:${key}`;
  }

  async increment(rawKey) {
    const key = this.prefixed(rawKey);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const now = new Date();
      // 1. A live window exists: count in it atomically.
      const live = await RateLimit.findOneAndUpdate({ key, resetAt: { $gt: now } }, { $inc: { hits: 1 } }, { returnDocument: 'after' }).lean();
      if (live) return { totalHits: live.hits, resetTime: live.resetAt };
      // 2. No live window: start one. The filter only matches an EXPIRED window, so a live one is never reset;
      //    when a live window appears meanwhile the upsert collides on the unique key (E11000) and we loop to step 1.
      const resetAt = new Date(now.getTime() + this.windowMs);
      try {
        const fresh = await RateLimit.findOneAndUpdate({ key, resetAt: { $lte: now } }, { $set: { hits: 1, resetAt } }, { upsert: true, returnDocument: 'after' }).lean();
        return { totalHits: fresh.hits, resetTime: fresh.resetAt };
      } catch (err) {
        if (err?.code !== 11000) throw err; // lost the race: loop and count in the winner's window
      }
    }
    return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
  }

  async decrement(rawKey) {
    await RateLimit.updateOne({ key: this.prefixed(rawKey), hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(rawKey) {
    await RateLimit.deleteOne({ key: this.prefixed(rawKey) });
  }
}

const make = (name, windowMs, limit, message) =>
  rateLimit({
    skip,
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    passOnStoreError: true, // a counter outage must not take the whole site down
    validate: { xForwardedForHeader: false, trustProxy: false },
    ...(env.rateLimitStore === 'mongo' && Object.assign({}, { store: Object.assign(new MongoStore(), { prefix: name }) })),
    message: { success: false, message },
  });

export const apiLimiter = make('api', 15 * 60 * 1000, 300, 'Too many requests. Please try again later.');
export const loginLimiter = make('login', 15 * 60 * 1000, 10, 'Too many login attempts. Please try again in 15 minutes.');
export const submitLimiter = make('submit', 60 * 60 * 1000, 20, 'Too many submissions. Please try again later.');
// Email verification: per IP. Per-address limits (cooldown, hourly cap, attempts) live in the controller.
export const otpRequestLimiter = make('otp-request', 60 * 60 * 1000, 10, 'Too many verification requests. Please try again later.');
export const otpVerifyLimiter = make('otp-verify', 15 * 60 * 1000, 30, 'Too many verification attempts. Please try again later.');
