import { NavLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Inbox, LayoutDashboard, LogOut, Scissors, Users } from 'lucide-react';
import { Mark } from '../../components/Logo.jsx';
import { api, session } from '../../lib/api.js';
import { usePageTitle } from '../../hooks/usePageTitle.js';
import OverviewTab from './OverviewTab.jsx';
import AppointmentsTab from './AppointmentsTab.jsx';
import ServicesTab from './ServicesTab.jsx';
import BarbersTab from './BarbersTab.jsx';
import MessagesTab from './MessagesTab.jsx';

// Which tab needs which permission. The server enforces the same permissions on every API route;
// this only decides what to SHOW.
export const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, perm: 'appointments:read', Component: OverviewTab },
  { id: 'appointments', label: 'Appointments', icon: CalendarDays, perm: 'appointments:read', Component: AppointmentsTab },
  { id: 'services', label: 'Services', icon: Scissors, perm: 'services:read', Component: ServicesTab },
  { id: 'barbers', label: 'Barbers', icon: Users, perm: 'barbers:read', Component: BarbersTab },
  { id: 'messages', label: 'Messages', icon: Inbox, perm: 'messages:read', Component: MessagesTab },
];

export const tabsFor = (permissions = []) => TABS.filter((t) => permissions.includes(t.perm));

export default function AdminDashboard() {
  usePageTitle('Dashboard');
  const nav = useNavigate();
  const { tab } = useParams();
  const s = session.get() || {};
  const perms = s.permissions || [];
  const tabs = tabsFor(perms);
  const current = tabs.find((t) => t.id === tab);

  if (!tabs.length) return <Navigate to="/admin/login" replace />;
  if (!current) return <Navigate to={`/admin/${tabs[0].id}`} replace />;

  async function signOut() {
    try { await api.post('/admin/logout'); } catch { /* the session is dropped locally either way */ }
    session.clear();
    nav('/admin/login', { replace: true });
  }

  const Active = current.Component;
  const roleLabel = s.role === 'developer' ? 'Developer' : 'Business owner';
  return (
    <div className="min-h-screen bg-ink-800">
      <header className="border-b border-char-700 bg-ink">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-4"><Mark className="h-10 w-10" /><div><p className="font-display text-xl text-cream-50">Royal Fade dashboard</p><p className="text-xs text-smoke-400">{s.email} &middot; <span className="font-semibold text-gold-300">{roleLabel}</span></p></div></div>
          <button type="button" onClick={signOut} className="btn-line btn-sm"><LogOut className="h-4 w-4" aria-hidden />Sign out</button>
        </div>
        <nav className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-3 sm:px-6" aria-label="Dashboard sections">
          {tabs.map(({ id, label, icon: Icon }) => (
            <NavLink key={id} to={`/admin/${id}`} className={({ isActive }) => `flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${isActive ? 'border-gold-500 text-gold-300' : 'border-transparent text-smoke-300 hover:text-cream-50'}`}><Icon className="h-4 w-4" aria-hidden />{label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8"><Active permissions={perms} role={s.role} /></main>
    </div>
  );
}
