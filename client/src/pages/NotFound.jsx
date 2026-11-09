import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function NotFound() {
  usePageTitle('Page not found');
  return (
    <section className="flex min-h-[70vh] items-center bg-ink-700 text-center">
      <div className="wrap">
        <p className="text-7xl font-extrabold text-gold-500 sm:text-9xl">404</p>
        <h1 className="mt-4 text-3xl text-white sm:text-4xl">This page got a little too much off the top</h1>
        <p className="mx-auto mt-4 max-w-md text-smoke-300">The page you are looking for does not exist or has moved.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4"><Link to="/" className="btn-gold">Back to home</Link><Link to="/booking" className="btn-line">Book Appointment</Link></div>
      </div>
    </section>
  );
}
