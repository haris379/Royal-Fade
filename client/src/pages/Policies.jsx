import { Link } from 'react-router-dom';
import { Heading } from '../components/ui.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useBusiness } from '../context/BusinessContext.jsx';

function Doc({ title, updated = 'November 2026', children }) {
  usePageTitle(title);
  return (
    <>
      <div className="bg-white text-ink-700">
        <section className="section pb-6 sm:pb-8"><div className="wrap"><Heading as="h1" title={title}>Last updated {updated}. Sample policy text for a demonstration website: have it reviewed before real use.</Heading></div></section>
        <section className="pb-20 sm:pb-28">
          <div className="wrap max-w-3xl space-y-8 leading-relaxed text-[#44403c] [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:text-ink-700 [&_a]:font-semibold [&_a]:text-gold-700 [&_a]:underline [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1.5">{children}</div>
        </section>
      </div>
    </>
  );
}

export function PrivacyPolicy() {
  const { contact } = useBusiness();
  return (
    <Doc title="Privacy Policy">
      <div><h2>Who we are</h2><p>Royal Fade is a barber studio. This website lets you browse services, book appointments and send us messages. Questions about your data: <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p></div>
      <div><h2>What we collect</h2><ul><li>Booking details: your name, email address, phone number, the service, barber and time you choose, and any note you add.</li><li>Email verification: a one-time code is emailed to you before a booking is accepted. We store only a secure hash of the code, and it expires after 10 minutes.</li><li>Contact messages: your name, email address and message.</li></ul></div>
      <div><h2>How we use it</h2><p>To run your appointment, confirm or cancel it by email, reply to your message, and prevent abuse of the booking system. We do not sell your data or use it for advertising.</p></div>
      <div><h2>Who can see it</h2><p>Only the studio&rsquo;s business owner account can view bookings and messages. Website maintainers manage services only and cannot see customer information. Emails are sent through our email provider.</p></div>
      <div><h2>How long we keep it</h2><p>Booking records are kept for as long as needed to run the business and meet legal obligations, then deleted. Ask us at any time to access, correct or delete your information.</p></div>
      <div><h2>Your rights</h2><p>Under UK GDPR you can request access, correction, deletion or restriction of your personal data, and complain to the Information Commissioner&rsquo;s Office (ico.org.uk).</p></div>
    </Doc>
  );
}

export function CookiePolicy() {
  return (
    <Doc title="Cookie Policy">
      <div><h2>Short version</h2><p>This website does not use advertising or tracking cookies, and does not show a cookie banner because none is needed.</p></div>
      <div><h2>What is stored in your browser</h2><ul><li>Business owners and website maintainers who sign in to the dashboard have a session token held in the browser&rsquo;s session storage until the tab is closed or they sign out. It is never used for tracking.</li><li>Fonts and images are served from this website itself, not from third parties.</li></ul></div>
      <div><h2>Third parties</h2><p>Links to Google Maps, WhatsApp and social networks open on those services, which have their own policies. If an embedded map is enabled, Google may set its own cookies when it loads.</p></div>
    </Doc>
  );
}

export function BookingPolicy() {
  return (
    <Doc title="Booking & Cancellation Policy">
      <div><h2>How booking works</h2><p>Choose a service, barber, date and time, enter your details and verify your email with the code we send you. Your booking then shows as <strong>pending</strong>. It is a request until we confirm it, and we will email you when it is confirmed.</p></div>
      <div><h2>Confirmation</h2><p>We aim to confirm requests promptly during opening hours. You will receive a confirmation email with your reference number. If we cannot offer the time you asked for, we will tell you.</p></div>
      <div><h2>Changing or cancelling</h2><p>Please give at least 24 hours&rsquo; notice by calling us or using the <Link to="/contact">contact page</Link>, quoting your reference. This lets us offer the time to someone else.</p></div>
      <div><h2>Late arrivals and no-shows</h2><p>If you are more than 15 minutes late we may need to shorten the service or rebook. Repeated no-shows may affect future bookings.</p></div>
      <div><h2>Prices</h2><p>Prices are shown in pounds (GBP) and are paid at the studio. &ldquo;From&rdquo; prices depend on the work required.</p></div>
      <div><h2>Opening times and closures</h2><p>Times are UK local time. Dates the studio is closed are not offered in the booking calendar.</p></div>
    </Doc>
  );
}
