import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDaysStr, ukToday, weekday } from '../lib/format.js';

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const pad = (n) => String(n).padStart(2, '0');

/** Month calendar. Past dates, dates beyond the booking window, closed weekdays and closed dates are disabled. */
export default function DatePicker({ value, onChange, hours, closedDates = [], maxAdvanceDays = 60, today = ukToday() }) {
  const start = value || today;
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const last = addDaysStr(today, maxAdvanceDays);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1));
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${view.y}-${pad(view.m + 1)}-${pad(i + 1)}`)];
  }, [view]);

  const disabled = (d) => d < today || d > last || closedDates.includes(d) || !hours?.[weekday(d)];
  const title = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(view.y, view.m, 1)));
  const move = (n) => setView(({ y, m }) => { const d = new Date(Date.UTC(y, m + n, 1)); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const canPrev = `${view.y}-${pad(view.m + 1)}` > today.slice(0, 7);
  const canNext = `${view.y}-${pad(view.m + 1)}` < last.slice(0, 7);

  return (
    <div className="max-w-md border border-char-600 bg-char-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={!canPrev} aria-label="Previous month" className="p-2 text-cream-100 hover:text-gold-300 disabled:opacity-30"><ChevronLeft /></button>
        <p className="font-display text-xl text-cream-50" aria-live="polite">{title}</p>
        <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label="Next month" className="p-2 text-cream-100 hover:text-gold-300 disabled:opacity-30"><ChevronRight /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-smoke-400">{DOW.map((d) => <span key={d} className="py-1">{d}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => d === null ? <span key={`b${i}`} /> : (
          <button key={d} type="button" disabled={disabled(d)} onClick={() => onChange(d)} aria-pressed={value === d} aria-label={new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${d}T00:00:00Z`))}
            className={`aspect-square text-sm font-semibold transition ${value === d ? 'bg-gold-500 text-ink' : d === today ? 'border border-gold-600 text-gold-300 hover:bg-gold-500 hover:text-ink' : 'text-cream-100 hover:bg-char-700'} disabled:cursor-not-allowed disabled:text-char-500 disabled:hover:bg-transparent disabled:line-through`}>
            {Number(d.slice(8))}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-smoke-500">Dates are in UK time. Crossed-out days are closed or unavailable.</p>
    </div>
  );
}
