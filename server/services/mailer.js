import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { business } from '../config/business.js';
import { verification } from '../config/verification.js';
import { formatTime } from './schedule.js';
import { categoryLabel } from '../utils/categories.js';

let transporter = null;

export function emailConfigured() {
  return Boolean(env.smtp.host && env.smtp.from);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
      // Fail fast: a serverless function must answer within its time limit even if the mail server is down.
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return transporter;
}

// Single place where mail leaves the app. Tests replace `send`.
export const mailTransport = {
  send: (message) => getTransporter().sendMail({ from: env.smtp.from, ...message }),
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Never throws. Returns { status: 'sent' | 'not_configured' | 'failed', error? }.
 * Only a short error code is kept: message text and recipients are never logged,
 * so one-time codes cannot leak into logs.
 */
export async function deliver(message) {
  if (!emailConfigured()) return { status: 'not_configured' };
  try {
    await mailTransport.send(message);
    return { status: 'sent' };
  } catch (err) {
    const code = String(err?.code || err?.name || 'SEND_ERROR').slice(0, 40);
    console.error(`Email delivery failed (${code})`);
    return { status: 'failed', error: code };
  }
}

// ---- Branded, responsive HTML shell (table layout + inline styles for email clients) ----
const GOLD = '#c9a24a';
const INK = '#0e0e0f';
const CREAM = '#f6efdf';

function layout({ preheader, heading, bodyHtml }) {
  const c = business.contact;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:'Helvetica Neue',Arial,sans-serif;color:${INK};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:4px;overflow:hidden;border:1px solid #e4d9bd;">
<tr><td style="background:${INK};padding:26px 28px;border-bottom:3px solid ${GOLD};"><div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:4px;color:${GOLD};">${esc(business.name.toUpperCase())}</div><div style="font-size:12px;letter-spacing:2px;color:#cfc6b0;margin-top:4px;">${esc(business.tagline)}</div></td></tr>
<tr><td style="padding:28px;"><h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:normal;color:${INK};">${esc(heading)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px;background:${INK};font-size:12px;line-height:1.6;color:#b9b19c;">${esc(business.name)} &middot; ${esc(c.address)}<br>${esc(c.phone)} &middot; ${esc(c.email)}</td></tr>
</table></td></tr></table></body></html>`;
}

export const money = (n, starting) => `${starting ? 'From ' : ''}\u00A3${Number(n).toLocaleString('en-GB', { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 })}`;
const duration = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);
const longDate = (dateStr) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${dateStr}T00:00:00Z`));

const STATUS_COPY = {
  pending: {
    heading: 'Appointment request received',
    intro: `Thanks for choosing ${business.name}. We have received your appointment request and verified your email address. This is a request, not yet a confirmed appointment. We will email you again as soon as it is confirmed.`,
    status: 'Pending confirmation',
    subject: (r) => `Appointment request received (${r}) - ${business.name}`,
  },
  confirmed: {
    heading: 'Your appointment is confirmed',
    intro: `Good news. Your appointment at ${business.name} is confirmed. We look forward to seeing you.`,
    status: 'Confirmed',
    subject: (r) => `Your appointment is confirmed (${r}) - ${business.name}`,
  },
  cancelled: {
    heading: 'Your appointment has been cancelled',
    intro: `Your appointment at ${business.name} has been cancelled, so the time is no longer reserved. If this is a surprise or you would like to rebook, please visit our website or call us.`,
    status: 'Cancelled',
    subject: (r) => `Your appointment has been cancelled (${r}) - ${business.name}`,
  },
};

/** Which delivery record a status uses. completed has no email. */
export const EMAIL_FIELD = { pending: 'bookingEmail', confirmed: 'confirmedEmail', cancelled: 'cancelledEmail' };

/** Pure function: builds the booking email for the appointment's current status. */
export function buildBookingEmail(appt) {
  const copy = STATUS_COPY[appt.status] || STATUS_COPY.pending;
  const c = business.contact;
  const when = `${longDate(appt.date)} at ${formatTime(appt.startMinutes)}`;
  const rows = [
    ['Reference', appt.reference],
    ['Status', copy.status],
    ['Service', appt.serviceName],
    ['Barber', appt.barberName],
    ['Date and time', when],
    ['Duration', duration(appt.durationMinutes)],
    ['Price', money(appt.servicePrice, appt.isStartingPrice)],
  ];
  const policy = appt.status === 'cancelled'
    ? 'You are welcome to book again at any time.'
    : 'Need to change or cancel? Please contact us at least 24 hours before your appointment so we can offer the time to someone else.';
  const text = [
    `Hi ${appt.customerName},`,
    '',
    copy.intro,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    policy,
    `${business.name} | ${c.phone} | ${c.email} | ${c.address}`,
  ].join('\n');
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">${rows
    .map(([k, v]) => `<tr><td style="padding:9px 0;border-bottom:1px solid #eee4cb;color:#6b6556;width:36%;vertical-align:top;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid #eee4cb;font-weight:600;">${esc(v)}</td></tr>`)
    .join('')}</table>`;
  const html = layout({
    preheader: copy.intro,
    heading: copy.heading,
    bodyHtml: `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Hi ${esc(appt.customerName)},<br>${esc(copy.intro)}</p>${table}<p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6b6556;">${esc(policy)}</p>`,
  });
  return { subject: copy.subject(appt.reference), text, html };
}

