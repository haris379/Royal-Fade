// Generates the demo illustrations in public/images (SVG, no external files).
// These are stylised placeholders, NOT photographs: replace them with real barber photography
// (same file names, or edit the paths in src/config/gallery.js and the services in the dashboard).
// Run:  npm run images --workspace client
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/images');
for (const d of ['services', 'gallery', 'barbers']) fs.mkdirSync(path.join(out, d), { recursive: true });
// Later attributes override earlier ones on the same tag (e.g. a thinner stroke-width), so keep only the last.
const dedupeAttrs = (svg) =>
  svg.replace(/<([a-zA-Z]+)((?:\s+[\w:-]+="[^"]*")+)\s*(\/?)>/g, (m, tag, attrs, close) => {
    const seen = new Map();
    for (const [, k, v] of attrs.matchAll(/([\w:-]+)="([^"]*)"/g)) seen.set(k, v);
    return `<${tag} ${[...seen].map(([k, v]) => `${k}="${v}"`).join(' ')}${close ? ' /' : ''}>`;
  });
const write = (rel, svg) => fs.writeFileSync(path.join(out, rel), dedupeAttrs(svg));

const GOLD = '#f7941d';
const GOLD_L = '#fbbf6a';

// small deterministic random for repeatable textures
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);

// ---------- backgrounds ----------
const defs = (id, tint) => `
<defs>
  <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tint[0]}"/><stop offset="1" stop-color="${tint[1]}"/></linearGradient>
  <radialGradient id="glow${id}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="${GOLD}" stop-opacity=".10"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>
  <linearGradient id="gold${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_L}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>
  <pattern id="stripes${id}" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><rect width="22" height="22" fill="none"/><rect width="1.4" height="22" fill="${GOLD}" opacity="0"/></pattern>
  <filter id="grain${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter>
</defs>`;

