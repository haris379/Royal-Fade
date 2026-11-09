import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Logo from './Logo.jsx';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/services', label: 'Services' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

/** Transparent over the home-page photo, solid charcoal everywhere else and once scrolled. */
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const solid = pathname !== '/' || scrolled || open;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const link = ({ isActive }) => `text-sm font-medium transition-colors ${isActive ? 'text-gold-400' : 'text-white hover:text-gold-400'}`;
  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${solid ? 'bg-ink-700' : 'bg-gradient-to-b from-black/60 to-transparent'}`}>
      <div className="wrap flex h-[72px] items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
          {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={link}>{l.label}</NavLink>)}
        </nav>
        <Link to="/booking" className="btn-gold btn-sm hidden md:inline-flex">Book Now</Link>
        <button type="button" className="p-2 text-white md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] overflow-y-auto bg-ink-700 px-5 pb-10 pt-4 md:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l) => <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `border-b border-char-700 py-4 text-lg font-medium ${isActive ? 'text-gold-400' : 'text-white'}`}>{l.label}</NavLink>)}
          </nav>
          <Link to="/booking" className="btn-gold mt-8 w-full">Book Now</Link>
        </div>
      )}
    </header>
  );
}
