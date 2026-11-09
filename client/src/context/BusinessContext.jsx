import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { site } from '../config/site.js';

const Ctx = createContext(null);

/** Public business data from the API (contact, hours, barbers, categories). Falls back to built-in defaults. */
export function BusinessProvider({ children }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    api.get('/business')
      .then((r) => { if (alive) { setData(r.data.data); setStatus('ready'); } })
      .catch(() => { if (alive) setStatus('error'); });
    return () => { alive = false; };
  }, []);

  const value = useMemo(() => ({
    status,
    contact: data?.contact || site.fallback.contact,
    hours: data?.hours || site.fallback.hours,
    barbers: data?.barbers || [],
    categories: data?.categories || [
      { id: 'haircuts', label: 'Haircuts' }, { id: 'beard-grooming', label: 'Beard Grooming' },
      { id: 'packages', label: 'Packages' }, { id: 'additional', label: 'Additional Services' },
    ],
    emailConfigured: data?.emailConfigured ?? true,
    maxAdvanceDays: data?.maxAdvanceDays || 60,
    closedDates: data?.closedDates || [],
  }), [data, status]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBusiness = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBusiness must be used inside <BusinessProvider>');
  return v;
};
