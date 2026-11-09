import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <a href="#main" className="sr-only z-[80] bg-gold-500 px-4 py-2 font-bold text-ink-900 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to content</a>
      <Navbar />
      {/* the home page hero sits under the transparent header; other pages start below the solid header */}
      <main id="main" className={`min-h-screen ${pathname === '/' ? '' : 'pt-[72px]'}`}><Outlet /></main>
      <Footer />
    </>
  );
}
