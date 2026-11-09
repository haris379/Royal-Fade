import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, validateCatalog, syncCatalog, slugify } from '../services/serviceCatalog.js';
import { CATEGORIES, CATEGORY_IDS, normalizeCategory } from '../utils/categories.js';

const names = (cat) => catalog.filter((s) => s.category === cat).map((s) => s.name);

test('the demo catalogue has the required categories and services', () => {
  assert.deepEqual(CATEGORIES.map((c) => c.label), ['Haircuts', 'Beard Grooming', 'Packages', 'Additional Services']);
  assert.deepEqual(names('haircuts'), ['Classic Haircut', 'Skin Fade', 'Taper Fade', 'Scissor Cut', 'Buzz Cut', 'Kids Haircut']);
  assert.deepEqual(names('beard-grooming'), ['Beard Trim', 'Beard Shape & Line-up', 'Hot Towel Shave', 'Beard Styling']);
  assert.deepEqual(names('packages'), ['Haircut & Beard Combo', 'Premium Grooming Package']);
  assert.deepEqual(names('additional'), ['Hair Wash & Style', 'Head Shave', 'Hair Design']);
  assert.equal(catalog.length, 15);
});

test('the catalogue is valid: unique slugs, categories, realistic GBP prices and durations, local images', () => {
  assert.deepEqual(validateCatalog(), []);
  for (const s of catalog) {
    assert.ok(s.price > 5 && s.price < 100, `${s.name} price ${s.price}`);
    assert.ok(s.durationMinutes >= 15 && s.durationMinutes <= 120);
    assert.match(s.image, /^\/images\/services\/[a-z0-9-]+\.svg$/, 'images are local, never external URLs');
    assert.equal(s.slug, slugify(s.name));
  }
  assert.ok(catalog.find((s) => s.name === 'Hair Design').isStartingPrice);
});

test('categories fall back safely', () => {
  assert.equal(normalizeCategory('nails'), 'haircuts');
  assert.equal(normalizeCategory(undefined), 'haircuts');
  assert.ok(CATEGORY_IDS.includes(normalizeCategory('packages')));
});

test('syncCatalog inserts what is missing and never overwrites existing values', async () => {
  const store = [{ _id: 1, name: 'Skin Fade', slug: 'skin-fade', price: 99, description: 'mine', category: 'haircuts' }];
  const Service = {
    find: () => ({ lean: async () => store.map((s) => ({ ...s })) }),
    create: async (d) => { store.push({ _id: store.length + 1, ...d }); },
    updateOne: async () => {},
  };
  const r = await syncCatalog(Service);
  assert.equal(r.created, catalog.length - 1);
  assert.equal(r.unchanged, 1);
  assert.equal(store[0].price, 99);
  assert.equal(store[0].description, 'mine');
});
