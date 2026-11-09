import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { SOCIAL_ICONS } from './BrandIcons.jsx';
import { site, whatsappLink } from '../config/site.js';
import { useBusiness } from '../context/BusinessContext.jsx';
import { phoneHref } from '../lib/format.js';

const col = 'text-sm text-smoke-400 transition-colors hover:text-gold-400';

export default function Footer() {
  const { contact } = useBusiness();
  return (
    <footer className="bg-ink-900 text-smoke-400">
      <div className="wrap grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">{site.tagline} A premium men&rsquo;s barber studio for fades, classic cuts and traditional shaves.</p>
          <div className="mt-5 flex gap-3">
            {site.socials.map((s) => {
              const Icon = SOCIAL_ICONS[s.id];
              return <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-600 text-gold-500 transition-colors hover:bg-gold-500 hover:text-ink-900"><Icon /></a>;
            })}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-base text-white">Quick Links</h3>
          <ul className="space-y-2.5">
            {[['/services', 'Services'], ['/about', 'About Us'], ['/gallery', 'Gallery'], ['/contact', 'Contact'], ['/booking', 'Book an Appointment']].map(([to, l]) => <li key={to}><Link to={to} className={col}>{l}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-base text-white">Services</h3>
          <ul className="space-y-2.5">
            {['Skin Fade', 'Taper Fade', 'Classic Haircut', 'Beard Trim', 'Hot Towel Shave'].map((l) => <li key={l}><Link to="/services" className={col}>{l}</Link></li>)}
          </ul>
        </div>
        <div>
          <h3 className="mb-4 text-base text-white">Visit Us</h3>
          <ul className="space-y-2.5 text-sm">
            <li>{contact.address}</li>
            <li><a href={phoneHref(contact.phone)} className={col}>{contact.phone}</a></li>
            <li><a href={`mailto:${contact.email}`} className={`${col} break-all`}>{contact.email}</a></li>
            <li><a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={col}>WhatsApp us</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-char-700">
        <div className="wrap flex flex-col gap-3 py-6 text-xs md:flex-row md:items-center md:justify-between">
          <p>&copy; {new Date().getFullYear()} Royal Fade. Demonstration website: the address, phone and email are sample details.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li><Link to="/privacy-policy" className="hover:text-gold-400">Privacy Policy</Link></li>
            <li><Link to="/booking-policy" className="hover:text-gold-400">Booking Policy</Link></li>
            <li><Link to="/cookie-policy" className="hover:text-gold-400">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
