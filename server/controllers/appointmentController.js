import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Appointment } from '../models/Appointment.js';
import { SlotLock } from '../models/SlotLock.js';
import { Service } from '../models/Service.js';
import { EmailVerification } from '../models/EmailVerification.js';
import { business } from '../config/business.js';
import { AppError } from '../utils/AppError.js';
import { sendBookingEmail } from '../services/mailer.js';
import { hashAuthToken } from '../services/otp.js';
import { recordEmailResult } from '../services/notifications.js';
import { candidateStarts, formatTime, freeBarbers, slotsFor, toMinutes, toHHMM, blockedMinutes } from '../services/schedule.js';
import { availabilityQuery, createAppointmentBody } from '../utils/validators.js';
import { categoryLabel, normalizeCategory } from '../utils/categories.js';

/** The barbers a request may be served by: one named barber, or everyone for "any". */
function resolveBarbers(barberId) {
  if (!barberId || barberId === 'any') return business.barbers;
  const found = business.barbers.find((b) => b.id === barberId);
  if (!found) throw new AppError(400, 'Please choose a valid barber.', { barberId: 'Unknown barber' });
  return [found];
}

async function loadBusy(date) {
  const locks = await SlotLock.find({ date }).select('barberId slot').lean();
  const busy = new Map();
  for (const l of locks) {
    if (!busy.has(l.barberId)) busy.set(l.barberId, new Set());
    busy.get(l.barberId).add(l.slot);
  }
  return busy;
}

export async function getAvailability(req, res) {
  const q = availabilityQuery.parse(req.query);
  const barbers = resolveBarbers(q.barberId);
  const service = await Service.findOne({ _id: q.serviceId, active: true }).lean();
  if (!service) throw new AppError(404, 'Service not found.');

  const starts = candidateStarts({ dateStr: q.date, durationMinutes: service.durationMinutes, business });
  const busy = await loadBusy(q.date);

  const slots = starts.map((start) => {
    const free = freeBarbers({ dateStr: q.date, start, durationMinutes: service.durationMinutes, barbers, busy, business });
    return { time: toHHMM(start), label: formatTime(start), available: free.length > 0 };
  });

  res.json({ success: true, data: { date: q.date, closed: starts.length === 0, slots } });
}

