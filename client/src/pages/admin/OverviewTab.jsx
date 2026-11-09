import { Link } from 'react-router-dom';
import { Alert, Spinner } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { api } from '../../lib/api.js';
import { money, shortDate } from '../../lib/format.js';
import { EmailState, Panel, StatusBadge } from './shared.jsx';

const CARDS = [
  ['total', 'Total appointments', 'text-cream-50'],
  ['pending', 'Pending', 'text-amber-200'],
  ['confirmed', 'Confirmed', 'text-emerald-200'],
  ['completed', 'Completed', 'text-sky-200'],
  ['cancelled', 'Cancelled', 'text-red-200'],
];

export default function OverviewTab() {
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/stats').then((r) => r.data.data), []);
  if (loading) return <Spinner label="Loading statistics" />;
  if (error) return <Alert>{error} <button type="button" className="ml-2 underline" onClick={reload}>Try again</button></Alert>;
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CARDS.map(([k, label, color]) => (
          <div key={k} className="border border-char-700 bg-char-900 p-5"><p className="text-sm text-smoke-400">{label}</p><p className={`mt-2 font-display text-5xl ${color}`}>{data[k]}</p></div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border border-gold-600/40 bg-gold-500/5 p-5"><p className="text-sm text-smoke-400">Appointments today</p><p className="mt-1 font-display text-3xl text-gold-300">{data.today}</p></div>
        <div className="border border-gold-600/40 bg-gold-500/5 p-5"><p className="text-sm text-smoke-400">Upcoming (pending and confirmed)</p><p className="mt-1 font-display text-3xl text-gold-300">{data.upcoming}</p></div>
        <Link to="/admin/messages" className="border border-gold-600/40 bg-gold-500/5 p-5 transition hover:bg-gold-500/10"><p className="text-sm text-smoke-400">Unread messages</p><p className="mt-1 font-display text-3xl text-gold-300">{data.unreadMessages ?? 0}</p></Link>
      </div>
      <Panel title="Recent bookings" action={<Link to="/admin/appointments" className="btn-line btn-sm">All appointments</Link>}>
        {!data.recent.length ? <p className="p-6 text-smoke-400">No bookings yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-smoke-400"><tr>{['Reference', 'Customer', 'Service', 'When', 'Price', 'Status', 'Email'].map((h) => <th key={h} className="px-6 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-char-700">
                {data.recent.map((a) => (
                  <tr key={a._id}><td className="px-6 py-3 font-semibold text-gold-300">{a.reference}</td><td className="px-6 py-3">{a.customerName}</td><td className="px-6 py-3">{a.serviceName}<span className="block text-xs text-smoke-400">{a.barberName}</span></td><td className="px-6 py-3">{shortDate(a.date)} {a.timeLabel}</td><td className="px-6 py-3">{money(a.servicePrice, a.isStartingPrice)}</td><td className="px-6 py-3"><StatusBadge status={a.status} /></td><td className="px-6 py-3"><EmailState appt={a} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
