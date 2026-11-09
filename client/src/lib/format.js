export const money = (n, starting = false) => {
  const v = Number(n) || 0;
  const s = `£${v.toLocaleString('en-GB', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
  return starting ? `From ${s}` : s;
};

export const duration = (m) => (m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "2030-06-18" -> "Tuesday 18 June 2030" (calendar maths only, no timezone surprises). */
export const longDate = (dateStr) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${dateStr}T00:00:00Z`)).replace(',', '');
export const shortDate = (dateStr) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${dateStr}T00:00:00Z`)).replace(',', '');

/** Today's date in UK time as YYYY-MM-DD (the shop's timezone, not the visitor's). */
export function ukToday(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
export function addDaysStr(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const weekday = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay();

/** Groups consecutive days that share hours: [{ label: 'Mon - Wed', text: '09:00 - 19:00' }, ...] */
export function hoursRows(hours = {}) {
  const rows = [];
  for (const d of ORDER) {
    const h = hours[d];
    const text = h ? `${h.open} - ${h.close}` : 'Closed';
    const last = rows[rows.length - 1];
    if (last && last.text === text) last.days.push(d);
    else rows.push({ days: [d], text });
  }
  return rows.map((r) => ({
    label: r.days.length === 1 ? DAY_NAMES[r.days[0]] : `${SHORT_DAYS[r.days[0]]} - ${SHORT_DAYS[r.days.at(-1)]}`,
    text: r.text,
  }));
}

export const phoneHref = (p) => `tel:${String(p).replace(/[^\d+]/g, '')}`;