const makeReference = () => `RF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

const bookingResponse = (appt, emailStatus, extra = {}) => ({
  reference: appt.reference,
  status: appt.status,
  customerName: appt.customerName,
  serviceName: appt.serviceName,
  serviceCategory: appt.serviceCategory,
  categoryLabel: categoryLabel(appt.serviceCategory),
  servicePrice: appt.servicePrice,
  isStartingPrice: appt.isStartingPrice,
  date: appt.date,
  timeLabel: formatTime(appt.startMinutes),
  barberName: appt.barberName,
  durationMinutes: appt.durationMinutes,
  emailVerified: true,
  emailStatus,
  ...extra,
});

const NOT_VERIFIED = 'Please verify your email address before booking.';

/**
 * Proves the caller controls the email on the booking. Nothing the client says about verification is trusted:
 * the token must hash to a server-side record for this exact address that was verified and has not expired.
 */
async function requireVerification(email, token) {
  if (!token || typeof token !== 'string') throw new AppError(403, NOT_VERIFIED, undefined, 'EMAIL_NOT_VERIFIED');
  const record = await EmailVerification.findOne({ tokenHash: hashAuthToken(token) });
  if (!record || record.email !== email || !['verified', 'consumed'].includes(record.status)) {
    throw new AppError(403, NOT_VERIFIED, undefined, 'EMAIL_NOT_VERIFIED');
  }
  return record;
}

/** The same request sent twice (double click, network retry) returns the booking that already exists. */
async function replayOrReject(record, body, startMinutes) {
  const existing = await Appointment.findOne({ verification: record._id });
  if (!existing) return null;
  const same = String(existing.service) === body.serviceId && existing.date === body.date && existing.startMinutes === startMinutes;
  if (!same) {
    throw new AppError(409, 'This email verification was already used for another booking. Please verify again to make a new booking.', undefined, 'VERIFICATION_ALREADY_USED');
  }
  return existing;
}

const replayResponse = (res, appt) =>
  res.status(200).json({ success: true, message: 'Your appointment request was already saved.', data: bookingResponse(appt, appt.bookingEmail?.status || 'not_sent', { replayed: true }) });

export async function createAppointment(req, res) {
  const body = createAppointmentBody.parse(req.body);
  const barbers = resolveBarbers(body.barberId);

  // Price, duration and name always come from the database, never from the request.
  const service = await Service.findOne({ _id: body.serviceId, active: true }).lean();
  if (!service) throw new AppError(404, 'That service is no longer available.');

  const start = toMinutes(body.time);
  const valid = candidateStarts({ dateStr: body.date, durationMinutes: service.durationMinutes, business });
  if (!valid.includes(start)) {
    throw new AppError(400, 'That date or time is not bookable. Please choose another slot.', { time: 'Choose an available time' });
  }

  // 1. Email ownership (enforced here, whatever the frontend shows).
  const record = await requireVerification(body.email, body.verificationToken);
  const earlier = await replayOrReject(record, body, start);
  if (earlier) return replayResponse(res, earlier);
  if (record.status !== 'verified' || !record.authExpiresAt || record.authExpiresAt <= new Date()) {
    throw new AppError(403, 'Your email verification has expired. Please verify your email again.', undefined, 'VERIFICATION_EXPIRED');
  }

  // 2. Availability, re-checked on the server (barber hours, days off, existing bookings).
  const busy = await loadBusy(body.date);
  const free = freeBarbers({ dateStr: body.date, start, durationMinutes: service.durationMinutes, barbers, busy, business });
  if (!free.length) throw new AppError(409, 'Sorry, that time is not available. Please pick another slot.', undefined, 'SLOT_TAKEN');

  const slots = slotsFor(start, service.durationMinutes, business.slotMinutes);
  const end = start + blockedMinutes(service.durationMinutes, business.slotMinutes);

  // 3. Claim the slot (unique index on SlotLock) and the verification (unique index on Appointment.verification).
  //    A failed attempt leaves the verification usable.
  for (const barber of free) {
    const apptId = new mongoose.Types.ObjectId();
    try {
      await SlotLock.insertMany(slots.map((slot) => ({ barberId: barber.id, date: body.date, slot, appointment: apptId })), { ordered: true });
    } catch (err) {
      await SlotLock.deleteMany({ appointment: apptId });
      const isDuplicate = err?.code === 11000 || err?.writeErrors?.some((w) => w.code === 11000);
      if (isDuplicate) continue; // someone else got this barber at the same moment; try the next one
      throw err;
    }

    let appt;
    try {
      appt = await Appointment.create({
        _id: apptId,
        reference: makeReference(),
        service: service._id,
        serviceName: service.name,
        serviceCategory: normalizeCategory(service.category),
        servicePrice: service.price,
        isStartingPrice: service.isStartingPrice,
        durationMinutes: service.durationMinutes,
        barberId: barber.id,
        barberName: barber.name,
        barberRequested: body.barberId || 'any',
        date: body.date,
        startMinutes: start,
        endMinutes: end,
        customerName: body.customerName,
        email: body.email,
        phone: body.phone,
        notes: body.notes,
        emailVerified: true,
        emailVerifiedAt: record.verifiedAt,
        verification: record._id,
      });
    } catch (err) {
      await SlotLock.deleteMany({ appointment: apptId });
      if (err?.code === 11000) {
        // The unique index on Appointment.verification rejected us: a parallel identical request already saved it.
        const winner = await replayOrReject(record, body, start);
        if (winner) return replayResponse(res, winner);
      }
      throw err;
    }

    // 4. The booking exists. Mark the authorization used, then (only now) send the email.
    await EmailVerification.updateOne({ _id: record._id }, { $set: { status: 'consumed', consumedAt: new Date(), appointment: appt._id } });
    const result = await sendBookingEmail(appt);
    await recordEmailResult(appt._id, 'bookingEmail', result);

    return res.status(201).json({ success: true, message: 'Your appointment request has been saved.', data: bookingResponse(appt, result.status) });
  }

  // Every barber was claimed. If the claimant was our own duplicate request, return that booking.
  const ours = await replayOrReject(record, body, start);
  if (ours) return replayResponse(res, ours);
  throw new AppError(409, 'Sorry, that time was just taken. Please pick another slot.', undefined, 'SLOT_TAKEN');
}
