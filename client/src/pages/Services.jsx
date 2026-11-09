import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Heading, Spinner } from '../components/ui.jsx';
import ServiceCard from '../components/ServiceCard.jsx';
import { useBusiness } from '../context/BusinessContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api } from '../lib/api.js';

export default function Services() {
  usePageTitle('Services & Prices');
  const { categories } = useBusiness();
  const [active, setActive] = useState('all');
  const { data, loading, error, reload } = useAsync(() => api.get('/services').then((r) => r.data.data), []);
  const groups = useMemo(
    () => categories.map((c) => ({ ...c, items: (data || []).filter((s) => s.category === c.id) })).filter((g) => g.items.length && (active === 'all' || g.id === active)),
    [categories, data, active],
  );
  const tab = (on) => `rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${on ? 'border-ink-700 bg-ink-700 text-white' : 'border-cream-300 bg-white text-ink-700 hover:border-ink-700'}`;

  return (
    <div className="bg-paper text-ink-700">
      <section className="section pb-6 sm:pb-8">
        <div className="wrap"><Heading as="h1" label="Our Services" title="Services & Prices">All prices are in pounds (GBP) and include a consultation. Pick a service to book it.</Heading></div>
      </section>
      <section className="pb-20 sm:pb-28">
        <div className="wrap">
          <div className="mb-10 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Service categories">
            {[{ id: 'all', label: 'All services' }, ...categories].map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={active === c.id} onClick={() => setActive(c.id)} className={tab(active === c.id)}>{c.label}</button>
            ))}
          </div>
          {loading && <Spinner light label="Loading services" />}
          {error && <Alert light>{error} <button type="button" className="ml-2 underline" onClick={reload}>Try again</button></Alert>}
          {!loading && !error && !groups.length && <p className="text-center text-[#57534e]">No services are listed yet. Please check back soon.</p>}
          <div className="space-y-16">
            {groups.map((g) => (
              <div key={g.id}>
                <h2 className="mb-6 border-b border-cream-300 pb-3 text-2xl">{g.label}</h2>
                <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">{g.items.map((s) => <ServiceCard key={s._id} service={s} />)}</div>
              </div>
            ))}
          </div>
          <p className="mt-14 text-center text-sm text-[#57534e]">Not sure what to book? <Link to="/contact" className="font-semibold text-gold-700 underline">Ask us</Link> and we will recommend the right service.</p>
        </div>
      </section>
    </div>
  );
}
