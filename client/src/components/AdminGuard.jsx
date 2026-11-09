import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, session } from '../lib/api.js';
import { Spinner } from './ui.jsx';

/**
 * Protects /admin. The stored session is only a hint: on every visit the server is asked who this token belongs to
 * and what that role may do (GET /admin/me, answered from the database). Nothing is trusted from the browser.
 */
export default function AdminGuard({ children }) {
  const loc = useLocation();
  const stored = session.get();
  const [state, setState] = useState(stored?.token ? 'checking' : 'out');

  useEffect(() => {
    if (!stored?.token) return undefined;
    let alive = true;
    api.get('/admin/me')
      .then((r) => { if (!alive) return; session.set({ ...stored, email: r.data.data.email, role: r.data.data.role, permissions: r.data.data.permissions }); setState('in'); })
      .catch(() => { if (alive) { session.clear(); setState('out'); } });
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === 'out') return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (state === 'checking') return <div className="min-h-screen bg-ink pt-24"><Spinner label="Checking your session" /></div>;
  return children;
}
