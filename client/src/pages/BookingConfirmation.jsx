import { Link, Navigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, Mail } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { longDate, money } from '../lib/format.js';

const EMAIL_NOTE = {
  sent: ['We have emailed you a booking request confirmation.', Mail],
  failed: ['We saved your request, but the confirmation email could not be delivered. The studio can resend it, so please keep your reference.', Mail],
  not_configured: ['We saved your request. Email notifications are not set up yet, so keep your reference.', Mail],
};

export default function BookingConfirmation() {
  usePageTitle('Booking request received');
  const { state } = useLocation();
  const b = state?.booking;
  if (!b) return <Navigate to="/booking" replace />; // a reload has no data: nothing personal is kept in the URL or storage

  const [note] = EMAIL_NOTE[b.emailStatus] || EMAIL_NOTE.sent;
  const rows = [['Name', b.customerName], ['Service', b.serviceName], ['Barber', b.barberName], ['Date', longDate(b.date)], ['Time', b.timeLabel], ['Price', money(b.servicePrice, b.isStartingPrice)]];
  return (
    <section className="bg-ink pb-24 pt-16">
      <div className="wrap max-w-2xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-gold-400" aria-hidden />
          <h1 className="mt-5 text-4xl text-cream-50 sm:text-5xl">Booking request received</h1>
          <p className="mx-auto mt-4 max-w-lg text-smoke-300">Thank you, {b.customerName.split(' ')[0]}. Your email is verified and your time is held for you. The studio will confirm your appointment shortly.</p>
        </div>
        <div className="mt-10 border border-gold-600/50 bg-char-900 shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-char-700 bg-ink px-6 py-4">
            <span><span className="block text-xs text-smoke-400">Appointment reference</span><span className="font-display text-2xl text-gold-300">{b.reference}</span></span>
            <span className="flex items-center gap-2 border border-gold-500/50 bg-gold-500/10 px-3 py-1 text-xs font-bold text-gold-300"><Clock className="h-3.5 w-3.5" aria-hidden />Pending confirmation</span>
          </div>
          <dl className="divide-y divide-char-700">
            {rows.map(([k, v]) => <div key={k} className="grid gap-1 px-6 py-3.5 sm:grid-cols-[8rem_1fr]"><dt className="text-sm text-smoke-400">{k}</dt><dd className="font-semibold text-cream-100">{v}</dd></div>)}
          </dl>
        </div>
        <p className="mt-6 flex gap-3 text-sm text-smoke-300"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" aria-hidden />{note}</p>
        <p className="mt-3 text-sm text-smoke-400">This is a request, not a confirmed appointment. Need to change it? Contact us with your reference at least 24 hours ahead.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4"><Link to="/" className="btn-gold">Back to home</Link><Link to="/booking" className="btn-line">Make another booking</Link></div>
      </div>
    </section>
  );
}
