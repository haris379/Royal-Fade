import { Mail } from 'lucide-react';

export const STATUS_STYLE = {
  pending: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  confirmed: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200',
  completed: 'border-sky-400/40 bg-sky-400/10 text-sky-200',
  cancelled: 'border-red-400/40 bg-red-400/10 text-red-200',
};

export const StatusBadge = ({ status }) => (
  <span className={`inline-block border px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLE[status] || ''}`}>{status}</span>
);

const EMAIL_STYLE = { sent: 'text-emerald-300', failed: 'text-red-300', not_sent: 'text-smoke-500', not_configured: 'text-amber-300' };
const EMAIL_LABEL = { sent: 'sent', failed: 'FAILED', not_sent: 'not sent', not_configured: 'not configured' };

/** Shows the delivery state of the email that belongs to the appointment's current status. */
export function EmailState({ appt }) {
  const field = { pending: 'bookingEmail', confirmed: 'confirmedEmail', cancelled: 'cancelledEmail' }[appt.status];
  if (!field) return <span className="text-xs text-smoke-500">no email</span>;
  const st = appt[field]?.status || 'not_sent';
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${EMAIL_STYLE[st]}`} title={`${field}: ${st}`}><Mail className="h-3.5 w-3.5" aria-hidden />{EMAIL_LABEL[st]}</span>;
}

export const emailField = (status) => ({ pending: 'bookingEmail', confirmed: 'confirmedEmail', cancelled: 'cancelledEmail' }[status]);

export const Panel = ({ title, children, action }) => (
  <section className="border border-char-700 bg-char-900 shadow-card">
    {(title || action) && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-char-700 px-6 py-4"><h2 className="font-display text-2xl text-cream-50">{title}</h2>{action}</div>}
    {children}
  </section>
);
