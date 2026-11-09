// Everything a shop owner is likely to change on the website itself. Contact details and opening hours are
// served by the API (server/config/business.js, or BUSINESS_* variables on the server) so the website
// and the booking system / emails always agree; the values below are only a fallback while the API loads.
// Social links, WhatsApp and the map come from client/.env (VITE_*), with demo defaults.
const env = import.meta.env;

export const site = {
  name: 'Royal Fade',
  tagline: 'Your Style. Our Craft.',
  // Fallback business data (kept identical to the server defaults)
  fallback: {
    contact: { phone: '020 7946 0321', email: 'hello@royalfade.example', address: '27 Demo Row, London, EC1A 1AA' },
    hours: {
      0: { open: '10:00', close: '16:00' }, 1: { open: '09:00', close: '19:00' }, 2: { open: '09:00', close: '19:00' },
      3: { open: '09:00', close: '19:00' }, 4: { open: '09:00', close: '20:00' }, 5: { open: '09:00', close: '20:00' }, 6: { open: '09:00', close: '18:00' },
    },
  },
  whatsapp: env.VITE_WHATSAPP_NUMBER || '447700900123',
  mapsUrl: env.VITE_MAPS_URL || 'https://www.google.com/maps/search/?api=1&query=London+EC1A+1AA',
  mapsEmbedUrl: env.VITE_MAPS_EMBED_URL || '',
  socials: [
    { id: 'instagram', label: 'Instagram', url: env.VITE_INSTAGRAM_URL || 'https://www.instagram.com/' },
    { id: 'facebook', label: 'Facebook', url: env.VITE_FACEBOOK_URL || 'https://www.facebook.com/' },
    { id: 'tiktok', label: 'TikTok', url: env.VITE_TIKTOK_URL || 'https://www.tiktok.com/' },
  ],
};

export const whatsappLink = (text = 'Hello Royal Fade, I would like to ask about an appointment.') =>
  `https://wa.me/${String(site.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
