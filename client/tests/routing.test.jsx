import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { screen, waitFor, within } from '@testing-library/react';
import { mockApi, renderApp } from './helpers.jsx';

const PUBLIC = [
  ['/', /your style/i],
  ['/services', /services & prices/i],
  ['/gallery', /our work/i],
  ['/about', /where craft meets style/i],
  ['/contact', /get in touch/i],
  ['/booking', /book an appointment/i],
  ['/privacy-policy', /privacy policy/i],
  ['/cookie-policy', /cookie policy/i],
  ['/booking-policy', /booking & cancellation policy/i],
];

describe('public routing (SPA)', () => {
  it.each(PUBLIC)('renders %s directly (as after a browser refresh)', async (route, heading) => {
    mockApi();
    renderApp(route);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeTruthy();
  });

  it('shows the 404 page for unknown URLs', async () => {
    mockApi();
    renderApp('/definitely/not/a/page');
    expect(await screen.findByText(/too much off the top/i)).toBeTruthy();
  });

  it('the public site never links to the admin dashboard', async () => {
    mockApi();
    const { container } = renderApp('/');
    await screen.findByRole('heading', { level: 1 });
    expect([...container.querySelectorAll('a')].some((a) => /admin/i.test(a.getAttribute('href') || ''))).toBe(false);
  });

  it('the home page loads services and barbers from the API and shows prices in pounds', async () => {
    mockApi();
    renderApp('/');
    expect(await screen.findByText('Marcus Reid')).toBeTruthy();
    expect(await screen.findAllByText(/£26/)).not.toHaveLength(0);
  });

  it('services page groups services by category with Book Now links', async () => {
    mockApi();
    renderApp('/services');
    expect(await screen.findByRole('heading', { level: 2, name: 'Haircuts' })).toBeTruthy();
    const links = await screen.findAllByRole('link', { name: /book now/i });
    expect(links.some((l) => (l.getAttribute('href') || '').includes('/booking?service='))).toBe(true);
  });

  it('a booking confirmation page without booking data sends the visitor back to the booking page', async () => {
    mockApi();
    renderApp('/booking/confirmation');
    expect(await screen.findByRole('heading', { level: 1, name: /book an appointment/i })).toBeTruthy();
  });

  it('the confirmation page shows the reference and says the booking is pending', async () => {
    mockApi();
    renderApp('/booking/confirmation', { booking: { reference: 'RF-ABCD1234', customerName: 'Jane Doe', serviceName: 'Skin Fade', barberName: 'Marcus Reid', date: '2030-06-18', timeLabel: '12:30', servicePrice: 26, emailStatus: 'sent' } });
    expect(await screen.findByText('RF-ABCD1234')).toBeTruthy();
    expect(screen.getByText(/pending confirmation/i)).toBeTruthy();
    expect(screen.getByText('Tuesday 18 June 2030')).toBeTruthy();
    expect(screen.getByText('£26')).toBeTruthy();
    expect(screen.getByText(/not a confirmed appointment/i)).toBeTruthy();
  });

  it('the admin login page lives at /admin/login and the dashboard redirects there when signed out', async () => {
    mockApi();
    renderApp('/admin');
    expect(await screen.findByRole('heading', { name: /dashboard sign in/i })).toBeTruthy();
  });
});

describe('Vercel SPA fallback configuration', () => {
  const root = path.resolve(__dirname, '../..');
  const v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const dest = (p) => v.rewrites.find((r) => new RegExp(`^${r.source}$`).test(p))?.destination;

  it('sends every client route to index.html so refreshes never 404', () => {
    for (const [route] of PUBLIC) expect(dest(route) ?? '/index.html').toBe('/index.html');
    expect(dest('/admin/login')).toBe('/index.html');
    expect(dest('/booking/confirmation')).toBe('/index.html');
  });
  it('keeps /api and /uploads on the serverless function', () => {
    expect(dest('/api/services')).toBe('/api');
    expect(dest('/uploads/services/x.png')).toBe('/api');
  });
});
