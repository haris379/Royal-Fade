import { Link } from "react-router-dom";
import {
  Award,
  Check,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Wallet,
} from "lucide-react";
import { Alert, Heading, Img, Spinner } from "../components/ui.jsx";
import ServiceCard from "../components/ServiceCard.jsx";
import BarberCard from "../components/BarberCard.jsx";
import { useBusiness } from "../context/BusinessContext.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { usePageTitle } from "../hooks/usePageTitle.js";
import { api } from "../lib/api.js";
import { duration, hoursRows, money, phoneHref } from "../lib/format.js";
import { GALLERY } from "../config/gallery.js";
import { site } from "../config/site.js";

const FEATURED = [
  "skin-fade",
  "taper-fade",
  "classic-haircut",
  "beard-shape-and-line-up",
  "hot-towel-shave",
  "scissor-cut",
];

// The three pricing cards. Prices and durations come from the database; the bullet points are display copy.
const PRICING = [
  {
    slug: "skin-fade",
    note: "A sharp, clean everyday cut",
    items: [
      "Consultation",
      "Skin fade with foil edge-up",
      "Neck clean-up",
      "Styled to finish",
    ],
  },
  {
    slug: "haircut-and-beard-combo",
    note: "Our most popular booking",
    popular: true,
    items: [
      "Haircut of your choice",
      "Beard trim and line-up",
      "Hot towel finish",
      "Styled with premium products",
    ],
  },
  {
    slug: "premium-grooming-package",
    note: "The full Royal Fade experience",
    items: [
      "Haircut and styling",
      "Hot towel straight-razor shave",
      "Hair wash and scalp massage",
      "2 hours with your barber",
    ],
  },
];

const WHY = [
  {
    icon: Award,
    title: "Experienced Barbers",
    text: "Four barbers with between four and fourteen years behind the chair.",
  },
  {
    icon: Star,
    title: "Premium Products",
    text: "Quality products and traditional tools, used on every appointment.",
  },
  {
    icon: Wallet,
    title: "Clear Pricing",
    text: "Prices in pounds, shown before you book. No hidden extras.",
  },
  {
    icon: ShieldCheck,
    title: "Hygienic Studio",
    text: "Tools sterilised between clients and a clean studio all day.",
  },
];

const REVIEWS = [
  {
    name: "James R.",
    role: "Regular client",
    text: "The cleanest skin fade I have had in years. Marcus took his time and the lines held for weeks.",
  },
  {
    name: "Aaron P.",
    role: "First visit",
    text: "Booked online in two minutes, in and out on time, and the hot towel shave was properly relaxing.",
  },
  {
    name: "Callum D.",
    role: "Brought his son",
    text: "Tommy was patient with my son for his first proper haircut. He walked out grinning.",
  },
];

