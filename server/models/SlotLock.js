import mongoose from 'mongoose';

// One document per barber per 15-minute block. The unique index makes double-booking impossible
// even when two requests arrive at the same moment (on different serverless instances too).
const slotLockSchema = new mongoose.Schema({
  barberId: { type: String, required: true },
  date: { type: String, required: true },
  slot: { type: Number, required: true }, // block start in minutes since midnight
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
});

slotLockSchema.index({ barberId: 1, date: 1, slot: 1 }, { unique: true });
slotLockSchema.index({ appointment: 1 });

export const SlotLock = mongoose.model('SlotLock', slotLockSchema);
