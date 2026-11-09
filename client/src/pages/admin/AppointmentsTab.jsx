import { Fragment, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Search } from 'lucide-react';
import { Alert, Spinner } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { api, errorMessage } from '../../lib/api.js';
import { duration, longDate, money } from '../../lib/format.js';
import { EmailState, Panel, StatusBadge, emailField } from './shared.jsx';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function AppointmentsTab({ permissions = [] }) {
  const canManage = permissions.includes('appointments:manage');
  const [filters, setFilters] = useState({ date: '', status: '', q: '' });
  const [q, setQ] = useState('');
  const [open, setOpen] = useState('');
  const [busy, setBusy] = useState('');
  const [flash, setFlash] = useState(null);

  useEffect(() => { const t = setTimeout(() => setFilters((f) => ({ ...f, q })), 300); return () => clearTimeout(t); }, [q]);

  const { data, loading, error, reload } = useAsync(
    () => api.get('/admin/appointments', { params: Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) }).then((r) => r.data),
    [filters.date, filters.status, filters.q],
  );
  const rows = data?.data || [];

  async function act(a, label, fn) {
    if (busy) return;
    setBusy(a._id); setFlash(null);
    try { const r = await fn(); setFlash({ kind: 'success', text: r || `${label} done.` }); reload(); }
    catch (err) { setFlash({ kind: 'error', text: errorMessage(err) }); }
    finally { setBusy(''); }
  }
  const setStatus = (a, status, label) => act(a, label, async () => { await api.patch(`/admin/appointments/${a._id}/status`, { status }); return `${a.reference} marked ${status}.`; });
  const resend = (a) => act(a, 'Resend', async () => { const r = await api.post(`/admin/appointments/${a._id}/resend-email`); return r.data.message; });

  const btn = 'btn btn-sm border';
  const actions = (a) => {
    const off = Boolean(busy);
    const out = [];
    if (a.status === 'pending') out.push(<button key="c" disabled={off || !a.emailVerified} title={a.emailVerified ? '' : 'Email address was never verified'} onClick={() => setStatus(a, 'confirmed', 'Confirm')} className={`${btn} border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10`}>Confirm</button>);
    if (a.status === 'confirmed') out.push(<button key="d" disabled={off} onClick={() => setStatus(a, 'completed', 'Complete')} className={`${btn} border-sky-500/50 text-sky-200 hover:bg-sky-500/10`}>Mark completed</button>);
    if (['pending', 'confirmed'].includes(a.status)) out.push(<button key="x" disabled={off} onClick={() => { if (window.confirm(`Cancel ${a.reference}? The customer will be emailed and the time is released.`)) setStatus(a, 'cancelled', 'Cancel'); }} className={`${btn} border-red-500/50 text-red-200 hover:bg-red-500/10`}>Cancel</button>);
    if (emailField(a.status) && a.emailVerified) out.push(<button key="r" disabled={off} onClick={() => resend(a)} className={`${btn} border-char-500 text-smoke-300 hover:text-gold-300`}><RefreshCw className="h-3.5 w-3.5" aria-hidden />Resend email</button>);
    return out;
  };

  return (
    <div className="space-y-6">
      <Panel title="Appointments">
        <div className="grid gap-4 border-b border-char-700 p-6 md:grid-cols-[1fr_12rem_12rem_auto]">
          <label className="relative block"><span className="sr-only">Search appointments</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke-500" aria-hidden /><input className="field pl-10" placeholder="Search name, email, phone, reference" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <label><span className="sr-only">Filter by date</span><input type="date" className="field" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /></label>
          <label><span className="sr-only">Filter by status</span><select className="field" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
          <button type="button" className="btn-quiet" onClick={() => { setQ(''); setFilters({ date: '', status: '', q: '' }); }}>Clear</button>
        </div>
        {flash && <div className="px-6 pt-5"><Alert kind={flash.kind}>{flash.text}</Alert></div>}
        {loading && <Spinner label="Loading appointments" />}
        {error && <div className="p-6"><Alert>{error}</Alert></div>}
        {!loading && !error && !rows.length && <p className="p-8 text-smoke-400">No appointments match these filters.</p>}
        {!!rows.length && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="text-xs text-smoke-400"><tr>{['', 'Reference', 'Customer', 'Service', 'When', 'Status', 'Email', canManage ? 'Actions' : ''].map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-char-700">
                {rows.map((a) => (
                  <Fragment key={a._id}>
                    <tr className="align-top">
                      <td className="px-4 py-3"><button type="button" aria-label={open === a._id ? 'Hide details' : 'Show details'} aria-expanded={open === a._id} onClick={() => setOpen(open === a._id ? '' : a._id)} className="text-smoke-400 hover:text-gold-300">{open === a._id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button></td>
                      <td className="px-4 py-3 font-semibold text-gold-300">{a.reference}</td>
                      <td className="px-4 py-3">{a.customerName}<span className="block text-xs text-smoke-400">{a.email}</span><span className="block text-xs text-smoke-400">{a.phone}</span></td>
                      <td className="px-4 py-3">{a.serviceName}<span className="block text-xs text-smoke-400">{a.barberName} &middot; {money(a.servicePrice, a.isStartingPrice)}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap">{longDate(a.date)}<span className="block text-xs text-smoke-400">{a.timeLabel} - {a.endLabel}</span></td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} />{!a.emailVerified && <span className="mt-1 block text-xs font-semibold text-red-300">email not verified</span>}</td>
                      <td className="px-4 py-3"><EmailState appt={a} /></td>
                      <td className="px-4 py-3"><div className="flex flex-wrap gap-2">{canManage && actions(a)}</div></td>
                    </tr>
                    {open === a._id && (
                      <tr className="bg-ink/40"><td /><td colSpan={7} className="px-4 py-5">
                        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                          {[['Customer', a.customerName], ['Email', `${a.email} ${a.emailVerified ? '(verified)' : '(NOT verified)'}`], ['Phone', a.phone], ['Service', `${a.serviceName} (${a.categoryLabel})`], ['Duration', duration(a.durationMinutes)], ['Price', money(a.servicePrice, a.isStartingPrice)], ['Barber', `${a.barberName}${a.barberRequested === 'any' ? ' (assigned, customer chose any)' : ''}`], ['Booked on', new Date(a.createdAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })], ['Notes', a.notes || 'None']].map(([k, v]) => <div key={k}><dt className="text-xs text-smoke-500">{k}</dt><dd className="mt-0.5 break-words text-cream-100">{v}</dd></div>)}
                        </dl>
                        <p className="mt-4 text-xs text-smoke-400">Emails: request received <b>{a.bookingEmail.status}</b> ({a.bookingEmail.attempts} attempt{a.bookingEmail.attempts === 1 ? '' : 's'}) &middot; confirmed <b>{a.confirmedEmail.status}</b> &middot; cancelled <b>{a.cancelledEmail.status}</b></p>
                      </td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data?.meta && data.meta.total > rows.length && <p className="border-t border-char-700 px-6 py-3 text-xs text-smoke-400">Showing the latest {rows.length} of {data.meta.total}. Use the filters to narrow the list.</p>}
      </Panel>
    </div>
  );
}