const frame = (w, h, id, tint, body, { vignette = true } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">
${defs(id, tint)}
<rect width="${w}" height="${h}" fill="url(#bg${id})"/>
<rect width="${w}" height="${h}" fill="url(#stripes${id})"/>
<rect width="${w}" height="${h}" fill="url(#glow${id})"/>
${body}
${vignette ? `<rect width="${w}" height="${h}" fill="none" stroke="${GOLD}" stroke-opacity=".28" stroke-width="2" transform="translate(14 14) scale(${(w - 28) / w} ${(h - 28) / h})"/>` : ''}
<rect width="${w}" height="${h}" fill="none" filter="url(#grain${id})"/>
</svg>`;

// ---------- motifs (drawn around 0,0, roughly 240 units tall) ----------
const S = (id, extra = '') => `fill="none" stroke="url(#gold${id})" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" ${extra}`;
const motifs = {
  scissors: (id) => `<g ${S(id)}><circle cx="-46" cy="78" r="26"/><circle cx="46" cy="78" r="26"/><path d="M-34 55 L46 -112"/><path d="M34 55 L-46 -112"/><path d="M-46 -112 L-28 -112 M46 -112 L28 -112" stroke-width="3"/><circle cx="0" cy="-2" r="6" fill="url(#gold${id})"/></g>`,
  razor: (id) => `<g ${S(id)} transform="rotate(-28)"><path d="M-110 20 L70 20 C95 20 105 -4 90 -26 C70 -56 20 -70 -30 -70 C-20 -40 -60 -20 -110 -14 Z" fill="url(#gold${id})" fill-opacity=".14"/><path d="M-110 20 L-110 56 C-110 66 -100 72 -90 72 L60 72 C80 72 86 56 70 20"/><circle cx="-92" cy="46" r="5" fill="url(#gold${id})"/></g>`,
  comb: (id) => `<g ${S(id)}><rect x="-120" y="-30" width="240" height="46" rx="10" fill="url(#gold${id})" fill-opacity=".12"/>${Array.from({ length: 17 }, (_, i) => `<path d="M${-108 + i * 13.5} 16 L${-108 + i * 13.5} 70" stroke-width="3.4"/>`).join('')}</g>`,
  clipper: (id) => `<g ${S(id)} transform="rotate(-12)"><path d="M-46 -120 L46 -120 L58 40 C58 70 40 96 0 96 C-40 96 -58 70 -58 40 Z" fill="url(#gold${id})" fill-opacity=".12"/><path d="M-40 -120 L-40 -150 L40 -150 L40 -120"/>${Array.from({ length: 9 }, (_, i) => `<path d="M${-36 + i * 9} -150 L${-36 + i * 9} -172" stroke-width="3"/>`).join('')}<circle cx="0" cy="12" r="16"/><path d="M-26 62 L26 62" stroke-width="3"/></g>`,
  brush: (id) => `<g ${S(id)} transform="rotate(-20)"><rect x="-44" y="-130" width="88" height="70" rx="12" fill="url(#gold${id})" fill-opacity=".14"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${-34 + i * 11.3} -130 L${-34 + i * 11.3} -156" stroke-width="3"/>`).join('')}<path d="M-26 -60 L-18 90 C-16 104 16 104 18 90 L26 -60"/></g>`,
  drop: (id) => `<g ${S(id)}><path d="M0 -120 C46 -52 74 -12 74 30 C74 74 40 100 0 100 C-40 100 -74 74 -74 30 C-74 -12 -46 -52 0 -120 Z" fill="url(#gold${id})" fill-opacity=".12"/><path d="M-30 40 C-30 62 -14 74 6 74" stroke-width="4"/></g>`,
  steam: (id) => `<g ${S(id)}><rect x="-110" y="20" width="220" height="70" rx="14" fill="url(#gold${id})" fill-opacity=".12"/><path d="M-110 55 L110 55" stroke-width="3"/>${[-60, 0, 60].map((x) => `<path d="M${x} 0 C${x - 22} -22 ${x + 22} -44 ${x} -68 C${x - 20} -92 ${x + 18} -112 ${x} -134" stroke-width="4"/>`).join('')}</g>`,
  pole: (id) => `<g ${S(id)}><rect x="-38" y="-150" width="76" height="240" rx="38" fill="url(#gold${id})" fill-opacity=".1"/>${Array.from({ length: 8 }, (_, i) => `<path d="M-38 ${-130 + i * 32} L38 ${-100 + i * 32}" stroke-width="9" opacity=".75"/>`).join('')}<rect x="-52" y="-176" width="104" height="26" rx="8"/><rect x="-52" y="90" width="104" height="26" rx="8"/></g>`,
  crown: (id) => `<g ${S(id)}><path d="M-100 60 L-120 -50 L-50 0 L0 -90 L50 0 L120 -50 L100 60 Z" fill="url(#gold${id})" fill-opacity=".16"/><path d="M-100 90 L100 90"/><circle cx="-120" cy="-56" r="7"/><circle cx="0" cy="-98" r="7"/><circle cx="120" cy="-56" r="7"/></g>`,
  zigzag: (id) => `<g ${S(id)}><path d="M-110 70 L-60 -70 L-10 40 L40 -90 L90 30 L120 -20" stroke-width="7"/><path d="M-110 100 L120 100" stroke-width="3"/></g>`,
  star: (id) => `<g ${S(id)}><path d="M0 -110 L26 -34 L106 -30 L44 20 L64 98 L0 54 L-64 98 L-44 20 L-106 -30 L-26 -34 Z" fill="url(#gold${id})" fill-opacity=".14"/></g>`,
};

// ---------- bust (front-facing head and shoulders), 400 x 500 box ----------
function bust(id, { hair = 'fade', beard = 'none', tone = '#2b2b30', stroke = true } = {}) {
  const ln = `stroke="url(#gold${id})" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"`;
  const line = `fill="none" ${ln}`;
  const faceFill = `fill="${tone}"`;
  const hairs = {
    fade: `<path d="M120 222 C112 130 150 92 200 92 C250 92 288 130 280 222 C274 182 252 150 200 148 C148 150 126 182 120 222 Z" fill="url(#gold${id})" fill-opacity=".22" ${ln}/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${118 - i * 1} ${236 - i * 9} C ${112 + i} ${214 - i * 9} ${114 + i * 2} ${196 - i * 9} ${124 + i * 3} ${184 - i * 9}" ${line} stroke-width="3" opacity="${1 - i * 0.16}"/><path d="M${282 + i} ${236 - i * 9} C ${288 - i} ${214 - i * 9} ${286 - i * 2} ${196 - i * 9} ${276 - i * 3} ${184 - i * 9}" ${line} stroke-width="3" opacity="${1 - i * 0.16}"/>`).join('')}`,
    taper: `<path d="M118 226 C106 120 150 80 205 84 C262 88 292 130 282 226 C276 188 262 152 204 148 C150 146 128 184 118 226 Z" fill="url(#gold${id})" fill-opacity=".22" ${ln}/>${[0, 1, 2, 3].map((i) => `<path d="M${122 - i} ${250 - i * 10} L${120 - i} ${214 - i * 10}" ${line} stroke-width="3" opacity="${1 - i * 0.2}"/><path d="M${278 + i} ${250 - i * 10} L${280 + i} ${214 - i * 10}" ${line} stroke-width="3" opacity="${1 - i * 0.2}"/>`).join('')}`,
    classic: `<path d="M116 232 C104 118 152 84 214 88 C268 92 298 138 284 232 C280 190 262 158 210 152 C176 150 140 160 128 190 C124 200 118 216 116 232 Z" fill="url(#gold${id})" fill-opacity=".22" ${ln}/><path d="M142 150 C170 134 214 134 258 150" ${line} stroke-width="3" opacity=".7"/>`,
    crop: `<path d="M120 226 C112 140 152 100 200 100 C250 100 288 140 280 226 C274 192 258 166 200 164 C146 166 126 192 120 226 Z" fill="url(#gold${id})" fill-opacity=".2" ${ln}/>${Array.from({ length: 9 }, (_, i) => `<path d="M${140 + i * 15} 160 L${140 + i * 15} ${130 - (i % 3) * 4}" ${line} stroke-width="2.4" opacity=".6"/>`).join('')}`,
    buzz: `<path d="M122 222 C116 132 152 102 200 102 C248 102 284 132 278 222 C272 184 252 166 200 164 C150 166 128 184 122 222 Z" fill="url(#gold${id})" fill-opacity=".12" ${ln} stroke-dasharray="1 7"/>`,
    long: `<path d="M112 300 C92 150 128 80 200 80 C272 80 308 150 288 300 C286 230 280 190 262 170 C240 150 160 150 138 170 C120 190 114 230 112 300 Z" fill="url(#gold${id})" fill-opacity=".22" ${ln}/>`,
    bald: '',
  };
  const beards = {
    none: '',
    short: `<path d="M124 240 C124 322 160 346 200 346 C240 346 276 322 276 240 C268 276 248 288 200 288 C152 288 132 276 124 240 Z" fill="url(#gold${id})" fill-opacity=".3" ${ln}/>${Array.from({ length: 14 }, (_, i) => `<path d="M${140 + i * 9} ${300 + Math.sin(i) * 4} L${142 + i * 9} ${320 + Math.cos(i) * 5}" ${line} stroke-width="1.6" opacity=".5"/>`).join('')}`,
    full: `<path d="M118 236 C112 340 156 384 200 386 C244 384 288 340 282 236 C272 280 250 292 200 292 C150 292 128 280 118 236 Z" fill="url(#gold${id})" fill-opacity=".36" ${ln}/><path d="M168 282 C184 272 216 272 232 282" ${line} stroke-width="4"/>${Array.from({ length: 18 }, (_, i) => `<path d="M${132 + i * 8.5} ${304 + Math.sin(i * 1.3) * 6} L${135 + i * 8.5} ${336 + Math.cos(i) * 8}" ${line} stroke-width="1.6" opacity=".5"/>`).join('')}`,
    stubble: `<path d="M124 240 C124 322 160 346 200 346 C240 346 276 322 276 240 C268 276 248 288 200 288 C152 288 132 276 124 240 Z" fill="url(#gold${id})" fill-opacity=".14" stroke="none"/>`,
  };
  return `<g>
  <path d="M30 500 C30 420 110 388 200 382 C290 388 370 420 370 500 Z" ${faceFill} ${ln}/>
  <path d="M168 330 L168 388 C182 404 218 404 232 388 L232 330 Z" ${faceFill} ${ln}/>
  <ellipse cx="118" cy="248" rx="11" ry="22" ${faceFill} ${ln}/><ellipse cx="282" cy="248" rx="11" ry="22" ${faceFill} ${ln}/>
  <path d="M120 230 C120 160 150 120 200 120 C250 120 280 160 280 230 C280 300 244 346 200 346 C156 346 120 300 120 230 Z" ${faceFill} ${ln}/>
  ${beards[beard]}${hairs[hair]}
  <path d="M164 232 C176 224 188 226 192 232 M208 232 C212 226 224 224 236 232" ${line} stroke-width="3"/>
  <path d="M200 238 L196 270 L206 272" ${line} stroke-width="3" opacity=".7"/>
  <path d="M180 306 C192 312 208 312 220 306" ${line} stroke-width="3" opacity=".8"/>
  <path d="M150 440 L200 470 L250 440" ${line} stroke-width="3" opacity=".6"/>
  </g>`;
}

const place = (inner, w, h, scale = 1, dx = 0, dy = 0) => `<g transform="translate(${w / 2 + dx} ${h / 2 + dy}) scale(${scale})">${inner}</g>`;
const placeBust = (inner, w, h, scale) => `<g transform="translate(${w / 2 - 200 * scale} ${h - 500 * scale}) scale(${scale})">${inner}</g>`;

// ---------- services ----------
const tints = [['#2a2522', '#171412'], ['#2c2724', '#191513'], ['#272321', '#151211']];
const services = {
  'classic-haircut': ['scissors', 'comb'], 'skin-fade': ['clipper'], 'taper-fade': ['bust:taper'], 'scissor-cut': ['scissors'], 'buzz-cut': ['bust:buzz'], 'kids-haircut': ['star'],
  'beard-trim': ['bust:short'], 'beard-shape-and-line-up': ['razor'], 'hot-towel-shave': ['steam'], 'beard-styling': ['brush'],
  'haircut-and-beard-combo': ['bust:full'], 'premium-grooming-package': ['crown'],
  'hair-wash-and-style': ['drop'], 'head-shave': ['bust:bald'], 'hair-design': ['zigzag'],
};
Object.entries(services).forEach(([slug, [m]], i) => {
  const W = 800, H = 600, id = `s${i}`;
  let body;
  if (m.startsWith('bust:')) {
    const kind = m.split(':')[1];
    const hair = { taper: 'taper', buzz: 'buzz', bald: 'bald', short: 'crop', full: 'classic' }[kind];
    const beard = { short: 'short', full: 'full' }[kind] || 'none';
    body = placeBust(bust(id, { hair, beard }), W, H, 0.98);
  } else body = place(motifs[m](id), W, H, 1.45, 0, 10);
  write(`services/${slug}.svg`, frame(W, H, id, tints[i % tints.length], body));
});

// ---------- gallery (category, file) ----------
const gallery = [
  ['classic', 'classic-01', { hair: 'classic', beard: 'none' }, [700, 900]],
  ['skin-fade', 'skin-fade-01', { hair: 'fade', beard: 'none' }, [800, 800]],
  ['taper-fade', 'taper-fade-01', { hair: 'taper', beard: 'short' }, [700, 900]],
  ['beard', 'beard-01', { hair: 'crop', beard: 'full' }, [800, 800]],
  ['styling', 'styling-01', { hair: 'long', beard: 'none' }, [700, 900]],
  ['skin-fade', 'skin-fade-02', { hair: 'fade', beard: 'stubble' }, [700, 900]],
  ['classic', 'classic-02', { hair: 'classic', beard: 'short' }, [800, 800]],
  ['taper-fade', 'taper-fade-02', { hair: 'taper', beard: 'none' }, [800, 800]],
  ['beard', 'beard-02', { hair: 'buzz', beard: 'full' }, [700, 900]],
  ['styling', 'styling-02', { hair: 'crop', beard: 'stubble' }, [800, 800]],
  ['skin-fade', 'skin-fade-03', { hair: 'fade', beard: 'short' }, [800, 800]],
  ['beard', 'beard-03', { hair: 'bald', beard: 'full' }, [700, 900]],
];
gallery.forEach(([, name, opt, [W, H]], i) => {
  const id = `g${i}`;
  write(`gallery/${name}.svg`, frame(W, H, id, tints[(i + 1) % tints.length], placeBust(bust(id, { ...opt, tone: '#27272b' }), W, H, W / 440)));
});

// ---------- barbers ----------
const barbers = [
  ['marcus', { hair: 'fade', beard: 'short' }],
  ['daniel', { hair: 'taper', beard: 'none' }],
  ['liam', { hair: 'crop', beard: 'full' }],
  ['tommy', { hair: 'classic', beard: 'stubble' }],
];
barbers.forEach(([name, opt], i) => {
  const W = 600, H = 750, id = `b${i}`;
  write(`barbers/${name}.svg`, frame(W, H, id, tints[(i + 2) % tints.length], placeBust(bust(id, { ...opt, tone: '#25252a' }), W, H, 1.4)));
});

// ---------- hero, about, shop ----------
{
  const W = 1000, H = 1250, id = 'h';
  const r = rng(7);
  const sparks = Array.from({ length: 26 }, () => `<circle cx="${r() * W}" cy="${r() * H * 0.7}" r="${1 + r() * 2}" fill="${GOLD_L}" opacity="${0.15 + r() * 0.3}"/>`).join('');
  write('hero.svg', frame(W, H, id, ['#1a1815', '#0a0a0b'], `${sparks}${placeBust(bust(id, { hair: 'fade', beard: 'short', tone: '#222226' }), W, H, 2.2)}`));
}
{
  const W = 1200, H = 900, id = 'a';
  write('about.svg', frame(W, H, id, ['#1b1a18', '#0b0b0c'], `${place(motifs.pole(id), W, H, 2.2, -330, 20)}${place(motifs.scissors(id), W, H, 1.9, 270, 20)}${place(motifs.comb(id), W, H, 1.2, 270, 330)}`));
}
{
  const W = 1200, H = 800, id = 'p';
  write('shop.svg', frame(W, H, id, ['#171719', '#0c0c0d'], `${place(motifs.razor(id), W, H, 1.7, -300, 40)}${place(motifs.brush(id), W, H, 1.5, 0, 20)}${place(motifs.clipper(id), W, H, 1.5, 320, 40)}`));
}

{
  const W = 1920, H = 1000, id = 'hb';
  write('hero-bg.svg', frame(W, H, id, ['#2b2623', '#120f0e'], `${place(motifs.scissors(id), W, H, 3.2, 520, 40)}${place(motifs.comb(id), W, H, 1.6, -560, 250)}`, { vignette: false }));
}
// ---------- brand ----------
write('../favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#f7941d"/><text x="32" y="43" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="30" fill="#1c1917">RF</text></svg>`);
console.log('Generated demo illustrations in public/images');
