import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EmailVerification from '../src/components/EmailVerification.jsx';
import { fail, mockApi, renderApp, SERVICES } from './helpers.jsx';

const type = (el, text) => fireEvent.change(el, { target: { value: text } });

describe('EmailVerification', () => {
  it('requests a code, verifies it and hands back only the server-issued token', async () => {
    const api = mockApi({
      'POST /verification/email/request': { success: true, data: { cooldownSeconds: 60 } },
      'POST /verification/email/verify': { success: true, data: { verified: true, verificationToken: 'server-token' } },
    });
    const onVerified = vi.fn();
    render(<EmailVerification email="jane@example.com" verified={false} onVerified={onVerified} />);
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    const input = await screen.findByLabelText(/verification code/i);
    expect(api.post).toHaveBeenCalledWith('/verification/email/request', { email: 'jane@example.com' });
    type(input, '123456');
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));
    await waitFor(() => expect(onVerified).toHaveBeenCalledWith('server-token'));
    expect(api.post).toHaveBeenCalledWith('/verification/email/verify', { email: 'jane@example.com', code: '123456' });
  });

  it('shows the server message for a wrong code and does not report success', async () => {
    mockApi({
      'POST /verification/email/request': { success: true, data: { cooldownSeconds: 60 } },
      'POST /verification/email/verify': () => fail(400, { message: 'Incorrect code. 4 attempts left.', code: 'INVALID_CODE' }),
    });
    const onVerified = vi.fn();
    render(<EmailVerification email="jane@example.com" verified={false} onVerified={onVerified} />);
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    type(await screen.findByLabelText(/verification code/i), '000000');
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));
    expect(await screen.findByText(/incorrect code/i)).toBeTruthy();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('only accepts digits, caps the code at 6 and keeps Verify disabled until complete', async () => {
    mockApi({ 'POST /verification/email/request': { success: true, data: { cooldownSeconds: 60 } } });
    render(<EmailVerification email="jane@example.com" verified={false} onVerified={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    const input = await screen.findByLabelText(/verification code/i);
    type(input, 'ab12cd34567');
    expect(input.value).toBe('123456');
    type(input, '123');
    expect(screen.getByRole('button', { name: /verify email/i }).disabled).toBe(true);
  });

  it('enforces the resend cooldown in the interface', async () => {
    mockApi({ 'POST /verification/email/request': { success: true, data: { cooldownSeconds: 60 } } });
    render(<EmailVerification email="jane@example.com" verified={false} onVerified={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    const resend = await screen.findByRole('button', { name: /resend code in/i });
    expect(resend.disabled).toBe(true);
  });

  it('surfaces a send failure and lets the customer retry', async () => {
    mockApi({ 'POST /verification/email/request': () => fail(502, { message: 'We could not send the verification email.', code: 'EMAIL_SEND_FAILED' }) });
    render(<EmailVerification email="jane@example.com" verified={false} onVerified={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    expect(await screen.findByText(/could not send the verification email/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /send verification code/i }).disabled).toBe(false);
  });

  it('shows the verified state', () => {
    render(<EmailVerification email="jane@example.com" verified onVerified={() => {}} />);
    expect(screen.getByText(/email verified/i)).toBeTruthy();
  });
});

describe('Booking page', () => {
  it('starts on service selection, and Continue stays disabled until a service is chosen', async () => {
    mockApi();
    renderApp('/booking');
    expect(await screen.findByRole('heading', { name: /choose a service/i })).toBeTruthy();
    const cont = screen.getByRole('button', { name: /continue/i });
    expect(cont.disabled).toBe(true);
    fireEvent.click(await screen.findByRole('button', { name: /skin fade/i }));
    expect(screen.getByRole('button', { name: /continue/i }).disabled).toBe(false);
  });

  it('?service= preselects the service and opens the barber step with Any Available Barber', async () => {
    mockApi();
    renderApp(`/booking?service=${SERVICES[0]._id}`);
    expect(await screen.findByRole('heading', { name: /choose your barber/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /any available barber/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /marcus reid/i })).toBeTruthy();
  });

  it('walks the whole flow: nothing is submitted until the email is verified, then the token is sent', async () => {
    const api = mockApi({
      'GET /appointments/availability': { success: true, data: { date: 'x', closed: false, slots: [{ time: '12:00', label: '12:00', available: true }, { time: '12:30', label: '12:30', available: false }] } },
      'POST /verification/email/request': { success: true, data: { cooldownSeconds: 60 } },
      'POST /verification/email/verify': { success: true, data: { verified: true, verificationToken: 'tok-123' } },
      'POST /appointments': { success: true, data: { reference: 'RF-12345678', status: 'pending', customerName: 'Jane Doe', serviceName: 'Skin Fade', barberName: 'Marcus Reid', date: '2030-01-01', timeLabel: '12:00', servicePrice: 26, emailStatus: 'sent' } },
    });
    renderApp(`/booking?service=${SERVICES[0]._id}`);
    fireEvent.click(await screen.findByRole('button', { name: /any available barber/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // date: pick the first enabled day button in the calendar
    await screen.findByRole('heading', { name: /choose a date/i });
    const day = screen.getAllByRole('button').find((b) => /^\d+$/.test(b.textContent) && !b.disabled);
    fireEvent.click(day);
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // time: unavailable slot is disabled, available one selectable
    await screen.findByRole('heading', { name: /choose a time/i });
    expect((await screen.findByRole('button', { name: '12:30' })).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '12:00' }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // details with invalid data is blocked client-side
    await screen.findByRole('heading', { name: /your details/i });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText(/enter your full name/i)).toBeTruthy();
    type(screen.getByLabelText(/full name/i), 'Jane Doe');
    type(screen.getByLabelText(/email address/i), 'Jane@Example.com');
    type(screen.getByLabelText(/phone number/i), '07700 900123');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // verification gate: cannot continue yet
    await screen.findByRole('heading', { name: /verify your email/i });
    expect(screen.getByRole('button', { name: /^continue/i }).disabled).toBe(true);
    expect(api.post).not.toHaveBeenCalledWith('/appointments', expect.anything());
    fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
    type(await screen.findByLabelText(/verification code/i), '654321');
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));
    await screen.findByText(/email verified/i);
    fireEvent.click(screen.getByRole('button', { name: /^continue/i }));

    await screen.findByRole('heading', { name: /review and confirm/i });
    fireEvent.click(screen.getByRole('button', { name: /confirm booking request/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/appointments', expect.objectContaining({ serviceId: SERVICES[0]._id, time: '12:00', barberId: 'any', verificationToken: 'tok-123', email: 'jane@example.com' })));
    // lands on the confirmation page showing the pending status
    expect(await screen.findByText('RF-12345678')).toBeTruthy();
    expect(screen.getByText(/pending confirmation/i)).toBeTruthy();
  });

  it('if the server says the slot was just taken, the customer is sent back to pick another time', async () => {
    mockApi({
      'GET /appointments/availability': { success: true, data: { closed: false, slots: [{ time: '12:00', label: '12:00', available: true }] } },
      'POST /verification/email/request': { success: true, data: { cooldownSeconds: 60 } },
      'POST /verification/email/verify': { success: true, data: { verificationToken: 'tok' } },
      'POST /appointments': () => fail(409, { message: 'Sorry, that time was just taken. Please pick another slot.', code: 'SLOT_TAKEN' }),
    });
    renderApp(`/booking?service=${SERVICES[0]._id}`);
    fireEvent.click(await screen.findByRole('button', { name: /any available barber/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByRole('heading', { name: /choose a date/i });
    fireEvent.click(screen.getAllByRole('button').find((b) => /^\d+$/.test(b.textContent) && !b.disabled));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(await screen.findByRole('button', { name: '12:00' }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await screen.findByRole('heading', { name: /your details/i });
    type(screen.getByLabelText(/full name/i), 'Jane Doe');
    type(screen.getByLabelText(/email address/i), 'jane@example.com');
    type(screen.getByLabelText(/phone number/i), '07700 900123');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(await screen.findByRole('button', { name: /send verification code/i }));
    type(await screen.findByLabelText(/verification code/i), '654321');
    fireEvent.click(screen.getByRole('button', { name: /verify email/i }));
    await screen.findByText(/email verified/i);
    fireEvent.click(screen.getByRole('button', { name: /^continue/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm booking request/i }));
    expect(await screen.findByText(/just taken/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /choose a time/i })).toBeTruthy();
  });
});
