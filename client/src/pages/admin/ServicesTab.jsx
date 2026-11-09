import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Alert, Img, Spinner } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useBusiness } from '../../context/BusinessContext.jsx';
import { api, errorMessage } from '../../lib/api.js';
import { duration, money } from '../../lib/format.js';
import { Panel } from './shared.jsx';
import ServiceForm from './ServiceForm.jsx';

/**
 * Everyone with "services:read" sees the catalogue. Only accounts with "services:write" (the developer)
 * get the add / edit / delete controls. The server enforces this independently on every request.
 */
export default function ServicesTab({ permissions = [] }) {
  const canWrite = permissions.includes('services:write');
  const { categories } = useBusiness();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/services').then((r) => r.data.data), []);
  const [editing, setEditing] = useState(null); // null | 'new' | service
  const [flash, setFlash] = useState(null);
  const label = (id) => categories.find((c) => c.id === id)?.label || id;

  async function remove(s) {
    if (!window.confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    setFlash(null);
    try { await api.delete(`/admin/services/${s._id}`); setFlash({ kind: 'success', text: `"${s.name}" deleted.` }); reload(); }
    catch (err) { setFlash({ kind: 'error', text: errorMessage(err) }); }
  }

  if (editing) return <ServiceForm service={editing === 'new' ? null : editing} onDone={(msg) => { setEditing(null); if (msg) setFlash({ kind: 'success', text: msg }); reload(); }} onCancel={() => setEditing(null)} />;

  return (
    <Panel title="Service catalogue" action={canWrite && <button type="button" className="btn-gold btn-sm" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />Add service</button>}>
      {!canWrite && <div className="p-6 pb-0"><Alert kind="info">The service catalogue is read-only for your account. To change a service, price or image, contact your website maintainer.</Alert></div>}
      {flash && <div className="p-6 pb-0"><Alert kind={flash.kind}>{flash.text}</Alert></div>}
      {loading && <Spinner label="Loading services" />}
      {error && <div className="p-6"><Alert>{error}</Alert></div>}
      {data && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs text-smoke-400"><tr>{['Service', 'Category', 'Price', 'Duration', 'Status', canWrite ? 'Actions' : ''].map((h, i) => <th key={i} className="px-6 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-char-700">
              {data.map((s) => (
                <tr key={s._id} className="align-top">
                  <td className="px-6 py-4"><div className="flex gap-4"><Img src={s.image} alt="" className="h-14 w-16 shrink-0 object-cover" /><div><p className="font-semibold text-cream-50">{s.name}</p><p className="mt-0.5 max-w-md text-xs text-smoke-400">{s.description}</p></div></div></td>
                  <td className="px-6 py-4 text-smoke-300">{label(s.category)}</td>
                  <td className="px-6 py-4 font-semibold text-gold-300">{money(s.price, s.isStartingPrice)}</td>
                  <td className="px-6 py-4 text-smoke-300">{duration(s.durationMinutes)}</td>
                  <td className="px-6 py-4"><span className={`border px-2.5 py-1 text-xs font-bold ${s.active ? 'border-emerald-400/40 text-emerald-200' : 'border-char-500 text-smoke-400'}`}>{s.active ? 'Active' : 'Hidden'}</span></td>
                  {canWrite && <td className="px-6 py-4"><div className="flex gap-2"><button type="button" className="btn btn-sm border border-char-500 text-smoke-300 hover:text-gold-300" onClick={() => setEditing(s)}><Pencil className="h-3.5 w-3.5" aria-hidden />Edit</button><button type="button" className="btn btn-sm border border-red-500/50 text-red-200 hover:bg-red-500/10" onClick={() => remove(s)}><Trash2 className="h-3.5 w-3.5" aria-hidden />Delete</button></div></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
