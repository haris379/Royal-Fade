import { Link } from 'react-router-dom';
import { Crown, Droplets, Scissors, Sparkles } from 'lucide-react';
import { Img } from './ui.jsx';
import { duration, money } from '../lib/format.js';

const ICONS = { haircuts: Scissors, 'beard-grooming': Droplets, packages: Crown, additional: Sparkles };

/** White service card on a light section: photo, small amber icon badge, name, description, price, Book Now. */
export default function ServiceCard({ service }) {
  const Icon = ICONS[service.category] || Scissors;
  return (
    <article className="flex flex-col overflow-hidden rounded-lg bg-white shadow-card">
      <div className="relative">
        <Img src={service.image} alt={`${service.name}`} className="aspect-[4/3] w-full object-cover" />
        <span className="absolute -bottom-5 left-6 flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-ink-900"><Icon className="h-[18px] w-[18px]" aria-hidden /></span>
      </div>
      <div className="flex flex-1 flex-col px-6 pb-6 pt-9">
        <h3 className="text-xl text-ink-700">{service.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-[#57534e]">{service.description}</p>
        <div className="mt-5 flex items-center justify-between border-t border-cream-200 pt-4">
          <p className="text-sm text-[#57534e]"><span className="text-lg font-bold text-ink-700">{money(service.price, service.isStartingPrice)}</span> &middot; {duration(service.durationMinutes)}</p>
          <Link to={`/booking?service=${service._id}`} className="text-sm font-bold text-gold-700 hover:underline">Book Now</Link>
        </div>
      </div>
    </article>
  );
}
