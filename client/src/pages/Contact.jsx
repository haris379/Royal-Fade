import { useState } from 'react';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Alert, Field, Heading } from '../components/ui.jsx';
import { SOCIAL_ICONS } from '../components/BrandIcons.jsx';
import { useBusiness } from '../context/BusinessContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { api, errorMessage, fieldErrors } from '../lib/api.js';
import { hoursRows, phoneHref } from '../lib/format.js';
import { site, whatsappLink } from '../config/site.js';

const EMPTY = { name: '', email: '', subject: '', message: '' };
const Ring = ({ icon: Icon }) => <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold-500 text-gold-500"><Icon className="h-5 w-5" aria-hidden /></span>;

export default function Contact() {
  usePageTitle('Contact');
  const { contact, hours } = useBusiness();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    setState({ busy: true, done: false, error: '' });
    try {
      await api.post('/contact', form);
      setForm(EMPTY);
      setState({ busy: false, done: true, error: '' });
    } catch (err) {
      setErrors(fieldErrors(err));
      setState({ busy: false, done: false, error: errorMessage(err) });
    }
  }

  return (
    <section className="section bg-ink-700">
      <div className="wrap">
        <Heading as="h1" dark label="Contact Us" title="Get In Touch">Questions about a style, a service or your booking? Send a message or reach us directly.</Heading>
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-7 text-smoke-300">
            <div className="flex gap-4"><Ring icon={Phone} /><div><p className="font-semibold text-white">Phone</p><a href={phoneHref(contact.phone)} className="hover:text-gold-400">{contact.phone}</a></div></div>
            <div className="flex gap-4"><Ring icon={Mail} /><div><p className="font-semibold text-white">Email</p><a href={`mailto:${contact.email}`} className="break-all hover:text-gold-400">{contact.email}</a></div></div>
            <div className="flex gap-4"><Ring icon={MessageCircle} /><div><p className="font-semibold text-white">WhatsApp</p><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="hover:text-gold-400">Chat with us</a></div></div>
            <div className="flex gap-4"><Ring icon={MapPin} /><div><p className="font-semibold text-white">Address</p>{contact.address}<a href={site.mapsUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-gold-400 underline">Open in Google Maps</a></div></div>
            <div className="flex gap-4"><Ring icon={Clock} /><div className="flex-1"><p className="font-semibold text-white">Opening hours (UK time)</p>
              <dl className="mt-1 text-sm">{hoursRows(hours).map((r) => <div key={r.label} className="flex justify-between gap-4 py-1"><dt>{r.label}</dt><dd className="text-white">{r.text}</dd></div>)}</dl></div></div>
            <div className="flex gap-3 pt-2">{site.socials.map((s) => { const Icon = SOCIAL_ICONS[s.id]; return <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-600 text-gold-500 hover:bg-gold-500 hover:text-ink-900"><Icon /></a>; })}</div>
            <p className="text-xs text-smoke-500">Sample details for this demonstration website.</p>
          </div>

          <form onSubmit={submit} noValidate className="rounded-lg bg-white p-6 text-ink-700 sm:p-8" aria-label="Contact form">
            <h2 className="text-2xl">Send us a message</h2>
            {state.done && <Alert light kind="success" className="mt-5">Thanks, your message has been received. We will reply by email.</Alert>}
            {state.error && <Alert light className="mt-5">{state.error}</Alert>}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field dark={false} id="c-name" label="Full name" error={errors.name}><input id="c-name" className="field-light" value={form.name} onChange={set('name')} autoComplete="name" placeholder="Your name" required /></Field>
              <Field dark={false} id="c-email" label="Email address" error={errors.email}><input id="c-email" type="email" className="field-light" value={form.email} onChange={set('email')} autoComplete="email" placeholder="you@example.com" required /></Field>
              <Field dark={false} id="c-subject" label="Subject" error={errors.subject} className="sm:col-span-2"><input id="c-subject" className="field-light" value={form.subject} onChange={set('subject')} required /></Field>
              <Field dark={false} id="c-message" label="Message" error={errors.message} className="sm:col-span-2"><textarea id="c-message" rows={5} className="field-light resize-y" value={form.message} onChange={set('message')} required /></Field>
            </div>
            <button className="btn-gold mt-6 w-full" disabled={state.busy}>{state.busy ? 'Sending...' : 'Send message'}</button>
          </form>
        </div>
        {site.mapsEmbedUrl && <iframe title="Map showing the studio location" src={site.mapsEmbedUrl} className="mt-12 h-[360px] w-full rounded-lg border border-char-700" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />}
      </div>
    </section>
  );
}
