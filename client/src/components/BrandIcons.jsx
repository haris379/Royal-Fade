// Small social icons (lucide-react no longer ships brand logos).
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const InstagramIcon = (p) => (
  <svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none" /></svg>
);
export const FacebookIcon = (p) => (
  <svg {...base} {...p}><path d="M14 8.5h2.5V5H14c-2.2 0-3.5 1.5-3.5 3.6V11H8v3.4h2.5V21H14v-6.6h2.4l.6-3.4H14V9.1c0-.4.2-.6.6-.6Z" fill="currentColor" stroke="none" /></svg>
);
export const TiktokIcon = (p) => (
  <svg {...base} {...p}><path d="M14 4v10.2a3.2 3.2 0 1 1-3.2-3.2" /><path d="M14 4c.4 2.4 1.9 3.9 4.5 4.1" /></svg>
);
export const SOCIAL_ICONS = { instagram: InstagramIcon, facebook: FacebookIcon, tiktok: TiktokIcon };
