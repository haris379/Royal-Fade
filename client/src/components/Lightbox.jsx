import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/** Accessible lightbox: Esc closes, arrow keys navigate, focus returns to the trigger on close. */
export default function Lightbox({ items, index, onClose, onIndex }) {
  const closeRef = useRef(null);
  const item = items[index];

  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; prev?.focus?.(); };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length);
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, items.length, onClose, onIndex]);

  if (!item) return null;
  const nav = 'absolute top-1/2 -translate-y-1/2 border border-char-500 bg-ink/80 p-3 text-cream-100 hover:border-gold-500 hover:text-gold-300';
  return (
    <div role="dialog" aria-modal="true" aria-label={item.title} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/92 p-4" onClick={onClose}>
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close preview" className="absolute right-4 top-4 border border-char-500 bg-ink/80 p-3 text-cream-100 hover:border-gold-500 hover:text-gold-300"><X className="h-5 w-5" /></button>
      <button type="button" aria-label="Previous image" className={`${nav} left-3`} onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + items.length) % items.length); }}><ChevronLeft /></button>
      <figure className="max-h-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <img src={item.src} alt={item.title} className="max-h-[78vh] w-auto max-w-full border border-char-600 object-contain" />
        <figcaption className="mt-3 text-center text-sm text-smoke-300">{item.title} <span className="text-smoke-500">({index + 1} of {items.length})</span></figcaption>
      </figure>
      <button type="button" aria-label="Next image" className={`${nav} right-3`} onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % items.length); }}><ChevronRight /></button>
    </div>
  );
}
