import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Clock, User, Users } from 'lucide-react';
import { Alert, Field, Img, Spinner } from '../components/ui.jsx';
import DatePicker from '../components/DatePicker.jsx';
import EmailVerification from '../components/EmailVerification.jsx';
import { useBusiness } from '../context/BusinessContext.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api, errorCode, errorMessage, fieldErrors } from '../lib/api.js';
import { duration, longDate, money } from '../lib/format.js';

const STEPS = ['Service', 'Barber', 'Date', 'Time', 'Details', 'Verify', 'Confirm'];
const EMPTY = { customerName: '', email: '', phone: '', notes: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateDetails(d) {
  const e = {};
  if (d.customerName.trim().length < 2) e.customerName = 'Enter your full name';
  if (!EMAIL_RE.test(d.email.trim())) e.email = 'Enter a valid email address';
  const digits = d.phone.replace(/\D/g, '');
  if (!/^\+?[0-9\s\-()]{7,20}$/.test(d.phone.trim()) || digits.length < 7) e.phone = 'Enter a valid phone number';
  if (d.notes.length > 500) e.notes = 'Notes must be at most 500 characters';
  return e;
}

function Stepper({ step }) {
  return (
    <>
      <ol className="hidden items-center sm:flex" aria-label="Booking progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center last:flex-none" aria-current={i === step ? 'step' : undefined}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center border text-sm font-bold ${i < step ? 'border-gold-500 bg-gold-500 text-ink' : i === step ? 'border-gold-400 text-gold-300' : 'border-char-600 text-smoke-500'}`}>{i < step ? <Check className="h-4 w-4" aria-hidden /> : i + 1}</span>
            <span className={`ml-2 text-xs font-semibold ${i === step ? 'text-cream-50' : 'text-smoke-500'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className={`mx-3 h-px flex-1 ${i < step ? 'bg-gold-500' : 'bg-char-600'}`} aria-hidden />}
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-gold-300 sm:hidden">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
    </>
  );
}

export default function Booking() {
  usePageTitle('Book an Appointment');
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { barbers, hours, closedDates, maxAdvanceDays, categories, emailConfigured } = useBusiness();

  const [step, setStep] = useState(0);
  const [service, setService] = useState(null);
  const [barberId, setBarberId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [token, setToken] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [submit, setSubmit] = useState({ busy: false, error: '' });
  const [notice, setNotice] = useState('');

  const services = useAsync(() => api.get('/services').then((r) => r.data.data), []);
  const preselect = params.get('service');
  useEffect(() => {
    if (preselect && services.data && !service) {
      const s = services.data.find((x) => x._id === preselect);
      if (s) { setService(s); setStep(1); }
    }
  }, [preselect, services.data, service]);

  const avail = useAsync(
    () => (step === 3 && service && date ? api.get('/appointments/availability', { params: { serviceId: service._id, date, barberId: barberId || 'any' } }).then((r) => r.data.data) : Promise.resolve(null)),
    [step, service?._id, date, barberId],
  );

  const barber = barberId === 'any' ? { name: 'Any available barber' } : barbers.find((b) => b.id === barberId);
  const email = details.email.trim().toLowerCase();
  const verified = Boolean(token) && verifiedEmail === email;
  const grouped = useMemo(() => categories.map((c) => ({ ...c, items: (services.data || []).filter((s) => s.category === c.id) })).filter((g) => g.items.length), [categories, services.data]);

  const go = (n) => { setNotice(''); setSubmit({ busy: false, error: '' }); setStep(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const setD = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }));

  function nextFromDetails(e) {
    e.preventDefault();
    const v = validateDetails(details);
    setErrors(v);
    if (Object.keys(v).length) return;
    if (token && verifiedEmail !== email) { setToken(''); setVerifiedEmail(''); } // a different address needs its own verification
    go(5);
  }

  async function confirm() {
    setSubmit({ busy: true, error: '' });
    try {
      const r = await api.post('/appointments', {
        serviceId: service._id, date, time, barberId: barberId || 'any', verificationToken: token,
        customerName: details.customerName.trim(), email, phone: details.phone.trim(), notes: details.notes.trim(),
      });
      nav('/booking/confirmation', { state: { booking: r.data.data } });
    } catch (err) {
      const code = errorCode(err);
      setErrors(fieldErrors(err));
      if (['EMAIL_NOT_VERIFIED', 'VERIFICATION_EXPIRED', 'VERIFICATION_ALREADY_USED'].includes(code)) {
        setToken(''); setVerifiedEmail('');
        setStep(5); setNotice(errorMessage(err)); setSubmit({ busy: false, error: '' });
      } else if (code === 'SLOT_TAKEN') {
        setTime(''); setStep(3); setNotice(errorMessage(err)); setSubmit({ busy: false, error: '' });
      } else setSubmit({ busy: false, error: errorMessage(err) });
    }
  }

  const nextBtn = 'btn-gold';
  const backBtn = (to) => <button type="button" className="btn-quiet" onClick={() => go(to)}><ArrowLeft className="h-4 w-4" aria-hidden /> Back</button>;

  return (
    <section className="bg-ink pb-24 pt-14">
      <div className="wrap">
        <h1 className="text-4xl text-cream-50 sm:text-5xl">Book an appointment</h1>
        <div className="fade-rule mt-5 w-40" />
        <div className="mt-10"><Stepper step={step} /></div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            {notice && <Alert className="mb-6">{notice}</Alert>}

            {step === 0 && (
              <div>
                <h2 className="text-3xl text-cream-50">Choose a service</h2>
                {services.loading && <Spinner label="Loading services" />}
                {services.error && <Alert className="mt-5">{services.error} <button type="button" className="ml-2 underline" onClick={services.reload}>Try again</button></Alert>}
                <div className="mt-8 space-y-10">
                  {grouped.map((g) => (
                    <fieldset key={g.id}>
                      <legend className="mb-4 font-display text-xl text-gold-300">{g.label}</legend>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {g.items.map((s) => (
                          <button key={s._id} type="button" aria-pressed={service?._id === s._id} onClick={() => setService(s)}
                            className={`flex gap-4 border p-3 text-left transition ${service?._id === s._id ? 'border-gold-500 bg-gold-500/10' : 'border-char-700 bg-char-900 hover:border-gold-600/60'}`}>
                            <Img src={s.image} alt="" className="h-20 w-20 shrink-0 object-cover" />
                            <span className="min-w-0"><span className="block font-display text-lg leading-tight text-cream-50">{s.name}</span>
                              <span className="mt-1 block text-sm text-gold-300">{money(s.price, s.isStartingPrice)}</span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-smoke-400"><Clock className="h-3.5 w-3.5" aria-hidden />{duration(s.durationMinutes)}</span></span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <div className="mt-10 flex justify-end"><button type="button" className={nextBtn} disabled={!service} onClick={() => go(1)}>Continue <ArrowRight className="h-4 w-4" aria-hidden /></button></div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-3xl text-cream-50">Choose your barber</h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <button type="button" aria-pressed={barberId === 'any'} onClick={() => setBarberId('any')}
                    className={`flex items-center gap-4 border p-5 text-left transition sm:col-span-2 ${barberId === 'any' ? 'border-gold-500 bg-gold-500/10' : 'border-char-700 bg-char-900 hover:border-gold-600/60'}`}>
                    <span className="flex h-14 w-14 items-center justify-center bg-ink text-gold-400"><Users aria-hidden /></span>
                    <span><span className="block font-display text-xl text-cream-50">Any available barber</span><span className="text-sm text-smoke-400">Fastest option: we assign whoever is free at your time.</span></span>
                  </button>
                  {barbers.map((b) => (
                    <button key={b.id} type="button" aria-pressed={barberId === b.id} onClick={() => setBarberId(b.id)}
                      className={`flex items-center gap-4 border p-4 text-left transition ${barberId === b.id ? 'border-gold-500 bg-gold-500/10' : 'border-char-700 bg-char-900 hover:border-gold-600/60'}`}>
                      <Img src={`/images/barbers/${b.id}.svg`} alt="" className="h-16 w-16 object-cover" />
                      <span><span className="block font-display text-xl text-cream-50">{b.name}</span><span className="text-sm text-gold-400">{b.title}</span><span className="mt-1 block text-xs text-smoke-400">{b.specialties.slice(0, 2).join(' · ')}</span></span>
                    </button>
                  ))}
                </div>
                <div className="mt-10 flex items-center justify-between">{backBtn(0)}<button type="button" className={nextBtn} disabled={!barberId} onClick={() => go(2)}>Continue <ArrowRight className="h-4 w-4" aria-hidden /></button></div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-3xl text-cream-50">Choose a date</h2>
                <div className="mt-8"><DatePicker value={date} onChange={(d) => { setDate(d); setTime(''); }} hours={hours} closedDates={closedDates} maxAdvanceDays={maxAdvanceDays} /></div>
                <div className="mt-10 flex items-center justify-between">{backBtn(1)}<button type="button" className={nextBtn} disabled={!date} onClick={() => go(3)}>Continue <ArrowRight className="h-4 w-4" aria-hidden /></button></div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-3xl text-cream-50">Choose a time</h2>
                <p className="mt-2 text-smoke-300">{date && longDate(date)} &middot; {barber?.name}</p>
                {avail.loading && <Spinner label="Checking availability" />}
                {avail.error && <Alert className="mt-6">{avail.error} <button type="button" className="ml-2 underline" onClick={avail.reload}>Try again</button></Alert>}
                {avail.data && (avail.data.closed || avail.data.slots.every((s) => !s.available)) && !avail.loading && (
                  <Alert kind="info" className="mt-6">{avail.data.closed ? 'The studio is closed or fully unavailable on this date.' : 'No times are free on this date for your selection.'} <button type="button" className="ml-1 underline" onClick={() => go(2)}>Choose another date</button>{barberId !== 'any' && <> or <button type="button" className="underline" onClick={() => { setBarberId('any'); }}>try any available barber</button></>}.</Alert>
                )}
                {avail.data && !avail.loading && (
                  <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5" role="group" aria-label="Available times">
                    {avail.data.slots.map((s) => (
                      <button key={s.time} type="button" disabled={!s.available} aria-pressed={time === s.time} onClick={() => setTime(s.time)}
                        title={s.available ? '' : 'Unavailable'}
                        className={`border py-3 text-sm font-bold transition ${time === s.time ? 'border-gold-500 bg-gold-500 text-ink' : 'border-char-600 text-cream-100 hover:border-gold-500'} disabled:cursor-not-allowed disabled:border-char-700 disabled:bg-transparent disabled:text-char-500 disabled:line-through disabled:hover:border-char-700`}>{s.label}</button>
                    ))}
                  </div>
                )}
                <div className="mt-10 flex items-center justify-between">{backBtn(2)}<button type="button" className={nextBtn} disabled={!time} onClick={() => go(4)}>Continue <ArrowRight className="h-4 w-4" aria-hidden /></button></div>
              </div>
            )}

            {step === 4 && (
              <form onSubmit={nextFromDetails} noValidate>
                <h2 className="text-3xl text-cream-50">Your details</h2>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field id="b-name" label="Full name" error={errors.customerName} className="sm:col-span-2"><input id="b-name" className="field" autoComplete="name" value={details.customerName} onChange={setD('customerName')} required /></Field>
                  <Field id="b-email" label="Email address" error={errors.email} hint="We will send a verification code to this address."><input id="b-email" type="email" className="field" autoComplete="email" value={details.email} onChange={setD('email')} required /></Field>
                  <Field id="b-phone" label="Phone number" error={errors.phone}><input id="b-phone" type="tel" className="field" autoComplete="tel" value={details.phone} onChange={setD('phone')} placeholder="07700 900123" required /></Field>
                  <Field id="b-notes" label="Booking notes (optional)" error={errors.notes} className="sm:col-span-2"><textarea id="b-notes" rows={4} className="field resize-y" value={details.notes} onChange={setD('notes')} maxLength={500} placeholder="Reference photo, hair concerns, anything we should know" /></Field>
                </div>
                <div className="mt-10 flex items-center justify-between">{backBtn(3)}<button className={nextBtn}>Continue <ArrowRight className="h-4 w-4" aria-hidden /></button></div>
              </form>
            )}

            {step === 5 && (
              <div>
                <h2 className="text-3xl text-cream-50">Verify your email</h2>
                <div className="mt-8"><EmailVerification email={email} verified={verified} emailConfigured={emailConfigured} onVerified={(t) => { setToken(t); setVerifiedEmail(email); setNotice(''); }} /></div>
                <div className="mt-10 flex items-center justify-between">{backBtn(4)}<button type="button" className={nextBtn} disabled={!verified} onClick={() => go(6)}>Continue <ArrowRight className="h-4 w-4" aria-hidden /></button></div>
              </div>
            )}

            {step === 6 && (
              <div>
                <h2 className="text-3xl text-cream-50">Review and confirm</h2>
                <dl className="mt-8 divide-y divide-char-700 border border-char-700 bg-char-900 text-[15px]">
                  {[['Service', `${service.name} (${duration(service.durationMinutes)})`], ['Barber', barber?.name], ['Date', longDate(date)], ['Time', time], ['Price', money(service.price, service.isStartingPrice)], ['Name', details.customerName], ['Email', `${email} (verified)`], ['Phone', details.phone], ...(details.notes ? [['Notes', details.notes]] : [])].map(([k, v]) => (
                    <div key={k} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[9rem_1fr]"><dt className="text-smoke-400">{k}</dt><dd className="break-words font-semibold text-cream-100">{v}</dd></div>
                  ))}
                </dl>
                <p className="mt-5 text-sm text-smoke-400">Submitting sends a booking <strong className="text-cream-200">request</strong>. It is confirmed once the studio accepts it, and you will be emailed. See the <Link to="/booking-policy" className="text-gold-300 underline">booking and cancellation policy</Link>. Payment is made at the studio.</p>
                {submit.error && <Alert className="mt-5">{submit.error}</Alert>}
                <div className="mt-8 flex items-center justify-between">{backBtn(5)}<button type="button" className="btn-gold px-8" disabled={submit.busy} onClick={confirm}>{submit.busy ? 'Sending request...' : 'Confirm booking request'}</button></div>
              </div>
            )}
          </div>

          <aside className="h-fit border border-char-700 bg-char-900 p-6 lg:sticky lg:top-28" aria-label="Your booking summary">
            <h2 className="font-display text-2xl text-cream-50">Your booking</h2>
            <div className="fade-rule mt-3 w-24" />
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-smoke-500">Service</dt><dd className="mt-0.5 font-semibold text-cream-100">{service ? service.name : 'Not chosen yet'}</dd></div>
              <div><dt className="text-smoke-500">Barber</dt><dd className="mt-0.5 flex items-center gap-2 font-semibold text-cream-100">{barber ? <><User className="h-4 w-4 text-gold-500" aria-hidden />{barber.name}</> : 'Not chosen yet'}</dd></div>
              <div><dt className="text-smoke-500">Date and time</dt><dd className="mt-0.5 font-semibold text-cream-100">{date ? `${longDate(date)}${time ? ` at ${time}` : ''}` : 'Not chosen yet'}</dd></div>
            </dl>
            {service && <div className="mt-6 flex items-baseline justify-between border-t border-char-700 pt-4"><span className="text-sm text-smoke-400">Price</span><span className="font-display text-3xl text-gold-300">{money(service.price, service.isStartingPrice)}</span></div>}
          </aside>
        </div>
      </div>
    </section>
  );
}
