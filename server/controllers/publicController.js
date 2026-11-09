import { Service } from '../models/Service.js';
import { ContactMessage } from '../models/ContactMessage.js';
import { business } from '../config/business.js';
import { emailConfigured, sendContactEmail } from '../services/mailer.js';
import { AppError } from '../utils/AppError.js';
import { objectId, contactBody, serviceListQuery } from '../utils/validators.js';
import { CATEGORIES, normalizeCategory, categoryOrder } from '../utils/categories.js';

const withCategory = (s) => ({ ...s, category: normalizeCategory(s.category) });

export async function listServices(req, res) {
  const { category } = serviceListQuery.parse(req.query);
  const all = (await Service.find({ active: true }).lean()).map(withCategory);
  const services = all
    .filter((s) => !category || s.category === category)
    .sort((a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  res.json({ success: true, data: services });
}

export async function getService(req, res) {
  const id = objectId.parse(req.params.id);
  const service = await Service.findOne({ _id: id, active: true }).lean();
  if (!service) throw new AppError(404, 'Service not found.');
  res.json({ success: true, data: withCategory(service) });
}

/** Public business information. Barbers are shown without their schedules' private details (days off are not exposed). */
export function getBusiness(req, res) {
  res.json({
    success: true,
    data: {
      name: business.name,
      tagline: business.tagline,
      timezone: business.timezone,
      currency: business.currency,
      contact: business.contact,
      hours: business.hours,
      closedDates: business.closedDates,
      maxAdvanceDays: business.maxAdvanceDays,
      barbers: business.barbers.map(({ id, name, title, experienceYears, specialties, bio }) => ({ id, name, title, experienceYears, specialties, bio })),
      categories: CATEGORIES,
      emailConfigured: emailConfigured(),
    },
  });
}

export async function createContactMessage(req, res) {
  const body = contactBody.parse(req.body);
  const saved = await ContactMessage.create(body);
  const emailStatus = (await sendContactEmail(saved)).status;
  res.status(201).json({
    success: true,
    message: 'Thanks. Your message has been received and we will reply by email.',
    data: { id: saved._id, emailStatus },
  });
}
