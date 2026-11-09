import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { session } from '../src/lib/api.js';
import { tabsFor } from '../src/pages/admin/AdminDashboard.jsx';
import { fail, mockApi, renderApp, SERVICES } from './helpers.jsx';

const ADMIN = { token: 't', email: 'owner@royalfade.test', role: 'admin', permissions: ['services:read', 'barbers:read', 'appointments:read', 'appointments:manage', 'messages:read', 'messages:manage'] };
const DEV = { token: 't', email: 'dev@royalfade.test', role: 'developer', permissions: ['services:read', 'services:write'] };

const dashboardRoutes = (who) => ({
  'GET /admin/me': { data: { email: who.email, role: who.role, permissions: who.permissions } },
  'GET /admin/services': { data: SERVICES },
  'GET /admin/stats': { data: { total: 4, pending: 1, confirmed: 1, completed: 1, cancelled: 1, today: 0, upcoming: 2, unreadMessages: 3, recent: [] } },
  'GET /admin/appointments': { data: [], meta: { total: 0 } },
  'GET /admin/messages': { data: [] },
  'GET /admin/barbers': { data: [] },
});

describe('dashboard tabs follow the permissions the server reports', () => {
  it('admin sees overview, appointments, services, barbers and messages', () => {
    expect(tabsFor(ADMIN.permissions).map((t) => t.id)).toEqual(['overview', 'appointments', 'services', 'barbers', 'messages']);
  });
  it('developer sees only the service catalogue', () => {
    expect(tabsFor(DEV.permissions).map((t) => t.id)).toEqual(['services']);
  });
  it('an account with no permissions sees nothing', () => {
    expect(tabsFor([])).toEqual([]);
  });
});

describe('admin dashboard (business owner)', () => {
  it('shows the statistics cards and the owner tabs', async () => {
    session.set(ADMIN);
    mockApi(dashboardRoutes(ADMIN));
    renderApp('/admin');
    expect(await screen.findByText('Total appointments')).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: /dashboard sections/i });
    for (const name of ['Overview', 'Appointments', 'Services', 'Barbers', 'Messages']) expect(within(nav).getByRole('link', { name })).toBeTruthy();
    expect(screen.getByText(/business owner/i)).toBeTruthy();
  });

  it('the service catalogue is read-only: no add, edit or delete controls, with an explanation', async () => {
    session.set(ADMIN);
    mockApi(dashboardRoutes(ADMIN));
    renderApp('/admin/services');
    expect(await screen.findByText('Skin Fade')).toBeTruthy();
    expect(screen.getByText(/read-only for your account/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /add service/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /edit/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });
});

describe('admin dashboard (developer)', () => {
  it('lands on the service catalogue with management controls and no customer sections', async () => {
    session.set(DEV);
    mockApi(dashboardRoutes(DEV));
    renderApp('/admin');
    expect(await screen.findByRole('button', { name: /add service/i })).toBeTruthy();
    expect(await screen.findAllByRole('button', { name: /edit/i })).not.toHaveLength(0);
    expect(await screen.findAllByRole('button', { name: /delete/i })).not.toHaveLength(0);
    const nav = screen.getByRole('navigation', { name: /dashboard sections/i });
    expect(within(nav).getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByText(/appointments/i, { selector: 'a' })).toBeNull();
  });

  it('typing /admin/appointments in the address bar redirects a developer to the catalogue', async () => {
    session.set(DEV);
    const api = mockApi(dashboardRoutes(DEV));
    renderApp('/admin/appointments');
    expect(await screen.findByRole('button', { name: /add service/i })).toBeTruthy();
    expect(api.get).not.toHaveBeenCalledWith('/admin/appointments', expect.anything());
  });
});

describe('session handling', () => {
  it('a token the server rejects sends the visitor to the login page', async () => {
    session.set(ADMIN);
    mockApi({ 'GET /admin/me': () => fail(401, { message: 'Session expired' }) });
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: /dashboard sign in/i })).toBeTruthy();
    expect(session.get()).toBeNull();
  });

  it('the stored role is only a hint: the server answer decides what is shown', async () => {
    session.set({ ...ADMIN, role: 'admin', permissions: ADMIN.permissions }); // stale/tampered browser storage
    mockApi(dashboardRoutes(DEV)); // server says: developer
    renderApp('/admin');
    expect(await screen.findByRole('button', { name: /add service/i })).toBeTruthy();
    expect(screen.queryByText('Total appointments')).toBeNull();
  });
});
