// Single source of truth for service categories (server side).
export const CATEGORIES = [
  { id: 'haircuts', label: 'Haircuts' },
  { id: 'beard-grooming', label: 'Beard Grooming' },
  { id: 'packages', label: 'Packages' },
  { id: 'additional', label: 'Additional Services' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/** Missing / unknown values fall back to "haircuts" so old records never break a page. */
export const normalizeCategory = (value) => (CATEGORY_IDS.includes(value) ? value : 'haircuts');
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === normalizeCategory(id)).label;
export const categoryOrder = (id) => CATEGORY_IDS.indexOf(normalizeCategory(id));