export default function Home() {
  usePageTitle("");
  const { barbers, hours, contact } = useBusiness();
  const {
    data: services,
    loading,
    error,
    reload,
  } = useAsync(() => api.get("/services").then((r) => r.data.data), []);
  const bySlug = (slug) => (services || []).find((s) => s.slug === slug);
  const featured = services ? FEATURED.map(bySlug).filter(Boolean) : [];
  const shown = featured.length ? featured : (services || []).slice(0, 6);

  return (
    <>
      {/* HERO: full-width photo, dark overlay, centred headline. Add client/public/images/hero.jpg to use a real photo. */}
      <section
        className="relative flex min-h-[92vh] items-center justify-center bg-ink-900 bg-cover bg-center text-center"
        style={{
          backgroundImage:
            "url('/images/heroImage.jpg'), url('/images/hero-bg.svg')",
        }}
      >
        <div className="absolute inset-0 bg-black/55" aria-hidden />
        <div className="wrap relative pb-16 pt-32">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold leading-[1.1] text-white sm:text-6xl lg:text-7xl">
            Your Style.
            <br />
            Our Craft.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-cream-200 sm:text-lg">
            Sharp fades, classic cuts and traditional hot towel shaves from a
            team of experienced barbers. Premium men&rsquo;s barber studio in
            the UK.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link to="/booking" className="btn-gold px-8 py-3.5 text-base">
              Book Appointment
            </Link>
            <Link to="/services" className="btn-line px-8 py-3.5 text-base">
              Explore Services
            </Link>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="section bg-paper text-ink-700" id="services">
        <div className="wrap">
          <Heading label="Our Services" title="Popular Barber Services">
            Cuts and grooming our regulars book most. Every price is in pounds
            and includes a consultation.
          </Heading>
          {loading && <Spinner light label="Loading services" />}
          {error && (
            <Alert light>
              {error}{" "}
              <button type="button" className="ml-2 underline" onClick={reload}>
                Try again
              </button>
            </Alert>
          )}
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((s) => (
              <ServiceCard key={s._id} service={s} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/services" className="btn-outline">
              View all services and prices
            </Link>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="section bg-white text-ink-700">
        <div className="wrap grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="eyebrow text-gold-700">About Us</p>
            <h2 className="text-3xl sm:text-[2.6rem] sm:leading-tight">
              Where Craft Meets Style
            </h2>
            <div className="mt-6 space-y-4 text-[#57534e]">
              <p>
                Royal Fade is a small barber studio built around one idea: a
                haircut should be done properly. We listen first, blend slowly,
                shape beards with a razor and never rush you out of the chair.
              </p>
              <p>
                Four barbers share the floor, each with their own specialty, and
                clients return because the result is consistent whichever chair
                they sit in.
              </p>
            </div>
            <dl className="mt-8 grid max-w-sm grid-cols-2 gap-6">
              {[
                ["14 yrs", "Longest-serving barber"],
                ["15", "Services to choose from"],
                ["4", "Barbers, your choice"],
                ["7 days", "Open every week"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="text-3xl font-bold text-gold-600">{n}</dt>
                  <dd className="text-sm text-[#57534e]">{l}</dd>
                </div>
              ))}
            </dl>
            <Link to="/about" className="btn-gold mt-9">
              Learn More About Us
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Img
              src="/images/about-02.jpg"
              alt="Barber tools"
              className="aspect-[4/5] w-full rounded-lg object-cover shadow-card"
            />
            <Img
              src="/images/about-01.jpg"
              alt="Barber pole and scissors"
              className="mt-8 aspect-[4/5] w-full rounded-lg object-cover shadow-card"
            />
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US (dark) */}
      <section className="section bg-ink-700">
        <div className="wrap">
          <Heading dark label="Why Choose Us" title="The Royal Fade Difference">
            What sets us apart as a choice for clients who care about the
            detail.
          </Heading>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map(({ icon: Icon, title, text }) => (
              <div key={title} className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold-500 text-gold-500">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-base text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-smoke-400">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="section bg-paper text-ink-700">
        <div className="wrap">
          <Heading label="Pricing" title="Simple, Transparent Pricing">
            Three of our most-booked options. Every service is listed on the
            services page.
          </Heading>
          <div className="mx-auto grid max-w-5xl items-start gap-7 md:grid-cols-3">
            {PRICING.map((p) => {
              const s = bySlug(p.slug);
              if (!s) return null;
              return (
                <div
                  key={p.slug}
                  className={`relative rounded-lg bg-white p-7 shadow-card ${p.popular ? "border-2 border-gold-500 md:-mt-3 md:pb-9" : "border border-cream-200"}`}
                >
                  {p.popular && (
                    <span className="absolute right-0 top-0 rounded-bl-md bg-gold-500 px-3 py-1 text-xs font-bold text-ink-900">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-xl">{s.name}</h3>
                  <p className="mt-1 text-sm text-[#57534e]">{p.note}</p>
                  <p className="mt-5">
                    <span className="text-4xl font-bold">
                      {money(s.price, s.isStartingPrice)}
                    </span>{" "}
                    <span className="text-sm text-[#57534e]">
                      / {duration(s.durationMinutes)}
                    </span>
                  </p>
                  <ul className="mt-6 space-y-3 text-sm">
                    {p.items.map((i) => (
                      <li key={i} className="flex gap-2.5">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-gold-600"
                          aria-hidden
                        />
                        {i}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to={`/booking?service=${s._id}`}
                    className={`mt-7 w-full ${p.popular ? "btn-gold" : "btn-dark"}`}
                  >
                    Book Now
                  </Link>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-sm text-[#57534e]">
            Prices are paid at the studio. &ldquo;From&rdquo; prices depend on
            the work involved.
          </p>
        </div>
      </section>

      {/* BARBERS */}
      <section className="section bg-white text-ink-700">
        <div className="wrap">
          <Heading label="The Team" title="Meet Our Barbers">
            Choose the barber whose work you like, or let us place you with
            whoever is free.
          </Heading>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {barbers.map((b) => (
              <BarberCard key={b.id} barber={b} />
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section className="section bg-paper text-ink-700">
        <div className="wrap">
          <Heading label="Gallery" title="Our Work">
            A look at recent cuts. Placeholder images until real photography is
            added.
          </Heading>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {GALLERY.slice(0, 6).map((g) => (
              <Link
                to="/gallery"
                key={g.src}
                className="block overflow-hidden rounded-lg shadow-card"
              >
                <Img
                  src={g.src}
                  alt={g.title}
                  className="aspect-[4/3] w-full object-contain transition-transform duration-500 hover:scale-105"
                />
              </Link>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/gallery" className="btn-outline">
              See the full gallery
            </Link>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section bg-white text-ink-700">
        <div className="wrap">
          <Heading label="Testimonials" title="What Our Clients Say">
            Sample testimonials for this demonstration website.
          </Heading>
          <div className="grid gap-6 md:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure key={r.name} className="card-light p-7">
                <div
                  className="flex gap-1 text-gold-500"
                  aria-label="5 out of 5 stars"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-current"
                      aria-hidden
                    />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-[#44403c]">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
                <figcaption className="mt-5 text-sm">
                  <span className="font-bold">{r.name}</span>{" "}
                  <span className="text-[#57534e]">&middot; {r.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* VISIT (dark) */}
      <section className="section bg-ink-700">
        <div className="wrap">
          <Heading dark label="Visit Us" title="Find the Studio">
            Ready for a sharper look? Book online in a couple of minutes.
          </Heading>
          <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-2">
            <div className="space-y-5 text-smoke-300">
              <p className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold-500 text-gold-500">
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-white">
                    Address
                  </span>
                  {contact.address}
                  <a
                    href={site.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm text-gold-400 underline"
                  >
                    Get directions
                  </a>
                </span>
              </p>
              <p className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold-500 text-gold-500">
                  <Phone className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-white">Phone</span>
                  <a
                    href={phoneHref(contact.phone)}
                    className="hover:text-gold-400"
                  >
                    {contact.phone}
                  </a>
                </span>
              </p>
              <p className="text-xs text-smoke-500">
                Sample details for this demonstration.
              </p>
            </div>
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold-500 text-gold-500">
                <Clock className="h-5 w-5" aria-hidden />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-white">Opening hours</p>
                <dl className="mt-2 divide-y divide-char-700 text-sm">
                  {hoursRows(hours).map((r) => (
                    <div key={r.label} className="flex justify-between py-2">
                      <dt className="text-smoke-300">{r.label}</dt>
                      <dd className="text-white">{r.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
          <div className="mt-12 text-center">
            <Link to="/booking" className="btn-gold px-8 py-3.5 text-base">
              Book Appointment
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
