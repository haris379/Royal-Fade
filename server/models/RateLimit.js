import mongoose from 'mongoose';

// Per-IP request counters shared by every serverless instance (see middleware/rateLimit.js).
const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  hits: { type: Number, required: true },
  resetAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }, // TTL cleanup
});

export const RateLimit = mongoose.model('RateLimit', schema);
