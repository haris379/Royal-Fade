import { Link } from 'react-router-dom';
import { Heading, Img } from '../components/ui.jsx';
import BarberCard from '../components/BarberCard.jsx';
import { useBusiness } from '../context/BusinessContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

const APPROACH = [
  ['We listen first', 'Every appointment starts with a conversation about your hair, your routine and what you want to walk out with.'],
  ['We work with your hair', 'Growth patterns, density and head shape decide the cut. We do not force a style that will not hold.'],
  ['We finish properly', 'Hot towel, razor edges, neck clean-up and styling product. The finish is where a good cut becomes a great one.'],
  ['We keep it clean', 'Tools are sterilised between clients and the studio is cleaned throughout the day.'],
];

export default function About() {
  usePageTitle('About Us');
  const { barbers } = useBusiness();
  return (
    <>
      <section className="section bg-white text-ink-700">
        <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow text-gold-700">About Us</p>
            <h1 className="text-3xl sm:text-5xl sm:leading-tight">Where Craft Meets Style</h1>
            <div className="mt-6 space-y-4 text-[#57534e]">
              <p>Royal Fade began with a simple frustration: too many shops rushed the cut and skipped the craft. We wanted a studio where fades are blended slowly, beards are shaped with a razor and nobody checks the clock.</p>
              <p>Today four barbers share the floor, each with a different specialty, and clients return because the result is consistent, whichever chair they sit in.</p>
              <p className="text-sm">Royal Fade is a demonstration website. The story, team and details on this page are sample content.</p>
            </div>
            <Link to="/booking" className="btn-gold mt-8">Book Appointment</Link>
          </div>
          <Img src="/images/shop.svg" alt="Razor, brush and clippers" className="aspect-[4/3] w-full rounded-lg object-cover shadow-card" />
        </div>
      </section>

      <section className="section bg-ink-700">
        <div className="wrap">
          <Heading dark label="Our Approach" title="How We Work">Between us we have more than thirty years behind the chair.</Heading>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {APPROACH.map(([t, d]) => <div key={t}><h3 className="text-lg text-white">{t}</h3><p className="mt-2 text-sm leading-relaxed text-smoke-400">{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section bg-paper text-ink-700">
        <div className="wrap">
          <Heading label="The Team" title="Meet Our Barbers">Four barbers, four specialties. Book the one who suits your style.</Heading>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">{barbers.map((b) => <BarberCard key={b.id} barber={b} />)}</div>
        </div>
      </section>
    </>
  );
}
