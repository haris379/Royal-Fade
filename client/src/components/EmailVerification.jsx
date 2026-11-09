import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Loader2, Mail } from 'lucide-react';
import { Alert } from './ui.jsx';
import { api, errorCode, errorMessage, fieldErrors } from '../lib/api.js';

/**
 * Step 6 of the booking flow. The code is checked by the server; the only thing this component trusts is
 * the one-time authorization token the server returns, and the server re-checks it when the booking is sent.
 */
export default function EmailVerification({ email, verified, onVerified, emailConfigured = true }) {
  const [phase, setPhase] = useState('idle'); // idle | sending | sent | verifying
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => { if (phase === 'sent') inputRef.current?.focus(); }, [phase]);

  async function send() {
    setError('');
    setPhase('sending');
    try {
      const r = await api.post('/verification/email/request', { email });
      setCooldown(r.data.data?.cooldownSeconds || 60);
      setCode('');
      setPhase('sent');
    } catch (err) {
      const wait = fieldErrors(err).retryAfterSeconds;
      if (errorCode(err) === 'COOLDOWN' && wait) { setCooldown(wait); setPhase('sent'); }
      else setPhase(phase === 'verifying' ? 'sent' : 'idle');
      setError(errorMessage(err));
    }
  }

  async function verify(e) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from the email.'); return; }
    setError('');
    setPhase('verifying');
    try {
      const r = await api.post('/verification/email/verify', { email, code });
      onVerified(r.data.data.verificationToken);
    } catch (err) {
      setError(errorMessage(err));
      setPhase('sent');
    }
  }

  if (verified) {
    return (
      <div className="flex items-start gap-4 border border-emerald-500/40 bg-emerald-500/10 p-6" role="status">
        <BadgeCheck className="mt-0.5 h-6 w-6 shrink-0 text-emerald-300" aria-hidden />
        <div><p className="font-display text-xl text-cream-50">Email verified</p><p className="mt-1 text-sm text-smoke-300">{email} is confirmed. You can now review and submit your booking.</p></div>
      </div>
    );
  }

  return (
    <div>
      {!emailConfigured && <Alert kind="info" className="mb-5">Email delivery is not set up on this server yet, so verification codes cannot be sent. Please contact the studio to book.</Alert>}
      <p className="text-smoke-300">Before we can accept your booking, we need to check that this email address belongs to you. We will send a 6-digit code to <strong className="text-cream-50">{email}</strong>.</p>

      {phase === 'idle' || phase === 'sending' ? (
        <button type="button" onClick={send} disabled={phase === 'sending' || !emailConfigured} className="btn-gold mt-6">
          {phase === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Sending code...</> : <><Mail className="h-4 w-4" aria-hidden /> Send verification code</>}
        </button>
      ) : (
        <form onSubmit={verify} className="mt-6" noValidate>
          <label htmlFor="otp" className="label">Verification code</label>
          <input id="otp" ref={inputRef} inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="\d{6}" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456"
            className="field max-w-[14rem] text-center font-display text-3xl tracking-[0.4em]" aria-describedby="otp-help" />
          <p id="otp-help" className="mt-2 text-xs text-smoke-400">The code expires in 10 minutes and works once. Check your spam folder if it does not arrive.</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <button className="btn-gold" disabled={phase === 'verifying' || code.length !== 6}>{phase === 'verifying' ? 'Checking...' : 'Verify email'}</button>
            <button type="button" className="btn-quiet" onClick={send} disabled={cooldown > 0}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</button>
          </div>
        </form>
      )}
      {error && <Alert className="mt-5">{error}</Alert>}
    </div>
  );
}
