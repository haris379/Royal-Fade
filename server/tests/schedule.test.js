import test from 'node:test';
import assert from 'node:assert/strict';
import { business } from '../config/business.js';
import { addDays, barberHoursFor, blockedMinutes, candidateStarts, dayOfWeek, freeBarbers, isValidDateStr, shopNow, slotsFor, toMinutes } from '../services/schedule.js';

const biz = { ...business, closedDates: ['2030-12-25'] };
const NOW = new Date('2030-06-10T09:00:00Z'); // a Monday, 10:00 in London (BST)

test('shop time uses the UK timezone, including British Summer Time', () => {
  assert.deepEqual(shopNow('Europe/London', new Date('2030-06-10T09:00:00Z')), { date: '2030-06-10', minutes: 600 }); // BST = UTC+1
  assert.deepEqual(shopNow('Europe/London', new Date('2030-12-10T09:00:00Z')), { date: '2030-12-10', minutes: 540 }); // GMT
  assert.equal(shopNow('Europe/London', new Date('2030-06-10T23:30:00Z')).date, '2030-06-11'); // already tomorrow in the UK
});

test('dates are validated strictly', () => {
  assert.ok(isValidDateStr('2030-02-28'));
  assert.ok(!isValidDateStr('2030-02-30'));
  assert.ok(!isValidDateStr('10/06/2030'));
  assert.ok(!isValidDateStr({ $ne: 1 }));
});

test('past dates and dates beyond the booking window have no start times', () => {
  assert.deepEqual(candidateStarts({ dateStr: '2030-06-09', durationMinutes: 30, business: biz, now: NOW }), []);
  assert.deepEqual(candidateStarts({ dateStr: addDays('2030-06-10', biz.maxAdvanceDays + 1), durationMinutes: 30, business: biz, now: NOW }), []);
});

test('closed dates (bank holidays) have no start times', () => {
  const now = new Date('2030-12-01T09:00:00Z');
  assert.deepEqual(candidateStarts({ dateStr: '2030-12-25', durationMinutes: 30, business: biz, now }), []);
  assert.ok(candidateStarts({ dateStr: '2030-12-24', durationMinutes: 30, business: biz, now }).length > 0);
});

test('same-day starts respect the minimum lead time and the closing time', () => {
  const starts = candidateStarts({ dateStr: '2030-06-10', durationMinutes: 30, business: biz, now: NOW });
  assert.ok(starts[0] >= toMinutes('11:00'), 'at least 60 min after 10:00');
  assert.ok(starts.at(-1) + 30 <= toMinutes('19:00'));
});

test('long services stop early enough to finish before closing', () => {
  const starts = candidateStarts({ dateStr: '2030-06-11', durationMinutes: 120, business: biz, now: NOW });
  assert.equal(starts.at(-1), toMinutes('17:00'));
});

test('time blocks round up to the 15-minute grid', () => {
  assert.equal(blockedMinutes(20, 15), 30);
  assert.deepEqual(slotsFor(540, 45, 15), [540, 555, 570]);
});

test('barbers: days off, own hours and unavailable dates are respected', () => {
  const marcus = business.barbers.find((b) => b.id === 'marcus'); // Sunday off
  const liam = business.barbers.find((b) => b.id === 'liam'); // Tue-Sat 11:00 start, Sun+Mon off
  const sunday = '2030-06-16';
  assert.equal(dayOfWeek(sunday), 0);
  assert.equal(barberHoursFor(biz, marcus, sunday), null);
  assert.equal(barberHoursFor(biz, liam, '2030-06-17'), null); // Monday off
  assert.equal(barberHoursFor(biz, liam, '2030-06-18').open, toMinutes('11:00'));
  const away = { ...marcus, unavailableDates: ['2030-06-18'] };
  assert.equal(barberHoursFor(biz, away, '2030-06-18'), null);
  assert.equal(barberHoursFor(biz, marcus, '2030-12-25'), null); // shop closed
});

test('freeBarbers excludes barbers who are busy or not working at that time', () => {
  const date = '2030-06-18'; // Tuesday
  const busy = new Map([['marcus', new Set([toMinutes('12:00')])]]);
  const free = (start, barbers = business.barbers, dur = 30) => freeBarbers({ dateStr: date, start, durationMinutes: dur, barbers, busy, business: biz }).map((b) => b.id);
  assert.ok(!free(toMinutes('12:00')).includes('marcus'), 'busy barber is excluded');
  assert.ok(free(toMinutes('12:00')).includes('daniel'), 'Daniel is off on Mondays only, so he works on Tuesday');
  assert.deepEqual(free(toMinutes('10:00'), business.barbers.filter((b) => b.id === 'liam')), [], 'Liam starts at 11:00 on Tuesdays');
});
