import { z } from 'zod';
import { DATE_RE, isValidDateStr } from '../services/schedule.js';
import { APPOINTMENT_STATUSES } from '../models/Appointment.js';
import { CATEGORY_IDS } from './categories.js';

// Every value is validated as a plain string/number/boolean, so objects such as {"$ne": null} never reach a query.
const objectId = z.string({ error: 'Invalid id' }).regex(/^[a-f\d]{24}$/i, 'Invalid id');
const cleanText = (min, max, label) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`)
    .transform((s) => s.replace(/[<>]/g, ''));

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(120)
  .email('Enter a valid email address');

// FormData sends booleans as the strings "true"/"false"; z.coerce.boolean() would turn "false" into true.
const boolish = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());

// UK-friendly: +44 7xxx xxxxxx, 07xxx xxxxxx, 020 xxxx xxxx ...
const phone = z
  .string({ error: 'Phone number is required' })
  .trim()
  .regex(/^\+?[0-9\s\-()]{7,20}$/, 'Enter a valid phone number')
  .refine((v) => v.replace(/\D/g, '').length >= 7, 'Enter a valid phone number');

const dateStr = z
  .string({ error: 'Date is required' })
  .regex(DATE_RE, 'Date must be YYYY-MM-DD')
  .refine(isValidDateStr, 'Enter a valid date');

export const emailOnlyBody = z.object({ email });
export const verifyCodeBody = z.object({
  email,
  code: z.string({ error: 'Enter the 6-digit code' }).trim().regex(/^\d{6}$/, 'The code is 6 digits'),
});

export const availabilityQuery = z.object({
  serviceId: objectId,
  date: dateStr,
  barberId: z.string().trim().max(30).optional(),
});

export const createAppointmentBody = z.object({
  serviceId: objectId,
  date: dateStr,
  time: z.string({ error: 'Choose a time' }).regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time'),
  barberId: z.string().trim().max(30).optional(),
  // Presence and validity are enforced in the controller (403), not here, so an absent token never reaches the slot logic.
  verificationToken: z.unknown().optional(),
  customerName: cleanText(2, 80, 'Full name'),
  email,
  phone,
  notes: z.string().trim().max(500, 'Notes must be at most 500 characters').optional().default('').transform((s) => s.replace(/[<>]/g, '')),
});

export const contactBody = z.object({
  name: cleanText(2, 100, 'Name'),
  email,
  subject: cleanText(3, 150, 'Subject'),
  message: cleanText(10, 2000, 'Message'),
});

export const loginBody = z.object({
  email: z.string({ error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email'),
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required').max(200),
});

export const statusBody = z.object({ status: z.enum(APPOINTMENT_STATUSES) });

export const appointmentFilter = z.object({
  date: dateStr.optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
});

export const serviceBody = z.object({
  name: cleanText(2, 80, 'Name'),
  description: cleanText(5, 400, 'Description'),
  price: z.coerce.number({ error: 'Price must be a number' }).min(0).max(100000),
  isStartingPrice: boolish.optional().default(false),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  image: z.string().trim().max(300).optional(), // omitted = keep the current image (update) / none (create)
  category: z.enum(CATEGORY_IDS, { error: 'Choose a valid category' }).default('haircuts'),
  active: boolish.optional().default(true),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export { objectId };

export const serviceListQuery = z.object({ category: z.enum(CATEGORY_IDS).optional() });
