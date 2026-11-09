import { Link } from 'react-router-dom';
import { site } from '../config/site.js';

export function Mark({ className = 'h-9 w-9' }) {
  return <span className={`inline-flex items-center justify-center rounded-full bg-gold-500 text-[0.8rem] font-extrabold text-ink-900 ${className}`} aria-hidden>RF</span>;
}

export default function Logo({ to = '/', onClick }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center gap-3 text-white" aria-label={`${site.name} home`}>
      <Mark />
      <span className="text-xl font-semibold tracking-tight">Royal Fade</span>
    </Link>
  );
}
