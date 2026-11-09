// DEMO business details. Replace with the real shop's information (or override with environment variables).
// Royal Fade is a demonstration project, not a real operating business. The phone number is in the range
// reserved for fiction by the UK regulator, and the address is invented.
const e = process.env;

export const business = {
  name: 'Royal Fade',
  fullName: 'Royal Fade - Premium Barber Studio',
  tagline: 'Your Style. Our Craft.',
  timezone: 'Europe/London',
  currency: 'GBP',
  contact: {
    phone: e.BUSINESS_PHONE || '020 7946 0321',
    email: e.BUSINESS_EMAIL || 'hello@royalfade.example',
    address: e.BUSINESS_ADDRESS || '27 Demo Row, London, EC1A 1AA',
  },
  slotMinutes: 15, // the booking grid: appointments occupy whole 15-minute blocks
  startIntervalMinutes: 30, // start times offered to customers (09:00, 09:30, ...)
  minLeadMinutes: 60, // same-day bookings must start at least this far ahead
  maxAdvanceDays: 60,
  // 0 = Sunday ... 6 = Saturday. A missing day means the shop is closed.
  hours: {
    0: { open: '10:00', close: '16:00' },
    1: { open: '09:00', close: '19:00' },
    2: { open: '09:00', close: '19:00' },
    3: { open: '09:00', close: '19:00' },
    4: { open: '09:00', close: '20:00' },
    5: { open: '09:00', close: '20:00' },
    6: { open: '09:00', close: '18:00' },
  },
  // Whole-shop closures (YYYY-MM-DD, shop local date), e.g. bank holidays.
  closedDates: ['2026-12-25', '2026-12-26', '2027-01-01'],
  // Barbers. Optional per barber: `hours` (own working hours per weekday, within the shop's hours),
  // `daysOff` (weekday numbers) and `unavailableDates` (holidays, training days).
  barbers: [
    {
      id: 'marcus',
      name: 'Marcus Reid',
      title: 'Master Barber',
      experienceYears: 14,
      specialties: ['Skin fades', 'Classic cuts', 'Hot towel shaves'],
      bio: 'Marcus trained on the shop floor of a traditional barbershop and has been fading hair for fourteen years. He is the one to see for a sharp, clean skin fade.',
      daysOff: [0],
      unavailableDates: [],
    },
    {
      id: 'daniel',
      name: 'Daniel Okafor',
      title: 'Senior Barber',
      experienceYears: 9,
      specialties: ['Taper fades', 'Hair design', 'Textured crops'],
      bio: 'Daniel is known for detail: crisp edges, patient blending and creative hair designs that grow out well.',
      daysOff: [1],
      unavailableDates: [],
    },
    {
      id: 'liam',
      name: 'Liam Hughes',
      title: 'Beard Specialist',
      experienceYears: 7,
      specialties: ['Beard shaping', 'Line-ups', 'Straight-razor shaves'],
      bio: 'Liam spends his days on beards, from a light tidy to a full sculpt, finished with a hot towel and a proper razor.',
      hours: { 2: { open: '11:00', close: '19:00' }, 3: { open: '11:00', close: '19:00' }, 4: { open: '11:00', close: '20:00' }, 5: { open: '11:00', close: '20:00' }, 6: { open: '09:00', close: '18:00' } },
      daysOff: [0, 1],
      unavailableDates: [],
    },
    {
      id: 'tommy',
      name: 'Tommy Shaw',
      title: 'Barber',
      experienceYears: 4,
      specialties: ['Scissor cuts', 'Kids haircuts', 'Buzz cuts'],
      bio: 'Tommy keeps the chair friendly and fast, and is great with younger clients and first-time visitors.',
      daysOff: [0, 3],
      unavailableDates: [],
    },
  ],
};
