import { Alert, Img, Spinner } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { api } from '../../lib/api.js';
import { shortDate } from '../../lib/format.js';
import { Panel } from './shared.jsx';

export default function BarbersTab() {
  const { data, loading, error } = useAsync(() => api.get('/admin/barbers').then((r) => r.data.data), []);
  if (loading) return <Spinner label="Loading barbers" />;
  if (error) return <Alert>{error}</Alert>;
  return (
    <Panel title="Barbers">
      <p className="border-b border-char-700 px-6 py-4 text-sm text-smoke-400">Read-only. Barber details and working hours are set in the website configuration by the maintainer.</p>
      <div className="grid gap-px bg-char-700 lg:grid-cols-2">
        {data.map((b) => (
          <article key={b.id} className="bg-char-900 p-6">
            <div className="flex gap-5">
              <Img src={`/images/barbers/${b.id}.svg`} alt="" className="h-28 w-24 shrink-0 object-cover" />
              <div><h3 className="font-display text-2xl text-cream-50">{b.name}</h3><p className="text-sm font-semibold text-gold-400">{b.title} &middot; {b.experienceYears} years</p><p className="mt-2 text-sm text-smoke-300">{b.specialties.join(' · ')}</p></div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-smoke-300">{b.bio}</p>
            <h4 className="mt-5 text-xs font-semibold text-smoke-400">Next 7 days</h4>
            <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              {b.nextSevenDays.map((d) => <li key={d.date} className="flex justify-between"><span className="text-smoke-400">{shortDate(d.date)}</span><span className={d.hours ? 'text-cream-100' : 'text-smoke-500'}>{d.hours || 'Off'}</span></li>)}
            </ul>
          </article>
        ))}
      </div>
    </Panel>
  );
}
