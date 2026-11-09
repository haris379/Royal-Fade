import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import AdminGuard from './components/AdminGuard.jsx';
import Home from './pages/Home.jsx';
import Services from './pages/Services.jsx';
import Gallery from './pages/Gallery.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import Booking from './pages/Booking.jsx';
import BookingConfirmation from './pages/BookingConfirmation.jsx';
import { BookingPolicy, CookiePolicy, PrivacyPolicy } from './pages/Policies.jsx';
import NotFound from './pages/NotFound.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="services" element={<Services />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="booking" element={<Booking />} />
        <Route path="booking/confirmation" element={<BookingConfirmation />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="cookie-policy" element={<CookiePolicy />} />
        <Route path="booking-policy" element={<BookingPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      {/* The dashboard has its own chrome and is not linked from the public site. */}
      <Route path="admin/login" element={<AdminLogin />} />
      <Route path="admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="admin/:tab" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
      <Route path="admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
