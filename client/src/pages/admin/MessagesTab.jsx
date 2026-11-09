import { useState } from 'react';
import { Check } from 'lucide-react';
import { Alert, Spinner } from '../../components/ui.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { api, errorMessage } from '../../lib/api.js';
import { Panel } from './shared.jsx';

export default function MessagesTab({ permissions = [] }) {
  const canManage = permissions.includes('messages:manage');
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/messages').then((r) => r.data.data), []);
  const [err, setErr] = useState('');

  async function markRead(id) {
    setErr('');
    try { await api.patch(`/admin/messages/${id}/read`); reload(); } catch (e) { setErr(errorMessage(e)); }
  }

  if (loading) return <Spinner label="Loading messages" />;
  if (error) return <Alert>{error}</Alert>;
  return (
    <Panel title="Contact messages">
      {err && <div className="p-6 pb-0"><Alert>{err}</Alert></div>}
      {!data.length && <p className="p-8 text-smoke-400">No messages yet.</p>}
      <ul className="divide-y divide-char-700">
        {data.map((m) => (
          <li key={m._id} className={`p-6 ${m.read ? '' : 'bg-gold-500/5'}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="font-display text-xl text-cream-50">{m.subject} {!m.read && <span className="ml-2 border border-gold-500/60 px-2 py-0.5 align-middle font-sans text-xs font-bold text-gold-300">New</span>}</h3>
                <p className="mt-1 text-sm text-smoke-400">{m.name} &middot; <a className="text-gold-300 underline" href={`mailto:${m.email}`}>{m.email}</a> &middot; {new Date(m.createdAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</p></div>
              {canManage && !m.read && <button type="button" className="btn-line btn-sm" onClick={() => markRead(m._id)}><Check className="h-4 w-4" aria-hidden />Mark as read</button>}
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-smoke-300">{m.message}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
