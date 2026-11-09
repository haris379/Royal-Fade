// Central demo service catalogue (prices in GBP, durations in minutes). Sample values only.
// `npm run seed` adds missing services and NEVER overwrites price, duration, description or image of
// services that already exist, so the developer's edits survive re-running the seed.
import { CATEGORY_IDS } from '../utils/categories.js';

export const slugify = (s) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// [name, description, price, minutes, startingPrice?]
const rows = (category, list) =>
  list.map(([name, description, price, durationMinutes, isStartingPrice]) => ({
    name,
    description,
    price,
    durationMinutes,
    isStartingPrice: Boolean(isStartingPrice),
    category,
  }));

export const catalog = [
  ...rows('haircuts', [
    ['Classic Haircut', 'A timeless scissor-and-clipper cut, shaped to your head and finished with a neat neckline and a style.', 22, 30],
    ['Skin Fade', 'A seamless blend down to the skin, cleaned up with a foil shave on the edges and styled to finish.', 26, 45],
    ['Taper Fade', 'A gentle taper at the sides and neck that keeps the length on top natural and easy to manage.', 25, 45],
    ['Scissor Cut', 'Cut entirely with scissors for natural movement and texture. Ideal for longer styles.', 30, 45],
    ['Buzz Cut', 'One clean length all over with a sharp edge-up. Quick, tidy and low maintenance.', 14, 30],
    ['Kids Haircut', 'A relaxed, friendly cut for boys under 12. Any style, including fades.', 16, 30],
  ]),
  ...rows('beard-grooming', [
    ['Beard Trim', 'Tidy length and shape across the beard, with the cheeks and neckline cleaned up.', 12, 30],
    ['Beard Shape & Line-up', 'Precise sculpting with razor-sharp lines on the cheeks and neck, finished with beard oil.', 16, 30],
    ['Hot Towel Shave', 'A traditional straight-razor shave with hot towels, shaving cream and a soothing aftershave balm.', 26, 45],
    ['Beard Styling', 'Trim, shape, conditioning and styling for a full beard that looks deliberate every day.', 20, 30],
  ]),
  ...rows('packages', [
    ['Haircut & Beard Combo', 'Your choice of haircut with a beard trim and line-up, booked as one appointment and priced for less.', 36, 75],
    ['Premium Grooming Package', 'Haircut, hot towel shave, hair wash and style. The full Royal Fade experience.', 62, 120],
  ]),
  ...rows('additional', [
    ['Hair Wash & Style', 'A deep-cleansing wash, scalp massage and blow-dry styled with premium products.', 12, 30],
    ['Head Shave', 'A close, comfortable razor shave of the whole head with hot towels and a moisturising finish.', 24, 45],
    ['Hair Design', 'Custom lines, patterns and freehand designs cut into the hair. Price depends on the design.', 15, 30, true],
  ]),
].map((s, i) => ({ ...s, slug: slugify(s.name), image: `/images/services/${slugify(s.name)}.svg`, sortOrder: i }));

export function validateCatalog(list = catalog) {
  const slugs = new Set();
  const errors = [];
  for (const s of list) {
    if (slugs.has(s.slug)) errors.push(`duplicate slug ${s.slug}`);
    slugs.add(s.slug);
    if (!CATEGORY_IDS.includes(s.category)) errors.push(`${s.name}: bad category`);
    if (!(s.price >= 0) || !(s.durationMinutes >= 15)) errors.push(`${s.name}: bad price/duration`);
  }
  return errors;
}

/**
 * Safe, repeatable catalogue sync. Works with any model exposing find/create/updateOne.
 * - Inserts services that do not exist yet (matched by slug).
 * - Never overwrites price, duration, description, image or active flag of existing services.
 * - Only fills in a missing slug or repairs an invalid category.
 */
export async function syncCatalog(Service, list = catalog) {
  const existing = await Service.find().lean();
  const bySlug = new Map(existing.filter((d) => d.slug).map((d) => [d.slug, d]));
  const legacyByName = new Map(existing.filter((d) => !d.slug).map((d) => [d.name, d]));
  const result = { created: 0, updated: 0, unchanged: 0 };

  for (const def of list) {
    const doc = bySlug.get(def.slug) || legacyByName.get(def.name);
    if (!doc) {
      await Service.create({ ...def, active: true });
      result.created += 1;
      continue;
    }
    const patch = {};
    if (!doc.slug) patch.slug = def.slug;
    if (!CATEGORY_IDS.includes(doc.category)) patch.category = def.category;
    if (Object.keys(patch).length) {
      await Service.updateOne({ _id: doc._id }, { $set: patch });
      result.updated += 1;
    } else result.unchanged += 1;
  }
  return result;
}
