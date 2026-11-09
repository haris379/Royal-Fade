import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Alert, Field } from '../../components/ui.jsx';
import { Mark } from '../../components/Logo.jsx';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import { api, errorMessage, session } from '../../lib/api.js';

export default function AdminLogin() {
  usePageTitle('Dashboard sign in');
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [state, setState] = useState({ busy: false, error: '' });
  if (session.get()?.token) return <Navigate to="/admin" replace />;

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: '' });
    try {
      const r = await api.post('/admin/login', form);
      session.set(r.data.data);
      nav('/admin', { replace: true });
    } catch (err) {
      setState({ busy: false, error: errorMessage(err, 'Sign in failed.') });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-12">
      <form onSubmit={submit} className="card-dark w-full max-w-md p-8 sm:p-10" aria-label="Dashboard sign in">
        <Link to="/" className="flex justify-center" aria-label="Back to the website"><Mark className="h-14 w-14" /></Link>
        <h1 className="mt-6 text-center text-3xl text-cream-50">Dashboard sign in</h1>
        <p className="mt-2 text-center text-sm text-smoke-400">For the business owner and website maintainer.</p>
        {state.error && <Alert className="mt-6">{state.error}</Alert>}
        <div className="mt-6 space-y-5">
          <Field id="a-email" label="Email"><input id="a-email" type="email" autoComplete="username" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field id="a-pass" label="Password"><input id="a-pass" type="password" autoComplete="current-password" className="field" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></Field>
        </div>
        <button className="btn-gold mt-7 w-full" disabled={state.busy}><Lock className="h-4 w-4" aria-hidden />{state.busy ? 'Signing in...' : 'Sign in'}</button>
        <p className="mt-6 text-center text-xs text-smoke-500"><Link to="/" className="hover:text-gold-300">Back to website</Link></p>
      </form>
    </div>
  );
}