/** Pure function: builds the one-time-code email. */
export function buildOtpEmail(code) {
  const minutes = Math.round(verification.otpTtlMs / 60000);
  const subject = `${code} is your ${business.name} verification code`;
  const text = [
    `Your ${business.name} verification code is: ${code}`,
    '',
    `It expires in ${minutes} minutes and can be used once.`,
    'If you did not request this, you can safely ignore this email. Nobody can book with your address without this code.',
    '',
    business.name,
  ].join('\n');
  const html = layout({
    preheader: `Your verification code is ${code}`,
    heading: 'Verify your email address',
    bodyHtml: `<p style="margin:0 0 18px;font-size:15px;line-height:1.6;">Enter this code on the booking page to confirm that this email address belongs to you:</p>
<p style="margin:0 0 18px;text-align:center;"><span style="display:inline-block;padding:14px 24px;background:${INK};border-radius:3px;font-size:32px;letter-spacing:9px;font-weight:700;color:${GOLD};">${esc(code)}</span></p>
<p style="margin:0;font-size:13px;line-height:1.6;color:#6b6556;">The code expires in ${minutes} minutes and can be used once. If you did not request it, ignore this email.</p>`,
  });
  return { subject, text, html };
}

export const sendOtpEmail = (to, code) => deliver({ to, ...buildOtpEmail(code) });
export const sendBookingEmail = (appt) => deliver({ to: appt.email, ...buildBookingEmail(appt) });

// ---- Contact-form notification (website visitor -> shop owner) ----

/** Splits MAIL_FROM ("Name <addr>" or "addr") into { name, address }. Returns null if no address is found. */
export function parseMailFrom(value) {
  const raw = String(value || '').trim();
  const m = raw.match(/^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>$/) || raw.match(/^()([^<>\s]+@[^<>\s]+)$/);
  if (!m) return null;
  return { name: m[1].trim().replace(/^"(.*)"$/, '$1').trim(), address: m[2] };
}

/** Makes visitor-supplied text safe to use as a display name: no control chars, quotes, brackets or "@". */
function safeDisplayName(value, max = 60) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>"@]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Pure function: builds the owner notification for a contact-form message. The From ADDRESS is always our own
 * authenticated sender; Reply-To is the visitor's (validated) address so Reply goes straight to them.
 */
export function buildContactEmail(msg) {
  const sender = parseMailFrom(env.smtp.from);
  const brand = (sender && sender.name) || `${business.name} Website`;
  const visitor = safeDisplayName(msg.name);
  const from = sender ? { name: visitor ? `${visitor} via ${brand}` : brand, address: sender.address } : env.smtp.from;
  const text = `From: ${msg.name} <${msg.email}>\n\n${msg.message}`;
  const html = layout({
    preheader: `New website message from ${msg.name}`,
    heading: 'New website message',
    bodyHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;margin-bottom:16px;">
<tr><td style="padding:6px 0;color:#6b6556;width:30%;">Name</td><td style="padding:6px 0;font-weight:600;">${esc(msg.name)}</td></tr>
<tr><td style="padding:6px 0;color:#6b6556;">Email</td><td style="padding:6px 0;font-weight:600;">${esc(msg.email)}</td></tr>
<tr><td style="padding:6px 0;color:#6b6556;">Subject</td><td style="padding:6px 0;font-weight:600;">${esc(msg.subject)}</td></tr></table>
<p style="margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;">${esc(msg.message)}</p>
<p style="margin:16px 0 0;font-size:12px;color:#6b6556;">Press Reply to answer ${esc(msg.name)} directly.</p>`,
  });
  return { from, to: env.smtp.owner, replyTo: { name: visitor, address: msg.email }, subject: msg.subject, text, html };
}

export function sendContactEmail(msg) {
  if (!env.smtp.owner) return Promise.resolve({ status: 'not_configured' });
  return deliver(buildContactEmail(msg));
}
