import { Img } from './ui.jsx';

export default function BarberCard({ barber }) {
  return (
    <article>
      <Img src={`/images/barbers/${barber.id}.svg`} alt={`${barber.name}, ${barber.title}`} className="aspect-[4/5] w-full rounded-lg object-cover" />
      <h3 className="mt-4 text-xl text-ink-700">{barber.name}</h3>
      <p className="text-sm font-semibold text-gold-700">{barber.title} &middot; {barber.experienceYears} years</p>
      <p className="mt-2 text-sm leading-relaxed text-[#57534e]">{barber.bio}</p>
      <p className="mt-2 text-xs text-smoke-500">{barber.specialties.join(' · ')}</p>
    </article>
  );
}
