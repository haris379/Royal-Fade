import { useMemo, useState } from 'react';
import { Heading, Img } from '../components/ui.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { GALLERY, GALLERY_CATEGORIES } from '../config/gallery.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function Gallery() {
  usePageTitle('Gallery');
  const [cat, setCat] = useState('all');
  const [open, setOpen] = useState(-1);
  const items = useMemo(() => GALLERY.filter((g) => cat === 'all' || g.category === cat), [cat]);
  const tab = (on) => `rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${on ? 'border-ink-700 bg-ink-700 text-white' : 'border-cream-300 bg-white text-ink-700 hover:border-ink-700'}`;

  return (
    <div className="bg-paper text-ink-700">
      <section className="section">
        <div className="wrap">
          <Heading as="h1" label="Gallery" title="Our Work">Fades, tapers, beards and styling. Click any image to view it larger. Placeholder images: replace the files in <code>client/public/images/gallery</code> with real photos.</Heading>
          <div className="mb-10 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Gallery categories">
            {GALLERY_CATEGORIES.map((c) => <button key={c.id} type="button" role="tab" aria-selected={cat === c.id} onClick={() => setCat(c.id)} className={tab(cat === c.id)}>{c.label}</button>)}
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {items.map((g, i) => (
              <li key={g.src}>
                <button type="button" onClick={() => setOpen(i)} className="block w-full overflow-hidden rounded-lg shadow-card" aria-label={`Open ${g.title}`}>
                  <Img src={g.src} alt={g.title} className="aspect-[4/3] w-full object-cover transition-transform duration-500 hover:scale-105" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {open >= 0 && <Lightbox items={items} index={open} onClose={() => setOpen(-1)} onIndex={setOpen} />}
    </div>
  );
}
