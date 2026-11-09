import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BusinessProvider } from '../src/context/BusinessContext.jsx';
import App from '../src/App.jsx';
import { api } from '../src/lib/api.js';

export const BUSINESS = {
  contact: { phone: '020 7946 0321', email: 'hello@royalfade.example', address: '27 Demo Row, London, EC1A 1AA' },
  hours: { 0: { open: '10:00', close: '16:00' }, 1: { open: '09:00', close: '19:00' }, 2: { open: '09:00', close: '19:00' }, 3: { open: '09:00', close: '19:00' }, 4: { open: '09:00', close: '20:00' }, 5: { open: '09:00', close: '20:00' }, 6: { open: '09:00', close: '18:00' } },
  closedDates: [], maxAdvanceDays: 60, emailConfigured: true,
  categories: [{ id: 'haircuts', label: 'Haircuts' }, { id: 'beard-grooming', label: 'Beard Grooming' }, { id: 'packages', label: 'Packages' }, { id: 'additional', label: 'Additional Services' }],
  barbers: [{ id: 'marcus', name: 'Marcus Reid', title: 'Master Barber', experienceYears: 14, specialties: ['Skin fades'], bio: 'Bio' }],
};
export const SERVICES = [
  { _id: 'a'.repeat(24), name: 'Skin Fade', slug: 'skin-fade', description: 'A seamless blend.', price: 26, durationMinutes: 45, category: 'haircuts', image: '/images/services/skin-fade.svg', active: true },
  { _id: 'b'.repeat(24), name: 'Hot Towel Shave', slug: 'hot-towel-shave', description: 'Traditional shave.', price: 26, durationMinutes: 45, category: 'beard-grooming', image: '', active: true },
];

/** Routes GET/POST calls to canned responses. `routes` maps "METHOD /path" to data or a function. */
export function mockApi(routes = {}) {
  const reply = (method) => vi.fn(async (url, ...rest) => {
    const key = `${method} ${url}`;
    const hit = routes[key];
    if (hit === undefined) throw Object.assign(new Error(`unmocked ${key}`), { response: { status: 404, data: { message: `unmocked ${key}` } } });
    const value = typeof hit === 'function' ? await hit(...rest) : hit;
    return { data: value };
  });
  const defaults = { 'GET /business': { data: BUSINESS }, 'GET /services': { data: SERVICES } };
  Object.assign(routes, { ...defaults, ...routes });
  api.get = reply('GET'); api.post = reply('POST'); api.put = reply('PUT'); api.patch = reply('PATCH'); api.delete = reply('DELETE');
  return api;
}

export const fail = (status, data) => { throw Object.assign(new Error('failed'), { response: { status, data } }); };

export function renderApp(path = '/', state) {
  return render(
    <MemoryRouter initialEntries={[state ? { pathname: path, state } : path]}>
      <BusinessProvider><App /></BusinessProvider>
    </MemoryRouter>,
  );
}
