// Pure scheduling helpers (no database access) so they can be unit tested.

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateStr(str) {
  if (typeof str !== 'string' || !DATE_RE.test(str)) return false;
  const d = new Date(`${str}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === str;
}

export function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export const toHHMM = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** 24-hour UK style label, e.g. "14:30". */
export const formatTime = (minutes) => toHHMM(minutes);

export function dayOfWeek(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

export function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Current date (YYYY-MM-DD) and minutes-since-midnight in the shop's timezone (handles GMT/BST). */
export function shopNow(timezone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Time a service occupies, rounded up to whole grid blocks. */
export const blockedMinutes = (durationMinutes, slotMinutes) => Math.ceil(durationMinutes / slotMinutes) * slotMinutes;

/** Grid block start times (minutes) that a booking starting at `start` occupies. */
export function slotsFor(start, durationMinutes, slotMinutes) {
  const total = blockedMinutes(durationMinutes, slotMinutes);
  const out = [];
  for (let t = start; t < start + total; t += slotMinutes) out.push(t);
  return out;
}

/** Shop opening window for a date, or null when closed (no hours that weekday, or a closed date). */
export function shopHoursFor(business, dateStr) {
  if (business.closedDates?.includes(dateStr)) return null;
  const h = business.hours[dayOfWeek(dateStr)];
  return h ? { open: toMinutes(h.open), close: toMinutes(h.close) } : null;
}

/** A barber's working window for a date: their own hours (or the shop's) clipped to the shop's. Null = not working. */
export function barberHoursFor(business, barber, dateStr) {
  const shop = shopHoursFor(business, dateStr);
  if (!shop) return null;
  const dow = dayOfWeek(dateStr);
  if (barber.daysOff?.includes(dow)) return null;
  if (barber.unavailableDates?.includes(dateStr)) return null;
  let open = shop.open;
  let close = shop.close;
  if (barber.hours) {
    const own = barber.hours[dow];
    if (!own) return null; // has custom hours but none for this weekday
    open = Math.max(open, toMinutes(own.open));
    close = Math.min(close, toMinutes(own.close));
  }
  return open < close ? { open, close } : null;
}

/**
 * All start times the SHOP offers for a date and service duration, ignoring existing bookings and barbers.
 * Returns [] for closed days, past dates and dates too far ahead.
 */
export function candidateStarts({ dateStr, durationMinutes, business, now = new Date() }) {
  if (!isValidDateStr(dateStr)) return [];
  const today = shopNow(business.timezone, now);
  if (dateStr < today.date) return [];
  if (dateStr > addDays(today.date, business.maxAdvanceDays)) return [];

  const hours = shopHoursFor(business, dateStr);
  if (!hours) return [];
  const block = blockedMinutes(durationMinutes, business.slotMinutes);
  const step = business.startIntervalMinutes || business.slotMinutes;

  const starts = [];
  for (let t = hours.open; t + block <= hours.close; t += step) {
    if (dateStr === today.date && t < today.minutes + business.minLeadMinutes) continue;
    starts.push(t);
  }
  return starts;
}

/**
 * busy: Map<barberId, Set<gridBlockStartMinutes>>
 * Returns the barbers who work for the whole booking AND have every grid block free.
 */
export function freeBarbers({ dateStr, start, durationMinutes, barbers, busy, business }) {
  const needed = slotsFor(start, durationMinutes, business.slotMinutes);
  const end = start + blockedMinutes(durationMinutes, business.slotMinutes);
  return barbers.filter((b) => {
    const hours = barberHoursFor(business, b, dateStr);
    if (!hours || start < hours.open || end > hours.close) return false;
    const taken = busy.get(b.id);
    return !taken || needed.every((s) => !taken.has(s));
  });
}
